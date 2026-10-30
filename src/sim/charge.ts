// 시간 충전: 게임을 꺼 둔 동안 현실 하루에 게임 1주(77틱)씩 쌓이고, 들어와서 재생하며 쓴다.
import { TICKS_PER_DAY } from './time';

export const CHARGE_TICKS_PER_REAL_DAY = 7 * TICKS_PER_DAY;
export const CHARGE_CAP_TICKS = 21 * TICKS_PER_DAY;
export const NEW_GAME_CHARGE_TICKS = 7 * TICKS_PER_DAY;
const MS_PER_REAL_DAY = 86_400_000;

export interface ChargeState {
  ticks: number;
  lastAccruedAt: number;
}

export function accrueCharge(c: ChargeState, nowMs: number): ChargeState {
  // 기기 시계가 뒤로 가면 쌓지 않고 기준 시각만 당긴다.
  if (nowMs < c.lastAccruedAt) return { ticks: c.ticks, lastAccruedAt: nowMs };
  const gained = ((nowMs - c.lastAccruedAt) / MS_PER_REAL_DAY) * CHARGE_TICKS_PER_REAL_DAY;
  return { ticks: Math.min(CHARGE_CAP_TICKS, c.ticks + gained), lastAccruedAt: nowMs };
}

/** amount: 이번 틱이 쓰는 충전(표준 하루 11 기준, 영업시간이 길면 한 틱이 덜 쓴다) */
export function canPlay(c: ChargeState, amount = 1): boolean {
  return c.ticks >= amount - 1e-9;
}

export function consumeTick(c: ChargeState, amount = 1): ChargeState {
  if (!canPlay(c, amount)) throw new Error('충전된 시간이 없어요');
  return { ticks: Math.max(0, c.ticks - amount), lastAccruedAt: c.lastAccruedAt };
}

export function formatCharge(ticks: number): string {
  const whole = Math.floor(ticks);
  return `${Math.floor(whole / TICKS_PER_DAY)}일 ${whole % TICKS_PER_DAY}시간`;
}
