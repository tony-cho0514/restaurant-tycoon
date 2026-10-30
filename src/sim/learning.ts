// 배움 장치: 내가 바꾼 결정 기록, 위기·기회 리포트(쟁여 둔 이득), 월말 부검 리포트, 경영 개념 도감.
import { CARDS, type CardId } from '../content/dexCards';
import { INGREDIENTS, INGREDIENT_IDS, type IngredientId } from './ingredients';
import { dailyLabor } from './labor';
import { profitOf, type DayRecord } from './ledger';
import { LEVERS, LEVER_IDS, type Levers } from './levers';
import { MENU, PIZZA_IDS, type MenuActive, type MenuItemId } from './menu';
import { pushMessage } from './messages';
import type { NewsItem } from './news';
import { buildMonthReport, monthLabel, reportMoney as money, type Decision, type MonthReport } from './report';
import { shiftHours } from './staffing';
import { DAY_NAMES } from './time';
import type { GameState, Settings } from './types';
import { UPGRADES, UPGRADE_IDS } from './upgradeOps';
import type { UpgradeId } from './upgrades';

export type { Decision, MonthReport };

interface Snapshot {
  menuPrices: Record<MenuItemId, number>;
  menuActive: MenuActive;
  levers: Levers;
  settings: Settings;
  staff: { id: number; name: string }[];
  upgrades: Record<UpgradeId, number>;
}

type TrackedShock = 'CHEESE_SHORTAGE' | 'VEG_HARVEST' | 'FESTIVAL' | 'FX_SPIKE' | 'FX_DROP';

export interface ShockTrack {
  type: TrackedShock;
  startDay: number;
  endDay: number;
  /** 시작 전날 시세(재료 시세 몫의 기준) */
  base: Partial<Record<IngredientId, number>>;
  /** 시작 전 일주일 하루 평균 주문(축제 비교용) */
  baseOrders: number;
}

export interface ShockReport {
  type: TrackedShock;
  startDay: number;
  endDay: number;
  title: string;
  text: string;
  tone: 'good' | 'bad' | 'neutral';
  /** 시세대로였다면 더 든 돈(음수면 덜 든 돈), 미리 있던 재고로 아낀 돈 */
  extra?: number;
  saved?: number;
}

export interface LearningState {
  reports: MonthReport[];
  shockReports: ShockReport[];
  dex: Partial<Record<CardId, { day: number; story: string }>>;
  decisions: Decision[];
  shocks: ShockTrack[];
  snap: Snapshot | null;
}

export function initialLearning(): LearningState {
  return { reports: [], shockReports: [], dex: {}, decisions: [], shocks: [], snap: null };
}

const REPORTS_KEEP = 24;
const DECISIONS_KEEP = 150;
/** 위기 리포트에서 「미리 사 둔 덕분」을 말할 만한 금액 */
const HEDGE_MIN = 10_000;
/** 환율은 끝이 없어서 4주 뒤에 정리한다 */
const FX_REPORT_DAYS = 28;

const SHOCK_NAME: Record<TrackedShock, string> = {
  CHEESE_SHORTAGE: '치즈 파동', VEG_HARVEST: '채소 풍년', FESTIVAL: '동네 축제', FX_SPIKE: '환율 급등', FX_DROP: '환율 하락',
};

const orders = (d: DayRecord) => d.hallOrders + d.deliveryOrders;
const won = (n: number) => `${Math.round(n).toLocaleString('ko-KR')}원`;

// ── 도감 ─────────────────────────────────────────────

export function unlockCard(s: GameState, id: CardId, story: string): void {
  if (s.learning.dex[id]) return;
  s.learning = { ...s.learning, dex: { ...s.learning.dex, [id]: { day: s.clock.day, story } } };
  pushMessage(s, { from: 'book', name: '경영 도감', text: `새 카드: ${CARDS[id].icon} ${CARDS[id].title}`, detail: story, tone: 'good', action: 'learn' });
}

// ── 내가 바꾼 결정 ────────────────────────────────────

function snapshotOf(s: GameState): Snapshot {
  return {
    menuPrices: { ...s.menuPrices }, menuActive: { ...s.menuActive }, levers: { ...s.levers }, settings: { ...s.settings },
    staff: s.staff.map((x) => ({ id: x.id, name: x.name })), upgrades: { ...s.upgrades },
  };
}

const hoursText = (st: Settings) => `${st.openHour}~${st.closeHour === 24 ? '자정' : `${st.closeHour}시`}`;
const closedText = (d: number | null) => (d === null ? '없음' : `${DAY_NAMES[d]}요일`);

/** 지난 마감 때와 견줘 바뀐 것을 결정으로 남긴다(가격·운영 수단·영업시간·휴무·배달팁·직원·업그레이드·메뉴). */
export function diffDecisions(a: Snapshot, s: GameState): Decision[] {
  const day = s.clock.day;
  const out: Decision[] = [];
  const changed = (Object.keys(MENU) as MenuItemId[]).filter((id) => a.menuPrices[id] !== s.menuPrices[id]);
  if (changed.length > 0) {
    const pizzas = changed.filter((id) => PIZZA_IDS.includes(id as never));
    const pct = pizzas.length > 0 ? pizzas.reduce((acc, id) => acc + s.menuPrices[id] / a.menuPrices[id] - 1, 0) / pizzas.length : undefined;
    out.push({
      day, kind: 'price', pct,
      text: `가격 바꿈: ${changed.slice(0, 3).map((id) => `${MENU[id].name.replace(/ L$/, '')} ${a.menuPrices[id].toLocaleString('ko-KR')}→${s.menuPrices[id].toLocaleString('ko-KR')}원`).join(', ')}${changed.length > 3 ? ` 외 ${changed.length - 3}개` : ''}`,
    });
  }
  for (const id of LEVER_IDS) if (a.levers[id] !== s.levers[id]) out.push({ day, kind: 'lever', text: `${LEVERS[id].name} ${s.levers[id] ? '켬' : '끔'}` });
  if (a.settings.openHour !== s.settings.openHour || a.settings.closeHour !== s.settings.closeHour) {
    out.push({ day, kind: 'hours', text: `영업시간 ${hoursText(a.settings)} → ${hoursText(s.settings)}` });
  }
  if (a.settings.closedDay !== s.settings.closedDay) out.push({ day, kind: 'closed', text: `정기 휴무 ${closedText(a.settings.closedDay)} → ${closedText(s.settings.closedDay)}` });
  if (a.settings.deliveryTip !== s.settings.deliveryTip) out.push({ day, kind: 'tip', text: `배달팁 ${won(a.settings.deliveryTip)} → ${won(s.settings.deliveryTip)}` });
  for (const x of s.staff) if (!a.staff.some((y) => y.id === x.id)) out.push({ day, kind: 'hire', text: `알바 ${x.name} 채용` });
  for (const x of a.staff) if (!s.staff.some((y) => y.id === x.id)) out.push({ day, kind: 'staff', text: `${x.name} 그만둠` });
  for (const id of UPGRADE_IDS) if (a.upgrades[id] !== s.upgrades[id]) out.push({ day, kind: 'upgrade', text: `${UPGRADES[id].name} ${s.upgrades[id]}단계` });
  for (const id of PIZZA_IDS) if (a.menuActive[id] !== s.menuActive[id]) out.push({ day, kind: 'menu', text: `${MENU[id].name.replace(/ L$/, '')} ${s.menuActive[id] ? '출시' : '판매 중지'}` });
  return out;
}

// ── 위기·기회 리포트 ──────────────────────────────────

const TRACKED: TrackedShock[] = ['CHEESE_SHORTAGE', 'VEG_HARVEST', 'FESTIVAL', 'FX_SPIKE', 'FX_DROP'];

function shockIngredients(type: TrackedShock): IngredientId[] {
  if (type === 'CHEESE_SHORTAGE') return ['mozzarella'];
  if (type === 'VEG_HARVEST') return ['veg'];
  if (type === 'FESTIVAL') return [];
  return INGREDIENT_IDS.filter((id) => INGREDIENTS[id].imported);
}

/** 위기·기회가 실제로 터진 틱 끝: 추적을 시작하고 도감 카드를 연다(시세는 이미 오늘 값으로 바뀌어 있다). */
export function startShock(s: GameState, item: NewsItem): void {
  const type = item.shockType as TrackedShock | undefined;
  if (!type || !TRACKED.includes(type) || item.kind !== 'fire') return;
  const yesterday = s.ledger.days.at(-1)?.prices ?? {};
  const base: Partial<Record<IngredientId, number>> = {};
  for (const id of shockIngredients(type)) base[id] = yesterday[id] ?? s.prices[id];
  const active = s.news.active.filter((a) => a.type === type).sort((a, b) => b.untilDay - a.untilDay)[0];
  const endDay = type === 'FX_SPIKE' || type === 'FX_DROP' ? s.clock.day + FX_REPORT_DAYS - 1 : (active?.untilDay ?? s.clock.day);
  const recent = s.ledger.days.slice(-7).filter((d) => orders(d) > 0);
  const baseOrders = recent.length > 0 ? recent.reduce((a, d) => a + orders(d), 0) / recent.length : 0;
  s.learning = { ...s.learning, shocks: [...s.learning.shocks, { type, startDay: s.clock.day, endDay, base, baseOrders }] };

  const ing = shockIngredients(type);
  const moved = ing.map((id) => ({ id, pct: base[id] ? s.prices[id] / base[id]! - 1 : 0 })).sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))[0];
  if (type === 'FX_SPIKE' || type === 'FX_DROP') {
    unlockCard(s, 'fx', `환율이 ${type === 'FX_SPIKE' ? '뛰자' : '내리자'} 수입 재료값이 따라 움직였어요. ${moved ? `${INGREDIENTS[moved.id].name}는 하루 만에 ${Math.abs(moved.pct * 100).toFixed(1)}% ${moved.pct >= 0 ? '올랐어요' : '내렸어요'}.` : ''}`);
  } else if (type !== 'FESTIVAL' && moved) {
    unlockCard(s, 'supplyShock', `${SHOCK_NAME[type]}로 ${INGREDIENTS[moved.id].name} 값이 하루 만에 ${Math.abs(moved.pct * 100).toFixed(0)}% ${moved.pct >= 0 ? '뛰었어요' : '내렸어요'}.`);
  }
}

function shockReport(t: ShockTrack, days: DayRecord[]): ShockReport {
  const span = days.filter((d) => d.day >= t.startDay && d.day <= t.endDay);
  const n = t.endDay - t.startDay + 1;
  const name = SHOCK_NAME[t.type];
  if (t.type === 'FESTIVAL') {
    const got = span.reduce((a, d) => a + orders(d), 0);
    const extraOrders = Math.round(got - t.baseOrders * span.length);
    const lost = span.reduce((a, d) => a + d.lostOrders + d.stockoutOrders, 0);
    const rev = span.reduce((a, d) => a + d.revenueHall + d.revenueDelivery, 0);
    const perOrder = got > 0 ? rev / got : 0;
    const text = `${name} ${n}일: 평소보다 주문 ${extraOrders >= 0 ? '+' : ''}${extraOrders}건. ` +
      (lost > 0 ? `일손·재료가 모자라 놓친 주문 ${lost}건(매출로 약 ${money(lost * perOrder)}).` : '놓친 주문 없이 다 받았어요! 🎉');
    return { type: t.type, startDay: t.startDay, endDay: t.endDay, title: `${name} 리포트`, text, tone: lost > 0 ? 'neutral' : 'good' };
  }
  let extra = 0;
  let saved = 0;
  for (const id of Object.keys(t.base) as IngredientId[]) {
    for (const d of span) {
      const used = d.used?.[id] ?? 0;
      if (used <= 0) continue;
      const market = used * (d.prices[id] ?? t.base[id]!);
      extra += market - used * t.base[id]!;
      saved += market - (d.paid?.[id] ?? market);
    }
  }
  const ingNames = (Object.keys(t.base) as IngredientId[]).length > 2 ? '수입 재료' : (Object.keys(t.base) as IngredientId[]).map((id) => INGREDIENTS[id].name).join('·');
  let text: string;
  if (extra >= 0) {
    text = `${name} ${n}일 동안 시세대로였다면 ${ingNames}에 ${money(extra)} 더 들 뻔했어요.`;
    if (saved >= HEDGE_MIN) text += ` 미리 있던 재고 덕분에 ${money(saved)} 아껴서 실제로는 ${money(Math.max(0, extra - saved))} 더 들었어요.`;
  } else {
    text = `${name} ${n}일 동안 시세가 내려 ${ingNames}에서 ${money(-extra)} 아낄 수 있었어요.`;
    if (saved <= -HEDGE_MIN) text += ` 다만 그 전에 비싸게 사 둔 재고를 쓰느라 ${money(-saved)}은 못 아꼈어요.`;
  }
  return { type: t.type, startDay: t.startDay, endDay: t.endDay, title: `${name} 리포트`, text, tone: extra > 0 ? 'bad' : 'good', extra: Math.round(extra), saved: Math.round(saved) };
}

// ── 마감 때 ──────────────────────────────────────────

/** 마감 뒤(오늘 기록이 장부에 들어간 다음): 결정 기록, 위기 리포트, 도감 카드 */
export function dayEndLearning(s: GameState): void {
  const day = s.clock.day;
  const rec = s.ledger.days.at(-1);
  if (!rec || rec.day !== day) return;

  // 결정: 지난 마감과 견줘 바뀐 것
  if (s.learning.snap) {
    const found = diffDecisions(s.learning.snap, s);
    if (found.length > 0) s.learning = { ...s.learning, decisions: [...s.learning.decisions, ...found].slice(-DECISIONS_KEEP) };
  }
  s.learning = { ...s.learning, snap: snapshotOf(s) };

  // 끝난 위기·기회
  const done = s.learning.shocks.filter((t) => day >= t.endDay);
  if (done.length > 0) {
    s.learning = { ...s.learning, shocks: s.learning.shocks.filter((t) => day < t.endDay) };
    for (const t of done) {
      const r = shockReport(t, s.ledger.days);
      s.learning = { ...s.learning, shockReports: [...s.learning.shockReports, r].slice(-20) };
      pushMessage(s, { from: 'book', name: r.title, text: r.text, tone: r.tone, important: true, action: 'learn' });
      if ((r.saved ?? 0) >= HEDGE_MIN) unlockCard(s, 'hedging', `${SHOCK_NAME[t.type]} 동안 미리 있던 재고 덕분에 ${money(r.saved!)} 아꼈어요.`);
    }
  }

  dayCards(s, rec);
}

function dayCards(s: GameState, rec: DayRecord): void {
  const dex = s.learning.dex;
  const rev = rec.revenueHall + rec.revenueDelivery;
  if (!dex.revenueProfit && rev > 0) {
    const p = profitOf(rec);
    unlockCard(s, 'revenueProfit', `오늘 매출은 ${won(rev)}이었는데, 재료·수수료·인건비${rec.rent > 0 ? '·월세' : ''} 등을 빼니 ${p >= 0 ? `이익은 ${won(p)}이었어요.` : `이익은커녕 ${won(-p)} 손해였어요.`}${rec.rent > 0 ? ` 한 달 월세 ${won(rec.rent)}이 오늘 한꺼번에 나갔어요.` : ''}`);
  }
  if (!dex.laborCost && rec.labor > 0) {
    const x = s.staff.find((y) => !(s.absentToday ?? []).includes(y.id) && shiftHours(s, y.shift) > 0);
    if (x) {
      const h = shiftHours(s, x.shift);
      const openDays = 7 - (s.settings.closedDay === null ? 0 : 1);
      unlockCard(s, 'laborCost', `${x.name} 알바는 ${h}시간 × 시급 ${won(x.wage)} = ${won(h * x.wage)}인데, 4대보험·주휴수당까지 더하면 하루 ${won(dailyLabor(h, x.wage, h * openDays))}이 들어요.`);
    }
  }
  if (!dex.inventory && rec.wasteCost > 0) unlockCard(s, 'inventory', `오늘 버린 재료가 ${won(rec.wasteCost)}어치예요(유통기한이 지났거나 실수로 망친 피자).`);
  if (!dex.bottleneck && rec.lostOrders >= 3) unlockCard(s, 'bottleneck', `오늘 일손·오븐이 모자라 주문 ${rec.lostOrders}건을 놓쳤어요. 한 시간에 만들 수 있는 피자 수가 오늘 매출의 천장이었어요.`);
  if (!dex.cashflow && (s.cashNegative || rec.purchases >= Math.max(200_000, 2 * rec.foodCost))) {
    unlockCard(s, 'cashflow', s.cashNegative
      ? `통장이 마이너스가 됐어요. 장부의 이익과 통장의 현금은 따로 움직여요.`
      : `오늘 재료를 ${won(rec.purchases)}어치 사서 통장에서 그만큼 빠졌지만, 장부엔 오늘 쓴 재료값 ${won(rec.foodCost)}만 비용으로 잡혔어요.`);
  }
  if (!dex.sustainability && (s.owner.warned || s.owner.awayReason === 'burnout')) {
    unlockCard(s, 'sustainability', s.owner.awayReason === 'burnout'
      ? `사장님이 과로로 쓰러져 며칠 쉬어야 해요. 그동안 알바가 없는 시간엔 가게 문을 닫아요.`
      : `쉬는 날 없이 ${s.owner.daysWithoutRest}일째, 사장님 스트레스가 ${Math.round(s.owner.stress)}까지 올라 지쳤어요.`);
  }
  const today = s.messages.items.filter((m) => m.day === s.clock.day);
  const bad = today.find((m) => m.ask === 'review' && (m.hit ?? 0) > 0);
  if (!dex.reputation && bad) unlockCard(s, 'reputation', `「${bad.text}」 별 ${bad.stars}개 리뷰 하나가 ${bad.channel === 'hall' ? '홀' : '배달앱'} 평점을 약 ${bad.hit!.toFixed(2)}점 깎았어요.`);
  const back = today.find((m) => m.key === 'coupon-back');
  if (!dex.retention && back) unlockCard(s, 'retention', `쿠폰 3,000원을 받은 「${back.name}」 손님이 다시 주문하고 별 ${back.stars}개를 남겼어요.`);
  const promise = today.find((m) => m.key === 'promise-kept' || m.key === 'promise-broken');
  if (!dex.trust && promise) {
    unlockCard(s, 'trust', promise.key === 'promise-kept'
      ? `약속한 메뉴를 만들자 「${promise.name}」 손님이 단골이 되어 별 5개를 남겼어요.`
      : `약속한 메뉴를 기한 안에 못 만들자 「${promise.name}」 손님이 별 2개를 남겼어요.`);
  }
  // 가격을 바꾸고 일주일이 지나면: 바꾸기 전 일주일과 뒤 일주일의 하루 주문
  const priced = s.learning.decisions.find((d) => d.kind === 'price' && d.pct !== undefined && d.day === s.clock.day - 7);
  if (!dex.elasticity && priced) {
    const avg = (ds: DayRecord[]) => {
      const open = ds.filter((d) => orders(d) > 0);
      return open.length > 0 ? open.reduce((a, d) => a + orders(d), 0) / open.length : 0;
    };
    const before = avg(s.ledger.days.filter((d) => d.day < priced.day && d.day >= priced.day - 7));
    const after = avg(s.ledger.days.filter((d) => d.day > priced.day));
    if (before > 0) {
      const change = after / before - 1;
      unlockCard(s, 'elasticity', `피자값을 평균 ${priced.pct! >= 0 ? '+' : ''}${(priced.pct! * 100).toFixed(1)}% 바꾼 뒤 하루 주문이 ${before.toFixed(1)}건 → ${after.toFixed(1)}건(${change >= 0 ? '+' : ''}${(change * 100).toFixed(1)}%)이 됐어요. 날씨·경기도 함께 움직였을 수 있어요.`);
    }
  }
}

/** 월말(그달 기록이 장부에 들어간 다음): 부검 리포트를 만들고, 처음이면 돈의 기본 카드를 연다. */
export function monthEndLearning(s: GameState, monthIndex: number): MonthReport {
  const report = buildMonthReport({
    monthIndex, number: s.learning.reports.length + 1, months: s.ledger.months, days: s.ledger.days,
    news: s.news.items, messages: s.messages.items, decisions: s.learning.decisions,
  });
  s.learning = { ...s.learning, reports: [...s.learning.reports, report].slice(-REPORTS_KEEP) };
  pushMessage(s, {
    from: 'book', name: '부검 리포트', text: `${monthLabel(monthIndex)} 부검 리포트가 나왔어요. 이익 ${money(report.profit)}${report.prevProfit !== null ? `(지난달보다 ${report.profit - report.prevProfit >= 0 ? '+' : ''}${money(report.profit - report.prevProfit)})` : ''}`,
    tone: report.profit >= 0 ? 'good' : 'bad', important: true, action: 'learn',
  });
  const k = report.kpi;
  const m = s.ledger.months.find((x) => x.monthIndex === monthIndex)!;
  const variableCost = m.foodCost + m.serviceCost + m.appFees + (m.cardFees ?? 0) + m.deliveryFees;
  unlockCard(s, 'fixedVariable', `이번 달 변동비(재료·수수료·배달비 등) ${money(variableCost)}은 주문 따라 움직였고, 고정비(인건비·월세·공과금·광고) ${money(k.fixed)}은 손님이 없어도 나갔어요.`);
  unlockCard(s, 'contribution', `주문 하나에 평균 ${won(k.orders > 0 ? k.revenue / k.orders : 0)}을 받아 변동비를 빼면 ${won(k.contribution)}이 남았어요. 이 돈을 모아 고정비를 메워요.`);
  if (k.breakevenPerDay !== null) unlockCard(s, 'breakeven', `이번 달엔 하루 주문 ${k.breakevenPerDay.toFixed(1)}건이 넘어야 남는 장사였어요. 실제 하루 평균은 ${k.actualPerDay.toFixed(1)}건이었어요.`);
  unlockCard(s, 'costRate', `이번 달 매출 ${money(k.revenue)} 가운데 재료비가 ${(k.costRate * 100).toFixed(1)}%였어요.`);
  if (report.lost.value > 0) unlockCard(s, 'opportunityCost', `이번 달 일손·재료가 모자라 놓친 주문 ${report.lost.staff + report.lost.stock}건은 약 ${money(report.lost.value)}의 이익이었어요. 장부엔 안 보이는 손해예요.`);
  return report;
}
