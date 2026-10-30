import {
  APP_ADS_DEMAND, CYCLE_MIX_TILT, CYCLE_SENSITIVITY, DELIVERY_TIP_DEFAULT, DELIVERY_TIP_ELASTICITY, PRICE_ELASTICITY, WEATHER_DEMAND,
} from './balance';
import { CYCLE_DEMAND, type Cycle, type Economy } from './economy';
import type { Levers } from './levers';
import { MENU, PIZZA_IDS, type MenuItemId, type PizzaId } from './menu';
import type { Neighborhood } from './neighborhoods';
import type { Ratings } from './ratings';

/** 그 시각의 상대 손님 비중. 11~21시는 기본 곡선, 그 밖은 늦게·일찍 열었을 때만 쓰는 값. */
export function curveAt(n: Neighborhood, hour: number): number {
  if (hour >= 11 && hour <= 21) return n.hourCurve[hour - 11];
  return n.extraHours[hour] ?? 0;
}

/** 피자 가격 수준: 1이면 (기본가 × 물가)와 같다. */
export function priceIndex(menuPrices: Record<MenuItemId, number>, inflation: number): number {
  let paid = 0;
  let ref = 0;
  for (const id of PIZZA_IDS) {
    paid += MENU[id].baseMix * menuPrices[id];
    ref += MENU[id].baseMix * MENU[id].defaultPrice * inflation;
  }
  return paid / ref;
}

/** 손님이 고르는 피자 비율. 기본가보다 비싸게 받는 메뉴는 덜 팔리고, 불황엔 비싼 메뉴부터 덜 팔린다. */
export function orderMix(
  menuPrices: Record<MenuItemId, number>,
  inflation: number,
  priceSensitivity: number,
  cycle: Cycle = 'normal',
): Record<PizzaId, number> {
  const sens = priceSensitivity * CYCLE_SENSITIVITY[cycle];
  const mean = PIZZA_IDS.reduce((s, id) => s + MENU[id].baseMix * menuPrices[id], 0);
  const w = PIZZA_IDS.map((id) =>
    MENU[id].baseMix *
    Math.pow((MENU[id].defaultPrice * inflation) / menuPrices[id], 2 * sens) *
    Math.pow(menuPrices[id] / mean, -CYCLE_MIX_TILT[cycle]),
  );
  const total = w.reduce((s, x) => s + x, 0);
  return Object.fromEntries(PIZZA_IDS.map((id, i) => [id, w[i] / total])) as Record<PizzaId, number>;
}

export function expectedOrders(inp: {
  n: Neighborhood;
  hour: number;
  isWeekend: boolean;
  economy: Economy;
  menuPrices: Record<MenuItemId, number>;
  ratings: Ratings;
  levers: Levers;
  shock: { hall: number; delivery: number };
  /** 손님이 내는 배달팁(원). 생략하면 기본값 */
  deliveryTip?: number;
}): { hall: number; delivery: number } {
  const { n, economy } = inp;
  const curveSum = n.hourCurve.reduce((s, x) => s + x, 0);
  const base = (n.baseDailyOrders * curveAt(n, inp.hour)) / curveSum;
  const sens = n.priceSensitivity * CYCLE_SENSITIVITY[economy.cycle];
  const common =
    CYCLE_DEMAND[economy.cycle] *
    (inp.isWeekend ? n.weekendFactor : 1) *
    Math.pow(priceIndex(inp.menuPrices, economy.inflation), -PRICE_ELASTICITY * sens);
  const weather = WEATHER_DEMAND[economy.weather];
  const hall = base * (1 - n.deliveryShare) * common * weather.hall * Math.pow(inp.ratings.hall / 4.5, 3) * inp.shock.hall;
  const delivery =
    base * n.deliveryShare * common * weather.delivery * Math.pow(inp.ratings.delivery / 4.5, 3) * inp.shock.delivery *
    (inp.levers.appAds ? APP_ADS_DEMAND : 1) *
    Math.max(0, 1 - DELIVERY_TIP_ELASTICITY * (((inp.deliveryTip ?? DELIVERY_TIP_DEFAULT) - DELIVERY_TIP_DEFAULT) / 1000));
  return { hall, delivery };
}
