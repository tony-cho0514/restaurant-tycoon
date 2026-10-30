// 장부. 이익은 「쓴 만큼」의 비용으로 계산하고, 재료를 미리 사는 현금 지출(purchases)은 이익에 넣지 않는다.
import type { IngredientId } from './ingredients';
import type { Usage } from './inventory';

export interface DayRecord {
  day: number;
  monthIndex: number;
  hallOrders: number;
  deliveryOrders: number;
  /** 단체 주문 건수 */
  groupOrders: number;
  lostOrders: number;
  stockoutOrders: number;
  revenueHall: number;
  revenueDelivery: number;
  foodCost: number;
  serviceCost: number;
  wasteCost: number;
  labor: number;
  rent: number;
  appFees: number;
  cardFees: number;
  deliveryFees: number;
  utilities: number;
  ads: number;
  /** 투자: 메뉴 개발·가게 업그레이드 */
  investment: number;
  purchases: number;
  /** 사장님 개인 지출(휴가 등): 통장에서 나가지만 가게 이익엔 안 잡힘 */
  ownerDraw: number;
  usage: Usage;
  /** 그날 개점 시세(7일 전 대비 표시용) */
  prices: Partial<Record<IngredientId, number>>;
}

export type MonthRecord = Omit<DayRecord, 'day' | 'usage' | 'prices'>;

export interface Ledger {
  days: DayRecord[];
  months: MonthRecord[];
}

export const DAYS_KEEP = 112;

export const NUMERIC_KEYS = [
  'hallOrders', 'deliveryOrders', 'groupOrders', 'lostOrders', 'stockoutOrders', 'revenueHall', 'revenueDelivery', 'foodCost',
  'serviceCost', 'wasteCost', 'labor', 'rent', 'appFees', 'cardFees', 'deliveryFees', 'utilities', 'ads', 'investment', 'purchases', 'ownerDraw',
] as const;

export function emptyDay(day: number, monthIndex: number): DayRecord {
  return {
    day, monthIndex,
    hallOrders: 0, deliveryOrders: 0, groupOrders: 0, lostOrders: 0, stockoutOrders: 0,
    revenueHall: 0, revenueDelivery: 0,
    foodCost: 0, serviceCost: 0, wasteCost: 0, labor: 0, rent: 0, appFees: 0, cardFees: 0, deliveryFees: 0, utilities: 0, ads: 0, investment: 0,
    purchases: 0,
    ownerDraw: 0,
    usage: {},
    prices: {},
  };
}

export function closeDay(l: Ledger, rec: DayRecord): Ledger {
  return { ...l, days: [...l.days, rec].slice(-DAYS_KEEP) };
}

export function closeMonth(l: Ledger, monthIndex: number): Ledger {
  const { day: _d, usage: _u, prices: _p, ...month } = emptyDay(0, monthIndex);
  for (const d of l.days) {
    if (d.monthIndex !== monthIndex) continue;
    for (const k of NUMERIC_KEYS) month[k] += Number.isFinite(d[k]) ? d[k] : 0;
  }
  return { ...l, months: [...l.months, month] };
}

export function profitOf(r: DayRecord | MonthRecord): number {
  return (
    r.revenueHall + r.revenueDelivery -
    r.foodCost - r.serviceCost - r.wasteCost - r.labor - r.rent - r.appFees - (r.cardFees ?? 0) - r.deliveryFees - r.utilities - r.ads - (r.investment ?? 0)
  );
}

/** 옛 저장에 없던 숫자 필드나 NaN이 된 값을 0으로 채운다(장부가 「NaN원」이 되지 않게). */
export function normalizeRecord<T extends Record<string, unknown>>(r: T): T {
  const out: Record<string, unknown> = { ...r };
  for (const k of NUMERIC_KEYS) if (typeof out[k] !== 'number' || !Number.isFinite(out[k] as number)) out[k] = 0;
  return out as T;
}
