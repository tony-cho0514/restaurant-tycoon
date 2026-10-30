// 한 틱 = 영업 1시간. 개점(11시)에 하루 준비, 매시간 손님 응대, 마감(21시)에 하루 정산.
import {
  APP_ADS_WEEKLY, APP_FEE_RATE, CARD_FEE_RATE, COLA_ATTACH_RATE, DELIVERY_COST_TOTAL, INSULATED_BOX_COST,
  MISC_COST_PER_PIZZA, PREMIUM_CHEESE_MULT, STRESS_EVENT, STRESS_TIRED, TIRED_MISTAKE_CHANCE, UTILITIES_PER_HOUR,
} from './balance';
import { accrueCharge, canPlay, consumeTick } from './charge';
import { orderMix, expectedOrders, priceIndex } from './demand';
import { rollWeather, stepEconomyWeek, type Weather } from './economy';
import { INGREDIENT_IDS, ingredientPrice, type IngredientId } from './ingredients';
import { autoReorder, canMake, consume, dailyUsageEstimate, expire, stockOf, type Usage } from './inventory';
import { closeDay, closeMonth, emptyDay, notePaid } from './ledger';
import { MENU, activePizzas, type PizzaId } from './menu';
import { NEIGHBORHOODS } from './neighborhoods';
import { fallbackUsage } from './newGame';
import { pruneOrders, type OrderRecord } from './orders';
import { dailyLabor } from './labor';
import { absenceMessages, dayEndMessage, fromNews, hourMessages, pushMessage, tiredMessage, type ReviewSeed } from './messages';
import { dayEndLearning, monthEndLearning, startShock } from './learning';
import { checkGuide } from './guide';
import { badEventRoom } from './pressure';
import { currentRent, leaseMorning } from './lease';
import { distressEvening, payLoanInPlace } from './bank';
import { yearEndReport } from './yearEnd';
import { regularsEvening } from './regulars';
import { MONSOON_DELIVERY_DELAY, inMonsoon, localDemand, localEvening, localEventsIn, localMorning, monsoonRain, planLocalWeek } from './localEvents';
import { dayEndFollowUps, dueCoupons, settleCoupons } from './replies';
import { announceMinWage, applyMinWage, dailyFlavor, demandShock, fireDue, planWeek, shockMultiplier, type NewsItem } from './news';
import { satisfaction, updateRating, type Channel } from './ratings';
import { Rng } from './rng';
import { serveHour } from './service';
import { addStress, moodBonus, ownerAway, ownerCheck, ownerEvening, ownerHour, ownerMorning, ownerWorking } from './owner';
import { arriveApplicants, capacityAt, kindnessBonus, raiseToMinWage, shiftHours, staffEvening, staffMorning, staffWorking } from './staffing';
import { failMissedGroups, fulfillGroupsAt, morningGroupOffers } from './groupOrders';
import { bikeMinutes, hallSeatCap, interiorBonus, signMult, storageMult } from './upgradeOps';
import { TICKS_PER_DAY, calendar, nextTick } from './time';
import type { GameState } from './types';

const CASH_WARNING_RESET = 100_000;

export type PauseReason =
  | { kind: 'news'; newsId: string }
  | { kind: 'monthEnd'; monthIndex: number }
  | { kind: 'cashNegative' }
  | { kind: 'outOfCharge' }
  | { kind: 'groupOffer'; offerId: number }
  | { kind: 'distress' }
  | { kind: 'closed' }
  | { kind: 'yearEnd'; year: number };

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

const combine = (a: { hall: number; delivery: number }, b: { hall: number; delivery: number }) => ({ hall: a.hall * b.hall, delivery: a.delivery * b.delivery });

function addUsage(u: Usage, id: IngredientId, qty: number) {
  u[id] = (u[id] ?? 0) + qty;
}

function openDay(s: GameState, rng: Rng): number[] {
  const n = NEIGHBORHOODS[s.neighborhoodId];
  const cal = calendar(s.clock);
  const day = s.clock.day;
  ownerMorning(s);
  leaseMorning(s);
  if (cal.dayOfWeek === 0) {
    s.economy = stepEconomyWeek(s.economy, rng);
    ({ news: s.news, economy: s.economy } = planWeek(s.news, s.economy, day, rng, n.name, badEventRoom(s, day)));
    planLocalWeek(s, rng, badEventRoom(s, day));
  }
  ({ news: s.news, economy: s.economy } = fireDue(s.news, s.economy, day, rng, n.name));
  if (cal.month === 7 && cal.dayOfMonth === 0) ({ news: s.news, economy: s.economy } = announceMinWage(s.news, s.economy, day, rng));
  if (cal.month === 1 && cal.dayOfMonth === 0) {
    s.economy = applyMinWage(s.economy);
    Object.assign(s, raiseToMinWage(s));
  }
  s.economy = { ...s.economy, weather: monsoonRain(day, rng) ? 'rain' : rollWeather(cal.season, rng) };

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
  const order = autoReorder(s.inventory, s.rules, usage, s.prices, day, storageMult(s));
  s.inventory = order.inv;
  s.cash -= order.spent;
  s.today.purchases += order.spent;

  if (cal.dayOfMonth === 0 && day > 0) {
    const rent = currentRent(s);
    s.cash -= rent;
    s.today.rent += rent;
    payLoanInPlace(s);
  }
  s.news = dailyFlavor(s.news, day, rng, n.name);
  if (!isClosedToday(s)) {
    const before = s.staff.length;
    Object.assign(s, staffMorning(s, rng, cal.dayOfWeek === 0));
    if (!ownerAway(s)) {
      const quit = before - s.staff.length;
      const absent = (s.absentToday ?? []).length;
      if (quit > 0) addStress(s, '알바가 그만둠', quit * STRESS_EVENT.staffQuit);
      if (absent > 0) addStress(s, '알바 결근', absent * STRESS_EVENT.staffAbsent);
    }
    absenceMessages(s);
  }
  Object.assign(s, arriveApplicants(s, rng));
  localMorning(s);
  const g = morningGroupOffers(s, rng);
  Object.assign(s, g.state);
  return g.newOffers;
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
    ratings: s.ratings, levers: s.levers, shock: combine(demandShock(s.news.active, s.clock.day), localDemand(s, s.clock.day)),
    deliveryTip: s.settings.deliveryTip,
    active: s.menuActive,
  });
  const hour = s.clock.hour;
  const staffOnDuty = staffWorking(s, hour).length;
  // 사장님도 알바도 없는 시간엔 문을 닫는다(약속한 단체 주문은 못 만들고 실패).
  if (!ownerWorking(s, hour) && staffOnDuty === 0) {
    fulfillGroupsAt(s, 0);
    ownerHour(s, hour, 0, 0);
    return;
  }
  // 단체 주문을 먼저 만들고, 남은 일손으로 손님을 받는다.
  const groupMade = fulfillGroupsAt(s, capacityAt(s, s.clock.hour));
  anim.pizzasBaked += groupMade;
  // 쿠폰 받고 다시 오는 손님은 평소 손님에 더해진다.
  const coupons = dueCoupons(s, hour);
  const extra = (ch: Channel) => coupons.filter((c) => c.channel === ch).length;
  // 홀은 자리만큼만 받는다(넘친 손님은 그냥 돌아감).
  const hallArrivals = rng.poisson(exp.hall * signMult(s)) + extra('hall');
  const seatLost = Math.max(0, hallArrivals - Math.floor(hallSeatCap(s)));
  const served = serveHour(hallArrivals - seatLost, rng.poisson(exp.delivery) + extra('delivery'), Math.max(0, capacityAt(s, s.clock.hour) - groupMade));
  s.today.lostOrders += served.lost + seatLost;
  anim.lostOrders += served.lost + seatLost;
  const hallBonus = interiorBonus(s) + kindnessBonus(s, s.clock.hour) + moodBonus(s, hour);
  ownerHour(s, hour, staffOnDuty, served.lost + seatLost);

  const mix = orderMix(s.menuPrices, s.economy.inflation, n.priceSensitivity, s.economy.cycle, s.menuActive, n.prefs);
  const mixList = activePizzas(s.menuActive).map((id) => ({ item: id as PizzaId, weight: mix[id] }));
  const pIndex = priceIndex(s.menuPrices, s.economy.inflation, s.menuActive);
  const zoneList = n.zones.map((z) => ({ item: z, weight: z.share }));
  const stockouts = new Set<IngredientId>();
  const seeds: ReviewSeed[] = [];

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
      notePaid(s.today, id, qty, r.cost);
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
        notePaid(s.today, 'cola', 1, r.cost);
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
      // 장마철 비 오는 날엔 배달 기사가 모자라 더 늦는다.
      const rainDelay = inMonsoon(s.clock.day) && s.economy.weather === 'rain' ? MONSOON_DELIVERY_DELAY : 0;
      minutes = Math.max(15, Math.round(served.waitDelivery + z.extraMin + rainDelay - bikeMinutes(s)));
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
          notePaid(s.today, 'cola500', 1, r.cost);
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
      hallBonus,
    }, rng);
    s.ratings = updateRating(s.ratings, ch, sat, s.levers);
    seeds.push({ ch, sat, wait: ch === 'hall' ? served.waitHall : (minutes ?? served.waitDelivery), pizza, gaveCola });
  };

  for (let i = 0; i < served.servedHall; i++) serveOne('hall');
  for (let i = 0; i < served.servedDelivery; i++) serveOne('delivery');
  anim.stockouts = [...stockouts];
  settleCoupons(s, coupons, seeds);
  hourMessages(s, {
    seeds, priceIndex: pIndex, hallBonus, mood: moodBonus(s, hour), stockouts: anim.stockouts,
    staffNames: staffWorking(s, hour).map((x) => x.name), usage: estimatedUsage(s),
    openHour: s.settings.openHour, closeHour: s.settings.closeHour,
  });

  // 지친 사장님은 가끔 피자를 망쳐 버린다.
  if (ownerWorking(s, hour) && s.owner.stress >= STRESS_TIRED && rng.chance(TIRED_MISTAKE_CHANCE)) {
    const recipe = MENU[rng.weighted(mixList)].recipe;
    if (canMake(s.inventory, recipe)) {
      for (const [id, qty] of Object.entries(recipe) as [IngredientId, number][]) {
        addUsage(s.today.usage, id, qty);
        const r = consume(s.inventory, id, qty);
        s.inventory = r.inv;
        s.today.wasteCost += r.cost;
      }
    }
  }
}

/** 오늘 가게에 누군가(사장님이나 알바) 있었던 영업시간 수 */
function hoursOpenToday(s: GameState): number {
  let n = 0;
  for (let h = s.settings.openHour; h < s.settings.closeHour; h++) if (ownerWorking(s, h) || staffWorking(s, h).length > 0) n++;
  return n;
}

function openHours(s: GameState): number {
  return Math.max(1, s.settings.closeHour - s.settings.openHour);
}

function isClosedToday(s: GameState): boolean {
  return s.settings.closedDay !== null && calendar(s.clock).dayOfWeek === s.settings.closedDay;
}

/** 이번 틱이 쓰는 충전: 휴무일은 0, 아니면 표준 하루(11)를 영업시간으로 나눈 만큼. */
export function tickCost(s: GameState): number {
  // 휴무일은 그날 첫 틱에서 바로 넘어간다. 이미 연 날을 휴무로 바꾸면 내일부터 적용.
  return s.openedDay !== s.clock.day && isClosedToday(s) ? 0 : TICKS_PER_DAY / openHours(s);
}

function closeDayInPlace(s: GameState, pauses: PauseReason[], closed: boolean) {
  const cal = calendar(s.clock);
  if (!closed) {
    const hours = openHours(s);
    const openDays = 7 - (s.settings.closedDay === null ? 0 : 1);
    const absent = s.absentToday ?? [];
    const labor = s.staff.filter((x) => !absent.includes(x.id)).reduce((a, x) => {
      const h = shiftHours(s, x.shift);
      return a + dailyLabor(h, x.wage, h * openDays);
    }, 0);
    // 전기·가스는 실제로 문을 연 시간만큼(사장님이 쉬고 알바도 없는 시간은 닫음)
    const utilities = Math.round(UTILITIES_PER_HOUR * Math.min(hours, hoursOpenToday(s)));
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
  failMissedGroups(s);
  if (!closed) Object.assign(s, staffEvening(s));
  const revenue = s.today.revenueHall + s.today.revenueDelivery;
  const record = !closed && s.ledger.days.length >= 7 && revenue > Math.max(...s.ledger.days.map((d) => d.revenueHall + d.revenueDelivery));
  ownerEvening(s, closed, record);
  dayEndMessage(s, closed, record);
  regularsEvening(s);
  dayEndFollowUps(s);
  s.ledger = closeDay(s.ledger, s.today);
  s.orders = pruneOrders(s.orders, s.clock.day);
  dayEndLearning(s);
  localEvening(s);
  const distress = distressEvening(s);
  if (distress) pauses.push({ kind: distress === 'warn' ? 'distress' : 'closed' });
  if (cal.dayOfMonth === 27) {
    s.ledger = closeMonth(s.ledger, cal.monthIndex);
    const from = cal.monthIndex * 28;
    monthEndLearning(s, cal.monthIndex, localEventsIn(s, from, from + 27));
    const year = yearEndReport(s, cal.monthIndex);
    if (year) {
      s.learning = { ...s.learning, years: [...(s.learning.years ?? []), year] };
      pushMessage(s, { from: 'book', name: '1년 결산', tone: year.profit >= 0 ? 'good' : 'bad', important: true, action: 'learn', text: `${year.year}년차 결산이 나왔어요. ${year.titles.join(' · ')}` });
      pauses.push({ kind: 'yearEnd', year: year.year });
    } else {
      pauses.push({ kind: 'monthEnd', monthIndex: cal.monthIndex });
    }
  }
}

/** 멈춰서 알릴 소식: 실제로 터진 위기·기회, 그리고 바로 챙길 일(채용·퇴사·최저임금·번아웃). 신호와 작은 소식은 말풍선으로만 뜬다. */
export function pausesFor(n: NewsItem): boolean {
  return n.important && n.kind !== 'signal';
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
  if (s.closed) return { pauses, anim };
  let dayOver = false;

  // 새 날의 첫 틱: 여는 시각에 맞추고 개점 준비(경제·뉴스·시세·폐기·발주·월세).
  if (s.openedDay !== s.clock.day) {
    s.clock = { day: s.clock.day, hour: openHour }; // 아직 문을 안 열었으니 (바뀐) 여는 시각부터
    for (const offerId of openDay(s, rng)) pauses.push({ kind: 'groupOffer', offerId });
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

  const wentNegative = s.cash < 0 && !s.cashNegative;
  if (wentNegative) {
    s.cashNegative = true;
    addStress(s, '통장 마이너스', STRESS_EVENT.cashNegative);
  } else if (s.cash >= CASH_WARNING_RESET) {
    // 0 근처를 오르내릴 때마다 멈추지 않도록, 넉넉히 회복해야 다시 경고한다.
    s.cashNegative = false;
  }
  const isNew = (id: string) => Number(id.slice(1)) >= firstNewId;
  for (const item of s.news.items) if (isNew(item.id) && item.kind === 'fire' && item.tone === 'bad') addStress(s, '나쁜 소식', STRESS_EVENT.badNews);
  if (ownerCheck(s, dayOver) === 'tired') tiredMessage(s);

  // 새 소식은 모두 메시지로 오고, 그중 큰일만 멈춰서 알린다.
  for (const item of s.news.items) {
    if (!isNew(item.id)) continue;
    pushMessage(s, fromNews(item, s.clock.hour));
    startShock(s, item);
    if (pausesFor(item)) pauses.push({ kind: 'news', newsId: item.id });
  }
  if (wentNegative) pauses.push({ kind: 'cashNegative' });

  if (dayOver) goToNextDay(s);
  else s.clock = nextTick(s.clock, s.settings);
  s.rngState = rng.state;
  const guided = checkGuide(s);
  if (guided !== s) Object.assign(s, guided);
  return { pauses, anim };
}

export function advanceTick(s: GameState): { state: GameState; pauses: PauseReason[]; anim: AnimEvents } {
  const state = structuredClone(s);
  const r = advanceTickInPlace(state);
  return { state, ...r };
}

export function playTick(s: GameState, nowMs: number): { state: GameState; pauses: PauseReason[]; anim: AnimEvents } | null {
  if (s.closed) return null;
  const charge = accrueCharge(s.charge, nowMs);
  const cost = tickCost(s);
  if (!canPlay(charge, cost)) return null;
  const state = structuredClone(s);
  state.charge = consumeTick(charge, cost);
  const r = advanceTickInPlace(state);
  return { state, ...r };
}
