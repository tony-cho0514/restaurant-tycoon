// 임대차: 해마다 재계약 때 월세 5% 인상, 반년 전에 건물주가 알린다.
import { LEASE_DAYS, LEASE_NOTICE_DAYS, rentOn } from '../../src/sim/lease';
import { NEIGHBORHOODS } from '../../src/sim/neighborhoods';
import { advanceTickInPlace } from '../../src/sim/tick';
import { g } from './gameHelpers';

test('월세는 재계약 때마다 5%씩 오른다', () => {
  const s = g();
  const base = NEIGHBORHOODS.campus.listing.monthlyRent;
  expect(rentOn(s, 0)).toBe(base);
  expect(rentOn(s, LEASE_DAYS - 1)).toBe(base);
  expect(rentOn(s, LEASE_DAYS)).toBe(Math.round(base * 1.05));
  expect(rentOn(s, LEASE_DAYS * 2)).toBe(Math.round(base * 1.05 ** 2));
});

test('반년 전에 건물주가 알리고, 재계약 날부터 오른 월세가 나가고, 도감 카드가 열린다', () => {
  const s = g();
  // 메시지는 최근 300개만 남으니 예고 다음 날 확인한다
  while (s.clock.day < LEASE_DAYS - LEASE_NOTICE_DAYS + 1) advanceTickInPlace(s);
  const notice = s.messages.items.find((m) => m.from === 'landlord')!;
  expect(notice.day).toBe(LEASE_DAYS - LEASE_NOTICE_DAYS);
  expect(notice.text).toMatch(/3월 재계약 때 월세를 5% 올리려고요/);
  while (s.clock.day < LEASE_DAYS + 1) advanceTickInPlace(s);
  const renewDay = s.ledger.days.find((d) => d.day === LEASE_DAYS)!;
  expect(renewDay.rent).toBe(rentOn(s, LEASE_DAYS));
  expect(s.learning.dex.lease?.story).toMatch(/월세가 .+ → .+으로 올랐어요/);
});
