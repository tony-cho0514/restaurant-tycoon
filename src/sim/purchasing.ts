// 재고 사기: 창고 상한과 여러 재료 한 번에 사기(장바구니).
import { INGREDIENTS, type IngredientId } from './ingredients';
import { MIN_STORAGE_UNITS, manualBuyUnits } from './inventory';
import { estimatedUsage } from './tick';
import type { GameState } from './types';
import { storageMult } from './upgradeOps';

/** 창고에 둘 수 있는 최대 양(개수). 하루 사용량 × 보관 일수와 최소 보관량 중 큰 쪽. */
export function storageCapUnits(s: GameState, id: IngredientId, usage = estimatedUsage(s)): number {
  return Math.max(INGREDIENTS[id].storageMaxDays * usage[id], MIN_STORAGE_UNITS[id]) * storageMult(s);
}

export interface CartItem {
  id: IngredientId;
  /** days: 하루 사용량 × qty일치 / units: qty개(kg·병) */
  mode: 'days' | 'units';
  qty: number;
}

export function cartLineQty(s: GameState, item: CartItem, usage = estimatedUsage(s)): number {
  return item.mode === 'days' ? item.qty * usage[item.id] : item.qty;
}

/** 장바구니를 한 번에 산다. 현금과 오늘 재료 구입(현금 지출)에 반영한 새 상태를 돌려준다. */
export function buyCart(s: GameState, items: CartItem[]) {
  const usage = estimatedUsage(s);
  let inv = s.inventory;
  const lines: { id: IngredientId; qty: number; spent: number; capped: boolean }[] = [];
  for (const item of items) {
    const r = manualBuyUnits(inv, item.id, cartLineQty(s, item, usage), s.prices, s.clock.day, storageCapUnits(s, item.id, usage));
    inv = r.inv;
    lines.push({ id: item.id, qty: r.qty, spent: r.spent, capped: r.capped });
  }
  const spent = lines.reduce((a, l) => a + l.spent, 0);
  const state: GameState = { ...s, inventory: inv, cash: s.cash - spent, today: { ...s.today, purchases: s.today.purchases + spent } };
  return { state, spent, lines };
}
