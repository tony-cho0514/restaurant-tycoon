import type { ChargeState } from './charge';
import type { Economy } from './economy';
import type { IngredientId } from './ingredients';
import type { Inventory, ReorderRule } from './inventory';
import type { DayRecord, Ledger } from './ledger';
import type { Levers } from './levers';
import type { MenuItemId } from './menu';
import type { NeighborhoodId } from './neighborhoods';
import type { NewsState } from './news';
import type { OrderRecord } from './orders';
import type { Ratings } from './ratings';
import type { Clock } from './time';

export interface GameState {
  version: 2;
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
  /** 운영 설정: 여는·닫는 시각(닫는 시각은 그 시각에 문을 닫음), 정기 휴무 요일(0=월), 손님이 내는 배달팁 */
  settings: Settings;
  /** 최근 7일 주문 기록 */
  orders: OrderRecord[];
  /** 개점 준비를 마친 마지막 날(하루에 한 번만 개점 처리) */
  openedDay: number;
}

export interface Settings {
  openHour: number;
  closeHour: number;
  closedDay: number | null;
  deliveryTip: number;
}

export const DEFAULT_SETTINGS: Settings = { openHour: 11, closeHour: 22, closedDay: null, deliveryTip: 1000 };
