// 재고: 산 묶음(lot)마다 단가와 만료일을 기억하고, 먼저 산 것부터 쓴다(FIFO).
import { INGREDIENTS, INGREDIENT_IDS, type IngredientId } from './ingredients';

export interface Lot {
  qty: number;
  unitCost: number;
  expiresDay: number;
}

export type Inventory = Record<IngredientId, Lot[]>;

export interface ReorderRule {
  reorderDays: number;
  targetDays: number;
}

export type Usage = Partial<Record<IngredientId, number>>;

export const DEFAULT_RULES: Record<IngredientId, ReorderRule> = {
  flour: { reorderDays: 3, targetDays: 10 },
  mozzarella: { reorderDays: 3, targetDays: 7 },
  tomatoSauce: { reorderDays: 3, targetDays: 10 },
  pepperoni: { reorderDays: 3, targetDays: 7 },
  veg: { reorderDays: 1, targetDays: 2 },
  box: { reorderDays: 5, targetDays: 14 },
  cola: { reorderDays: 3, targetDays: 7 },
  cola500: { reorderDays: 3, targetDays: 7 },
};

const EPS = 1e-9;

export function emptyInventory(): Inventory {
  return Object.fromEntries(INGREDIENT_IDS.map((id) => [id, []])) as unknown as Inventory;
}

export function stockOf(inv: Inventory, id: IngredientId): number {
  return inv[id].reduce((s, l) => s + l.qty, 0);
}

export function buy(inv: Inventory, id: IngredientId, qty: number, unitCost: number, today: number): Inventory {
  if (qty <= EPS) return inv;
  return { ...inv, [id]: [...inv[id], { qty, unitCost, expiresDay: today + INGREDIENTS[id].shelfLifeDays }] };
}

export function canMake(inv: Inventory, recipe: Usage): boolean {
  return (Object.entries(recipe) as [IngredientId, number][]).every(([id, qty]) => stockOf(inv, id) + EPS >= qty);
}

export function consume(inv: Inventory, id: IngredientId, qty: number): { inv: Inventory; cost: number; shortfall: number } {
  let need = qty;
  let cost = 0;
  const lots: Lot[] = [];
  for (const lot of inv[id]) {
    if (need <= EPS) {
      lots.push(lot);
      continue;
    }
    const take = Math.min(lot.qty, need);
    cost += take * lot.unitCost;
    need -= take;
    if (lot.qty - take > EPS) lots.push({ ...lot, qty: lot.qty - take });
  }
  return { inv: { ...inv, [id]: lots }, cost, shortfall: need > EPS ? need : 0 };
}

export function expire(inv: Inventory, today: number): { inv: Inventory; wasteCost: number; wasted: Usage } {
  let wasteCost = 0;
  const wasted: Usage = {};
  const next = { ...inv };
  for (const id of INGREDIENT_IDS) {
    const kept: Lot[] = [];
    for (const lot of inv[id]) {
      if (lot.expiresDay < today) {
        wasteCost += lot.qty * lot.unitCost;
        wasted[id] = (wasted[id] ?? 0) + lot.qty;
      } else kept.push(lot);
    }
    next[id] = kept;
  }
  return { inv: next, wasteCost: Math.round(wasteCost), wasted };
}

export function dailyUsageEstimate(recent: Usage[], id: IngredientId, fallback: number): number {
  const last = recent.slice(-7);
  if (last.length === 0) return fallback;
  return last.reduce((s, u) => s + (u[id] ?? 0), 0) / last.length;
}

function room(inv: Inventory, id: IngredientId, dailyUsage: number): number {
  return Math.max(0, INGREDIENTS[id].storageMaxDays * dailyUsage - stockOf(inv, id));
}

export function autoReorder(
  inv: Inventory,
  rules: Record<IngredientId, ReorderRule>,
  usage: Record<IngredientId, number>,
  prices: Record<IngredientId, number>,
  today: number,
): { inv: Inventory; spent: number; bought: Usage } {
  let next = inv;
  let spent = 0;
  const bought: Usage = {};
  for (const id of INGREDIENT_IDS) {
    const daily = usage[id];
    if (daily <= 0) continue;
    const stock = stockOf(next, id);
    if (stock >= rules[id].reorderDays * daily) continue;
    const qty = Math.min(rules[id].targetDays * daily - stock, room(next, id, daily));
    if (qty <= EPS) continue;
    next = buy(next, id, qty, prices[id], today);
    spent += Math.round(qty * prices[id]);
    bought[id] = qty;
  }
  return { inv: next, spent, bought };
}

export function manualBuyDays(
  inv: Inventory,
  id: IngredientId,
  days: number,
  usage: Record<IngredientId, number>,
  prices: Record<IngredientId, number>,
  today: number,
): { inv: Inventory; spent: number; capped: boolean } {
  const want = days * usage[id];
  const allowed = room(inv, id, usage[id]);
  const qty = Math.min(want, allowed);
  if (qty <= EPS) return { inv, spent: 0, capped: want > EPS };
  return { inv: buy(inv, id, qty, prices[id], today), spent: Math.round(qty * prices[id]), capped: want > allowed + EPS };
}
