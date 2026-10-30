// 한 주 고정비와 「통장으로 몇 주 버티나」: 첫날부터 보이는 숫자라 계산이 맞아야 한다.
import { APP_ADS_WEEKLY, UTILITIES_PER_HOUR } from '../../src/sim/balance';
import { NEIGHBORHOODS } from '../../src/sim/neighborhoods';
import { runwayWeeks, weeklyFixed } from '../../src/sim/runway';
import { g } from './gameHelpers';

test('한 주 고정비 = 월세 4분의 1 + 알바비 + 공과금(+광고), 휴무일은 빼고 센다', () => {
  const s = g();
  const f = weeklyFixed(s);
  expect(f.rent).toBe(NEIGHBORHOODS.campus.listing.monthlyRent / 4);
  expect(f.utilities).toBe(UTILITIES_PER_HOUR * 11 * 7);
  expect(f.total).toBe(f.rent + f.labor + f.utilities + f.ads);
  const closedSunday = weeklyFixed({ ...s, settings: { ...s.settings, closedDay: 6 } });
  expect(closedSunday.utilities).toBe(UTILITIES_PER_HOUR * 11 * 6);
  expect(closedSunday.labor).toBeLessThan(f.labor + 1);
  expect(weeklyFixed({ ...s, levers: { ...s.levers, appAds: true } }).ads).toBe(APP_ADS_WEEKLY);
});

test('통장 돈 ÷ 한 주 고정비만큼 버티고, 마이너스면 0주', () => {
  const s = g();
  expect(runwayWeeks(s)).toBeCloseTo(s.cash / weeklyFixed(s).total);
  expect(runwayWeeks({ ...s, cash: -5 })).toBe(0);
});
