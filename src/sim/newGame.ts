import { COLA_ATTACH_RATE, START_OPERATING_CASH } from './balance';
import { NEW_GAME_CHARGE_TICKS } from './charge';
import { initialEconomy } from './economy';
import { INGREDIENT_IDS, ingredientPrice, type IngredientId } from './ingredients';
import { DEFAULT_RULES, autoReorder, emptyInventory } from './inventory';
import { emptyDay } from './ledger';
import { initialLearning } from './learning';
import { initialLocal } from './localEvents';
import { initialGuide } from './guide';
import { initialBank } from './bank';
import { initialMessages } from './messages';
import { MENU, activePizzas, defaultMenuActive, type MenuActive, type MenuItemId } from './menu';
import { initialOwner } from './owner';
import { initialStaff } from './staff';
import { defaultUpgrades } from './upgrades';
import type { NewsState } from './news';
import { NEIGHBORHOODS, type Neighborhood, type NeighborhoodId } from './neighborhoods';
import { Rng } from './rng';
import { START_MONTH } from './time';
import { DEFAULT_SETTINGS, type GameState } from './types';

/** 기본 주문 수로 계산한 하루 재료 사용량. 판매 기록이 쌓이기 전 발주 기준이 된다. */
export function fallbackUsage(n: Neighborhood, active?: Partial<MenuActive>): Record<IngredientId, number> {
  const usage = Object.fromEntries(INGREDIENT_IDS.map((id) => [id, 0])) as Record<IngredientId, number>;
  const ids = activePizzas(active);
  const baseSum = ids.reduce((s, id) => s + MENU[id].baseMix, 0);
  for (const id of ids) {
    for (const [ing, qty] of Object.entries(MENU[id].recipe) as [IngredientId, number][]) {
      usage[ing] += (MENU[id].baseMix / baseSum) * qty * n.baseDailyOrders;
    }
  }
  usage.cola = COLA_ATTACH_RATE * n.baseDailyOrders;
  return usage;
}

export function createNewGame(o: { seed: number; neighborhoodId: NeighborhoodId; shopName: string; nowMs: number }): GameState {
  const n = NEIGHBORHOODS[o.neighborhoodId];
  const rng = new Rng(o.seed);
  const economy = initialEconomy(rng);
  const prices = Object.fromEntries(
    INGREDIENT_IDS.map((id) => [id, ingredientPrice(id, { fx: economy.fx, inflation: economy.inflation, month: START_MONTH, shockMult: 1, noise: 1 })]),
  ) as Record<IngredientId, number>;
  const today = emptyDay(0, 0);
  const rules = structuredClone(DEFAULT_RULES);
  const stock = autoReorder(emptyInventory(), rules, fallbackUsage(n), prices, 0);
  today.rent = n.listing.monthlyRent;
  today.purchases = stock.spent;
  const news: NewsState = {
    pending: [],
    active: [],
    items: [{
      id: 'n1', day: 0, kind: 'announce', important: true, tone: 'good',
      headline: `「${o.shopName}」 개업!`,
      body: `${n.name}에 작은 피자집이 문을 열었다. 첫 손님을 맞을 준비가 끝났다.`,
    }],
    nextId: 2,
  };
  return {
    version: 3,
    seed: o.seed,
    rngState: rng.state,
    createdAt: o.nowMs,
    shopName: o.shopName,
    neighborhoodId: o.neighborhoodId,
    clock: { day: 0, hour: 11 },
    cash: START_OPERATING_CASH,
    cashNegative: false,
    economy,
    prices,
    menuPrices: Object.fromEntries(Object.entries(MENU).map(([k, v]) => [k, v.defaultPrice])) as Record<MenuItemId, number>,
    levers: { freeCola: false, premiumCheese: false, insulatedBox: false, reviewReplies: false, appAds: false },
    ratings: { hall: 4.5, delivery: 4.5 },
    inventory: stock.inv,
    rules,
    news,
    ledger: { days: [], months: [] },
    today,
    charge: { ticks: NEW_GAME_CHARGE_TICKS, lastAccruedAt: o.nowMs },
    settings: { ...DEFAULT_SETTINGS },
    orders: [],
    openedDay: -1,
    menuActive: defaultMenuActive(),
    menuDeveloped: { cheese: true, pepperoni: true, combo: true, cola: true },
    staff: [initialStaff(economy.minWage, o.neighborhoodId === 'office' ? 'lunch' : 'dinner')],
    applicants: [],
    jobPost: null,
    upgrades: defaultUpgrades(),
    groupOffers: [],
    groupOrders: [],
    nextStaffId: 2,
    owner: initialOwner({ hall: 4.5, delivery: 4.5 }),
    messages: initialMessages(news.items, true),
    learning: initialLearning(),
    local: initialLocal(),
    guide: initialGuide(),
    bank: initialBank(),
  };
}
