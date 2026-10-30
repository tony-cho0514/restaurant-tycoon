// 장부. 이익은 「쓴 만큼」의 비용으로 계산하고, 재료를 미리 사는 현금 지출(purchases)은 이익에 넣지 않는다.
import type { IngredientId } from './ingredients';
import type { Usage } from './inventory';

export interface DayRecord {
  day: number;
  monthIndex: number;
  hallOrders: number;
  deliveryOrders: number;
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
  purchases: number;
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

const NUMERIC_KEYS = [
  'hallOrders', 'deliveryOrders', 'lostOrders', 'stockoutOrders', 'revenueHall', 'revenueDelivery', 'foodCost',
  'serviceCost', 'wasteCost', 'labor', 'rent', 'appFees', 'cardFees', 'deliveryFees', 'utilities', 'ads', 'purchases',
] as const;

export function emptyDay(day: number, monthIndex: number): DayRecord {
  return {
    day, monthIndex,
    hallOrders: 0, deliveryOrders: 0, lostOrders: 0, stockoutOrders: 0,
    revenueHall: 0, revenueDelivery: 0,
    foodCost: 0, serviceCost: 0, wasteCost: 0, labor: 0, rent: 0, appFees: 0, cardFees: 0, deliveryFees: 0, utilities: 0, ads: 0,
    purchases: 0,
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
    for (const k of NUMERIC_KEYS) month[k] += d[k];
  }
  return { ...l, months: [...l.months, month] };
}

export function profitOf(r: DayRecord | MonthRecord): number {
  return (
    r.revenueHall + r.revenueDelivery -
    r.foodCost - r.serviceCost - r.wasteCost - r.labor - r.rent - r.appFees - (r.cardFees ?? 0) - r.deliveryFees - r.utilities - r.ads
  );
}
