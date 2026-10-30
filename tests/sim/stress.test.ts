// 사장님 스트레스: 오래 일하고 바쁘면 오르고, 쉬면 내린다. 너무 높으면 지치고 번아웃.
import { advanceTick } from '../../src/sim/tick';
import { capacityAt } from '../../src/sim/staffing';
import { leaveEarly, takeDayOff, takeVacation, ownerWorking, VACATION_COST, STRESS_TIRED, STRESS_BURNOUT } from '../../src/sim/owner';
import { profitOf } from '../../src/sim/ledger';
import { SAVE_KEY, loadGame } from '../../src/sim/save';
import type { GameState } from '../../src/sim/types';
import { g } from './gameHelpers';

function playDay(s: GameState): GameState { const d = s.clock.day; while (s.clock.day === d) s = advanceTick(s).state; return s; }
function playDays(s: GameState, n: number): GameState { for (let i = 0; i < n; i++) s = playDay(s); return s; }
const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, m }; };

test('쉬는 날 없이 2주 일하면 스트레스가 쌓이고, 이유가 남는다', () => {
  const s0 = g(); const s = playDays(s0, 14);
  expect(s.owner.stress).toBeGreaterThan(s0.owner.stress + 20);
  expect(s.owner.log.length).toBeGreaterThan(0);
});

test('정기 휴무가 있으면 스트레스가 덜 쌓인다', () => {
  const busy = playDays(g(), 14);
  const rested = playDays({ ...g(), settings: { ...g().settings, closedDay: 0 } }, 14);
  expect(rested.owner.stress).toBeLessThan(busy.owner.stress - 10);
});

test('일찍 퇴근하면 남은 시간엔 사장님이 없고, 알바가 없으면 그 시간엔 손님을 안 받는다', () => {
  let s = g(); for (let i = 0; i < 2; i++) s = advanceTick(s).state; // 13시
  s = { ...s, staff: [] };
  const before = s.owner.stress;
  s = leaveEarly(s);
  expect(ownerWorking(s, s.clock.hour)).toBe(false);
  expect(capacityAt(s, s.clock.hour)).toBe(0);
  const day0 = s.clock.day; while (s.clock.day === day0) s = advanceTick(s).state;
  const d = s.ledger.days[0];
  expect(s.orders.filter((o) => o.day === 0 && o.hour >= 13)).toHaveLength(0);
  expect(d.hallOrders + d.deliveryOrders).toBeGreaterThan(0);
  expect(s.owner.stress).toBeLessThan(before);
});

test('하루 쉬기: 다음 날은 알바만 일하고, 스트레스가 크게 준다', () => {
  let s = g(); s.owner = { ...s.owner, stress: 60 };
  s = takeDayOff(s);
  s = playDay(s); // 0일 영업
  const mid = s.owner.stress;
  s = playDay(s); // 1일 = 사장님 쉬는 날(저녁 알바만)
  expect(s.orders.filter((o) => o.day === 1).length).toBeGreaterThan(0);
  expect(s.orders.filter((o) => o.day === 1 && o.hour < 16)).toHaveLength(0);
  expect(s.owner.stress).toBeLessThan(mid - 15);
});

test('휴가: 30만 원이 통장에서 나가지만 장부 이익엔 안 잡히고, 사흘 쉰다', () => {
  let s = g(); s.owner = { ...s.owner, stress: 80 };
  const cash0 = s.cash;
  s = takeVacation(s);
  expect(s.cash).toBe(cash0 - VACATION_COST); expect(s.today.ownerDraw).toBe(VACATION_COST);
  expect(profitOf({ ...s.today, revenueHall: 0 })).toBe(profitOf({ ...s.today, ownerDraw: 0, revenueHall: 0 }));
  s = playDays(s, 4);
  expect(s.owner.stress).toBeLessThan(40);
  expect(() => takeVacation({ ...g(), cash: 1000 })).toThrow('돈');
});

test('스트레스가 높으면 처리 능력이 줄고, 번아웃이 오면 억지로 쉰다', () => {
  const s = g();
  const tired = { ...s, owner: { ...s.owner, stress: STRESS_TIRED + 5 } };
  expect(capacityAt(tired, 18)).toBe(capacityAt(s, 18) - 1);
  let b = { ...s, owner: { ...s.owner, stress: STRESS_BURNOUT + 5 } };
  b = playDay(b);
  expect(b.owner.awayUntil).toBeGreaterThanOrEqual(1);
  expect(b.news.items.some((n) => n.headline.includes('쓰러졌'))).toBe(true);
});

test('스트레스가 지침 선을 넘으면 「좀 쉬세요」 알림이 온다', () => {
  let s = g(); s.owner = { ...s.owner, stress: STRESS_TIRED - 0.5 };
  let warned = false;
  for (let i = 0; i < 11 && !warned; i++) { const r = advanceTick(s); s = r.state; warned = r.pauses.some((p) => p.kind === 'news' && s.news.items.find((n) => n.id === p.newsId)?.headline.includes('쉬세요')); }
  expect(warned).toBe(true);
});

test('스트레스 없는 옛 저장도 열린다', () => {
  const raw = JSON.parse(JSON.stringify(g())); delete raw.owner;
  const st = mem(); st.m.set(SAVE_KEY, JSON.stringify(raw));
  const s = loadGame(st)!; expect(s.owner.stress).toBeGreaterThanOrEqual(0);
});
