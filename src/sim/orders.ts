// 주문 기록: 한 건 한 건 남겨 매출·주문 탭에서 본다. 최근 7일만 보관한다.
import type { MenuItemId } from './menu';
import type { Neighborhood } from './neighborhoods';

export interface OrderRecord {
  day: number;
  hour: number;
  channel: 'hall' | 'delivery' | 'group';
  items: { menu: MenuItemId; qty: number }[];
  amount: number;
  zone?: string;
  /** 배달에 걸린 시간(분) */
  minutes?: number;
}

export const ORDER_KEEP_DAYS = 7;

export function pruneOrders(orders: OrderRecord[], today: number): OrderRecord[] {
  return orders.filter((o) => o.day > today - ORDER_KEEP_DAYS);
}

export function ordersOn(orders: OrderRecord[], day: number): OrderRecord[] {
  return orders.filter((o) => o.day === day);
}

export function hourlyRevenue(orders: OrderRecord[], day: number): Map<number, { count: number; amount: number }> {
  const m = new Map<number, { count: number; amount: number }>();
  for (const o of orders) {
    if (o.day !== day) continue;
    const cur = m.get(o.hour) ?? { count: 0, amount: 0 };
    cur.count += 1;
    cur.amount += o.amount;
    m.set(o.hour, cur);
  }
  return m;
}

/** 배달 구역별 주문 수·매출·평균 배달 시간(주문 많은 순) */
export function zoneStats(orders: OrderRecord[], n: Neighborhood) {
  const stats = n.zones.map((z) => ({ id: z.id, name: z.name, count: 0, amount: 0, avgMinutes: 0 }));
  for (const o of orders) {
    if (o.channel !== 'delivery' || !o.zone) continue;
    const z = stats.find((x) => x.name === o.zone);
    if (!z) continue;
    z.avgMinutes = (z.avgMinutes * z.count + (o.minutes ?? 0)) / (z.count + 1);
    z.count += 1;
    z.amount += o.amount;
  }
  return stats.sort((a, b) => b.count - a.count);
}
