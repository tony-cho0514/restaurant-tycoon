// 확장 2차: 직원(채용·면접), 단체 주문, 업그레이드
import { capacityAt, staffWorking, postJob, interview, hire, fire, QUESTIONS } from '../../src/sim/staffing';
import { acceptGroup, declineGroup } from '../../src/sim/groupOrders';
import { buyUpgrade, UPGRADES, shopGrade, ovenCap, hallSeatCap } from '../../src/sim/upgradeOps';
import { emptyInventory } from '../../src/sim/inventory';
import { advanceTick } from '../../src/sim/tick';
import type { GameState } from '../../src/sim/types';
import type { Staff } from '../../src/sim/staff';
import { g } from './gameHelpers';

const extra = (o: Partial<Staff>): Staff => ({ id: 9, name: '박알바', age: 20, wage: 10030, shift: 'full', traits: { speed: 0.5, kindness: 0.5, diligence: 1, quitRisk: 0 }, revealed: {}, daysWorked: 0, hiredDay: 0, ...o });
function playDay(s: GameState): GameState { const d = s.clock.day; while (s.clock.day === d) s = advanceTick(s).state; return s; }

test('알바가 늘면 처리 능력이 늘고, 점심 근무자는 저녁에 없다', () => {
  const s = g(); const one = capacityAt(s, 13);
  const two = { ...s, staff: [...s.staff, extra({ shift: 'lunch' })] };
  expect(capacityAt(two, 13)).toBeGreaterThan(one);
  expect(capacityAt(two, 18)).toBe(capacityAt(s, 18));
  expect(staffWorking(two, 18).map((x) => x.id)).not.toContain(9);
});

test('점심 알바는 점심 시간만큼만 시급을 받는다', () => {
  const base = playDay({ ...g() });
  const lunch = playDay({ ...g(), staff: [...g().staff, extra({ shift: 'lunch', traits: { speed: 0.5, kindness: 0.5, diligence: 1, quitRisk: 0 } })] });
  const diff = lunch.ledger.days[0].labor - base.ledger.days[0].labor;
  expect(diff).toBe(Math.round(5 * 10030 * 1.29)); // 11~16시 5시간, 주 35시간 → 주휴 포함
});

test('최저임금보다 낮은 시급으로는 공고를 못 낸다', () => {
  expect(() => postJob(g(), 9000, 'lunch')).toThrow('최저임금');
});

test('공고 → 다음 날 지원자 → 면접 → 채용', () => {
  let s = postJob(g(), 10500, 'dinner');
  s = playDay(s); s = advanceTick(s).state; // 다음 날 개점
  expect(s.applicants.length).toBeGreaterThanOrEqual(2); expect(s.applicants.length).toBeLessThanOrEqual(4);
  const a = s.applicants[0];
  const r = interview(s, a.id, 0); expect(typeof r.answer).toBe('string'); expect(r.answer.length).toBeGreaterThan(5);
  const r2 = interview(r.state, a.id, 1);
  expect(() => interview(r2.state, a.id, 2)).toThrow(); // 질문은 2개까지
  const h = hire(r2.state, a.id);
  expect(h.staff).toHaveLength(2); expect(h.staff[1].shift).toBe('dinner'); expect(h.staff[1].wage).toBeGreaterThanOrEqual(10500);
  expect(h.applicants.find((x) => x.id === a.id)).toBeUndefined();
  expect(QUESTIONS).toHaveLength(4);
  expect(fire(h, h.staff[1].id).staff).toHaveLength(1);
});

test('14일 일하면 친절함이 드러난다', () => {
  let s = g(); s.staff = [{ ...s.staff[0], traits: { ...s.staff[0].traits, diligence: 1 } }];
  for (let i = 0; i < 14; i++) s = playDay(s);
  expect(s.staff[0].revealed.speed).toBe(true); expect(s.staff[0].revealed.kindness).toBe(true);
});

test('단체 주문: 받으면 그 시각에 만들어 매출로, 재료가 없으면 평점이 깎인다', () => {
  const offer = { id: 77, title: '테스트 모임', dueDay: 1, dueHour: 12, items: [{ menu: 'cheese' as const, qty: 5 }], discount: 0.1, expiresDay: 1 };
  let s = acceptGroup({ ...g(), groupOffers: [offer] }, 77);
  expect(s.groupOffers).toHaveLength(0); expect(s.groupOrders).toHaveLength(1);
  while (!(s.clock.day === 1 && s.clock.hour === 13)) s = advanceTick(s).state;
  const grp = s.orders.filter((o) => o.channel === 'group');
  expect(grp).toHaveLength(1); expect(grp[0].amount).toBe(Math.round(5 * s.menuPrices.cheese * 0.9));
  expect(s.groupOrders).toHaveLength(0);

  let t = acceptGroup({ ...g(), groupOffers: [offer] }, 77); t.inventory = emptyInventory(); t.rules = Object.fromEntries(Object.entries(t.rules).map(([k, r]) => [k, { ...r, reorderDays: 0, targetDays: 0 }])) as GameState['rules'];
  const r0 = t.ratings.delivery;
  while (!(t.clock.day === 1 && t.clock.hour === 13)) t = advanceTick(t).state;
  expect(t.ratings.delivery).toBeLessThan(r0 - 0.1);
  expect(declineGroup({ ...g(), groupOffers: [offer] }, 77).groupOffers).toHaveLength(0);
});

test('업그레이드: 오븐을 올리면 상한이 오르고 투자로 잡히며, 최대 단계 넘어선 못 산다', () => {
  const s = g(); expect(ovenCap(s)).toBe(16);
  const u = buyUpgrade(s, 'oven');
  expect(ovenCap(u)).toBe(24); expect(u.cash).toBe(s.cash - UPGRADES.oven.costs[0]); expect(u.today.investment).toBe(UPGRADES.oven.costs[0]);
  const u2 = buyUpgrade({ ...u, cash: 1e9 }, 'oven'); expect(() => buyUpgrade(u2, 'oven')).toThrow();
  expect(hallSeatCap(buyUpgrade({ ...s, cash: 1e9 }, 'tables'))).toBeGreaterThan(hallSeatCap(s));
  expect(shopGrade(u)).toBe(1);
  expect(() => buyUpgrade({ ...s, cash: 0 }, 'oven')).toThrow('돈');
});
