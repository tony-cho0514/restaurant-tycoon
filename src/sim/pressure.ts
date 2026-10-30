// 숨 돌릴 틈(압력 예산): 악재가 몰아치지 않게. 몰아붙이고, 쉬게 하고, 다시 몰아붙인다(RimWorld 스토리텔러).
// - 첫 달엔 큰 악재 하나까지
// - 악재가 진행 중이거나 끝난 지 7일이 안 됐으면 새 악재를 들이지 않는다
// - 지난달이 적자면 새 악재가 반으로 준다
// 좋은 소식(축제·풍년·환율 하락)과 경기 순환은 상관없다.
import { profitOf } from './ledger';
import { isBadShock, shockDays } from './news';
import { DAYS_PER_MONTH } from './time';
import type { GameState } from './types';

export const CALM_DAYS = 7;
export const FIRST_MONTH_BAD_MAX = 1;
export const AFTER_LOSS_ROOM = 0.5;
/** 오래가는 위기(치즈 파동 6주)도 처음 2주만 「한창」으로 센다. 그 뒤는 배경이라 다른 일이 겹쳐도 된다. */
export const ACUTE_DAYS = 14;
const acute = (t: Parameters<typeof shockDays>[0]) => Math.min(shockDays(t), ACUTE_DAYS);

/** 지금까지 예약됐거나 지나간 악재들의 [시작, 끝] */
function badWindows(s: GameState): { start: number; end: number }[] {
  const out: { start: number; end: number }[] = [];
  for (const p of s.news.pending) if (isBadShock(p.type)) out.push({ start: p.signalDay, end: p.fireDay + acute(p.type) });
  for (const n of s.news.items) {
    if (n.kind === 'fire' && n.shockType && isBadShock(n.shockType)) out.push({ start: n.day, end: n.day + acute(n.shockType) });
  }
  for (const e of s.local.events) out.push({ start: e.signalDay, end: e.endDay });
  return out;
}

/** 새 악재가 들어설 여지: 0이면 안 됨, 1이면 평소대로 */
export function badEventRoom(s: GameState, day: number): number {
  const w = badWindows(s);
  if (day < DAYS_PER_MONTH && w.length >= FIRST_MONTH_BAD_MAX) return 0;
  if (w.some((x) => x.end + CALM_DAYS > day)) return 0;
  const last = s.ledger.months.at(-1);
  return last && profitOf(last) < 0 ? AFTER_LOSS_ROOM : 1;
}
