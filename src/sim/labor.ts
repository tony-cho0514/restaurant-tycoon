// 인건비: 시급 × 시간 + 4대보험 사업주 부담 + (주 15시간 이상이면) 주휴수당.
import { HOLIDAY_PAY_MIN_WEEKLY_HOURS, HOLIDAY_PAY_RATE, INSURANCE_RATE } from './balance';

/** 하루 인건비. 주휴수당은 주 단위 대신 일한 날마다 나눠서 잡는다(근무시간의 1/5). */
export function dailyLabor(hours: number, wage: number, weeklyHours: number): number {
  const base = hours * wage;
  const holiday = weeklyHours >= HOLIDAY_PAY_MIN_WEEKLY_HOURS ? base * HOLIDAY_PAY_RATE : 0;
  return Math.round(base * (1 + INSURANCE_RATE) + holiday);
}
