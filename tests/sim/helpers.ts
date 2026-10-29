import { INGREDIENTS, type IngredientId } from '../../src/sim/ingredients';
import { MENU, type MenuItemId } from '../../src/sim/menu';
import type { Levers } from '../../src/sim/levers';

export function basePrices(): Record<IngredientId, number> {
  return Object.fromEntries(Object.entries(INGREDIENTS).map(([k, v]) => [k, v.basePrice])) as Record<IngredientId, number>;
}

export function zeroUsage(): Record<IngredientId, number> {
  return Object.fromEntries(Object.keys(INGREDIENTS).map((k) => [k, 0])) as Record<IngredientId, number>;
}

export function allOff(): Levers {
  return { freeCola: false, premiumCheese: false, insulatedBox: false, reviewReplies: false, appAds: false };
}

export function defaultMenuPrices(): Record<MenuItemId, number> {
  return Object.fromEntries(Object.entries(MENU).map(([k, v]) => [k, v.defaultPrice])) as Record<MenuItemId, number>;
}
