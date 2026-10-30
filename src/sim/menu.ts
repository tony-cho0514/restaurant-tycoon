import { MISC_COST_PER_PIZZA, PREMIUM_CHEESE_MULT } from './balance';
import type { IngredientId } from './ingredients';

export type MenuItemId = 'cheese' | 'pepperoni' | 'combo' | 'potato' | 'bulgogi' | 'goguma' | 'hawaiian' | 'cola';
export type PizzaId = Exclude<MenuItemId, 'cola'>;
export const PIZZA_IDS: PizzaId[] = ['cheese', 'pepperoni', 'combo', 'potato', 'bulgogi', 'goguma', 'hawaiian'];
/** 개업할 때부터 파는 피자 */
export const STARTER_PIZZAS: PizzaId[] = ['cheese', 'pepperoni', 'combo'];
export type MenuActive = Record<MenuItemId, boolean>;

export function defaultMenuActive(): MenuActive {
  return { cheese: true, pepperoni: true, combo: true, potato: false, bulgogi: false, goguma: false, hawaiian: false, cola: true };
}

/** 판매 중인 피자. active가 없으면 개업 메뉴 3개. */
export function activePizzas(active?: Partial<MenuActive>): PizzaId[] {
  return active ? PIZZA_IDS.filter((id) => active[id]) : STARTER_PIZZAS;
}

export interface MenuItemDef {
  name: string;
  defaultPrice: number;
  recipe: Partial<Record<IngredientId, number>>;
  isPizza: boolean;
  baseMix: number;
}

export const MENU: Record<MenuItemId, MenuItemDef> = {
  cheese: { name: '치즈 피자 L', defaultPrice: 18900, recipe: { flour: 0.25, mozzarella: 0.25, tomatoSauce: 0.1, box: 1 }, isPizza: true, baseMix: 0.3 },
  pepperoni: { name: '페퍼로니 피자 L', defaultPrice: 20900, recipe: { flour: 0.25, mozzarella: 0.22, tomatoSauce: 0.1, pepperoni: 0.06, box: 1 }, isPizza: true, baseMix: 0.35 },
  combo: { name: '콤비네이션 피자 L', defaultPrice: 22900, recipe: { flour: 0.25, mozzarella: 0.22, tomatoSauce: 0.1, pepperoni: 0.04, veg: 0.12, box: 1 }, isPizza: true, baseMix: 0.35 },
  potato: { name: '포테이토 피자 L', defaultPrice: 22900, recipe: { flour: 0.25, mozzarella: 0.2, tomatoSauce: 0.08, potato: 0.15, ham: 0.03, box: 1 }, isPizza: true, baseMix: 0.3 },
  bulgogi: { name: '불고기 피자 L', defaultPrice: 23900, recipe: { flour: 0.25, mozzarella: 0.2, tomatoSauce: 0.08, bulgogi: 0.1, veg: 0.05, box: 1 }, isPizza: true, baseMix: 0.3 },
  goguma: { name: '고구마 피자 L', defaultPrice: 22900, recipe: { flour: 0.25, mozzarella: 0.2, sweetPotato: 0.12, box: 1 }, isPizza: true, baseMix: 0.3 },
  hawaiian: { name: '하와이안 피자 L', defaultPrice: 21900, recipe: { flour: 0.25, mozzarella: 0.2, tomatoSauce: 0.08, pineapple: 0.1, ham: 0.06, box: 1 }, isPizza: true, baseMix: 0.3 },
  cola: { name: '콜라 1.25L', defaultPrice: 2500, recipe: { cola: 1 }, isPizza: false, baseMix: 0 },
};

export function unitCost(id: MenuItemId, prices: Record<IngredientId, number>, opts: { premiumCheese: boolean }): number {
  const def = MENU[id];
  let cost = def.isPizza ? MISC_COST_PER_PIZZA : 0;
  for (const [ing, qty] of Object.entries(def.recipe) as [IngredientId, number][]) {
    const mult = ing === 'mozzarella' && opts.premiumCheese ? PREMIUM_CHEESE_MULT : 1;
    cost += qty * prices[ing] * mult;
  }
  return Math.round(cost);
}

export function clampMenuPrice(price: number): number {
  if (!Number.isFinite(price)) return 1000;
  return Math.min(100_000, Math.max(1000, Math.round(price / 100) * 100));
}

/** 메뉴 한 판(한 병)에 들어가는 재료와 그 원가. 피자는 여기에 기타 비용(올리브유·피클 등)이 더해진다. */
export function recipeLines(
  id: MenuItemId,
  prices: Record<IngredientId, number>,
  premiumCheese: boolean,
): { ingredient: IngredientId; qty: number; cost: number }[] {
  return (Object.entries(MENU[id].recipe) as [IngredientId, number][]).map(([ingredient, qty]) => ({
    ingredient,
    qty,
    cost: qty * prices[ingredient] * (ingredient === 'mozzarella' && premiumCheese ? PREMIUM_CHEESE_MULT : 1),
  }));
}
