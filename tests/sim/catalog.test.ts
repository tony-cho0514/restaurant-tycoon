import { ingredientPrice } from '../../src/sim/ingredients';
import { unitCost, clampMenuPrice } from '../../src/sim/menu';
import { NEIGHBORHOODS, cashAfterSetup } from '../../src/sim/neighborhoods';
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
  expect(cashAfterSetup(NEIGHBORHOODS.campus)).toBe(20_000_000);
  expect(cashAfterSetup(NEIGHBORHOODS.office)).toBe(20_000_000);
  expect(cashAfterSetup(NEIGHBORHOODS.residential)).toBe(40_000_000);
});
