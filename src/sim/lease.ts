// 임대차: 해마다 개업한 날 재계약하고 월세가 5% 오른다(상가건물 임대차보호법이 정한 한 번 증액 상한).
// 반년 전에 건물주가 미리 알려 준다. 피할 수는 없고, 준비하는 게 숙제다.
import { unlockCard } from './learning';
import { pushMessage, OWNER_NAME } from './messages';
import { NEIGHBORHOODS } from './neighborhoods';
import { reportMoney as money } from './report';
import { DAYS_PER_MONTH, calendar } from './time';
import type { GameState } from './types';

export const LEASE_DAYS = 12 * DAYS_PER_MONTH;
export const RENT_RAISE = 0.05;
export const LEASE_NOTICE_DAYS = 6 * DAYS_PER_MONTH;

/** 그날의 월세: 재계약할 때마다 5%씩 */
export function rentOn(s: GameState, day: number): number {
  return Math.round(NEIGHBORHOODS[s.neighborhoodId].listing.monthlyRent * (1 + RENT_RAISE) ** Math.floor(Math.max(0, day) / LEASE_DAYS));
}

export function currentRent(s: GameState): number {
  return rentOn(s, s.clock.day);
}

/** 개점 때: 재계약 반년 전 예고, 재계약 날 인상 */
export function leaseMorning(s: GameState): void {
  const day = s.clock.day;
  if (day <= 0) return;
  const toRenew = LEASE_DAYS - (day % LEASE_DAYS);
  if (toRenew === LEASE_NOTICE_DAYS) {
    const renew = day + toRenew;
    pushMessage(s, {
      from: 'landlord', name: '건물주', tone: 'bad', important: true, action: 'shop', key: `lease-notice-${renew}`,
      text: `사장님, ${calendar({ day: renew, hour: 0 }).month}월 재계약 때 월세를 5% 올리려고요. ${money(rentOn(s, day))} → ${money(rentOn(s, renew))}이에요. 법으로 정해진 상한이 5%라 그 이상은 안 올려요 🙏`,
    });
  }
  if (day % LEASE_DAYS === 0) {
    const before = rentOn(s, day - 1);
    const after = rentOn(s, day);
    pushMessage(s, { from: 'owner', name: OWNER_NAME, tone: 'bad', text: `재계약 끝. 월세가 ${money(after)}으로 올랐다. 이제 매달 ${money(after - before)}을 더 벌어야 한다…` });
    const contribution = s.learning.reports.at(-1)?.kpi.contribution ?? 0;
    const more = contribution > 0 ? ` 주문 하나에 ${money(contribution)}이 남으니, 한 달에 주문 ${Math.ceil((after - before) / contribution)}건을 더 팔아야 메워져요.` : '';
    unlockCard(s, 'lease', `월세가 ${money(before)} → ${money(after)}으로 올랐어요.${more}`);
  }
}
