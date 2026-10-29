import { OVEN_CAP_PER_HOUR, PIZZAS_PER_STAFF_HOUR, STAFF_COUNT } from './balance';
import type { Levers } from './levers';

export function capacityPerHour(levers: Levers): number {
  // 리뷰 답글을 달면 사장님 손이 묶여 시간당 1판을 덜 만든다.
  return Math.min(STAFF_COUNT * PIZZAS_PER_STAFF_HOUR - (levers.reviewReplies ? 1 : 0), OVEN_CAP_PER_HOUR);
}

export function serveHour(hall: number, delivery: number, capacity: number) {
  const total = hall + delivery;
  const maxServed = Math.floor(capacity * 1.2);
  const lost = Math.max(0, total - maxServed);
  // 넘친 주문은 배달부터 잃는다(배달앱 자동 거절).
  const lostDelivery = Math.min(delivery, lost);
  const lostHall = lost - lostDelivery;
  const load = capacity > 0 ? total / capacity : Infinity;
  const k = load <= 0.8 ? 1 : 1 + 2 * (load - 0.8);
  return {
    servedHall: hall - lostHall,
    servedDelivery: delivery - lostDelivery,
    lost,
    waitHall: 15 * k,
    waitDelivery: 35 * k,
  };
}
