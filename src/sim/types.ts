import type { ChargeState } from './charge';
import type { Economy } from './economy';
import type { IngredientId } from './ingredients';
import type { Inventory, ReorderRule } from './inventory';
import type { DayRecord, Ledger } from './ledger';
import type { Levers } from './levers';
import type { MenuItemId } from './menu';
import type { NeighborhoodId } from './neighborhoods';
import type { NewsState } from './news';
import type { Ratings } from './ratings';
import type { Clock } from './time';

export interface GameState {
  version: 1;
  seed: number;
  rngState: number;
  createdAt: number;
  shopName: string;
  neighborhoodId: NeighborhoodId;
  clock: Clock;
  cash: number;
  cashNegative: boolean;
  economy: Economy;
  prices: Record<IngredientId, number>;
  menuPrices: Record<MenuItemId, number>;
  levers: Levers;
  ratings: Ratings;
  inventory: Inventory;
  rules: Record<IngredientId, ReorderRule>;
  news: NewsState;
  ledger: Ledger;
  today: DayRecord;
  charge: ChargeState;
}
