// 한 틱 = 영업 1시간. 개점(11시)에 하루 준비, 매시간 손님 응대, 마감(21시)에 하루 정산.
import {
  APP_ADS_WEEKLY, APP_FEE_RATE, COLA_ATTACH_RATE, DELIVERY_FEE_OWNER, INSULATED_BOX_COST, LABOR_OVERHEAD,
  MISC_COST_PER_PIZZA, PREMIUM_CHEESE_MULT, STAFF_COUNT, UTILITIES_PER_DAY,
} from './balance';
import { accrueCharge, canPlay, consumeTick } from './charge';
import { orderMix, expectedOrders, priceIndex } from './demand';
import { rollWeather, stepEconomyWeek, type Weather } from './economy';
import { INGREDIENT_IDS, ingredientPrice, type IngredientId } from './ingredients';
import { autoReorder, canMake, consume, dailyUsageEstimate, expire, stockOf, type Usage } from './inventory';
import { closeDay, closeMonth, emptyDay } from './ledger';
import { MENU, PIZZA_IDS, type PizzaId } from './menu';
import { NEIGHBORHOODS } from './neighborhoods';
import { fallbackUsage } from './newGame';
import { announceMinWage, applyMinWage, dailyFlavor, demandShock, fireDue, planWeek, shockMultiplier } from './news';
import { satisfaction, updateRating, type Channel } from './ratings';
import { Rng } from './rng';
import { capacityPerHour, serveHour } from './service';
import { CLOSE_HOUR, OPEN_HOUR, TICKS_PER_DAY, calendar, nextTick } from './time';
import type { GameState } from './types';

export type PauseReason =
  | { kind: 'news'; newsId: string }
  | { kind: 'monthEnd'; monthIndex: number }
  | { kind: 'cashNegative' }
  | { kind: 'outOfCharge' };

export interface AnimEvents {
  hour: number;
  hallArrivals: number;
  deliveriesOut: number;
  pizzasBaked: number;
  lostOrders: number;
  revenue: number;
  weather: Weather;
  stockouts: IngredientId[];
}

function addUsage(u: Usage, id: IngredientId, qty: number) {
  u[id] = (u[id] ?? 0) + qty;
}

function openDay(s: GameState, rng: Rng) {
  const n = NEIGHBORHOODS[s.neighborhoodId];
  const cal = calendar(s.clock);
  const day = s.clock.day;
  if (cal.dayOfWeek === 0) {
    s.economy = stepEconomyWeek(s.economy, rng);
    ({ news: s.news, economy: s.economy } = planWeek(s.news, s.economy, day, rng, n.name));
  }
  ({ news: s.news, economy: s.economy } = fireDue(s.news, s.economy, day, rng, n.name));
  if (cal.month === 7 && cal.dayOfMonth === 0) ({ news: s.news, economy: s.economy } = announceMinWage(s.news, s.economy, day, rng));
  if (cal.month === 1 && cal.dayOfMonth === 0) s.economy = applyMinWage(s.economy);
  s.economy = { ...s.economy, weather: rollWeather(cal.season, rng) };

  for (const id of INGREDIENT_IDS) {
    s.prices[id] = ingredientPrice(id, {
      fx: s.economy.fx,
      inflation: s.economy.inflation,
      month: cal.month,
      shockMult: shockMultiplier(s.news.active, id, day),
      noise: 1 + rng.normal(0, 0.02),
    });
  }
  s.today.prices = { ...s.prices };

  const expired = expire(s.inventory, day);
  s.inventory = expired.inv;
  s.today.wasteCost += expired.wasteCost;

  const usage = estimatedUsage(s);
  const order = autoReorder(s.inventory, s.rules, usage, s.prices, day);
  s.inventory = order.inv;
  s.cash -= order.spent;
  s.today.purchases += order.spent;

  if (cal.dayOfMonth === 0 && day > 0) {
    s.cash -= n.listing.monthlyRent;
    s.today.rent += n.listing.monthlyRent;
  }
  s.news = dailyFlavor(s.news, day, rng, n.name);
}

/** 최근 7일 사용량으로 하루 사용량을 추정한다. 콜라 서비스를 켰으면 서비스용 콜라도 배달 주문만큼 잡는다. */
export function estimatedUsage(s: GameState): Record<IngredientId, number> {
  const n = NEIGHBORHOODS[s.neighborhoodId];
  const fallback = fallbackUsage(n);
  const recent = s.ledger.days.map((d) => d.usage);
  const usage = Object.fromEntries(INGREDIENT_IDS.map((id) => [id, dailyUsageEstimate(recent, id, fallback[id])])) as Record<IngredientId, number>;
  if (s.levers.freeCola) usage.cola500 = Math.max(usage.cola500, n.baseDailyOrders * n.deliveryShare);
  return usage;
}

function serveOrders(s: GameState, rng: Rng, anim: AnimEvents) {
  const n = NEIGHBORHOODS[s.neighborhoodId];
  const cal = calendar(s.clock);
  const exp = expectedOrders({
    n, hour: s.clock.hour, isWeekend: cal.isWeekend, economy: s.economy, menuPrices: s.menuPrices,
    ratings: s.ratings, levers: s.levers, shock: demandShock(s.news.active, s.clock.day),
  });
  const served = serveHour(rng.poisson(exp.hall), rng.poisson(exp.delivery), capacityPerHour(s.levers));
  s.today.lostOrders += served.lost;
  anim.lostOrders += served.lost;

  const mix = orderMix(s.menuPrices, s.economy.inflation, n.priceSensitivity, s.economy.cycle);
  const mixList = PIZZA_IDS.map((id) => ({ item: id as PizzaId, weight: mix[id] }));
  const pIndex = priceIndex(s.menuPrices, s.economy.inflation);
  const stockouts = new Set<IngredientId>();

  const serveOne = (ch: Channel) => {
    const pizza = rng.weighted(mixList);
    const recipe = MENU[pizza].recipe;
    for (const [id, qty] of Object.entries(recipe) as [IngredientId, number][]) addUsage(s.today.usage, id, qty);
    if (!canMake(s.inventory, recipe)) {
      for (const [id, qty] of Object.entries(recipe) as [IngredientId, number][]) if (stockOf(s.inventory, id) < qty) stockouts.add(id);
      s.today.stockoutOrders += 1;
      anim.lostOrders += 1;
      return;
    }
    let food = MISC_COST_PER_PIZZA;
    let cashOut = MISC_COST_PER_PIZZA;
    for (const [id, qty] of Object.entries(recipe) as [IngredientId, number][]) {
      const r = consume(s.inventory, id, qty);
      s.inventory = r.inv;
      food += r.cost;
      if (id === 'mozzarella' && s.levers.premiumCheese) {
        const surcharge = r.cost * (PREMIUM_CHEESE_MULT - 1);
        food += surcharge;
        cashOut += surcharge;
      }
    }
    let revenue = s.menuPrices[pizza];
    if (rng.chance(COLA_ATTACH_RATE)) {
      addUsage(s.today.usage, 'cola', 1);
      if (stockOf(s.inventory, 'cola') >= 1) {
        const r = consume(s.inventory, 'cola', 1);
        s.inventory = r.inv;
        food += r.cost;
        revenue += s.menuPrices.cola;
      }
    }
    let gaveCola = false;
    if (ch === 'delivery') {
      const appFee = revenue * APP_FEE_RATE;
      s.today.appFees += appFee;
      s.today.deliveryFees += DELIVERY_FEE_OWNER;
      cashOut += appFee + DELIVERY_FEE_OWNER;
      if (s.levers.insulatedBox) {
        s.today.serviceCost += INSULATED_BOX_COST;
        cashOut += INSULATED_BOX_COST;
      }
      if (s.levers.freeCola) {
        addUsage(s.today.usage, 'cola500', 1);
        if (stockOf(s.inventory, 'cola500') >= 1) {
          const r = consume(s.inventory, 'cola500', 1);
          s.inventory = r.inv;
          s.today.serviceCost += r.cost;
          gaveCola = true;
        }
      }
      s.today.deliveryOrders += 1;
      s.today.revenueDelivery += revenue;
      anim.deliveriesOut += 1;
    } else {
      s.today.hallOrders += 1;
      s.today.revenueHall += revenue;
      anim.hallArrivals += 1;
    }
    s.today.foodCost += food;
    s.cash += revenue - cashOut;
    anim.revenue += revenue;
    anim.pizzasBaked += 1;
    const sat = satisfaction(ch, {
      wait: ch === 'hall' ? served.waitHall : served.waitDelivery,
      priceIndex: pIndex,
      priceSensitivity: n.priceSensitivity,
      levers: s.levers,
      gaveCola,
    }, rng);
    s.ratings = updateRating(s.ratings, ch, sat, s.levers);
  };

  for (let i = 0; i < served.servedHall; i++) serveOne('hall');
  for (let i = 0; i < served.servedDelivery; i++) serveOne('delivery');
  anim.stockouts = [...stockouts];
}

function closeDayInPlace(s: GameState, pauses: PauseReason[]) {
  const cal = calendar(s.clock);
  const labor = Math.round((STAFF_COUNT - 1) * TICKS_PER_DAY * s.economy.minWage * LABOR_OVERHEAD);
  s.today.labor += labor;
  s.today.utilities += UTILITIES_PER_DAY;
  s.cash -= labor + UTILITIES_PER_DAY;
  // 배달앱 광고비는 켜 둔 날마다 하루치(주 광고비의 1/7)씩 나간다.
  if (s.levers.appAds) {
    const adsToday = Math.round(APP_ADS_WEEKLY / 7);
    s.today.ads += adsToday;
    s.cash -= adsToday;
  }
  s.today.foodCost = Math.round(s.today.foodCost);
  s.today.appFees = Math.round(s.today.appFees);
  s.today.serviceCost = Math.round(s.today.serviceCost);
  s.ledger = closeDay(s.ledger, s.today);
  if (cal.dayOfMonth === 27) {
    s.ledger = closeMonth(s.ledger, cal.monthIndex);
    pauses.push({ kind: 'monthEnd', monthIndex: cal.monthIndex });
  }
}

export function advanceTickInPlace(s: GameState): { pauses: PauseReason[]; anim: AnimEvents } {
  const rng = new Rng(s.rngState);
  const pauses: PauseReason[] = [];
  const firstNewId = s.news.nextId;
  const anim: AnimEvents = {
    hour: s.clock.hour, hallArrivals: 0, deliveriesOut: 0, pizzasBaked: 0, lostOrders: 0, revenue: 0,
    weather: s.economy.weather, stockouts: [],
  };

  if (s.clock.hour === OPEN_HOUR) openDay(s, rng);
  anim.weather = s.economy.weather;
  serveOrders(s, rng, anim);
  if (s.clock.hour === CLOSE_HOUR - 1) closeDayInPlace(s, pauses);

  for (const item of s.news.items) {
    if (item.important && Number(item.id.slice(1)) >= firstNewId) pauses.push({ kind: 'news', newsId: item.id });
  }
  if (s.cash < 0 && !s.cashNegative) {
    s.cashNegative = true;
    pauses.push({ kind: 'cashNegative' });
  } else if (s.cash >= 0) {
    s.cashNegative = false;
  }

  const next = nextTick(s.clock);
  if (next.day !== s.clock.day) s.today = emptyDay(next.day, calendar(next).monthIndex);
  s.clock = next;
  s.rngState = rng.state;
  return { pauses, anim };
}

export function advanceTick(s: GameState): { state: GameState; pauses: PauseReason[]; anim: AnimEvents } {
  const state = structuredClone(s);
  const r = advanceTickInPlace(state);
  return { state, ...r };
}

export function playTick(s: GameState, nowMs: number): { state: GameState; pauses: PauseReason[]; anim: AnimEvents } | null {
  const charge = accrueCharge(s.charge, nowMs);
  if (!canPlay(charge)) return null;
  const state = structuredClone(s);
  state.charge = consumeTick(charge);
  const r = advanceTickInPlace(state);
  return { state, ...r };
}
