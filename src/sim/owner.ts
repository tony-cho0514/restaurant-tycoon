// 사장님: 스트레스(0~100), 쉬는 날, 일찍 퇴근·하루 쉬기·휴가, 지침·번아웃.
import {
  BURNOUT_DAYS, MOOD_SAT_GOOD, MOOD_SAT_TIRED, STRESS_BURNOUT, STRESS_EVENT, STRESS_GOOD, STRESS_LONG_DAY_HOURS, STRESS_LONG_HOUR,
  STRESS_LOST_MAX_PER_HOUR, STRESS_PER_LOST_ORDER, STRESS_PER_WORK_HOUR, STRESS_REST_DAY, STRESS_REST_HOUR, STRESS_SLEEP,
  STRESS_SOLO_HOUR, STRESS_START, STRESS_STREAK_FREE_DAYS, STRESS_STREAK_MAX, STRESS_STREAK_PER_DAY, STRESS_TIRED, STRESS_WARN_RESET,
  VACATION_COST, VACATION_DAYS,
} from './balance';
import { pushNews } from './news';
import type { Ratings } from './ratings';
import type { GameState } from './types';

export { STRESS_BURNOUT, STRESS_GOOD, STRESS_TIRED, VACATION_COST, VACATION_DAYS };

export type AwayReason = 'dayOff' | 'vacation' | 'burnout';

export interface OwnerState {
  stress: number;
  /** 쉬는 날 없이 일한 날 수 */
  daysWithoutRest: number;
  /** 사장님이 가게에 안 나오는 날(양 끝 포함) */
  awayFrom: number;
  awayUntil: number;
  awayReason: AwayReason | null;
  /** 이 날 이 시각부터 퇴근 */
  leftEarly: { day: number; hour: number } | null;
  /** 지침 알림을 이미 했는지(충분히 내려오면 다시 알림) */
  warned: boolean;
  /** 개점 때 평점(하루 동안 오르내린 걸 보려고) */
  ratingsAtOpen: Ratings;
  /** 오늘 스트레스가 오르내린 이유 */
  log: { reason: string; delta: number }[];
}

export const AWAY_LABEL: Record<AwayReason, string> = { dayOff: '하루 쉼', vacation: '휴가', burnout: '번아웃으로 쉼' };

export function initialOwner(ratings: Ratings): OwnerState {
  return {
    stress: STRESS_START, daysWithoutRest: 0, awayFrom: -1, awayUntil: -2, awayReason: null,
    leftEarly: null, warned: false, ratingsAtOpen: { ...ratings }, log: [],
  };
}

export function ownerAway(s: GameState, day = s.clock.day): boolean {
  return s.owner.awayFrom <= day && day <= s.owner.awayUntil;
}

export function ownerWorking(s: GameState, hour: number): boolean {
  if (ownerAway(s)) return false;
  const l = s.owner.leftEarly;
  return !(l && l.day === s.clock.day && hour >= l.hour);
}

/** 사장님이 시간당 만드는 피자: 쉬면 0, 지쳤으면 한 판 덜 */
export function ownerPizzas(s: GameState, hour: number, base: number): number {
  if (!ownerWorking(s, hour)) return 0;
  return s.owner.stress >= STRESS_TIRED ? base - 1 : base;
}

/** 사장님 컨디션이 홀 만족도에 주는 보정 */
export function moodBonus(s: GameState, hour: number): number {
  if (!ownerWorking(s, hour)) return 0;
  if (s.owner.stress >= STRESS_TIRED) return MOOD_SAT_TIRED;
  if (s.owner.stress < STRESS_GOOD) return MOOD_SAT_GOOD;
  return 0;
}

/** 스트레스를 바꾸고 오늘 이유에 쌓는다(같은 이유는 합친다). */
export function addStress(s: GameState, reason: string, delta: number): void {
  if (delta === 0) return;
  const stress = Math.min(100, Math.max(0, s.owner.stress + delta));
  const log = s.owner.log.map((x) => ({ ...x }));
  const hit = log.find((x) => x.reason === reason);
  if (hit) hit.delta += delta;
  else log.push({ reason, delta });
  s.owner = { ...s.owner, stress, log };
}

// ── 플레이어가 고르는 휴식 ─────────────────────────────

/** 오늘 남은 영업을 알바에게 맡기고 퇴근. 알바가 없는 시간엔 문을 닫는다. */
export function leaveEarly(s: GameState): GameState {
  if (ownerAway(s)) throw new Error('오늘은 이미 쉬는 날이에요');
  const hour = Math.max(s.clock.hour, s.settings.openHour);
  if (hour >= s.settings.closeHour) throw new Error('벌써 문 닫을 시간이에요');
  if (!ownerWorking(s, hour)) throw new Error('이미 퇴근했어요');
  return { ...s, owner: { ...s.owner, leftEarly: { day: s.clock.day, hour } } };
}

function scheduleAway(s: GameState, days: number, reason: AwayReason): GameState {
  const from = s.clock.day + 1;
  if (s.owner.awayUntil >= from) throw new Error('이미 쉬기로 한 날이 있어요');
  return { ...s, owner: { ...s.owner, awayFrom: from, awayUntil: from + days - 1, awayReason: reason } };
}

/** 내일 하루 가게를 알바에게 맡긴다. */
export function takeDayOff(s: GameState): GameState {
  return scheduleAway(s, 1, 'dayOff');
}

/** 내일부터 사흘 휴가. 사장님 개인 돈이 나가고(장부 이익엔 안 잡힘), 그동안 가게는 알바가 본다. */
export function takeVacation(s: GameState): GameState {
  if (s.cash < VACATION_COST) throw new Error('휴가 갈 돈이 모자라요');
  const next = scheduleAway(s, VACATION_DAYS, 'vacation');
  return { ...next, cash: next.cash - VACATION_COST, today: { ...next.today, ownerDraw: next.today.ownerDraw + VACATION_COST } };
}

// ── 시뮬레이션 안에서 부르는 것 ───────────────────────

/** 개점 때: 오늘 이유 비우기, 평점 기록, 끝난 휴식 정리 */
export function ownerMorning(s: GameState): void {
  const done = s.owner.awayUntil < s.clock.day;
  s.owner = { ...s.owner, log: [], ratingsAtOpen: { ...s.ratings }, awayReason: done ? null : s.owner.awayReason };
}

/** 한 영업시간마다: 일했으면 오르고, 퇴근해 쉬었으면 내린다. */
export function ownerHour(s: GameState, hour: number, staffOnDuty: number, lost: number): void {
  if (ownerAway(s)) return;
  if (ownerWorking(s, hour)) {
    addStress(s, '가게 일', STRESS_PER_WORK_HOUR);
    if (staffOnDuty === 0) addStress(s, '혼자 가게 보기', STRESS_SOLO_HOUR);
    if (lost > 0) addStress(s, '주문이 밀림', Math.min(STRESS_LOST_MAX_PER_HOUR, lost * STRESS_PER_LOST_ORDER));
  } else {
    addStress(s, '일찍 퇴근해서 쉼', -STRESS_REST_HOUR);
  }
}

/** 마감 때: 쉰 날이면 크게 내리고, 일한 날이면 긴 영업·연속 출근만큼 오른다. */
export function ownerEvening(s: GameState, closed: boolean, revenueRecord: boolean): void {
  if (closed || ownerAway(s)) {
    addStress(s, closed ? '정기 휴무' : AWAY_LABEL[s.owner.awayReason ?? 'dayOff'], -STRESS_REST_DAY);
    s.owner = { ...s.owner, daysWithoutRest: 0 };
    return;
  }
  const worked = ownerHoursToday(s);
  if (worked === 0) {
    s.owner = { ...s.owner, daysWithoutRest: 0 };
    return;
  }
  const streak = s.owner.daysWithoutRest + 1;
  s.owner = { ...s.owner, daysWithoutRest: streak };
  addStress(s, '퇴근 후 잠', -STRESS_SLEEP);
  if (worked > STRESS_LONG_DAY_HOURS) addStress(s, '긴 영업시간', (worked - STRESS_LONG_DAY_HOURS) * STRESS_LONG_HOUR);
  if (streak > STRESS_STREAK_FREE_DAYS) addStress(s, '쉬는 날 없이 계속 출근', Math.min(STRESS_STREAK_MAX, (streak - STRESS_STREAK_FREE_DAYS) * STRESS_STREAK_PER_DAY));
  const open = s.owner.ratingsAtOpen;
  const change = s.ratings.hall + s.ratings.delivery - open.hall - open.delivery;
  if (change <= -0.05) addStress(s, '평점이 떨어짐', STRESS_EVENT.ratingDown);
  else if (change >= 0.05) addStress(s, '평점이 오름', STRESS_EVENT.ratingUp);
  if (revenueRecord) addStress(s, '매출 신기록', STRESS_EVENT.revenueRecord);
}

/** 오늘 사장님이 가게에 있는(있었던) 영업시간 수 */
export function ownerHoursToday(s: GameState): number {
  let n = 0;
  for (let h = s.settings.openHour; h < s.settings.closeHour; h++) if (ownerWorking(s, h)) n++;
  return n;
}

/** 틱 끝: 지침, 번아웃. 번아웃이면 이번 시간 뒤로 퇴근하고 내일부터 며칠 쉰다. 지침 선을 막 넘으면 'tired'를 돌려준다. */
export function ownerCheck(s: GameState, dayOver: boolean): 'tired' | null {
  const o = s.owner;
  const day = s.clock.day;
  if (o.stress >= STRESS_BURNOUT && !ownerAway(s) && o.awayUntil < day + 1) {
    s.owner = {
      ...o, warned: true, awayFrom: day + 1, awayUntil: day + BURNOUT_DAYS, awayReason: 'burnout',
      leftEarly: dayOver ? o.leftEarly : { day, hour: s.clock.hour + 1 },
    };
    s.news = pushNews(s.news, {
      day, kind: 'announce', important: true, tone: 'bad',
      headline: '[사장님] 과로로 쓰러졌어요',
      body: `내일부터 ${BURNOUT_DAYS}일은 억지로 쉬어야 해요. 그동안 알바가 없는 시간엔 가게 문을 닫아요. 쉬는 날을 정하거나 알바에게 맡기세요.`,
    });
    return null;
  }
  if (o.stress >= STRESS_TIRED && !o.warned) {
    s.owner = { ...o, warned: true };
    return 'tired';
  }
  if (o.stress < STRESS_WARN_RESET && o.warned) s.owner = { ...o, warned: false };
  return null;
}

/** 화면용 표정 */
export function stressFace(stress: number): string {
  if (stress < 20) return '😊';
  if (stress < 45) return '🙂';
  if (stress < STRESS_TIRED) return '😐';
  if (stress < STRESS_BURNOUT) return '😣';
  return '🤯';
}
