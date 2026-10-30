// 월말 부검 리포트: 지난달 대비 이익 변화를 원인별로 쪼갠다. 몫을 모두 더하면 실제 이익 변화와 원 단위까지 같다.
// 첫 달(또는 지난달 기록이 없을 때)은 「이번 달 돈이 어디로 갔나」 구조를 보여 준다.
import { BAD_TOPICS, TOPIC_LABEL, type Topic } from '../content/messageTemplates';
import { INGREDIENTS, type IngredientId } from './ingredients';
import { profitOf, type DayRecord, type MonthRecord } from './ledger';
import type { Message } from './messages';
import type { NewsItem } from './news';
import { DAYS_PER_MONTH, calendar } from './time';

export type PartKey =
  | 'revenue' | 'food' | 'fees' | 'service'
  | 'volume' | 'group' | 'ingredients' | 'perOrder'
  | 'waste' | 'labor' | 'rentUtil' | 'ads' | 'investment';

export interface ReportPart {
  key: PartKey;
  label: string;
  amount: number;
  detail?: string;
}

export interface Kpi {
  revenue: number;
  orders: number;
  openDays: number;
  costRate: number;
  laborRate: number;
  /** 주문 하나에 남는 돈(공헌이익) */
  contribution: number;
  /** 한 달 고정비: 인건비·월세·공과금·광고 */
  fixed: number;
  /** 하루에 이만큼 주문이 와야 이익이 0(손익분기점). 공헌이익이 0 이하면 null */
  breakevenPerDay: number | null;
  actualPerDay: number;
}

export interface Decision {
  day: number;
  kind: 'price' | 'lever' | 'hours' | 'closed' | 'tip' | 'hire' | 'staff' | 'upgrade' | 'menu';
  text: string;
  /** 가격을 바꿨을 때 평균 변화율 */
  pct?: number;
}

export interface MonthReport {
  monthIndex: number;
  label: string;
  /** 몇 번째 리포트(1부터): 힌트가 점점 줄어드는 기준 */
  number: number;
  profit: number;
  prevProfit: number | null;
  mode: 'structure' | 'change';
  parts: ReportPart[];
  kpi: Kpi;
  prevKpi: Kpi | null;
  lost: { staff: number; stock: number; value: number };
  events: { day: number; text: string; tone: NewsItem['tone'] }[];
  decisions: (Decision & { before: number | null; after: number | null })[];
  voices: { count: number; avg: number | null; top: string | null };
  /** 가장 크게 영향을 준 원인과 써 볼 수단 */
  cause: string;
  hint: string | null;
}

const money = (n: number) => {
  const a = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  return a >= 10_000 ? `${sign}${Math.round(a / 10_000).toLocaleString('ko-KR')}만 원` : `${sign}${Math.round(a).toLocaleString('ko-KR')}원`;
};
export { money as reportMoney };

export function monthLabel(monthIndex: number): string {
  const c = calendar({ day: monthIndex * DAYS_PER_MONTH, hour: 0 });
  return `${c.year}년차 ${c.month}월`;
}

const orders = (r: MonthRecord | DayRecord) => r.hallOrders + r.deliveryOrders;
const revenue = (r: MonthRecord | DayRecord) => r.revenueHall + r.revenueDelivery;
const variable = (r: MonthRecord) => r.foodCost + r.serviceCost + r.appFees + (r.cardFees ?? 0) + r.deliveryFees;

export function kpiOf(m: MonthRecord, days: DayRecord[]): Kpi {
  const n = orders(m);
  const r = revenue(m);
  const openDays = days.filter((d) => orders(d) > 0).length;
  const contribution = n > 0 ? (r - variable(m)) / n : 0;
  const fixed = m.labor + m.rent + m.utilities + m.ads;
  return {
    revenue: r,
    orders: n,
    openDays,
    costRate: r > 0 ? m.foodCost / r : 0,
    laborRate: r > 0 ? m.labor / r : 0,
    contribution,
    fixed,
    breakevenPerDay: contribution > 0 && openDays > 0 ? fixed / contribution / openDays : null,
    actualPerDay: openDays > 0 ? n / openDays : 0,
  };
}

/** 재료별 (이번 달 산 값 − 이번 달 쓴 양 × 지난달 단위당 산 값): 재료 시세 몫 */
function ingredientEffect(cur: DayRecord[], prev: DayRecord[]): { total: number; byIng: [IngredientId, number][] } {
  const sum = (days: DayRecord[], key: 'used' | 'paid') => {
    const out: Partial<Record<IngredientId, number>> = {};
    for (const d of days) for (const [id, v] of Object.entries(d[key] ?? {}) as [IngredientId, number][]) out[id] = (out[id] ?? 0) + v;
    return out;
  };
  const usedC = sum(cur, 'used'); const paidC = sum(cur, 'paid');
  const usedP = sum(prev, 'used'); const paidP = sum(prev, 'paid');
  const byIng: [IngredientId, number][] = [];
  for (const id of Object.keys(usedC) as IngredientId[]) {
    const uc = usedC[id] ?? 0; const up = usedP[id] ?? 0;
    if (uc <= 0 || up <= 0) continue;
    byIng.push([id, (paidC[id] ?? 0) - uc * ((paidP[id] ?? 0) / up)]);
  }
  byIng.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  return { total: byIng.reduce((a, [, v]) => a + v, 0), byIng };
}

function structureParts(m: MonthRecord): ReportPart[] {
  const parts: ReportPart[] = [
    { key: 'revenue', label: '매출', amount: revenue(m) },
    { key: 'food', label: '재료비', amount: -m.foodCost },
    { key: 'fees', label: '수수료·배달비', amount: -(m.appFees + (m.cardFees ?? 0) + m.deliveryFees) },
    { key: 'service', label: '서비스(콜라·보온 포장·쿠폰)', amount: -m.serviceCost },
    { key: 'waste', label: '폐기', amount: -m.wasteCost },
    { key: 'labor', label: '인건비', amount: -m.labor },
    { key: 'rentUtil', label: '월세·공과금', amount: -(m.rent + m.utilities) },
    { key: 'ads', label: '광고', amount: -m.ads },
    { key: 'investment', label: '투자(메뉴 개발·업그레이드)', amount: -(m.investment ?? 0) },
  ];
  // 원 단위로 반올림하고, 반올림 차이는 재료비가 맡아 합계가 이번 달 이익과 같게 한다.
  const rounded = parts.map((p) => ({ ...p, amount: Math.round(p.amount) }));
  const food = rounded.find((p) => p.key === 'food')!;
  food.amount += Math.round(profitOf(m)) - rounded.reduce((a, p) => a + p.amount, 0);
  return rounded.filter((p) => p.amount !== 0 || p.key === 'revenue');
}

function changeParts(cur: MonthRecord, prev: MonthRecord, curDays: DayRecord[], prevDays: DayRecord[]): ReportPart[] {
  const nC = orders(cur); const nP = orders(prev);
  const cP = revenue(prev) - variable(prev);
  const perP = nP > 0 ? cP / nP : 0;
  const ratioP = revenue(prev) > 0 ? Math.min(1, Math.max(0, cP / revenue(prev))) : 0;
  const ing = ingredientEffect(curDays, prevDays);
  const dayAvg = (n: number, days: DayRecord[]) => {
    const open = days.filter((d) => orders(d) > 0).length;
    return open > 0 ? Math.round(n / open) : 0;
  };
  const ticket = (m: MonthRecord) => (orders(m) > 0 ? Math.round((revenue(m) - (m.groupRevenue ?? 0)) / orders(m)) : 0);
  const parts: ReportPart[] = [
    { key: 'volume', label: '손님 수(주문 건수)', amount: Math.round((nC - nP) * perP), detail: `주문 ${nP}건 → ${nC}건 · 하루 평균 ${dayAvg(nP, prevDays)}건 → ${dayAvg(nC, curDays)}건` },
    { key: 'group', label: '단체 주문', amount: Math.round(((cur.groupRevenue ?? 0) - (prev.groupRevenue ?? 0)) * ratioP), detail: `단체 주문 ${prev.groupOrders}건 → ${cur.groupOrders}건` },
    {
      key: 'ingredients', label: '재료 시세', amount: -Math.round(ing.total),
      detail: ing.byIng.filter(([, v]) => Math.abs(v) >= 5_000).slice(0, 3).map(([id, v]) => `${INGREDIENTS[id].name} ${v > 0 ? '더 듦' : '덜 듦'} ${money(Math.abs(v))}`).join(' · ') || undefined,
    },
    { key: 'perOrder', label: '주문당 남는 돈(가격·메뉴·서비스)', amount: 0, detail: `주문당 매출 ${ticket(prev).toLocaleString('ko-KR')}원 → ${ticket(cur).toLocaleString('ko-KR')}원` },
    { key: 'waste', label: '폐기', amount: -(cur.wasteCost - prev.wasteCost) },
    { key: 'labor', label: '인건비', amount: -(cur.labor - prev.labor) },
    { key: 'rentUtil', label: '월세·공과금', amount: -(cur.rent + cur.utilities - prev.rent - prev.utilities) },
    { key: 'ads', label: '광고', amount: -(cur.ads - prev.ads) },
    { key: 'investment', label: '투자(메뉴 개발·업그레이드)', amount: -((cur.investment ?? 0) - (prev.investment ?? 0)), detail: '투자는 앞으로 돌아올 돈이에요' },
  ];
  // 주문당 남는 돈은 나머지: 몫을 다 더하면 실제 이익 변화와 원 단위까지 같아진다.
  const delta = Math.round(profitOf(cur)) - Math.round(profitOf(prev));
  const rest = parts.reduce((a, p) => a + Math.round(p.amount), 0);
  parts.find((p) => p.key === 'perOrder')!.amount = delta - rest;
  return parts.map((p) => ({ ...p, amount: Math.round(p.amount) })).filter((p) => p.amount !== 0);
}

const HINT: Record<PartKey | 'lost' | 'breakeven' | 'burnout', [string, string]> = {
  burnout: ['사장님이 쓰러져 문을 닫은 날이 있어 주문이 줄었어요', '쉬는 날을 미리 정하고, 알바에게 맡겨 사장님 없이도 가게가 열리게 해 보세요.'],
  volume: ['주문이 줄었어요', '평점(메시지 탭 리뷰 요약), 가격, 경기, 쉬는 날 수를 보세요. 배달앱 광고로 손님을 늘려 볼 수도 있어요.'],
  group: ['단체 주문이 줄었어요', '단체 주문 요청을 받을 수 있게 재료와 일손에 여유를 두세요.'],
  ingredients: ['재료를 산 값이 올랐어요', '위기 신호가 오면 미리 사 두고, 오른 만큼 가격에 반영할지 따져 보세요.'],
  perOrder: ['주문 하나에 남는 돈이 줄었어요', '가격을 내렸는지, 서비스(콜라·보온 포장·프리미엄 치즈·쿠폰)가 늘었는지 메뉴·운영 수단 탭을 보세요.'],
  waste: ['버린 재료가 늘었어요', '재고 탭에서 미리 사 두는 날 수를 줄여 보세요.'],
  labor: ['인건비가 늘었어요', '알바 근무 시간이 손님 많은 시간과 맞는지 직원 탭에서 보세요.'],
  rentUtil: ['월세·공과금이 늘었어요', '영업시간을 늘렸다면 늘어난 시간에 손님이 충분한지 보세요.'],
  ads: ['광고비가 늘었어요', '광고를 켠 뒤 배달 주문이 광고비보다 많이 늘었는지 보세요.'],
  investment: ['투자를 했어요', '투자는 앞으로 돌아올 돈이에요. 몇 달 안에 회수되는지 지켜보세요.'],
  revenue: ['매출이 적어요', '하루 주문을 늘릴 방법(가격·광고·메뉴)을 찾아보세요.'],
  food: ['재료비 비중이 커요', '원가율이 높은 메뉴의 가격을 보세요.'],
  fees: ['수수료·배달비가 커요', '배달팁을 손님이 더 내게 하거나 홀 손님을 늘려 보세요.'],
  service: ['서비스 비용이 커요', '켜 둔 서비스가 평점·주문으로 돌아오는지 보세요.'],
  lost: ['일손·재료가 모자라 놓친 주문이 많아요', '바쁜 시간에 알바를 더 두거나 오븐을 늘리고, 재고 탭에서 발주를 넉넉히 잡아 보세요.'],
  breakeven: ['하루 주문이 손익분기점보다 적어요', '고정비(알바 시간·영업시간)를 줄이거나 주문 하나에 남는 돈을 늘려야 해요.'],
};

function pickCause(parts: ReportPart[], lostValue: number, kpi: Kpi, mode: MonthReport['mode'], burnout: boolean): [string, string] {
  if (mode === 'structure') {
    if (kpi.breakevenPerDay !== null && kpi.actualPerDay < kpi.breakevenPerDay) return HINT.breakeven;
    if (lostValue > 0) return HINT.lost;
    return ['첫 달 장사를 마쳤어요', '다음 달부터는 지난달과 견줘서 무엇이 달라졌는지 쪼개 보여 드려요.'];
  }
  const worst = parts.filter((p) => p.amount < 0).sort((a, b) => a.amount - b.amount)[0];
  if (lostValue > 0 && (!worst || lostValue > -worst.amount)) return HINT.lost;
  if (!worst) {
    const best = [...parts].sort((a, b) => b.amount - a.amount)[0];
    return [best ? `가장 크게 도운 건 「${best.label}」이에요` : '지난달과 거의 같아요', '잘된 이유를 다음 달에도 이어 가 보세요.'];
  }
  if (worst.key === 'volume' && burnout) return HINT.burnout;
  return HINT[worst.key];
}

export interface ReportInput {
  monthIndex: number;
  number: number;
  months: MonthRecord[];
  days: DayRecord[];
  news: NewsItem[];
  messages: Message[];
  decisions: Decision[];
}

export function buildMonthReport(x: ReportInput): MonthReport {
  const cur = x.months.find((m) => m.monthIndex === x.monthIndex)!;
  const prev = x.months.find((m) => m.monthIndex === x.monthIndex - 1) ?? null;
  const curDays = x.days.filter((d) => d.monthIndex === x.monthIndex);
  const prevDays = x.days.filter((d) => d.monthIndex === x.monthIndex - 1);
  const mode: MonthReport['mode'] = prev && orders(prev) > 0 ? 'change' : 'structure';
  const kpi = kpiOf(cur, curDays);
  const parts = mode === 'change' ? changeParts(cur, prev!, curDays, prevDays) : structureParts(cur);
  const lostStaff = cur.lostOrders; const lostStock = cur.stockoutOrders;
  const lostValue = Math.round((lostStaff + lostStock) * Math.max(0, kpi.contribution));
  const from = x.monthIndex * DAYS_PER_MONTH;
  const to = from + DAYS_PER_MONTH - 1;
  const inMonth = (d: number) => d >= from && d <= to;
  const burnout = x.news.some((n) => inMonth(n.day) && n.headline.startsWith('[사장님] 과로'));
  const [cause, hint] = pickCause(parts, lostValue, kpi, mode, burnout);
  const events = x.news
    .filter((n) => inMonth(n.day) && (n.kind === 'fire' || (n.important && n.kind === 'announce')) && !n.headline.startsWith('「'))
    .map((n) => ({ day: n.day, text: n.headline.replace(/^\[[^\]]+\]\s*/, ''), tone: n.tone }));
  const openOrders = (d: DayRecord) => orders(d);
  const avg = (ds: DayRecord[]) => {
    const open = ds.filter((d) => openOrders(d) > 0);
    return open.length > 0 ? open.reduce((a, d) => a + openOrders(d), 0) / open.length : null;
  };
  const decisions = x.decisions.filter((d) => inMonth(d.day)).map((d) => {
    const before = avg(x.days.filter((r) => r.day < d.day && r.day >= d.day - 7));
    const afterDays = x.days.filter((r) => r.day > d.day && r.day <= d.day + 7 && r.day <= to);
    return { ...d, before: before === null ? null : Math.round(before), after: afterDays.length >= 3 ? Math.round(avg(afterDays) ?? 0) : null };
  });
  const reviews = x.messages.filter((m) => m.from === 'review' && m.stars !== undefined && inMonth(m.day));
  const counts = new Map<Topic, number>();
  for (const m of reviews) if (m.topic && BAD_TOPICS.includes(m.topic)) counts.set(m.topic, (counts.get(m.topic) ?? 0) + 1);
  const top = [...counts].sort((a, b) => b[1] - a[1]).find(([, n]) => n >= 2);

  return {
    monthIndex: x.monthIndex,
    label: monthLabel(x.monthIndex),
    number: x.number,
    profit: Math.round(profitOf(cur)),
    prevProfit: prev ? Math.round(profitOf(prev)) : null,
    mode,
    parts,
    kpi,
    prevKpi: prev ? kpiOf(prev, prevDays) : null,
    lost: { staff: lostStaff, stock: lostStock, value: lostValue },
    events,
    decisions,
    voices: {
      count: reviews.length,
      avg: reviews.length > 0 ? reviews.reduce((a, m) => a + m.stars!, 0) / reviews.length : null,
      top: top ? `「${TOPIC_LABEL[top[0]]}」 ${top[1]}개` : null,
    },
    cause,
    hint,
  };
}
