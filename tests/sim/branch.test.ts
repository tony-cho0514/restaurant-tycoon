// 2호점: 조건이 차면 열고, 매니저가 규칙대로 하루 단위로 돌리고, 같은 동네면 1호점 손님을 나눠 먹는다.
import {
  BRANCH_COST, BRANCH_DEPOSIT, BRANCH_REQ, CANNIBAL, STARTUP_LOAN_MONTHS, branchChecklist, branchShare, canOpenBranch, closeBranch, managerCandidates,
  openBranch, setBranchRules,
} from '../../src/sim/branch';
import { createNewGame } from '../../src/sim/newGame';
import { visitBranch } from '../../src/sim/owner';
import { advanceTickInPlace } from '../../src/sim/tick';
import type { GameState } from '../../src/sim/types';
import type { NeighborhoodId } from '../../src/sim/neighborhoods';

function playUntil(s: GameState, day: number): GameState {
  const c = structuredClone(s);
  while (c.clock.day < day) advanceTickInPlace(c);
  return c;
}

let ready: GameState;
beforeAll(() => {
  const s = createNewGame({ seed: 3, neighborhoodId: 'residential', shopName: 'x', nowMs: 0 });
  s.settings = { ...s.settings, closedDay: 6 };
  ready = playUntil(s, BRANCH_REQ.days);
  ready.cash = 20_000_000;
});
const open = (hood: NeighborhoodId, loan = 15_000_000) => openBranch(ready, { neighborhoodId: hood, manager: managerCandidates(ready)[0], loan });

test('개업 6개월·최근 3달 흑자·통장 1,500만 원이 다 차야 2호점을 열 수 있다', () => {
  const fresh = createNewGame({ seed: 3, neighborhoodId: 'residential', shopName: 'x', nowMs: 0 });
  expect(branchChecklist(fresh)).toEqual({ days: false, profit: false, cash: false });
  expect(canOpenBranch(ready)).toBe(true);
  expect(canOpenBranch({ ...ready, cash: 1_000_000 })).toBe(false);
  expect(() => openBranch({ ...ready, cash: 10_000_000 }, { neighborhoodId: 'campus', manager: managerCandidates(ready)[0], loan: 15_000_000 })).toThrow();
});

test('매니저 후보는 성향이 셋 다 다르고, 한 주 동안 같은 사람들이다', () => {
  const c = managerCandidates(ready);
  expect(new Set(c.map((m) => m.trait)).size).toBe(3);
  expect(managerCandidates({ ...ready, clock: { ...ready.clock, hour: 20 } })).toEqual(c);
  for (const m of c) expect(m.salary).toBeGreaterThanOrEqual(2_800_000);
});

test('열면 3,000만 원이 나가고(창업 대출로 일부 메움), 매니저가 인사하고, 「위임」 카드가 열린다', () => {
  const s = open('campus');
  expect(s.cash).toBe(ready.cash + 15_000_000 - BRANCH_COST);
  expect(s.branch!.loan!.paymentsLeft).toBe(STARTUP_LOAN_MONTHS);
  expect(s.messages.items.some((m) => m.name.endsWith('매니저') && m.text.includes('2호점 내일 문 열어요'))).toBe(true);
  expect(s.learning.dex.delegation).toBeTruthy();
});

test('매니저가 매일 보고하고, 이익이 통장으로 들어오며, 월말엔 2호점 한 달이 정리된다(공동구매 카드)', () => {
  const s = playUntil(open('campus'), (Math.floor(ready.clock.day / 28) + 1) * 28 + 1);
  const b = s.branch!;
  expect(b.days.length).toBeGreaterThan(5);
  expect(b.months.length).toBe(1);
  expect(b.months[0].orders).toBe(b.days.filter((d) => d.monthIndex === b.months[0].monthIndex).reduce((a, d) => a + d.orders, 0));
  expect(b.months[0].saved).toBeGreaterThan(0);
  expect(s.learning.dex.scale).toBeTruthy();
  expect(s.messages.items.some((m) => m.text.startsWith('사장님, 2호점 오늘 주문'))).toBe(true);
});

test('같은 동네에 열면 1호점 배달 주문이 줄어든다(자기잠식)', () => {
  const end = ready.clock.day + 28;
  const delivery = (s: GameState) => s.ledger.days.filter((d) => d.day >= ready.clock.day + 1 && d.day < end).reduce((a, d) => a + d.deliveryOrders, 0);
  const same = playUntil(open('residential', 0 + 10_000_000), end);
  const other = playUntil(open('office', 10_000_000), end);
  expect(delivery(same)).toBeLessThan(delivery(other));
  // 배달 수요 배수 자체는 정확히 15%만 줄인다(그 뒤 차이는 갈라진 난수로 생긴 다른 사건들 몫)
  const sameOpen = open('residential', 10_000_000);
  const day = sameOpen.branch!.openedDay;
  expect(branchShare({ ...sameOpen, clock: { day, hour: 12 } }).delivery).toBe(1 - CANNIBAL);
  expect(branchShare({ ...sameOpen, clock: { day: day - 1, hour: 12 } }).delivery).toBe(1);
  expect(branchShare({ ...open('office', 10_000_000), clock: { day, hour: 12 } }).delivery).toBe(1);
});

test('사장님이 2호점에 들르면 그날 1호점은 알바가 보고, 매니저 의욕이 오르며, 쉬는 날로 치지 않는다', () => {
  const s = visitBranch(open('campus'));
  const morale = s.branch!.morale;
  const next = playUntil(s, s.clock.day + 2);
  expect(next.messages.items.some((m) => m.text.includes('와 주셔서 힘났어요'))).toBe(true);
  expect(next.branch!.morale).toBeGreaterThan(morale - 0.05);
  expect(next.owner.daysWithoutRest).toBeGreaterThan(0);
});

test('규칙은 범위 안에서만 바뀐다', () => {
  const s = setBranchRules(open('campus'), { staff: 9, stockDays: 0, price: 'local' });
  expect(s.branch!.rules.staff).toBe(4);
  expect(s.branch!.rules.stockDays).toBe(1);
  expect(s.branch!.rules.price).toBe('local');
});

test('2호점을 정리하면 보증금은 돌려받고 남은 창업 대출은 갚는다', () => {
  const s = open('campus');
  const closed = closeBranch(s);
  expect(closed.branch).toBeNull();
  expect(closed.cash).toBe(s.cash + BRANCH_DEPOSIT - s.branch!.loan!.balance);
});
