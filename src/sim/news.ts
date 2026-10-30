// 뉴스·신호·충격. 모든 큰 변동은 몇 주 먼저 신호 뉴스가 나온 뒤에 일어난다(대체로 맞지만 가끔 빗나감).
import { FLAVOR_TEMPLATES, MIN_WAGE_TEMPLATES, NEWS_TEMPLATES, fillTemplate, type Tpl } from '../content/newsTemplates';
import type { Economy } from './economy';
import type { IngredientId } from './ingredients';
import type { Rng } from './rng';

export type ShockType = 'FX_SPIKE' | 'FX_DROP' | 'CHEESE_SHORTAGE' | 'VEG_HARVEST' | 'RECESSION' | 'BOOM' | 'RECOVERY' | 'FESTIVAL';

export interface PendingShock {
  id: string;
  type: ShockType;
  signalDay: number;
  fireDay: number;
  real: boolean;
  magnitude: number;
}

export interface ActiveShock {
  type: 'CHEESE_SHORTAGE' | 'VEG_HARVEST' | 'FESTIVAL';
  untilDay: number;
  magnitude: number;
}

export interface NewsItem {
  id: string;
  day: number;
  kind: 'signal' | 'fire' | 'fizzle' | 'announce' | 'flavor';
  headline: string;
  body: string;
  important: boolean;
  shockType?: ShockType;
  tone: 'bad' | 'good' | 'neutral';
}

export interface NewsState {
  pending: PendingShock[];
  active: ActiveShock[];
  items: NewsItem[];
  nextId: number;
}

export const NEWS_KEEP = 200;

const CYCLE_SHOCKS: ShockType[] = ['RECESSION', 'BOOM', 'RECOVERY'];

const SHOCK_RULES: Record<ShockType, { accuracy: number; lead: [number, number]; magnitude: [number, number]; activeDays: number; tone: NewsItem['tone'] }> = {
  FX_SPIKE: { accuracy: 0.8, lead: [7, 21], magnitude: [0.08, 0.15], activeDays: 0, tone: 'bad' },
  FX_DROP: { accuracy: 0.8, lead: [7, 21], magnitude: [0.05, 0.1], activeDays: 0, tone: 'good' },
  CHEESE_SHORTAGE: { accuracy: 0.8, lead: [7, 21], magnitude: [0.3, 0.5], activeDays: 42, tone: 'bad' },
  VEG_HARVEST: { accuracy: 0.8, lead: [7, 21], magnitude: [0.2, 0.35], activeDays: 28, tone: 'good' },
  FESTIVAL: { accuracy: 0.95, lead: [7, 14], magnitude: [0.6, 0.6], activeDays: 3, tone: 'good' },
  RECESSION: { accuracy: 1, lead: [0, 0], magnitude: [0, 0], activeDays: 0, tone: 'bad' },
  BOOM: { accuracy: 1, lead: [0, 0], magnitude: [0, 0], activeDays: 0, tone: 'good' },
  RECOVERY: { accuracy: 1, lead: [0, 0], magnitude: [0, 0], activeDays: 0, tone: 'neutral' },
};

const RANDOM_SHOCK_WEIGHTS: { item: ShockType; weight: number }[] = [
  { item: 'FX_SPIKE', weight: 3 },
  { item: 'FX_DROP', weight: 2 },
  { item: 'CHEESE_SHORTAGE', weight: 3 },
  { item: 'VEG_HARVEST', weight: 2 },
  { item: 'FESTIVAL', weight: 2 },
];
const WEEKLY_SHOCK_CHANCE = 0.35;
/** 경기 순환(호황·불황·회복)은 숨 돌릴 틈 계산에서 뺀다: 몇 달짜리 배경이라 */
const CYCLE_TYPES: ShockType[] = ['RECESSION', 'BOOM', 'RECOVERY'];

/** 가게를 아프게 하는 위기인가(경기 순환 제외) */
export function isBadShock(t: ShockType): boolean {
  return SHOCK_RULES[t].tone === 'bad' && !CYCLE_TYPES.includes(t);
}

/** 위기가 이어지는 날 수(환율처럼 한 번에 끝나는 건 0) */
export function shockDays(t: ShockType): number {
  return SHOCK_RULES[t].activeDays;
}

function addItem(ns: NewsState, item: Omit<NewsItem, 'id'>): NewsState {
  const items = [...ns.items, { ...item, id: `n${ns.nextId}` }].slice(-NEWS_KEEP);
  return { ...ns, items, nextId: ns.nextId + 1 };
}

function fromTemplate(rng: Rng, pool: Tpl[], vars: Record<string, string>): Tpl {
  return fillTemplate(rng.pick(pool), vars);
}

function schedule(ns: NewsState, type: ShockType, day: number, fireDay: number, rng: Rng, place: string): NewsState {
  const rule = SHOCK_RULES[type];
  const shock: PendingShock = {
    id: `s${ns.nextId}`,
    type,
    signalDay: day,
    fireDay,
    real: rng.chance(rule.accuracy),
    magnitude: rule.magnitude[0] + rng.float() * (rule.magnitude[1] - rule.magnitude[0]),
  };
  const withPending = { ...ns, pending: [...ns.pending, shock], nextId: ns.nextId + 1 };
  const t = fromTemplate(rng, NEWS_TEMPLATES[type].signal, { place });
  return addItem(withPending, { day, kind: 'signal', ...t, important: true, shockType: type, tone: rule.tone });
}

/** room: 새 악재가 들어설 여지(0~1, 숨 돌릴 틈). 좋은 소식은 상관없다. */
export function planWeek(ns: NewsState, econ: Economy, day: number, rng: Rng, place: string, room = 1): { news: NewsState; economy: Economy } {
  let news = ns;
  let economy = econ;
  const cyclePending = news.pending.some((p) => CYCLE_SHOCKS.includes(p.type));
  if (economy.cycleWeeksLeft <= 3 && !cyclePending) {
    let next: ShockType | 'STAY';
    if (economy.cycle === 'normal') {
      next = rng.weighted([{ item: 'BOOM' as const, weight: 0.4 }, { item: 'RECESSION' as const, weight: 0.4 }, { item: 'STAY' as const, weight: 0.2 }]);
    } else {
      next = 'RECOVERY';
    }
    if (next === 'STAY') {
      economy = { ...economy, cycleWeeksLeft: rng.int(16, 40) };
    } else {
      news = schedule(news, next, day, day + Math.max(economy.cycleWeeksLeft, 1) * 7, rng, place);
    }
  }
  if (rng.chance(WEEKLY_SHOCK_CHANCE)) {
    const type = rng.weighted(RANDOM_SHOCK_WEIGHTS);
    // 같은 종류가 대기 중이거나 아직 진행 중이면 새로 예약하지 않는다(파동이 겹쳐 값이 폭등하지 않게).
    const busy = news.pending.some((p) => p.type === type) || news.active.some((a) => a.type === type && a.untilDay >= day);
    const calm = isBadShock(type) && (room <= 0 || (room < 1 && !rng.chance(room)));
    if (!busy && !calm) {
      const [lo, hi] = SHOCK_RULES[type].lead;
      news = schedule(news, type, day, day + rng.int(lo, hi), rng, place);
    }
  }
  return { news, economy };
}

function applyShock(econ: Economy, active: ActiveShock[], shock: PendingShock, day: number, rng: Rng): { economy: Economy; active: ActiveShock[] } {
  const clampFx = (fx: number) => Math.min(1800, Math.max(1000, fx));
  switch (shock.type) {
    case 'FX_SPIKE':
      return { economy: { ...econ, fx: clampFx(econ.fx * (1 + shock.magnitude)) }, active };
    case 'FX_DROP':
      return { economy: { ...econ, fx: clampFx(econ.fx * (1 - shock.magnitude)) }, active };
    case 'RECESSION':
      return { economy: { ...econ, cycle: 'recession', cycleWeeksLeft: rng.int(16, 40) }, active };
    case 'BOOM':
      return { economy: { ...econ, cycle: 'boom', cycleWeeksLeft: rng.int(16, 40) }, active };
    case 'RECOVERY':
      return { economy: { ...econ, cycle: 'normal', cycleWeeksLeft: rng.int(16, 40) }, active };
    case 'CHEESE_SHORTAGE':
    case 'VEG_HARVEST':
    case 'FESTIVAL':
      return {
        economy: econ,
        active: [...active, { type: shock.type, untilDay: day + SHOCK_RULES[shock.type].activeDays - 1, magnitude: shock.magnitude }],
      };
  }
}

export function fireDue(ns: NewsState, econ: Economy, day: number, rng: Rng, place: string): { news: NewsState; economy: Economy } {
  let news: NewsState = { ...ns, active: ns.active.filter((a) => a.untilDay >= day) };
  let economy = econ;
  const due = news.pending.filter((p) => p.fireDay <= day);
  if (due.length === 0) return { news, economy };
  news = { ...news, pending: news.pending.filter((p) => p.fireDay > day) };
  for (const shock of due) {
    const tone = SHOCK_RULES[shock.type].tone;
    if (shock.real) {
      const applied = applyShock(economy, news.active, shock, day, rng);
      economy = applied.economy;
      news = { ...news, active: applied.active };
      const t = fromTemplate(rng, NEWS_TEMPLATES[shock.type].fire, { place, pct: String(Math.round(shock.magnitude * 100)) });
      news = addItem(news, { day, kind: 'fire', ...t, important: true, shockType: shock.type, tone });
    } else {
      const t = fromTemplate(rng, NEWS_TEMPLATES[shock.type].fizzle, { place });
      news = addItem(news, { day, kind: 'fizzle', ...t, important: false, shockType: shock.type, tone: 'neutral' });
    }
  }
  return { news, economy };
}

export function announceMinWage(ns: NewsState, econ: Economy, day: number, rng: Rng): { news: NewsState; economy: Economy } {
  const band = rng.weighted([
    { item: [0.02, 0.05] as const, weight: 0.7 },
    { item: [0.05, 0.09] as const, weight: 0.25 },
    { item: [0.12, 0.16] as const, weight: 0.05 },
  ]);
  const rate = band[0] + rng.float() * (band[1] - band[0]);
  const wage = Math.round((econ.minWage * (1 + rate)) / 10) * 10;
  const t = fromTemplate(rng, MIN_WAGE_TEMPLATES, {
    wage: wage.toLocaleString('ko-KR'),
    pct: (Math.round(rate * 1000) / 10).toFixed(1),
  });
  const news = addItem(ns, { day, kind: 'announce', ...t, important: true, tone: rate >= 0.05 ? 'bad' : 'neutral' });
  return { news, economy: { ...econ, pendingMinWage: wage } };
}

export function applyMinWage(econ: Economy): Economy {
  return { ...econ, minWage: econ.pendingMinWage ?? econ.minWage, pendingMinWage: null };
}

export function dailyFlavor(ns: NewsState, day: number, rng: Rng, place: string): NewsState {
  const t = fromTemplate(rng, FLAVOR_TEMPLATES, { place });
  return addItem(ns, { day, kind: 'flavor', ...t, important: false, tone: 'neutral' });
}

export function shockMultiplier(active: ActiveShock[], id: IngredientId, day: number): number {
  let mult = 1;
  for (const a of active) {
    if (a.untilDay < day) continue;
    if (a.type === 'CHEESE_SHORTAGE' && id === 'mozzarella') mult *= 1 + a.magnitude;
    if (a.type === 'VEG_HARVEST' && id === 'veg') mult *= 1 - a.magnitude;
  }
  return mult;
}

export function demandShock(active: ActiveShock[], day: number): { hall: number; delivery: number } {
  const festival = active.some((a) => a.type === 'FESTIVAL' && a.untilDay >= day);
  return festival ? { hall: 1.6, delivery: 1.2 } : { hall: 1, delivery: 1 };
}

/** 다른 모듈(직원·단체 주문)이 뉴스를 남길 때 */
export function pushNews(ns: NewsState, item: Omit<NewsItem, 'id'>): NewsState {
  return addItem(ns, item);
}
