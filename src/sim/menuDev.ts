// 메뉴 개발과 판매 중지. 새 메뉴는 개발비를 내고 출시하며, 그 메뉴에만 쓰는 재료를 사흘치 같이 들여온다.
import { MENU_DEV_COST } from './balance';
import type { IngredientId } from './ingredients';
import { buy, stockOf } from './inventory';
import { MENU, activePizzas, type MenuItemId, type PizzaId } from './menu';
import { NEIGHBORHOODS } from './neighborhoods';
import { fallbackUsage } from './newGame';
import type { GameState } from './types';

export { MENU_DEV_COST };

export function developMenu(s: GameState, id: PizzaId): GameState {
  if (s.menuDeveloped[id]) throw new Error('이미 개발한 메뉴예요');
  const menuActive = { ...s.menuActive, [id]: true };
  const usage = fallbackUsage(NEIGHBORHOODS[s.neighborhoodId], menuActive);
  let inventory = s.inventory;
  let spent = 0;
  for (const ing of Object.keys(MENU[id].recipe) as IngredientId[]) {
    if (stockOf(inventory, ing) > 0) continue;
    const qty = usage[ing] * 3;
    inventory = buy(inventory, ing, qty, s.prices[ing], s.clock.day);
    spent += Math.round(qty * s.prices[ing]);
  }
  if (s.cash < MENU_DEV_COST + spent) throw new Error('돈이 모자라요');
  return {
    ...s,
    menuActive,
    menuDeveloped: { ...s.menuDeveloped, [id]: true },
    inventory,
    cash: s.cash - MENU_DEV_COST - spent,
    today: { ...s.today, purchases: s.today.purchases + spent, investment: (s.today.investment ?? 0) + MENU_DEV_COST },
  };
}

export function setMenuActive(s: GameState, id: MenuItemId, on: boolean): GameState {
  if (on && !s.menuDeveloped[id]) throw new Error('먼저 메뉴를 개발해야 해요');
  if (!on && MENU[id].isPizza && activePizzas(s.menuActive).filter((x) => x !== id).length === 0) {
    throw new Error('피자는 하나 이상 팔아야 해요');
  }
  return { ...s, menuActive: { ...s.menuActive, [id]: on } };
}
