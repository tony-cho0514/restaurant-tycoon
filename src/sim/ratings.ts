import { LEVER_SAT_BONUS, SATISFACTION_BASE } from './balance';
import type { Levers } from './levers';
import type { Rng } from './rng';

export interface Ratings {
  hall: number;
  delivery: number;
}

export type Channel = 'hall' | 'delivery';

export function satisfaction(
  ch: Channel,
  /** gaveCola: 서비스 콜라를 실제로 넣었는지(재고가 없으면 못 넣음). 생략하면 수단이 켜진 대로 본다. */
  ctx: { wait: number; priceIndex: number; priceSensitivity: number; levers: Levers; gaveCola?: boolean; hallBonus?: number },
  rng: Rng,
): number {
  let s = SATISFACTION_BASE;
  if (ctx.levers.premiumCheese) s += LEVER_SAT_BONUS.premiumCheese;
  if (ch === 'delivery') {
    if (ctx.gaveCola ?? ctx.levers.freeCola) s += LEVER_SAT_BONUS.freeCola;
    if (ctx.levers.insulatedBox) s += LEVER_SAT_BONUS.insulatedBox;
    s -= Math.max(0, (ctx.wait - 35) / 20);
  } else {
    s -= Math.max(0, (ctx.wait - 15) / 10);
    s += ctx.hallBonus ?? 0;
  }
  s -= Math.max(0, ctx.priceIndex - 1) * 2 * ctx.priceSensitivity;
  s += rng.normal(0, 0.3);
  return Math.min(5, Math.max(1, s));
}

export function updateRating(r: Ratings, ch: Channel, sat: number, levers: Levers): Ratings {
  let alpha = ch === 'hall' ? 0.02 : 0.03;
  // 리뷰 답글은 나쁜 리뷰가 평점에 주는 충격을 줄인다.
  if (levers.reviewReplies && sat < r[ch]) alpha *= 0.7;
  return { ...r, [ch]: r[ch] + alpha * (sat - r[ch]) };
}
