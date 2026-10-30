// 이름 있는 단골의 기억: 기분(좋은 리뷰 +1, 나쁜 리뷰 −1), 사장님의 마지막 답장, 발길을 끊은 날.
// 메시지 문구 전용 난수만 쓰고 돈·평점·손님 수는 건드리지 않는다.
import { REGULARS, REGULAR_TEXT, type RegularDef } from '../content/regulars';
import type { Rng } from './rng';
import { OWNER_NAME, pushMessage, type ReplyId } from './messages';
import type { GameState } from './types';

export interface RegularMemory {
  mood: number;
  lastReply?: ReplyId;
  /** 발길을 끊은 날 */
  goneDay?: number;
  /** 사장님이 알아챘나 */
  noticed?: boolean;
}

/** 리뷰 하나가 단골 몫일 확률 */
export const REGULAR_SHARE = 0.35;
/** 기분이 여기까지 떨어지면 발길을 끊는다 */
export const LEAVE_MOOD = -3;
/** 끊은 지 이만큼 지나면 다시 와 볼 수 있다 */
export const COMEBACK_DAYS = 28;
/** 끊은 지 며칠 뒤 사장님이 알아채나 */
export const NOTICE_DAYS = 5;

const memOf = (s: GameState, id: string): RegularMemory => s.messages.regulars?.[id] ?? { mood: 0 };

function setMem(s: GameState, id: string, m: RegularMemory) {
  s.messages = { ...s.messages, regulars: { ...(s.messages.regulars ?? {}), [id]: m } };
}

/** 이 리뷰를 쓸 단골(없으면 지나가는 손님) */
export function pickRegular(s: GameState, ch: 'delivery' | 'hall', rng: Rng): RegularDef | null {
  if (!rng.chance(REGULAR_SHARE)) return null;
  const day = s.clock.day;
  const pool = REGULARS[s.neighborhoodId].filter((r) => {
    if (r.ch !== ch) return false;
    const m = memOf(s, r.id);
    return m.goneDay === undefined || day - m.goneDay >= COMEBACK_DAYS;
  });
  return pool.length > 0 ? rng.pick(pool) : null;
}

/** 단골 리뷰 문구: 지난 답장·돌아온 사정을 기억하고, 끝에 말버릇을 붙인다. 기분도 바꾼다. */
export function regularReview(s: GameState, r: RegularDef, stars: number, base: string, rng: Rng): string {
  const m = memOf(s, r.id);
  let text = `${base} ${r.tail}`;
  if (m.goneDay !== undefined) text = `${rng.pick(REGULAR_TEXT.back)} ${base}`;
  else if (stars >= 4 && m.lastReply === 'apology') text = `${rng.pick(REGULAR_TEXT.thanks)} ${r.tail}`;
  else if (stars >= 4 && m.lastReply === 'coupon') text = `${rng.pick(REGULAR_TEXT.thanksCoupon)} ${r.tail}`;
  else if (stars <= 2 && m.lastReply === 'rebut') text = rng.pick(REGULAR_TEXT.grudge);
  const mood = (m.goneDay !== undefined ? 0 : m.mood) + (stars >= 4 ? 1 : stars <= 2 ? -1 : 0);
  const next: RegularMemory = { mood, lastReply: stars >= 4 ? undefined : m.lastReply };
  if (mood <= LEAVE_MOOD) next.goneDay = s.clock.day;
  setMem(s, r.id, next);
  return text;
}

/** 답장을 단골이 기억한다 */
export function rememberReply(s: GameState, regularId: string, reply: ReplyId) {
  setMem(s, regularId, { ...memOf(s, regularId), lastReply: reply });
}

/** 마감 때: 발길을 끊은 단골을 며칠 뒤 사장님이 알아챈다 */
export function regularsEvening(s: GameState) {
  for (const r of REGULARS[s.neighborhoodId]) {
    const m = memOf(s, r.id);
    if (m.goneDay === undefined || m.noticed || s.clock.day - m.goneDay < NOTICE_DAYS) continue;
    setMem(s, r.id, { ...m, noticed: true });
    pushMessage(s, { from: 'owner', name: OWNER_NAME, tone: 'bad', important: true, text: `요즘 「${r.name}」님이 안 보이네… 마지막엔 별로였다는 리뷰였는데.` });
  }
}
