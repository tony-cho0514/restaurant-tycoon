import type { Levers } from './levers';
import type { Rng } from './rng';

export interface Ratings {
  hall: number;
  delivery: number;
}

export type Channel = 'hall' | 'delivery';

export function satisfaction(
  ch: Channel,
  ctx: { wait: number; priceIndex: number; priceSensitivity: number; levers: Levers },
  rng: Rng,
): number {
  let s = 3.8;
  if (ctx.levers.premiumCheese) s += 0.4;
  if (ch === 'delivery') {
    if (ctx.levers.freeCola) s += 0.3;
    if (ctx.levers.insulatedBox) s += 0.2;
    s -= Math.max(0, (ctx.wait - 35) / 20);
  } else {
    s -= Math.max(0, (ctx.wait - 15) / 10);
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
