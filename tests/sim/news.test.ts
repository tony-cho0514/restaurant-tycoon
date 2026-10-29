import { Rng } from '../../src/sim/rng';
import { initialEconomy, stepEconomyWeek } from '../../src/sim/economy';
import {
  planWeek, fireDue, shockMultiplier, demandShock,
  type NewsState, type ShockType, type ActiveShock,
} from '../../src/sim/news';
import { NEWS_TEMPLATES, FLAVOR_TEMPLATES, MIN_WAGE_TEMPLATES, fillTemplate } from '../../src/content/newsTemplates';

function run(seed: number, weeks: number) {
  const r = new Rng(seed); let econ = initialEconomy(r); let ns: NewsState = { pending: [], active: [], items: [], nextId: 1 };
  const fired: { type: ShockType; day: number }[] = []; const signals: { type: ShockType; day: number }[] = [];
  for (let d = 0; d < weeks * 7; d++) {
    if (d % 7 === 0) { econ = stepEconomyWeek(econ, r); ({ news: ns, economy: econ } = planWeek(ns, econ, d, r, '새내기길')); }
    ({ news: ns, economy: econ } = fireDue(ns, econ, d, r, '새내기길'));
    for (const it of ns.items) if (it.day === d && it.shockType) (it.kind === 'fire' ? fired : it.kind === 'signal' ? signals : []).push({ type: it.shockType, day: d });
  }
  return { fired, signals, ns };
}

test('신호 없이 터지는 충격은 없다', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const { fired, signals } = run(seed, 200);
    for (const f of fired) expect(signals.some(s => s.type === f.type && s.day <= f.day - 7)).toBe(true);
  }
});

test('FX_SPIKE 빗나감 비율 10~30%', () => {
  let fire = 0, fizzle = 0;
  for (let seed = 1; seed <= 60; seed++) for (const it of run(seed, 200).ns.items) if (it.shockType === 'FX_SPIKE') { if (it.kind === 'fire') fire++; if (it.kind === 'fizzle') fizzle++; }
  const rate = fizzle / (fire + fizzle); expect(rate).toBeGreaterThan(0.1); expect(rate).toBeLessThan(0.3);
});

test('치즈 파동과 축제 효과', () => {
  const active: ActiveShock[] = [{ type: 'CHEESE_SHORTAGE', untilDay: 50, magnitude: 0.4 }, { type: 'FESTIVAL', untilDay: 12, magnitude: 0.6 }];
  expect(shockMultiplier(active, 'mozzarella', 49)).toBeCloseTo(1.4); expect(shockMultiplier(active, 'mozzarella', 51)).toBe(1);
  expect(demandShock(active, 10)).toEqual({ hall: 1.6, delivery: 1.2 });
});

test('같은 종류는 동시에 두 번 대기하지 않고, 뉴스는 200개까지', () => {
  const { ns } = run(4, 520);
  const types = ns.pending.map(p => p.type); expect(new Set(types).size).toBe(types.length);
  expect(ns.items.length).toBeLessThanOrEqual(200);
});

test('모든 틀의 변수가 채워진다', () => {
  const all = [...Object.values(NEWS_TEMPLATES).flatMap(t => [...t.signal, ...t.fire, ...t.fizzle]), ...FLAVOR_TEMPLATES, ...MIN_WAGE_TEMPLATES];
  for (const t of all) { const f = fillTemplate(t, { pct: '12', place: '새내기길', wage: '10,350' }); expect(f.headline + f.body).not.toMatch(/[{}]/); }
  for (const t of Object.values(NEWS_TEMPLATES).flatMap(x => x.signal)) expect(t.headline + t.body).not.toMatch(/\d/);
});
