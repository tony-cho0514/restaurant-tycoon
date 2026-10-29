import { accrueCharge, consumeTick, formatCharge } from '../../src/sim/charge';

const DAY = 86_400_000;

test('현실 하루 = 77틱, 반나절 = 38.5틱', () => {
  expect(accrueCharge({ ticks: 0, lastAccruedAt: 0 }, DAY).ticks).toBeCloseTo(77);
  expect(accrueCharge({ ticks: 0, lastAccruedAt: 0 }, DAY / 2).ticks).toBeCloseTo(38.5);
});

test('상한 231틱', () => {
  expect(accrueCharge({ ticks: 200, lastAccruedAt: 0 }, 10 * DAY).ticks).toBe(231);
});

test('시계가 뒤로 가면 충전은 그대로, 기준 시각만 당겨짐', () => {
  const c = accrueCharge({ ticks: 10, lastAccruedAt: 5 * DAY }, 4 * DAY);
  expect(c).toEqual({ ticks: 10, lastAccruedAt: 4 * DAY });
});

test('소비와 표기', () => {
  expect(consumeTick({ ticks: 1.5, lastAccruedAt: 0 }).ticks).toBeCloseTo(0.5);
  expect(() => consumeTick({ ticks: 0.5, lastAccruedAt: 0 })).toThrow('충전된 시간이 없어요');
  expect(formatCharge(58.7)).toBe('5일 3시간');
  expect(formatCharge(0.4)).toBe('0일 0시간');
});
