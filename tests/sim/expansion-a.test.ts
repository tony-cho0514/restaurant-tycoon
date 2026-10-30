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
