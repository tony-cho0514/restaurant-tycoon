import { INGREDIENTS, type IngredientId } from '../../src/sim/ingredients';
import { MENU, type MenuItemId } from '../../src/sim/menu';

export function basePrices(): Record<IngredientId, number> {
  return Object.fromEntries(Object.entries(INGREDIENTS).map(([k, v]) => [k, v.basePrice])) as Record<IngredientId, number>;
}

export function zeroUsage(): Record<IngredientId, number> {
  return Object.fromEntries(Object.keys(INGREDIENTS).map((k) => [k, 0])) as Record<IngredientId, number>;
}

export function defaultMenuPrices(): Record<MenuItemId, number> {
  return Object.fromEntries(Object.entries(MENU).map(([k, v]) => [k, v.defaultPrice])) as Record<MenuItemId, number>;
}
