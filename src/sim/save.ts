// 저장: 기기 안 저장소(Storage를 인자로 받음) + 직전 저장 백업 + 파일 내보내기·가져오기.
import { CHARGE_CAP_TICKS } from './charge';
import { INGREDIENT_IDS, ingredientPrice } from './ingredients';
import { DEFAULT_RULES } from './inventory';
import { normalizeRecord } from './ledger';
import { defaultMenuActive } from './menu';
import { initialStaff } from './staff';
import { calendar } from './time';
import { defaultUpgrades } from './upgrades';
import { LEVER_IDS } from './levers';
import { MENU } from './menu';
import { NEIGHBORHOODS } from './neighborhoods';
import { initialLearning } from './learning';
import { initialMessages } from './messages';
import { initialOwner } from './owner';
import { advanceTickInPlace } from './tick';
import type { NewsItem } from './news';
import { DEFAULT_SETTINGS, type GameState } from './types';

export const SAVE_KEY = 'restaurant-tycoon/save/v1';
export const BACKUP_KEY = 'restaurant-tycoon/save/v1/bak';
/** 읽지 못한 저장 원본을 버리지 않고 옮겨 두는 곳 */
export const CORRUPT_KEY = 'restaurant-tycoon/save/v1/corrupt';

export interface StorageLike {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem?(k: string): void;
}

export class SaveImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SaveImportError';
  }
}

const num = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const obj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const allNums = (x: unknown, keys: readonly string[]) => obj(x) && keys.every((k) => num(x[k]));

/** 최상위 필드의 형태를 모두 확인한다. 형태만 흉내 낸 파일이 화면을 깨뜨리지 않게. */
function hasGameShape(x: unknown): x is GameState {
  if (!obj(x)) return false;
  const s = x as Record<string, unknown>;
  const e = s.economy as Record<string, unknown>;
  const news = s.news as Record<string, unknown>;
  const ledger = s.ledger as Record<string, unknown>;
  const inv = s.inventory as Record<string, unknown>;
  const rules = s.rules as Record<string, unknown>;
  return (
    s.version === 3 &&
    num(s.seed) && num(s.rngState) && num(s.createdAt) && num(s.cash) &&
    typeof s.shopName === 'string' && typeof s.cashNegative === 'boolean' &&
    typeof s.neighborhoodId === 'string' && s.neighborhoodId in NEIGHBORHOODS &&
    allNums(s.clock, ['day', 'hour']) &&
    obj(e) && allNums(e, ['cycleWeeksLeft', 'fx', 'inflation', 'minWage']) &&
    ['boom', 'normal', 'recession'].includes(e.cycle as string) &&
    ['sunny', 'cloudy', 'rain', 'heat', 'cold'].includes(e.weather as string) &&
    allNums(s.prices, INGREDIENT_IDS) &&
    allNums(s.menuPrices, Object.keys(MENU)) &&
    obj(s.levers) && LEVER_IDS.every((k) => typeof (s.levers as Record<string, unknown>)[k] === 'boolean') &&
    allNums(s.ratings, ['hall', 'delivery']) &&
    obj(inv) && INGREDIENT_IDS.every((k) => Array.isArray(inv[k])) &&
    obj(rules) && INGREDIENT_IDS.every((k) => allNums(rules[k], ['reorderDays', 'targetDays'])) &&
    obj(news) && Array.isArray(news.pending) && Array.isArray(news.active) && Array.isArray(news.items) && num(news.nextId) &&
    obj(ledger) && Array.isArray(ledger.days) && Array.isArray(ledger.months) &&
    allNums(s.today, ['day', 'monthIndex']) &&
    allNums(s.charge, ['ticks', 'lastAccruedAt']) &&
    allNums(s.settings, ['openHour', 'closeHour', 'deliveryTip']) &&
    ((s.settings as unknown as Record<string, unknown>).closedDay === null || num((s.settings as unknown as Record<string, unknown>).closedDay)) &&
    Array.isArray(s.orders) && num(s.openedDay) &&
    obj(s.menuActive) && obj(s.menuDeveloped) && Array.isArray(s.staff) && Array.isArray(s.applicants) &&
    obj(s.upgrades) && Array.isArray(s.groupOffers) && Array.isArray(s.groupOrders) && num(s.nextStaffId) &&
    allNums(s.owner, ['stress', 'daysWithoutRest', 'awayFrom', 'awayUntil']) && Array.isArray((s.owner as Record<string, unknown>).log) &&
    obj(s.messages) && Array.isArray(s.messages.items) && num(s.messages.nextId) && Array.isArray(s.messages.pending) &&
    obj(s.learning) && Array.isArray(s.learning.reports) && Array.isArray(s.learning.shockReports) && obj(s.learning.dex) &&
    Array.isArray(s.learning.decisions) && Array.isArray(s.learning.shocks)
  );
}

/** 하루·월 기록의 숫자 필드를 모두 유한한 수로 맞춘다(옛 저장·NaN 기록 고치기). */
function normalizeLedger(x: unknown): unknown {
  if (!obj(x) || !obj(x.ledger) || !obj(x.today)) return x;
  const ledger = x.ledger as { days?: unknown; months?: unknown };
  if (!Array.isArray(ledger.days) || !Array.isArray(ledger.months)) return x;
  return {
    ...x,
    today: normalizeRecord(x.today as Record<string, unknown>),
    ledger: {
      ...ledger,
      days: ledger.days.map((d) => (obj(d) ? normalizeRecord(d) : d)),
      months: ledger.months.map((m) => (obj(m) ? normalizeRecord(m) : m)),
    },
  };
}

/** 옛 저장 형식을 지금 형식으로 옮긴다(없는 필드는 기본값). */
export function migrate(x: unknown): unknown {
  if (!obj(x)) return x;
  if (x.version === 1) {
    const clock = obj(x.clock) ? (x.clock as { day: number; hour: number }) : { day: 0, hour: 11 };
    return withExtras(toV3({
      ...x,
      version: 2,
      settings: { ...DEFAULT_SETTINGS },
      orders: [],
      // 버전 1은 11시 틱에 개점 준비를 했다: 11시보다 뒤라면 그날 준비는 끝난 것
      openedDay: clock.hour > 11 ? clock.day : clock.day - 1,
    }));
  }
  if (x.version === 2) return withExtras(toV3(x));
  return withExtras(x);
}

/** 뒤에 생긴 필드를 채운다(버전은 그대로 3): 사장님 스트레스, 사이드 메시지(지난 뉴스로 시작) */
function withExtras(x: Record<string, unknown>): Record<string, unknown> {
  let out = x;
  if (!obj(out.owner)) {
    const ratings = allNums(out.ratings, ['hall', 'delivery']) ? (out.ratings as { hall: number; delivery: number }) : { hall: 4.5, delivery: 4.5 };
    out = { ...out, owner: initialOwner(ratings) };
  }
  if (!obj(out.messages)) {
    const items = obj(out.news) && Array.isArray(out.news.items) ? (out.news.items as NewsItem[]).filter((n) => obj(n) && typeof n.headline === 'string' && typeof n.id === 'string') : [];
    out = { ...out, messages: initialMessages(items, false) };
  } else if (!Array.isArray(out.messages.pending)) {
    out = { ...out, messages: { ...out.messages, pending: [] } };
  }
  if (!obj(out.learning)) out = { ...out, learning: initialLearning() };
  return out;
}

/** 버전 2 → 3: 새 메뉴·재료, 직원, 업그레이드, 단체 주문 필드를 채운다. */
function toV3(x: Record<string, unknown>): Record<string, unknown> {
  const econ = (x.economy ?? {}) as { fx?: number; inflation?: number; minWage?: number };
  const clock = (x.clock ?? { day: 0, hour: 11 }) as { day: number; hour: number };
  const prices = { ...(x.prices as Record<string, number>) };
  for (const id of INGREDIENT_IDS) {
    if (!num(prices[id])) {
      prices[id] = ingredientPrice(id, { fx: econ.fx ?? 1350, inflation: econ.inflation ?? 1, month: calendar(clock).month, shockMult: 1, noise: 1 });
    }
  }
  const menuPrices = { ...(x.menuPrices as Record<string, number>) };
  for (const [id, def] of Object.entries(MENU)) if (!num(menuPrices[id])) menuPrices[id] = def.defaultPrice;
  const inventory = { ...(x.inventory as Record<string, unknown>) };
  for (const id of INGREDIENT_IDS) if (!Array.isArray(inventory[id])) inventory[id] = [];
  const rules = { ...(x.rules as Record<string, unknown>) };
  for (const id of INGREDIENT_IDS) if (!obj(rules[id])) rules[id] = { ...DEFAULT_RULES[id] };
  return {
    ...x,
    version: 3,
    prices,
    menuPrices,
    inventory,
    rules,
    menuActive: defaultMenuActive(),
    menuDeveloped: { cheese: true, pepperoni: true, combo: true, cola: true },
    staff: [initialStaff(econ.minWage ?? 10_030)],
    applicants: [],
    jobPost: null,
    upgrades: defaultUpgrades(),
    groupOffers: [],
    groupOrders: [],
    nextStaffId: 2,
  };
}

/** 형태 확인 + 한 틱 시험 실행으로 속까지 멀쩡한지 본다. 멀쩡하면 충전값만 범위 안으로 묶어 돌려준다. */
function validState(raw: unknown): GameState | null {
  const x = normalizeLedger(migrate(raw));
  if (!hasGameShape(x)) return null;
  try {
    advanceTickInPlace(structuredClone(x));
  } catch {
    return null;
  }
  const ticks = Math.min(CHARGE_CAP_TICKS, Math.max(0, x.charge.ticks));
  return ticks === x.charge.ticks ? x : { ...x, charge: { ...x.charge, ticks } };
}

function parseState(raw: string | null): GameState | null {
  if (!raw) return null;
  try {
    return validState(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveGame(s: GameState, st: StorageLike): { ok: true } | { ok: false; reason: 'quota' | 'unknown' } {
  try {
    const current = st.getItem(SAVE_KEY);
    // 멀쩡한 본 저장만 백업으로 옮긴다(깨진 걸로 좋은 백업을 덮지 않게).
    if (parseState(current)) st.setItem(BACKUP_KEY, current!);
    st.setItem(SAVE_KEY, JSON.stringify(s));
    return { ok: true };
  } catch (e) {
    const name = (e as { name?: string })?.name;
    return { ok: false, reason: name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED' ? 'quota' : 'unknown' };
  }
}

export function loadGame(st: StorageLike): GameState | null {
  return parseState(st.getItem(SAVE_KEY)) ?? parseState(st.getItem(BACKUP_KEY));
}

/** 본 저장이 있는데 백업까지 못 읽을 때: 원본을 CORRUPT_KEY로 옮겨 보존하고 true를 돌려준다. */
export function quarantineCorrupt(st: StorageLike): boolean {
  const raw = st.getItem(SAVE_KEY);
  if (raw === null || loadGame(st)) return false;
  st.setItem(CORRUPT_KEY, raw);
  st.removeItem?.(SAVE_KEY);
  return true;
}

export function exportSave(s: GameState, nowMs: number): string {
  return JSON.stringify({ app: 'restaurant-tycoon', version: 3, exportedAt: nowMs, state: s });
}

export function importSave(text: string): GameState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new SaveImportError('이 게임의 저장 파일이 아니에요');
  }
  const file = parsed as { app?: unknown; version?: unknown; state?: unknown };
  if (!file || typeof file !== 'object' || file.app !== 'restaurant-tycoon') throw new SaveImportError('이 게임의 저장 파일이 아니에요');
  if (file.version !== 1 && file.version !== 2 && file.version !== 3) throw new SaveImportError('지원하지 않는 저장 버전이에요');
  const state = validState(file.state);
  if (!state) throw new SaveImportError('저장 파일이 손상됐어요');
  return state;
}
