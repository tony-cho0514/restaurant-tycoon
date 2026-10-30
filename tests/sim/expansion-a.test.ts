// 확장 1차: 저장 v2, 운영시간·휴무
import { SAVE_KEY, exportSave, importSave, loadGame } from '../../src/sim/save';
import { advanceTick, playTick } from '../../src/sim/tick';
import { calendar } from '../../src/sim/time';
import type { GameState } from '../../src/sim/types';
import { g } from './gameHelpers';

const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, m }; };

function asV1(s: GameState): Record<string, unknown> {
  const { settings: _s, orders: _o, openedDay: _d, ...rest } = s as GameState & Record<string, unknown>;
  return { ...rest, version: 1 };
}

test('버전 1 저장은 불러올 때 버전 2로 옮겨진다', () => {
  const st = mem(); st.m.set(SAVE_KEY, JSON.stringify(asV1(g())));
  const s = loadGame(st)!;
  expect(s.version).toBe(2);
  expect(s.settings).toEqual({ openHour: 11, closeHour: 22, closedDay: null, deliveryTip: 1000 });
  expect(s.orders).toEqual([]);
});

test('버전 1로 내보낸 파일도 가져온다', () => {
  const file = JSON.stringify({ app: 'restaurant-tycoon', version: 1, exportedAt: 0, state: asV1(g()) });
  expect(importSave(file).version).toBe(2);
  expect(importSave(exportSave(g(), 0)).version).toBe(2);
});

function playDay(s: GameState): { s: GameState; ticks: number } {
  const day = s.clock.day; let ticks = 0;
  while (s.clock.day === day) { s = advanceTick(s).state; ticks++; }
  return { s, ticks };
}

test('10시~24시로 열면 하루 14시간 영업하고 손님이 더 온다', () => {
  const base = playDay(g());
  const long = g(); long.settings = { ...long.settings, openHour: 10, closeHour: 24 };
  const r = playDay(long);
  expect(r.ticks).toBe(14);
  const orders = (x: GameState) => x.ledger.days[0].hallOrders + x.ledger.days[0].deliveryOrders + x.ledger.days[0].lostOrders + x.ledger.days[0].stockoutOrders;
  expect(orders(r.s)).toBeGreaterThan(orders(base.s));
});

test('정기 휴무일엔 매출·인건비가 없고 충전도 쓰지 않는다', () => {
  let s = g(); s.settings = { ...s.settings, closedDay: 1 };
  s = playDay(s).s; // 0일(월) 영업
  expect(calendar(s.clock).dayOfWeek).toBe(1);
  const before = s.charge.ticks;
  const r = playTick(s, 0)!; // 화요일 = 휴무 → 바로 다음 날로
  expect(r.state.clock.day).toBe(2);
  const tue = r.state.ledger.days.find((d) => d.day === 1)!;
  expect(tue.hallOrders + tue.deliveryOrders).toBe(0); expect(tue.labor).toBe(0); expect(tue.utilities).toBe(0);
  expect(r.state.charge.ticks).toBeCloseTo(before);
});

test('영업시간이 길어도 하루 충전 소비는 표준 하루(11)', () => {
  let s = g(); s.settings = { ...s.settings, openHour: 10, closeHour: 24 }; s.charge = { ticks: 77, lastAccruedAt: 0 };
  const day = s.clock.day;
  while (s.clock.day === day) s = playTick(s, 0)!.state;
  expect(77 - s.charge.ticks).toBeCloseTo(11);
});

test('영업 중에 닫는 시각을 앞당기면 다음 틱에 하루를 마감한다', () => {
  let s = g(); for (let i = 0; i < 5; i++) s = advanceTick(s).state; // 16시
  s.settings = { ...s.settings, closeHour: 15 };
  s = advanceTick(s).state;
  expect(s.clock.day).toBe(1); expect(s.ledger.days).toHaveLength(1);
});

// A3·A4: 주문 기록, 카드 수수료, 배달팁, 인건비
import { ordersOn } from '../../src/sim/orders';
import { dailyLabor } from '../../src/sim/labor';
import { expectedOrders } from '../../src/sim/demand';
import { NEIGHBORHOODS } from '../../src/sim/neighborhoods';
import { allOff, defaultMenuPrices } from './helpers';

test('주문이 한 건씩 기록되고 금액 합이 매출과 같다', () => {
  const s = playDay(g()).s; const d = s.ledger.days[0];
  const list = ordersOn(s.orders, 0);
  expect(list.length).toBe(d.hallOrders + d.deliveryOrders);
  expect(list.reduce((a, o) => a + o.amount, 0)).toBe(d.revenueHall + d.revenueDelivery);
  expect(list.every((o) => o.items.length >= 1 && o.hour >= 11 && o.hour <= 21)).toBe(true);
});

test('주문 기록은 7일만 보관한다', () => {
  let s = g(); for (let i = 0; i < 8; i++) s = playDay(s).s;
  expect(ordersOn(s.orders, 0)).toHaveLength(0);
  expect(ordersOn(s.orders, 7).length).toBeGreaterThan(0);
});

test('홀 매출의 1.5%가 카드 수수료로 나간다', () => {
  const d = playDay(g()).s.ledger.days[0];
  expect(d.cardFees).toBe(Math.round(d.revenueHall * 0.015));
});

test('배달팁을 손님이 더 내면 사장 배달비는 줄고 배달 주문도 준다', () => {
  let s = g(); s.settings = { ...s.settings, deliveryTip: 2000 };
  const d = playDay(s).s.ledger.days[0];
  expect(d.deliveryFees).toBe(d.deliveryOrders * 2000);
  const econ = { cycle: 'normal', cycleWeeksLeft: 30, fx: 1350, inflation: 1, minWage: 10030, pendingMinWage: null, weather: 'sunny' } as const;
  const base = { n: NEIGHBORHOODS.campus, hour: 18, isWeekend: false, economy: econ, menuPrices: defaultMenuPrices(), ratings: { hall: 4.5, delivery: 4.5 }, levers: allOff(), shock: { hall: 1, delivery: 1 } };
  expect(expectedOrders({ ...base, deliveryTip: 2000 }).delivery).toBeCloseTo(expectedOrders({ ...base, deliveryTip: 1000 }).delivery * 0.92);
});

test('인건비 = 시급×시간 + 4대보험 9% + 주 15시간 이상이면 주휴수당', () => {
  expect(dailyLabor(11, 10030, 77)).toBe(Math.round(11 * 10030 * 1.29));
  expect(dailyLabor(4, 10030, 12)).toBe(Math.round(4 * 10030 * 1.09));
});

// A5: 재고 개선
import { manualBuyUnits, stockOf } from '../../src/sim/inventory';
import { buyCart, storageCapUnits } from '../../src/sim/purchasing';
import { recipeLines, unitCost } from '../../src/sim/menu';
import { MISC_COST_PER_PIZZA } from '../../src/sim/balance';
import { basePrices } from './helpers';

test('서비스 콜라를 꺼 둬도 개수로 사면 0원이 아니다', () => {
  const s = g();
  const r = manualBuyUnits(s.inventory, 'cola500', 24, s.prices, 0, storageCapUnits(s, 'cola500'));
  expect(r.spent).toBeGreaterThan(0); expect(stockOf(r.inv, 'cola500')).toBe(24);
});

test('여러 재료를 한 번에 사면 합계가 각각의 합과 같고 현금이 그만큼 준다', () => {
  const s = g();
  const r = buyCart(s, [{ id: 'mozzarella', mode: 'days', qty: 7 }, { id: 'box', mode: 'days', qty: 7 }, { id: 'cola500', mode: 'units', qty: 10 }]);
  expect(r.spent).toBe(r.lines.reduce((a, l) => a + l.spent, 0));
  expect(r.state.cash).toBe(s.cash - r.spent);
  expect(r.state.today.purchases).toBe(s.today.purchases + r.spent);
  expect(r.lines.find((l) => l.id === 'cola500')!.spent).toBeGreaterThan(0);
});

test('메뉴의 재료 구성 합 + 기타 = 한 판 원가', () => {
  const p = basePrices();
  for (const id of ['cheese', 'pepperoni', 'combo'] as const) {
    const lines = recipeLines(id, p, false);
    expect(Math.round(lines.reduce((a, l) => a + l.cost, 0) + MISC_COST_PER_PIZZA)).toBe(unitCost(id, p, { premiumCheese: false }));
  }
  expect(recipeLines('combo', p, false).map((l) => l.ingredient)).toContain('veg');
});
