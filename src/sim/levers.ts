// 운영 수단: 문제 앞에서 사장이 직접 골라 쓰는 수단들. 비용은 미리 정확히, 효과는 해 봐야 안다.
import {
  APP_ADS_WEEKLY, APP_FEE_RATE, CARD_FEE_RATE, COLA_ATTACH_RATE, DELIVERY_COST_TOTAL, DELIVERY_TIP_DEFAULT, INSULATED_BOX_COST,
} from './balance';
import { orderMix } from './demand';
import type { Cycle } from './economy';
import type { IngredientId } from './ingredients';
import { PIZZA_IDS, clampMenuPrice, unitCost, type MenuItemId } from './menu';
import type { Neighborhood } from './neighborhoods';

export type LeverId = 'freeCola' | 'premiumCheese' | 'insulatedBox' | 'reviewReplies' | 'appAds';
export type Levers = Record<LeverId, boolean>;

export const LEVER_IDS: LeverId[] = ['freeCola', 'premiumCheese', 'insulatedBox', 'reviewReplies', 'appAds'];

export const LEVERS: Record<LeverId, { name: string; description: string; effectHint: string }> = {
  freeCola: {
    name: '콜라 서비스',
    description: '배달 주문마다 콜라 500ml를 서비스로 넣어요.',
    effectHint: '배달앱 평점에 도움이 될 수 있어요.',
  },
  premiumCheese: {
    name: '프리미엄 치즈',
    description: '더 좋은 모짜렐라를 써요. 치즈 값이 더 들어요.',
    effectHint: '맛 평가가 좋아져 홀과 배달 평점 모두에 도움이 될 수 있어요.',
  },
  insulatedBox: {
    name: '보온 포장',
    description: '배달 피자를 보온 포장재로 감싸요.',
    effectHint: '배달 음식이 덜 식어 배달앱 평점에 도움이 될 수 있어요.',
  },
  reviewReplies: {
    name: '리뷰 답글',
    description: '사장님이 배달앱 리뷰에 직접 답글을 달아요.',
    effectHint: '나쁜 리뷰가 평점에 주는 충격을 줄여 줄 수 있어요. 대신 사장님 손이 묶여 시간당 피자 한 판을 덜 만들어요.',
  },
  appAds: {
    name: '배달앱 광고',
    description: '배달앱에서 가게가 더 눈에 띄게 광고해요. 매주 광고비가 나가요.',
    effectHint: '배달 주문이 늘 수 있어요.',
  },
};

export interface MarginCtx {
  prices: Record<IngredientId, number>;
  menuPrices: Record<MenuItemId, number>;
  inflation: number;
  levers: Levers;
  n: Neighborhood;
  /** 지금 경기. 생략하면 보통 경기로 계산한다. */
  cycle?: Cycle;
  /** 손님이 내는 배달팁. 생략하면 기본값 */
  deliveryTip?: number;
}

export function orderEconomics(ctx: MarginCtx, ch: 'hall' | 'delivery') {
  const mix = orderMix(ctx.menuPrices, ctx.inflation, ctx.n.priceSensitivity, ctx.cycle ?? 'normal');
  const opts = { premiumCheese: ctx.levers.premiumCheese };
  let revenue = COLA_ATTACH_RATE * ctx.menuPrices.cola;
  let cost = COLA_ATTACH_RATE * unitCost('cola', ctx.prices, opts);
  for (const id of PIZZA_IDS) {
    revenue += mix[id] * ctx.menuPrices[id];
    cost += mix[id] * unitCost(id, ctx.prices, opts);
  }
  if (ch === 'hall') cost += revenue * CARD_FEE_RATE;
  if (ch === 'delivery') {
    cost += revenue * APP_FEE_RATE + (DELIVERY_COST_TOTAL - (ctx.deliveryTip ?? DELIVERY_TIP_DEFAULT));
    if (ctx.levers.insulatedBox) cost += INSULATED_BOX_COST;
    if (ctx.levers.freeCola) cost += ctx.prices.cola500;
  }
  return { revenuePerOrder: revenue, variableCostPerOrder: cost, marginRate: (revenue - cost) / revenue };
}

export interface LeverPreview {
  channel: 'hall' | 'delivery' | 'all';
  perOrderCostDelta: number;
  weeklyFixedDelta: number;
  capacityDelta: number;
  marginBefore: number;
  marginAfter: number;
  marginDeltaPp: number;
  effectHint: string;
}

const LEVER_CHANNEL: Record<LeverId, LeverPreview['channel']> = {
  freeCola: 'delivery',
  insulatedBox: 'delivery',
  premiumCheese: 'all',
  reviewReplies: 'all',
  appAds: 'all',
};

function channelEconomics(ctx: MarginCtx, channel: LeverPreview['channel']) {
  if (channel !== 'all') return orderEconomics(ctx, channel);
  const ds = ctx.n.deliveryShare;
  const hall = orderEconomics(ctx, 'hall');
  const del = orderEconomics(ctx, 'delivery');
  return {
    revenuePerOrder: (1 - ds) * hall.revenuePerOrder + ds * del.revenuePerOrder,
    variableCostPerOrder: (1 - ds) * hall.variableCostPerOrder + ds * del.variableCostPerOrder,
    marginRate: (1 - ds) * hall.marginRate + ds * del.marginRate,
  };
}

export function previewLever(ctx: MarginCtx, id: LeverId, turnOn: boolean): LeverPreview {
  const channel = LEVER_CHANNEL[id];
  const before = channelEconomics(ctx, channel);
  const after = channelEconomics({ ...ctx, levers: { ...ctx.levers, [id]: turnOn } }, channel);
  const sign = turnOn === ctx.levers[id] ? 0 : turnOn ? 1 : -1;
  return {
    channel,
    perOrderCostDelta: Math.round(after.variableCostPerOrder - before.variableCostPerOrder),
    weeklyFixedDelta: id === 'appAds' ? sign * APP_ADS_WEEKLY : 0,
    capacityDelta: id === 'reviewReplies' ? -sign : 0,
    marginBefore: before.marginRate,
    marginAfter: after.marginRate,
    marginDeltaPp: (after.marginRate - before.marginRate) * 100,
    effectHint: LEVERS[id].effectHint,
  };
}

export function previewMenuPrice(ctx: MarginCtx, item: MenuItemId, newPrice: number) {
  const cost = unitCost(item, ctx.prices, { premiumCheese: ctx.levers.premiumCheese });
  const current = ctx.menuPrices[item];
  const next = clampMenuPrice(newPrice);
  let effectHint = '';
  if (next > current) {
    effectHint = ctx.n.priceSensitivity >= 1.2 ? '이 동네 손님은 가격에 민감해요. 손님이 줄 수 있어요.' : '손님이 조금 줄 수 있어요.';
  } else if (next < current) {
    effectHint = '손님이 늘 수 있지만 한 판에 남는 돈은 줄어요.';
  }
  return {
    unitCost: cost,
    unitMarginBefore: current - cost,
    unitMarginAfter: next - cost,
    costRateAfter: cost / next,
    effectHint,
  };
}
