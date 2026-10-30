// 망하는 길: 긴급 대출 → 업그레이드 되팔기 → 폐업 경고 → 폐업. 정산과 장부가 맞아야 한다.
import {
  DISTRESS_CLOSE_DAYS, DISTRESS_WARN_DAYS, LOAN_MONTHS, borrow, canBorrow, lifetimeProfit, loanLimit, loanSchedule,
  payLoanInPlace, repayAll, resaleValue, sellUpgrade, settlement,
} from '../../src/sim/bank';
import { profitOf } from '../../src/sim/ledger';
import { NEIGHBORHOODS } from '../../src/sim/neighborhoods';
import { SAVE_KEY, loadGame } from '../../src/sim/save';
import { advanceTick, advanceTickInPlace, playTick } from '../../src/sim/tick';
import type { GameState } from '../../src/sim/types';
import { buyUpgrade } from '../../src/sim/upgradeOps';
import { g } from './gameHelpers';

const broke = (): GameState => ({ ...g(), cash: -200_000 });
const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); } }; };

test('대출은 통장이 마이너스거나 2주도 못 버틸 때만, 한도는 월세 석 달치', () => {
  expect(canBorrow({ ...g(), cash: 50_000_000 })).toBe(false);
  expect(canBorrow(broke())).toBe(true);
  expect(loanLimit(g())).toBe(4_500_000);
  expect(() => borrow({ ...g(), cash: 50_000_000 }, 1_000_000)).toThrow();
  expect(() => borrow(broke(), 5_000_000)).toThrow();
});

test('대출을 받으면 통장에 들어오고, 은행 메시지와 「빚과 이자」 카드가 생긴다', () => {
  const s = borrow(broke(), 3_000_000);
  expect(s.cash).toBe(2_800_000);
  expect(s.today.loan).toBe(3_000_000);
  expect(s.bank.loan!.paymentsLeft).toBe(LOAN_MONTHS);
  expect(s.messages.items.at(-2)!.from).toBe('bank');
  expect(s.learning.dex.debt?.story).toMatch(/이자로 약 .+을 더 내고/);
  // 이익엔 안 잡힌다
  expect(profitOf(s.today)).toBe(profitOf(broke().today));
  expect(canBorrow({ ...s, cash: -1 })).toBe(false);
});

test('매달 1일에 원리금을 갚고, 12번이면 끝난다(이자는 장부 비용)', () => {
  let s = borrow(broke(), 3_000_000);
  const schedule = loanSchedule(3_000_000);
  let interest = 0;
  for (let k = 1; k <= LOAN_MONTHS; k++) {
    s = { ...s, clock: { day: k * 28, hour: 11 }, today: { ...s.today, interest: 0, loan: 0 } };
    payLoanInPlace(s);
    interest += s.today.interest;
    expect(s.today.interest).toBe(schedule[k - 1].interest);
  }
  expect(s.bank.loan).toBeNull();
  expect(interest).toBe(schedule.reduce((a, r) => a + r.interest, 0));
  expect(schedule.reduce((a, r) => a + r.principal, 0)).toBe(3_000_000);
});

test('남은 원금은 한 번에 갚을 수 있다', () => {
  const s = { ...borrow(broke(), 2_000_000), cash: 5_000_000 };
  const paid = repayAll(s);
  expect(paid.cash).toBe(3_000_000);
  expect(paid.bank.loan).toBeNull();
});

test('업그레이드는 산 값의 40%에 한 단계씩 되팔고, 기본 단계는 못 판다', () => {
  const rich = { ...g(), cash: 100_000_000 };
  expect(resaleValue(rich, 'oven')).toBeNull();
  const bought = buyUpgrade(rich, 'oven');
  expect(resaleValue(bought, 'oven')).toBe(2_000_000);
  const sold = sellUpgrade(bought, 'oven');
  expect(sold.upgrades.oven).toBe(1);
  expect(sold.cash).toBe(bought.cash + 2_000_000);
  expect(() => sellUpgrade(sold, 'oven')).toThrow();
});

test('통장 마이너스가 2주 이어지면 경고하고, 4주면 문을 닫는다(그 뒤엔 시간이 흐르지 않는다)', () => {
  let s: GameState = { ...g(), cash: -500_000_000 };
  const kinds: string[] = [];
  while (!s.closed && s.clock.day < 40) {
    const r = advanceTick(s);
    s = r.state;
    kinds.push(...r.pauses.map((p) => `${p.kind}@${s.bank.negativeDays}`));
  }
  expect(kinds).toContain(`distress@${DISTRESS_WARN_DAYS}`);
  expect(kinds).toContain(`closed@${DISTRESS_CLOSE_DAYS}`);
  expect(s.closed!.reason).toBe('bankrupt');
  const after = structuredClone(s);
  advanceTickInPlace(after);
  expect(after.clock).toEqual(s.clock);
  expect(playTick({ ...s, charge: { ticks: 77, lastAccruedAt: 0 } }, 0)).toBeNull();
});

test('폐업 정산: 통장 + 보증금 − 남은 대출, 권리금은 못 받는다', () => {
  const s = borrow(broke(), 3_000_000);
  const st = settlement(s);
  expect(st.total).toBe(s.cash + NEIGHBORHOODS.campus.listing.deposit - 3_000_000);
  expect(st.keyMoney).toBe(NEIGHBORHOODS.campus.listing.keyMoney);
});

test('개업부터 이익 = 마감한 달 + 아직 마감 안 한 날', () => {
  const s = structuredClone(g());
  while (s.clock.day < 40) advanceTickInPlace(s);
  const sum = s.ledger.months.reduce((a, m) => a + profitOf(m), 0) + s.ledger.days.filter((d) => d.monthIndex === 1).reduce((a, d) => a + profitOf(d), 0);
  expect(lifetimeProfit(s)).toBe(Math.round(sum));
});

test('대출이 있는 달도 부검 리포트 몫의 합이 이익과 원 단위까지 같다', () => {
  const s = structuredClone(borrow({ ...g(), cash: -100_000 }, 4_000_000));
  while (s.clock.day < 28 * 3) advanceTickInPlace(s);
  const [first, ...rest] = s.learning.reports;
  expect(first.parts.reduce((a, p) => a + p.amount, 0)).toBe(first.profit);
  for (const r of rest) expect(r.parts.reduce((a, p) => a + p.amount, 0)).toBe(r.profit - r.prevProfit!);
  expect(s.ledger.months[1].interest).toBeGreaterThan(0);
});

test('은행 기록이 없는 옛 저장도 열린다', () => {
  const raw = JSON.parse(JSON.stringify(g())); delete raw.bank;
  for (const d of raw.ledger.days) { delete d.interest; delete d.loan; }
  delete raw.today.interest; delete raw.today.loan;
  const st = mem(); st.setItem(SAVE_KEY, JSON.stringify(raw));
  const loaded = loadGame(st)!;
  expect(loaded.bank).toEqual({ loan: null, negativeDays: 0 });
  expect(loaded.today.interest).toBe(0);
});
