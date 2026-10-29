import { buy, consume, emptyInventory, expire, stockOf, autoReorder, manualBuyDays, DEFAULT_RULES } from '../../src/sim/inventory';
import { basePrices, zeroUsage } from './helpers';

test('먼저 산 것부터 쓴다', () => {
  const inv = buy(buy(emptyInventory(), 'mozzarella', 1, 10000, 0), 'mozzarella', 1, 12000, 1);
  const r = consume(inv, 'mozzarella', 1.5); expect(r.cost).toBe(16000); expect(r.shortfall).toBe(0);
  expect(consume(r.inv, 'mozzarella', 1).shortfall).toBeCloseTo(0.5);
});

test('채소는 5일 지나면 버려지고 폐기 비용이 잡힌다', () => {
  const inv = buy(emptyInventory(), 'veg', 2, 5000, 0);
  expect(expire(inv, 5).wasteCost).toBe(0); const e = expire(inv, 6);
  expect(e.wasteCost).toBe(10000); expect(stockOf(e.inv, 'veg')).toBe(0);
});

test('자동 발주는 기준 아래일 때 목표까지', () => {
  const usage = { ...zeroUsage(), mozzarella: 10 }; const prices = basePrices();
  const r = autoReorder(buy(emptyInventory(), 'mozzarella', 20, 12000, 0), DEFAULT_RULES, usage, prices, 0);
  expect(stockOf(r.inv, 'mozzarella')).toBe(70); expect(r.spent).toBe(50 * 12000);
});

test('미리 사기는 창고 상한에서 잘린다', () => {
  const r = manualBuyDays(emptyInventory(), 'mozzarella', 60, { ...zeroUsage(), mozzarella: 10 }, basePrices(), 0);
  expect(stockOf(r.inv, 'mozzarella')).toBe(300); expect(r.capped).toBe(true);
});
