import { LEVERS, orderEconomics, previewLever, previewMenuPrice, type MarginCtx } from '../../src/sim/levers';
import { NEIGHBORHOODS } from '../../src/sim/neighborhoods';
import { allOff, basePrices, defaultMenuPrices } from './helpers';

const ctx = (o: Partial<MarginCtx> = {}): MarginCtx => ({ prices: basePrices(), menuPrices: defaultMenuPrices(), inflation: 1, levers: allOff(), n: NEIGHBORHOODS.campus, ...o });

test('기본 조건 주문당 매출 22,125원', () => { expect(orderEconomics(ctx(), 'hall').revenuePerOrder).toBeCloseTo(22125, 0); });

test('콜라 서비스: 배달 주문당 +800원, 이익률 −3.6%p', () => {
  const p = previewLever(ctx(), 'freeCola', true);
  expect(p.channel).toBe('delivery'); expect(p.perOrderCostDelta).toBe(800); expect(p.marginDeltaPp).toBeCloseTo(-3.6, 1);
});

test('배달앱 광고는 고정비, 리뷰 답글은 처리 능력', () => {
  expect(previewLever(ctx(), 'appAds', true).weeklyFixedDelta).toBe(88000);
  expect(previewLever(ctx(), 'reviewReplies', true).capacityDelta).toBe(-1);
});

test('효과 문구에는 숫자가 없다', () => { for (const l of Object.values(LEVERS)) expect(l.effectHint).not.toMatch(/\d/); });

test('가격 미리보기', () => {
  const p = previewMenuPrice(ctx(), 'cheese', 19900);
  expect(p.unitMarginAfter - p.unitMarginBefore).toBe(1000); expect(p.effectHint).toContain('가격에 민감');
});
