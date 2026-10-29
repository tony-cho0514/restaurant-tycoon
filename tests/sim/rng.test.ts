import { Rng } from '../../src/sim/rng';

test('같은 seed면 같은 수열', () => {
  const a = new Rng(42), b = new Rng(42);
  expect([a.float(), a.float(), a.int(1, 6)]).toEqual([b.float(), b.float(), b.int(1, 6)]);
});

test('state를 저장했다 복원하면 이어서 같은 수열', () => {
  const a = new Rng(7); a.float(); const saved = a.state;
  const x = a.float(); expect(new Rng(saved).float()).toBe(x);
});

test('int는 양끝 포함, float는 [0,1)', () => {
  const r = new Rng(1); const seen = new Set<number>();
  for (let i = 0; i < 10000; i++) { const v = r.int(1, 3); seen.add(v); const f = r.float(); expect(f >= 0 && f < 1).toBe(true); }
  expect([...seen].sort()).toEqual([1, 2, 3]);
});

test('poisson 평균 ≈ lambda, lambda 0이면 0', () => {
  const r = new Rng(3); let s = 0; for (let i = 0; i < 20000; i++) s += r.poisson(6);
  expect(Math.abs(s / 20000 - 6)).toBeLessThan(0.1); expect(r.poisson(0)).toBe(0);
});
