import { Rng } from '../../src/sim/rng';
import { initialEconomy, stepEconomyWeek, rollWeather, type Cycle } from '../../src/sim/economy';

test('10년 돌려도 환율은 1000~1800', () => {
  const r = new Rng(9); let e = initialEconomy(r);
  for (let i = 0; i < 520; i++) { e = stepEconomyWeek(e, r); expect(e.fx).toBeGreaterThanOrEqual(1000); expect(e.fx).toBeLessThanOrEqual(1800); }
});

test('보통 경기 1년 물가 ≈ 3.17%', () => {
  const r = new Rng(1); let e = { ...initialEconomy(r), cycleWeeksLeft: 999 };
  for (let i = 0; i < 52; i++) e = stepEconomyWeek(e, r);
  expect(e.inflation).toBeCloseTo(1.0317, 3);
});

test('침체기 환율이 평균적으로 더 오른다', () => {
  const avg = (cycle: Cycle) => { let s = 0; for (let seed = 1; seed <= 200; seed++) { const r = new Rng(seed); let e = { ...initialEconomy(r), cycle, cycleWeeksLeft: 999 }; for (let i = 0; i < 52; i++) e = stepEconomyWeek(e, r); s += e.fx; } return s / 200; };
  expect(avg('recession')).toBeGreaterThan(avg('normal'));
});

test('계절별 날씨', () => {
  const r = new Rng(5); const w: Record<string, number> = {};
  for (let i = 0; i < 20000; i++) { const x = rollWeather('winter', r); w[x] = (w[x] ?? 0) + 1; expect(rollWeather('summer', r)).not.toBe('cold'); }
  expect(w.heat).toBeUndefined(); expect(Math.abs(w.cold / 20000 - 0.3)).toBeLessThan(0.03);
});
