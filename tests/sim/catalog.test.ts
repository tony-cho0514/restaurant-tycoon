import { ingredientPrice } from '../../src/sim/ingredients';
import { unitCost, clampMenuPrice } from '../../src/sim/menu';
import { START_OPERATING_CASH } from '../../src/sim/balance';
import { NEIGHBORHOODS } from '../../src/sim/neighborhoods';
import { createNewGame } from '../../src/sim/newGame';
import { basePrices } from './helpers';

const base = { fx: 1350, inflation: 1, month: 4, shockMult: 1, noise: 1 };

test('기준 조건이면 기준가', () => { expect(ingredientPrice('mozzarella', base)).toBe(12000); });

test('환율 20% 상승 → 수입품은 0.7 승만큼만', () => {
  expect(ingredientPrice('mozzarella', { ...base, fx: 1620 })).toBeCloseTo(13634, -1);
  expect(ingredientPrice('box', { ...base, fx: 1620 })).toBe(700);
});

test('채소는 8월에 1.2배', () => { expect(ingredientPrice('veg', { ...base, month: 8 })).toBe(6000); });

test('메뉴 원가', () => {
  const p = basePrices();
  expect(unitCost('cheese', p, { premiumCheese: false })).toBe(5475);
  expect(unitCost('cheese', p, { premiumCheese: true })).toBe(6375);
  expect(unitCost('cola', p, { premiumCheese: false })).toBe(1300);
});

test('가격 범위 묶기', () => {
  expect(clampMenuPrice(0)).toBe(1000); expect(clampMenuPrice(1e8)).toBe(100000);
  expect(clampMenuPrice(18950)).toBe(19000); expect(clampMenuPrice(NaN)).toBe(1000);
});

test('동네 데이터', () => {
  for (const n of Object.values(NEIGHBORHOODS)) expect(n.hourCurve).toHaveLength(11);
  // 보증금·권리금은 동네마다 달라도, 다 내고 남는 운영 자금은 모두 100만 원
  for (const id of Object.keys(NEIGHBORHOODS) as (keyof typeof NEIGHBORHOODS)[]) {
    expect(createNewGame({ seed: 1, neighborhoodId: id, shopName: 'x', nowMs: 0 }).cash).toBe(START_OPERATING_CASH);
  }
});
