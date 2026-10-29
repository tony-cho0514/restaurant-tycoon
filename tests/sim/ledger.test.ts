import { emptyDay, profitOf } from '../../src/sim/ledger';

test('이익 계산은 현금 지출(purchases)을 빼지 않는다', () => {
  const r = { ...emptyDay(0, 0), revenueHall: 100_000, foodCost: 30_000, purchases: 500_000 }; expect(profitOf(r)).toBe(70_000);
});
