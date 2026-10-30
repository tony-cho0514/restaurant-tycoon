// 한 틱 = 영업 1시간. 개점(11시)에 하루 준비, 매시간 손님 응대, 마감(21시)에 하루 정산.
import {
  APP_ADS_WEEKLY, APP_FEE_RATE, CARD_FEE_RATE, COLA_ATTACH_RATE, DELIVERY_COST_TOTAL, INSULATED_BOX_COST,
  MISC_COST_PER_PIZZA, PREMIUM_CHEESE_MULT, STAFF_COUNT, UTILITIES_PER_HOUR,
} from './balance';
import { accrueCharge, canPlay, consumeTick } from './charge';
import { orderMix, expectedOrders, priceIndex } from './demand';
import { rollWeather, stepEconomyWeek, type Weather } from './economy';
import { INGREDIENT_IDS, ingredientPrice, type IngredientId } from './ingredients';
import { autoReorder, canMake, consume, dailyUsageEstimate, expire, stockOf, type Usage } from './inventory';
import { closeDay, closeMonth, emptyDay } from './ledger';
import { MENU, activePizzas, type PizzaId } from './menu';
import { NEIGHBORHOODS } from './neighborhoods';
import { fallbackUsage } from './newGame';
import { pruneOrders, type OrderRecord } from './orders';
import { dailyLabor } from './labor';
import { announceMinWage, applyMinWage, dailyFlavor, demandShock, fireDue, planWeek, shockMultiplier } from './news';
import { satisfaction, updateRating, type Channel } from './ratings';
import { Rng } from './rng';
import { capacityPerHour, serveHour } from './service';
import { TICKS_PER_DAY, calendar, nextTick } from './time';
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
  const fallback = fallbackUsage(n, s.menuActive);
  const recent = s.ledger.days.map((d) => d.usage);
  // 기록이 적은 새 메뉴 재료도 모자라지 않게, 기본 예상치의 60%는 늘 잡아 둔다.
  const usage = Object.fromEntries(INGREDIENT_IDS.map((id) => [id, Math.max(dailyUsageEstimate(recent, id, fallback[id]), 0.6 * fallback[id])])) as Record<IngredientId, number>;
  if (s.levers.freeCola) usage.cola500 = Math.max(usage.cola500, n.baseDailyOrders * n.deliveryShare);
  return usage;
}

function serveOrders(s: GameState, rng: Rng, anim: AnimEvents) {
  const n = NEIGHBORHOODS[s.neighborhoodId];
  const cal = calendar(s.clock);
  const exp = expectedOrders({
    n, hour: s.clock.hour, isWeekend: cal.isWeekend, economy: s.economy, menuPrices: s.menuPrices,
    ratings: s.ratings, levers: s.levers, shock: demandShock(s.news.active, s.clock.day),
    deliveryTip: s.settings.deliveryTip,
    active: s.menuActive,
  });
  const served = serveHour(rng.poisson(exp.hall), rng.poisson(exp.delivery), capacityPerHour(s.levers));
  s.today.lostOrders += served.lost;
  anim.lostOrders += served.lost;

  const mix = orderMix(s.menuPrices, s.economy.inflation, n.priceSensitivity, s.economy.cycle, s.menuActive, n.prefs);
  const mixList = activePizzas(s.menuActive).map((id) => ({ item: id as PizzaId, weight: mix[id] }));
  const pIndex = priceIndex(s.menuPrices, s.economy.inflation, s.menuActive);
  const zoneList = n.zones.map((z) => ({ item: z, weight: z.share }));
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
    const items: OrderRecord['items'] = [{ menu: pizza, qty: 1 }];
    if (rng.chance(COLA_ATTACH_RATE)) {
      addUsage(s.today.usage, 'cola', 1);
      if (stockOf(s.inventory, 'cola') >= 1) {
        const r = consume(s.inventory, 'cola', 1);
        s.inventory = r.inv;
        food += r.cost;
        revenue += s.menuPrices.cola;
        items.push({ menu: 'cola', qty: 1 });
      }
    }
    let gaveCola = false;
    let zone: string | undefined;
    let minutes: number | undefined;
    if (ch === 'delivery') {
      const z = rng.weighted(zoneList);
      zone = z.name;
      minutes = Math.round(served.waitDelivery + z.extraMin);
      const appFee = revenue * APP_FEE_RATE;
      s.today.appFees += appFee;
      const ownerDelivery = DELIVERY_COST_TOTAL - s.settings.deliveryTip;
      s.today.deliveryFees += ownerDelivery;
      cashOut += appFee + ownerDelivery;
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
      const cardFee = revenue * CARD_FEE_RATE;
      s.today.cardFees += cardFee;
      cashOut += cardFee;
      anim.hallArrivals += 1;
    }
    s.orders.push({ day: s.clock.day, hour: s.clock.hour, channel: ch, items, amount: revenue, zone, minutes });
    s.today.foodCost += food;
    s.cash += revenue - cashOut;
    anim.revenue += revenue;
    anim.pizzasBaked += 1;
    const sat = satisfaction(ch, {
      wait: ch === 'hall' ? served.waitHall : (minutes ?? served.waitDelivery),
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

function openHours(s: GameState): number {
  return Math.max(1, s.settings.closeHour - s.settings.openHour);
}

function isClosedToday(s: GameState): boolean {
  return s.settings.closedDay !== null && calendar(s.clock).dayOfWeek === s.settings.closedDay;
}

/** 이번 틱이 쓰는 충전: 휴무일은 0, 아니면 표준 하루(11)를 영업시간으로 나눈 만큼. */
export function tickCost(s: GameState): number {
  return isClosedToday(s) ? 0 : TICKS_PER_DAY / openHours(s);
}

function closeDayInPlace(s: GameState, pauses: PauseReason[], closed: boolean) {
  const cal = calendar(s.clock);
  if (!closed) {
    const hours = openHours(s);
    const openDays = 7 - (s.settings.closedDay === null ? 0 : 1);
    const labor = (STAFF_COUNT - 1) * dailyLabor(hours, s.economy.minWage, hours * openDays);
    const utilities = Math.round(UTILITIES_PER_HOUR * hours);
    s.today.labor += labor;
    s.today.utilities += utilities;
    s.cash -= labor + utilities;
  }
  // 배달앱 광고비는 켜 둔 날마다 하루치(주 광고비의 1/7)씩 나간다(휴무일에도 광고는 계속 나간다).
  if (s.levers.appAds) {
    const adsToday = Math.round(APP_ADS_WEEKLY / 7);
    s.today.ads += adsToday;
    s.cash -= adsToday;
  }
  s.today.foodCost = Math.round(s.today.foodCost);
  s.today.appFees = Math.round(s.today.appFees);
  s.today.cardFees = Math.round(s.today.cardFees);
  s.today.serviceCost = Math.round(s.today.serviceCost);
  s.ledger = closeDay(s.ledger, s.today);
  s.orders = pruneOrders(s.orders, s.clock.day);
  if (cal.dayOfMonth === 27) {
    s.ledger = closeMonth(s.ledger, cal.monthIndex);
    pauses.push({ kind: 'monthEnd', monthIndex: cal.monthIndex });
  }
}

function goToNextDay(s: GameState) {
  const next = { day: s.clock.day + 1, hour: s.settings.openHour };
  s.today = emptyDay(next.day, calendar(next).monthIndex);
  s.clock = next;
}

export function advanceTickInPlace(s: GameState): { pauses: PauseReason[]; anim: AnimEvents } {
  const rng = new Rng(s.rngState);
  const pauses: PauseReason[] = [];
  const firstNewId = s.news.nextId;
  const anim: AnimEvents = {
    hour: s.clock.hour, hallArrivals: 0, deliveriesOut: 0, pizzasBaked: 0, lostOrders: 0, revenue: 0,
    weather: s.economy.weather, stockouts: [],
  };
  const { openHour, closeHour } = s.settings;
  let dayOver = false;

  // 새 날의 첫 틱: 여는 시각에 맞추고 개점 준비(경제·뉴스·시세·폐기·발주·월세).
  if (s.openedDay !== s.clock.day) {
    s.clock = { day: s.clock.day, hour: openHour }; // 아직 문을 안 열었으니 (바뀐) 여는 시각부터
    openDay(s, rng);
    s.openedDay = s.clock.day;
    if (isClosedToday(s)) {
      closeDayInPlace(s, pauses, true);
      dayOver = true;
    }
  }
  anim.hour = s.clock.hour;
  anim.weather = s.economy.weather;
  if (!dayOver && s.clock.hour >= closeHour) {
    // 영업 중에 닫는 시각을 앞당긴 경우: 손님을 받지 않고 바로 마감
    closeDayInPlace(s, pauses, false);
    dayOver = true;
  }
  if (!dayOver) {
    serveOrders(s, rng, anim);
    if (s.clock.hour >= closeHour - 1) {
      closeDayInPlace(s, pauses, false);
      dayOver = true;
    }
  }

  for (const item of s.news.items) {
    if (item.important && Number(item.id.slice(1)) >= firstNewId) pauses.push({ kind: 'news', newsId: item.id });
  }
  if (s.cash < 0 && !s.cashNegative) {
    s.cashNegative = true;
    pauses.push({ kind: 'cashNegative' });
  } else if (s.cash >= 0) {
    s.cashNegative = false;
  }

  if (dayOver) goToNextDay(s);
  else s.clock = nextTick(s.clock, s.settings);
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
  const cost = tickCost(s);
  if (!canPlay(charge, cost)) return null;
  const state = structuredClone(s);
  state.charge = consumeTick(charge, cost);
  const r = advanceTickInPlace(state);
  return { state, ...r };
}
