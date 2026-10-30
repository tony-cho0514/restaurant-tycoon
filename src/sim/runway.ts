// 한 주 고정비와 「통장으로 몇 주 버티나」: 손님이 하나도 없어도 나가는 돈 기준(재료비·수수료 같은 변동비는 뺀다).
import { APP_ADS_WEEKLY, UTILITIES_PER_HOUR } from './balance';
import { dailyLabor } from './labor';
import { NEIGHBORHOODS } from './neighborhoods';
import { shiftHours } from './staffing';
import { DAYS_PER_MONTH } from './time';
import type { GameState } from './types';

export interface FixedWeek { rent: number; labor: number; utilities: number; ads: number; total: number }

export function weeklyFixed(s: GameState): FixedWeek {
  const st = s.settings;
  const hours = st.closeHour - st.openHour;
  const openDays = 7 - (st.closedDay === null ? 0 : 1);
  const laborPerDay = s.staff.reduce((a, x) => {
    const h = shiftHours(s, x.shift);
    return a + dailyLabor(h, x.wage, h * openDays);
  }, 0);
  const rent = Math.round((NEIGHBORHOODS[s.neighborhoodId].listing.monthlyRent * 7) / DAYS_PER_MONTH);
  const labor = Math.round(laborPerDay * openDays);
  const utilities = Math.round(UTILITIES_PER_HOUR * hours * openDays);
  const ads = s.levers.appAds ? APP_ADS_WEEKLY : 0;
  return { rent, labor, utilities, ads, total: rent + labor + utilities + ads };
}

/** 지금 통장 돈으로 고정비를 몇 주 낼 수 있나(마이너스면 0) */
export function runwayWeeks(s: GameState): number {
  const f = weeklyFixed(s).total;
  return f > 0 ? Math.max(0, s.cash) / f : Infinity;
}
