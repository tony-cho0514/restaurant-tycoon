// 게임 시계. 한 틱 = 영업 1시간(11시~21시), 한 달 = 28일, 게임은 3월에 시작한다.
export const OPEN_HOUR = 11;
export const CLOSE_HOUR = 22;
export const TICKS_PER_DAY = CLOSE_HOUR - OPEN_HOUR;
export const DAYS_PER_WEEK = 7;
export const DAYS_PER_MONTH = 28;
export const START_MONTH = 3;

export interface Clock {
  day: number;
  hour: number;
}

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export const DAY_NAMES = ['월', '화', '수', '목', '금', '토', '일'];

export function seasonOf(month: number): Season {
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

export function calendar(c: Clock) {
  const monthIndex = Math.floor(c.day / DAYS_PER_MONTH);
  const monthsFromJan = START_MONTH - 1 + monthIndex;
  const month = (monthsFromJan % 12) + 1;
  const year = 1 + Math.floor(monthsFromJan / 12);
  const dayOfMonth = c.day % DAYS_PER_MONTH;
  const dayOfWeek = c.day % DAYS_PER_WEEK;
  return {
    year,
    month,
    monthIndex,
    week: Math.floor(dayOfMonth / DAYS_PER_WEEK) + 1,
    dayOfWeek,
    dayOfMonth,
    season: seasonOf(month),
    isWeekend: dayOfWeek >= 5,
  };
}

/** 다음 영업 시각. 닫는 시각에 닿으면 다음 날 여는 시각으로 넘어간다. */
export function nextTick(c: Clock, hours: { openHour: number; closeHour: number } = { openHour: OPEN_HOUR, closeHour: CLOSE_HOUR }): Clock {
  if (c.hour + 1 >= hours.closeHour) return { day: c.day + 1, hour: hours.openHour };
  return { day: c.day, hour: c.hour + 1 };
}

export function formatClock(c: Clock): string {
  const cal = calendar(c);
  return `${cal.year}년차 ${cal.month}월 ${cal.week}주 ${DAY_NAMES[cal.dayOfWeek]}요일 ${c.hour}시`;
}
