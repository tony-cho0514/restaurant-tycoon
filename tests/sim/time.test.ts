import { calendar, nextTick, formatClock } from '../../src/sim/time';

test('달력', () => {
  expect(calendar({ day: 0, hour: 11 })).toMatchObject({ year: 1, month: 3, week: 1, dayOfWeek: 0, season: 'spring', isWeekend: false });
  expect(calendar({ day: 28, hour: 11 }).month).toBe(4);
  expect(calendar({ day: 280, hour: 11 })).toMatchObject({ year: 2, month: 1, season: 'winter' });
  expect(calendar({ day: 5, hour: 11 }).isWeekend).toBe(true);
});

test('틱 넘기기와 표기', () => {
  expect(nextTick({ day: 0, hour: 21 })).toEqual({ day: 1, hour: 11 });
  expect(nextTick({ day: 0, hour: 11 })).toEqual({ day: 0, hour: 12 });
  expect(formatClock({ day: 9, hour: 14 })).toBe('1년차 3월 2주 수요일 14시');
});
