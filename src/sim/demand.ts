import { APP_ADS_DEMAND, PRICE_ELASTICITY, RECESSION_SENSITIVITY_MULT, WEATHER_DEMAND } from './balance';
import { CYCLE_DEMAND, type Economy } from './economy';
import type { Levers } from './levers';
import { MENU, PIZZA_IDS, type MenuItemId, type PizzaId } from './menu';
import type { Neighborhood } from './neighborhoods';
import type { Ratings } from './ratings';

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

export function orderMix(menuPrices: Record<MenuItemId, number>, inflation: number, priceSensitivity: number): Record<PizzaId, number> {
  const w = PIZZA_IDS.map((id) => MENU[id].baseMix * Math.pow((MENU[id].defaultPrice * inflation) / menuPrices[id], 2 * priceSensitivity));
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
}): { hall: number; delivery: number } {
  const { n, economy } = inp;
  const curveSum = n.hourCurve.reduce((s, x) => s + x, 0);
  const base = (n.baseDailyOrders * n.hourCurve[inp.hour - 11]) / curveSum;
  const sens = n.priceSensitivity * (economy.cycle === 'recession' ? RECESSION_SENSITIVITY_MULT : 1);
  const common =
    CYCLE_DEMAND[economy.cycle] *
    (inp.isWeekend ? n.weekendFactor : 1) *
    Math.pow(priceIndex(inp.menuPrices, economy.inflation), -PRICE_ELASTICITY * sens);
  const weather = WEATHER_DEMAND[economy.weather];
  const hall = base * (1 - n.deliveryShare) * common * weather.hall * Math.pow(inp.ratings.hall / 4.5, 3) * inp.shock.hall;
  const delivery =
    base * n.deliveryShare * common * weather.delivery * Math.pow(inp.ratings.delivery / 4.5, 3) * inp.shock.delivery *
    (inp.levers.appAds ? APP_ADS_DEMAND : 1);
  return { hall, delivery };
}
