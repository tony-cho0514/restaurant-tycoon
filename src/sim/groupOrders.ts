// 단체 주문: 동네마다 성격이 다른 큰 주문. 개점 때 제안이 오고, 받으면 약속 한 시간 전부터 미리 만들어 약속 시각에 보낸다.
import { DELIVERY_COST_TOTAL, MISC_COST_PER_PIZZA, PREMIUM_CHEESE_MULT } from './balance';
import type { GroupOffer } from './groups';
import { canMake, consume, type Inventory } from './inventory';
import type { IngredientId } from './ingredients';
import { MENU, activePizzas, type PizzaId } from './menu';
import type { NeighborhoodId } from './neighborhoods';
import { pushNews } from './news';
import type { Rng } from './rng';
import { capacityAt } from './staffing';
import { calendar } from './time';
import type { GameState } from './types';

const TEMPLATES: Record<NeighborhoodId, { titles: string[]; qty: [number, number]; hours: number[]; chance: number; weekend: boolean | null }> = {
  residential: { titles: ['은행나무 교회 주일 모임', '학원 수강생 간식', '아파트 부녀회 모임', '어린이집 생일 파티'], qty: [8, 15], hours: [12, 18], chance: 0.12, weekend: true },
  office: { titles: ['유리타워 3층 팀 회의', '공공기관 야근 간식', '스타트업 회식', '부서 워크숍'], qty: [10, 20], hours: [12, 19], chance: 0.1, weekend: false },
  campus: { titles: ['동아리 정기 모임', 'MT 야식', '시험 기간 과방 야식', '학생회 행사'], qty: [12, 25], hours: [20, 21], chance: 0.08, weekend: null },
};

const GROUP_RATING_UP = 0.05;
const GROUP_RATING_DOWN = 0.2;
/** 미리 만드는 시간과 약속 시간에 단체 주문에 쓸 수 있는 일손 비율(나머지는 평소 손님 몫) */
const GROUP_SHARE = 0.6;
const MIN_GROUP = 5;

/** 이 제안을 그 시각까지 만들 수 있는 최대 판 수(한 시간 전 + 약속 시각, 결근 없다고 보고)와 지금 재고로 만들 수 있는 판 수 */
export function groupFeasible(s: GameState, o: Pick<GroupOffer, 'dueHour' | 'items'>): { maxPizzas: number; stockPizzas: number } {
  const full = { ...s, absentToday: [] };
  const prepHour = Math.max(s.settings.openHour, o.dueHour - 1);
  const maxPizzas =
    (prepHour < o.dueHour ? Math.floor(capacityAt(full, prepHour) * GROUP_SHARE) : 0) +
    Math.floor(capacityAt(full, o.dueHour) * GROUP_SHARE);
  let inv: Inventory = s.inventory;
  let stockPizzas = 0;
  for (const it of o.items) {
    for (let i = 0; i < it.qty && canMake(inv, MENU[it.menu].recipe); i++) {
      for (const [ing, qty] of Object.entries(MENU[it.menu].recipe) as [IngredientId, number][]) inv = consume(inv, ing, qty).inv;
      stockPizzas++;
    }
  }
  return { maxPizzas, stockPizzas };
}

/** 개점 때: 지난 제안 정리, 새 제안이 오면 뉴스와 함께 돌려준다. 약속은 영업일·영업시간 안, 만들 수 있는 판 수로. */
export function morningGroupOffers(s: GameState, rng: Rng): { state: GameState; newOffers: number[] } {
  const day = s.clock.day;
  let state: GameState = { ...s, groupOffers: s.groupOffers.filter((o) => o.expiresDay >= day) };
  const t = TEMPLATES[s.neighborhoodId];
  if (!rng.chance(t.chance)) return { state, newOffers: [] };
  let dueDay = day + rng.int(2, 5);
  if (t.weekend !== null) {
    for (let i = 0; i < 7 && calendar({ day: dueDay, hour: 11 }).isWeekend !== t.weekend; i++) dueDay += 1;
  }
  if (s.settings.closedDay !== null && calendar({ day: dueDay, hour: 11 }).dayOfWeek === s.settings.closedDay) dueDay += 1;
  const { openHour, closeHour } = s.settings;
  const dueHour = Math.min(Math.max(rng.pick(t.hours), openHour + 1), closeHour - 1);

  const pizzas = activePizzas(state.menuActive);
  const first = rng.pick(pizzas);
  const second = pizzas.length > 1 ? rng.pick(pizzas.filter((p) => p !== first)) : null;
  const wanted = rng.int(t.qty[0], t.qty[1]);
  const { maxPizzas } = groupFeasible(state, { dueHour, items: [] });
  const total = Math.min(wanted, maxPizzas);
  if (total < MIN_GROUP) return { state, newOffers: [] };
  const firstQty = second ? Math.ceil(total * 0.6) : total;
  const items = [{ menu: first, qty: firstQty }, ...(second ? [{ menu: second, qty: total - firstQty }] : [])];
  const offer: GroupOffer = {
    id: state.nextStaffId,
    title: rng.pick(t.titles),
    dueDay,
    dueHour,
    items,
    discount: rng.pick([0.05, 0.1, 0.15]),
    expiresDay: day + 1,
  };
  state = {
    ...state,
    groupOffers: [...state.groupOffers, offer],
    nextStaffId: state.nextStaffId + 1,
    news: pushNews(state.news, {
      day, kind: 'announce', important: false, tone: 'good',
      headline: `[단체] ${offer.title} — 피자 ${total}판`,
      body: '받으면 약속 한 시간 전부터 미리 만들어요. 그 시간엔 평소 손님을 받을 일손이 줄어요.',
    }),
  };
  return { state, newOffers: [offer.id] };
}

export function acceptGroup(s: GameState, id: number): GameState {
  const o = s.groupOffers.find((x) => x.id === id);
  if (!o) throw new Error('단체 주문을 찾을 수 없어요');
  if (s.clock.day > o.expiresDay) throw new Error('기한이 지난 제안이에요');
  return { ...s, groupOffers: s.groupOffers.filter((x) => x.id !== id), groupOrders: [...s.groupOrders, o] };
}

export function declineGroup(s: GameState, id: number): GameState {
  return { ...s, groupOffers: s.groupOffers.filter((x) => x.id !== id) };
}

/** 한 판 만들기: 재료·기타 비용·고급 치즈 추가분을 장부와 현금에 반영 */
function makeOne(s: GameState, menu: PizzaId): boolean {
  const recipe = MENU[menu].recipe;
  for (const [ing, qty] of Object.entries(recipe) as [IngredientId, number][]) s.today.usage[ing] = (s.today.usage[ing] ?? 0) + qty;
  if (!canMake(s.inventory, recipe)) return false;
  let food = MISC_COST_PER_PIZZA;
  let cashOut = MISC_COST_PER_PIZZA;
  for (const [ing, qty] of Object.entries(recipe) as [IngredientId, number][]) {
    const r = consume(s.inventory, ing, qty);
    s.inventory = r.inv;
    food += r.cost;
    if (ing === 'mozzarella' && s.levers.premiumCheese) {
      const extra = r.cost * (PREMIUM_CHEESE_MULT - 1);
      food += extra;
      cashOut += extra;
    }
  }
  s.today.foodCost += food;
  s.cash -= cashOut;
  return true;
}

/** 이 시각에 해야 할 단체 주문 일: 약속 한 시간 전엔 일손의 60%로 미리, 약속 시각엔 남은 만큼 다 만들고 보낸다. 만든 판 수를 돌려준다. */
export function fulfillGroupsAt(s: GameState, capacity: number): number {
  const day = s.clock.day;
  const hour = s.clock.hour;
  let used = 0;
  const settled: GroupOffer[] = [];
  for (const o of s.groupOrders) {
    if (o.dueDay !== day) continue;
    const isPrep = hour === o.dueHour - 1;
    const isDue = hour === o.dueHour;
    if (!isPrep && !isDue) continue;
    const madeItems = o.madeItems ?? o.items.map((i) => ({ menu: i.menu, qty: 0 }));
    let budget = isPrep ? Math.floor(capacity * GROUP_SHARE) : capacity - used;
    for (let k = 0; k < o.items.length && budget > 0; k++) {
      while (madeItems[k].qty < o.items[k].qty && budget > 0 && makeOne(s, o.items[k].menu)) {
        madeItems[k].qty++;
        budget--;
        used++;
      }
    }
    o.madeItems = madeItems;
    if (isDue) settled.push(o);
  }
  for (const o of settled) settleGroup(s, o);
  s.groupOrders = s.groupOrders.filter((o) => !settled.includes(o));
  return used;
}

function settleGroup(s: GameState, o: GroupOffer) {
  const made = o.madeItems ?? [];
  const ok = made.reduce((a, i) => a + i.qty, 0);
  const need = o.items.reduce((a, i) => a + i.qty, 0);
  const amount = Math.round(made.reduce((a, i) => a + i.qty * s.menuPrices[i.menu], 0) * (1 - o.discount));
  if (ok > 0) {
    s.today.revenueDelivery += amount;
    s.today.deliveryFees += DELIVERY_COST_TOTAL;
    s.today.groupOrders += 1;
    s.cash += amount - DELIVERY_COST_TOTAL;
    s.orders.push({ day: s.clock.day, hour: s.clock.hour, channel: 'group', items: made.filter((i) => i.qty > 0), amount });
  }
  const success = ok === need;
  s.ratings = { ...s.ratings, delivery: Math.min(5, Math.max(1, s.ratings.delivery + (success ? GROUP_RATING_UP : -GROUP_RATING_DOWN))) };
  s.news = pushNews(s.news, {
    day: s.clock.day, kind: 'announce', important: !success, tone: success ? 'good' : 'bad',
    headline: success ? `[단체] ${o.title} 배달 완료!` : `[단체] ${o.title} — ${need}판 중 ${ok}판만 보냈어요`,
    body: success ? '단골이 될지도 몰라요. 평점이 조금 올랐어요.' : '약속을 못 지켜 평점이 크게 깎였어요. 재료와 일손을 미리 챙겨 두세요.',
  });
}

/** 마감 때: 오늘 약속인데 영업시간 밖이라 못 한 단체 주문은 실패로 처리 */
export function failMissedGroups(s: GameState): void {
  const missed = s.groupOrders.filter((o) => o.dueDay <= s.clock.day);
  for (const o of missed) {
    s.ratings = { ...s.ratings, delivery: Math.max(1, s.ratings.delivery - GROUP_RATING_DOWN) };
    s.news = pushNews(s.news, {
      day: s.clock.day, kind: 'announce', important: true, tone: 'bad',
      headline: `[단체] ${o.title} 약속을 못 지켰어요`,
      body: '영업시간 밖이거나 휴무일이었어요. 평점이 크게 깎였어요.',
    });
  }
  s.groupOrders = s.groupOrders.filter((o) => !missed.includes(o));
}
