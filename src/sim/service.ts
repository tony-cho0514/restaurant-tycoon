import { OVERLOAD_WAIT_SLOPE } from './balance';

export function serveHour(hall: number, delivery: number, capacity: number) {
  const total = hall + delivery;
  const maxServed = Math.floor(capacity * 1.2);
  const lost = Math.max(0, total - maxServed);
  // 넘친 주문은 배달부터 잃는다(배달앱 자동 거절).
  const lostDelivery = Math.min(delivery, lost);
  const lostHall = lost - lostDelivery;
  const load = capacity > 0 ? total / capacity : Infinity;
  // 일손보다 주문이 많으면 대기 시간이 빠르게 늘어난다.
  const k = load <= 0.8 ? 1 : 1 + OVERLOAD_WAIT_SLOPE * (load - 0.8);
  return {
    servedHall: hall - lostHall,
    servedDelivery: delivery - lostDelivery,
    lost,
    waitHall: 15 * k,
    waitDelivery: 35 * k,
  };
}
