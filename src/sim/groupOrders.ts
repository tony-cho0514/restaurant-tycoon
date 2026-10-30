// 단체 주문: 동네마다 성격이 다른 큰 주문. 개점 때 제안이 오고, 받으면 약속한 시각에 먼저 만든다.
import { DELIVERY_COST_TOTAL } from './balance';
import type { GroupOffer } from './groups';
import { canMake, consume } from './inventory';
import type { IngredientId } from './ingredients';
import { MENU, activePizzas } from './menu';
import type { NeighborhoodId } from './neighborhoods';
import { pushNews } from './news';
import type { Rng } from './rng';
import { calendar } from './time';
import type { GameState } from './types';

const TEMPLATES: Record<NeighborhoodId, { titles: string[]; qty: [number, number]; hours: number[]; chance: number; weekend: boolean | null }> = {
  residential: { titles: ['은행나무 교회 주일 모임', '학원 수강생 간식', '아파트 부녀회 모임', '어린이집 생일 파티'], qty: [8, 15], hours: [12, 18], chance: 0.12, weekend: true },
  office: { titles: ['유리타워 3층 팀 회의', '공공기관 야근 간식', '스타트업 회식', '부서 워크숍'], qty: [10, 20], hours: [12, 19], chance: 0.1, weekend: false },
  campus: { titles: ['동아리 정기 모임', 'MT 야식', '시험 기간 과방 야식', '학생회 행사'], qty: [12, 25], hours: [20, 21], chance: 0.08, weekend: null },
};

const GROUP_RATING_UP = 0.05;
const GROUP_RATING_DOWN = 0.2;

/** 개점 때: 지난 제안 정리, 새 제안이 오면 뉴스와 함께 돌려준다. */
export function morningGroupOffers(s: GameState, rng: Rng): { state: GameState; newOffers: number[] } {
  const day = s.clock.day;
  let state: GameState = { ...s, groupOffers: s.groupOffers.filter((o) => o.expiresDay >= day) };
  const t = TEMPLATES[s.neighborhoodId];
  if (!rng.chance(t.chance)) return { state, newOffers: [] };
  // 원하는 요일(주말/평일)이 되는 2~5일 뒤
  let dueDay = day + rng.int(2, 5);
  if (t.weekend !== null) {
    for (let i = 0; i < 7; i++) {
      const wk = calendar({ day: dueDay, hour: 11 }).isWeekend;
      if (wk === t.weekend) break;
      dueDay += 1;
    }
  }
  const pizzas = activePizzas(state.menuActive);
  const total = rng.int(t.qty[0], t.qty[1]);
  const first = rng.pick(pizzas);
  const second = pizzas.length > 1 ? rng.pick(pizzas.filter((p) => p !== first)) : null;
  const firstQty = second ? Math.ceil(total * 0.6) : total;
  const items = [{ menu: first, qty: firstQty }, ...(second ? [{ menu: second, qty: total - firstQty }] : [])];
  const offer: GroupOffer = {
    id: state.nextStaffId,
    title: rng.pick(t.titles),
    dueDay,
    dueHour: rng.pick(t.hours),
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
      body: '받으면 약속한 시각에 재료와 일손을 먼저 써요. 못 맞추면 평점이 크게 깎여요.',
    }),
  };
  return { state, newOffers: [offer.id] };
}

export function acceptGroup(s: GameState, id: number): GameState {
  const o = s.groupOffers.find((x) => x.id === id);
  if (!o) throw new Error('단체 주문을 찾을 수 없어요');
  return { ...s, groupOffers: s.groupOffers.filter((x) => x.id !== id), groupOrders: [...s.groupOrders, o] };
}

export function declineGroup(s: GameState, id: number): GameState {
  return { ...s, groupOffers: s.groupOffers.filter((x) => x.id !== id) };
}

/** 약속한 시각의 틱에서 먼저 만든다. 만든 판 수를 돌려준다(그 시간 처리 능력에서 뺀다). */
export function fulfillGroupsAt(s: GameState, capacity: number): number {
  const due = s.groupOrders.filter((o) => o.dueDay === s.clock.day && o.dueHour === s.clock.hour);
  let made = 0;
  for (const o of due) {
    let ok = 0;
    let need = 0;
    let amount = 0;
    const items: { menu: (typeof o.items)[number]['menu']; qty: number }[] = [];
    for (const it of o.items) {
      need += it.qty;
      let n = 0;
      for (let i = 0; i < it.qty; i++) {
        if (made >= capacity || !canMake(s.inventory, MENU[it.menu].recipe)) break;
        for (const [ing, qty] of Object.entries(MENU[it.menu].recipe) as [IngredientId, number][]) {
          const r = consume(s.inventory, ing, qty);
          s.inventory = r.inv;
          s.today.foodCost += r.cost;
        }
        n++;
        made++;
      }
      if (n > 0) items.push({ menu: it.menu, qty: n });
      ok += n;
      amount += n * s.menuPrices[it.menu];
    }
    amount = Math.round(amount * (1 - o.discount));
    if (ok > 0) {
      s.today.revenueDelivery += amount;
      s.today.deliveryFees += DELIVERY_COST_TOTAL;
      s.cash += amount - DELIVERY_COST_TOTAL;
      s.orders.push({ day: s.clock.day, hour: s.clock.hour, channel: 'group', items, amount });
    }
    const success = ok === need;
    s.ratings = { ...s.ratings, delivery: Math.min(5, Math.max(1, s.ratings.delivery + (success ? GROUP_RATING_UP : -GROUP_RATING_DOWN))) };
    s.news = pushNews(s.news, {
      day: s.clock.day, kind: 'announce', important: !success, tone: success ? 'good' : 'bad',
      headline: success ? `[단체] ${o.title} 배달 완료!` : `[단체] ${o.title} — ${need}판 중 ${ok}판만 보냈어요`,
      body: success ? '단골이 될지도 몰라요. 평점이 조금 올랐어요.' : '약속을 못 지켜 평점이 크게 깎였어요. 재료와 일손을 미리 챙겨 두세요.',
    });
  }
  s.groupOrders = s.groupOrders.filter((o) => !due.includes(o));
  return made;
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
