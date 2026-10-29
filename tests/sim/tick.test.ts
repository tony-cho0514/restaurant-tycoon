import { createNewGame } from '../../src/sim/newGame';
import { advanceTick, advanceTickInPlace, playTick } from '../../src/sim/tick';
import { profitOf } from '../../src/sim/ledger';
import { g } from './gameHelpers';

test('advanceTick은 입력을 바꾸지 않는다', () => { const s = g(); const before = JSON.stringify(s); advanceTick(s); expect(JSON.stringify(s)).toBe(before); });

test('77틱 = 1주', () => { let s = g(); for (let i = 0; i < 77; i++) s = advanceTick(s).state; expect(s.clock).toEqual({ day: 7, hour: 11 }); });

test('같은 seed면 300틱 뒤 똑같다', () => { let a = g(), b = g(); for (let i = 0; i < 300; i++) { a = advanceTick(a).state; b = advanceTick(b).state; } expect(a).toEqual(b); });

test('월세는 매달 첫날 한 번', () => {
  let s = g(); for (let i = 0; i < 28 * 11 * 2; i++) s = advanceTick(s).state;
  expect(s.ledger.months.map(m => m.rent)).toEqual([1_500_000, 1_500_000]);
});

test('monthEnd 멈춤은 28일에 한 번', () => {
  let s = g(), n = 0; for (let i = 0; i < 28 * 11 * 3; i++) { const r = advanceTick(s); s = r.state; n += r.pauses.filter(p => p.kind === 'monthEnd').length; }
  expect(n).toBe(3);
});

test('밸런스: 기본 운영 1년, 동네 3곳 × seed 5개의 월 이익 중앙값 300만~1,200만 원', () => {
  for (const id of ['campus', 'office', 'residential'] as const) {
    const profits: number[] = [];
    for (let seed = 1; seed <= 5; seed++) { const s = createNewGame({ seed, neighborhoodId: id, shopName: 't', nowMs: 0 }); for (let i = 0; i < 12 * 28 * 11; i++) advanceTickInPlace(s); profits.push(...s.ledger.months.map(profitOf)); }
    profits.sort((a, b) => a - b); const med = profits[Math.floor(profits.length / 2)];
    expect(med).toBeGreaterThan(3_000_000); expect(med).toBeLessThan(12_000_000);
  }
}, 120_000);

test('치즈 파동이 터지면 치즈 시세가 크게 오른다', () => {
  let s = g(); s.news.pending.push({ id: 'x', type: 'CHEESE_SHORTAGE', signalDay: 0, fireDay: 1, real: true, magnitude: 0.4 });
  for (let i = 0; i < 11; i++) s = advanceTick(s).state; const before = s.prices.mozzarella;
  for (let i = 0; i < 11; i++) s = advanceTick(s).state; expect(s.prices.mozzarella / before).toBeGreaterThan(1.25);
});

test('3년 플레이 후 저장 크기 1MB 미만', () => { const s = g(); for (let i = 0; i < 3 * 12 * 28 * 11; i++) advanceTickInPlace(s); expect(JSON.stringify(s).length).toBeLessThan(1_000_000); }, 120_000);

test('현금이 0 아래로 내려갈 때 한 번 멈춘다', () => {
  let s = g(); s.cash = 10_000; s.menuPrices = { cheese: 1000, pepperoni: 1000, combo: 1000, cola: 1000 };
  let n = 0; for (let i = 0; i < 11 * 5; i++) { const r = advanceTick(s); s = r.state; n += r.pauses.filter(p => p.kind === 'cashNegative').length; }
  expect(n).toBe(1);
});

test('하루 기록에 그날 시세가 남는다(7일 전 대비 표시용)', () => {
  let s = g(); for (let i = 0; i < 8 * 11; i++) s = advanceTick(s).state;
  expect(s.ledger.days[0].prices.mozzarella).toBeGreaterThan(0); expect(s.ledger.days[7].prices.veg).toBeGreaterThan(0);
});

test('playTick은 충전이 없으면 null', () => { const s = { ...g(), charge: { ticks: 0, lastAccruedAt: 0 } }; expect(playTick(s, 0)).toBeNull(); });
