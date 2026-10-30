// 몰아 돌리기: 쌓인 충전을 지금 설정 그대로 한 번에 돌리고 한 장으로 요약한다.
// 큰일(위기·단체 주문·월말·폐업 위기)이 생기면 거기서 멈춘다. 결정이 곧 배움이라 기본은 여전히 직접 돌리기다.
import { CARD_IDS, type CardId } from '../content/dexCards';
import { accrueCharge, canPlay, consumeTick } from './charge';
import { profitOf } from './ledger';
import { localEventsIn } from './localEvents';
import { advanceTickInPlace, tickCost, type PauseReason } from './tick';
import type { GameState } from './types';

/** 몰아 돌리기를 권할 만큼 쌓인 충전(이틀치) */
export const CATCH_UP_MIN_TICKS = 22;

export interface CatchUpSummary {
  fromDay: number;
  toDay: number;
  /** 마감까지 마친 날 수 */
  days: number;
  revenue: number;
  profit: number;
  orders: number;
  cashBefore: number;
  cashAfter: number;
  ratingBefore: { hall: number; delivery: number };
  ratingAfter: { hall: number; delivery: number };
  newMessages: number;
  cards: CardId[];
  events: string[];
  /** 멈춘 까닭(충전을 다 쓰면 없음) */
  stoppedBy?: PauseReason['kind'];
}

export function catchUp(s0: GameState, nowMs: number, onTick?: (s: GameState) => void): { state: GameState; pauses: PauseReason[]; summary: CatchUpSummary } {
  const s = structuredClone(s0);
  let pauses: PauseReason[] = [];
  for (;;) {
    const charge = accrueCharge(s.charge, nowMs);
    const cost = tickCost(s);
    if (s.closed || !canPlay(charge, cost)) { s.charge = charge; break; }
    s.charge = consumeTick(charge, cost);
    const r = advanceTickInPlace(s);
    onTick?.(s);
    if (r.pauses.length > 0) { pauses = r.pauses; break; }
  }
  const days = s.ledger.days.filter((d) => d.day >= s0.clock.day && d.day < s.clock.day);
  const firstNew = s0.messages.items.at(-1)?.id ?? 0;
  const news = s.news.items.filter((n) => n.kind === 'fire' && n.day >= s0.clock.day).map((n) => n.headline.replace(/^\[[^\]]+\]\s*/, ''));
  const local = localEventsIn(s, s0.clock.day, s.clock.day).filter((e) => e.day >= s0.clock.day).map((e) => e.text);
  return {
    state: s,
    pauses,
    summary: {
      fromDay: s0.clock.day,
      toDay: s.clock.day,
      days: days.length,
      revenue: Math.round(days.reduce((a, d) => a + d.revenueHall + d.revenueDelivery, 0)),
      profit: Math.round(days.reduce((a, d) => a + profitOf(d), 0)),
      orders: days.reduce((a, d) => a + d.hallOrders + d.deliveryOrders + d.groupOrders, 0),
      cashBefore: s0.cash,
      cashAfter: s.cash,
      ratingBefore: s0.ratings,
      ratingAfter: s.ratings,
      newMessages: s.messages.items.filter((m) => m.id > firstNew).length,
      cards: CARD_IDS.filter((id) => s.learning.dex[id] && !s0.learning.dex[id]),
      events: [...news, ...local],
      stoppedBy: pauses[0]?.kind,
    },
  };
}
