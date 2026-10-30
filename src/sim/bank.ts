// 망하는 길을 하나의 이야기로: 긴급 대출 → 업그레이드 되팔기 → 그래도 안 되면 폐업 → 폐업 부검 → 다른 동네에서 다시.
// 대출: 통장이 마이너스거나 2주도 못 버틸 때, 한 번에 하나. 한도는 월세 석 달치, 연 6%, 12개월 원리금 균등 상환(매달 1일 월세와 함께).
// 폐업: 통장 마이너스가 2주 이어지면 경고, 4주 이어지면 문을 닫는다. 스스로 정리할 수도 있다.
import { currentRent } from './lease';
import { unlockCard } from './learning';
import { profitOf } from './ledger';
import { OWNER_NAME, pushMessage } from './messages';
import { NEIGHBORHOODS } from './neighborhoods';
import { reportMoney as money } from './report';
import { runwayWeeks } from './runway';
import type { GameState } from './types';
import { UPGRADES, type UpgradeDef } from './upgradeOps';
import type { UpgradeId } from './upgrades';

export const LOAN_RATE = 0.06;
export const LOAN_MONTHS = 12;
export const LOAN_STEP = 500_000;
export const LOAN_RENT_MONTHS = 3;
/** 업그레이드를 되팔면 산 값의 이만큼 */
export const RESALE_RATE = 0.4;
export const DISTRESS_WARN_DAYS = 14;
export const DISTRESS_CLOSE_DAYS = 28;

export interface Loan {
  principal: number;
  balance: number;
  /** 매달 갚는 돈(원금+이자) */
  payment: number;
  paymentsLeft: number;
  startDay: number;
  /** 지금까지 낸 이자 */
  interestPaid: number;
}

export interface BankState {
  loan: Loan | null;
  /** 마감 때 통장이 마이너스였던 날이 며칠째 이어지나 */
  negativeDays: number;
}

export interface ClosedShop {
  day: number;
  reason: 'bankrupt' | 'voluntary';
}

export function initialBank(): BankState {
  return { loan: null, negativeDays: 0 };
}

export function loanLimit(s: GameState): number {
  return Math.floor((currentRent(s) * LOAN_RENT_MONTHS) / LOAN_STEP) * LOAN_STEP;
}

export function canBorrow(s: GameState): boolean {
  return !s.bank.loan && (s.cash < 0 || runwayWeeks(s) < 2);
}

/** 원리금 균등: 매달 같은 돈을 내고, 그 안의 이자는 남은 원금에 매긴다 */
export function monthlyPayment(amount: number, rate = LOAN_RATE, months = LOAN_MONTHS): number {
  const r = rate / 12;
  return Math.round((amount * r) / (1 - (1 + r) ** -months));
}

export function loanSchedule(amount: number, rate = LOAN_RATE, months = LOAN_MONTHS): { n: number; interest: number; principal: number; balance: number }[] {
  const r = rate / 12;
  const pay = monthlyPayment(amount, rate, months);
  const rows = [];
  let balance = amount;
  for (let n = 1; n <= months; n++) {
    const interest = Math.round(balance * r);
    const principal = n === months ? balance : Math.min(balance, pay - interest);
    balance -= principal;
    rows.push({ n, interest, principal, balance });
  }
  return rows;
}

export function borrow(s0: GameState, amount: number): GameState {
  if (!canBorrow(s0)) throw new Error('지금은 대출을 받을 수 없어요');
  if (amount <= 0 || amount > loanLimit(s0) || amount % LOAN_STEP !== 0) throw new Error('대출 금액이 맞지 않아요');
  const s = structuredClone(s0);
  const payment = monthlyPayment(amount);
  s.cash += amount;
  s.today.loan += amount;
  s.bank = { ...s.bank, loan: { principal: amount, balance: amount, payment, paymentsLeft: LOAN_MONTHS, startDay: s.clock.day, interestPaid: 0 } };
  const interest = loanSchedule(amount).reduce((a, x) => a + x.interest, 0);
  pushMessage(s, { from: 'bank', name: '은행', tone: 'neutral', important: true, action: 'ledger', text: `대출 ${money(amount)}이 들어왔어요. 다음 달부터 매달 1일에 ${money(payment)}씩 ${LOAN_MONTHS}번 갚아요.` });
  unlockCard(s, 'debt', `${money(amount)}을 빌렸어요. 1년 동안 이자로 약 ${money(interest)}을 더 내고, 매달 ${money(payment)}이 고정비처럼 나가요.`);
  return s;
}

/** 매달 1일: 원리금 자동 상환(이자는 비용, 원금은 이익과 상관없는 돈 흐름) */
export function payLoanInPlace(s: GameState): void {
  const loan = s.bank.loan;
  if (!loan || s.clock.day <= loan.startDay) return;
  const interest = Math.round(loan.balance * (LOAN_RATE / 12));
  const principal = loan.paymentsLeft <= 1 ? loan.balance : Math.min(loan.balance, loan.payment - interest);
  s.cash -= interest + principal;
  s.today.interest += interest;
  s.today.loan -= principal;
  const balance = loan.balance - principal;
  if (balance <= 0) {
    s.bank = { ...s.bank, loan: null };
    pushMessage(s, { from: 'bank', name: '은행', tone: 'good', text: `대출을 다 갚았어요. 이자로 모두 ${money(loan.interestPaid + interest)}을 냈어요. 수고하셨어요 👏` });
  } else {
    s.bank = { ...s.bank, loan: { ...loan, balance, paymentsLeft: loan.paymentsLeft - 1, interestPaid: loan.interestPaid + interest } };
  }
}

/** 남은 원금을 한 번에 갚기(중도 상환 수수료 없음) */
export function repayAll(s0: GameState): GameState {
  const loan = s0.bank.loan;
  if (!loan) throw new Error('갚을 대출이 없어요');
  if (s0.cash < loan.balance) throw new Error('통장 돈이 모자라요');
  return {
    ...s0,
    cash: s0.cash - loan.balance,
    today: { ...s0.today, loan: s0.today.loan - loan.balance },
    bank: { ...s0.bank, loan: null },
  };
}

/** 이 업그레이드를 한 단계 되팔면 받는 돈(기본 단계는 못 판다) */
export function resaleValue(s: GameState, id: UpgradeId): number | null {
  const def: UpgradeDef = UPGRADES[id];
  const level = s.upgrades[id];
  if (level <= def.start) return null;
  return Math.round(def.costs[level - 1 - def.start] * RESALE_RATE);
}

export function sellUpgrade(s0: GameState, id: UpgradeId): GameState {
  const value = resaleValue(s0, id);
  if (value === null) throw new Error('기본 단계는 되팔 수 없어요');
  return {
    ...s0,
    cash: s0.cash + value,
    upgrades: { ...s0.upgrades, [id]: s0.upgrades[id] - 1 },
    // 되판 돈은 투자를 거둬들인 것: 그날 투자에서 뺀다(이익이 그만큼 커 보인다)
    today: { ...s0.today, investment: (s0.today.investment ?? 0) - value },
  };
}

/** 마감 때: 통장 마이너스가 이어지면 경고하고, 끝내 못 버티면 문을 닫는다 */
export function distressEvening(s: GameState): 'warn' | 'closed' | null {
  const neg = s.cash < 0 ? s.bank.negativeDays + 1 : 0;
  s.bank = { ...s.bank, negativeDays: neg };
  if (neg === DISTRESS_WARN_DAYS) {
    pushMessage(s, {
      from: 'owner', name: OWNER_NAME, tone: 'bad', important: true, action: 'ledger',
      text: `통장이 2주째 마이너스다… 2주 안에 플러스로 못 돌리면 가게를 닫아야 한다. 대출·업그레이드 되팔기·비용 줄이기를 해 보자.`,
    });
    return 'warn';
  }
  if (neg >= DISTRESS_CLOSE_DAYS) {
    s.closed = { day: s.clock.day, reason: 'bankrupt' };
    return 'closed';
  }
  return null;
}

export function closeShop(s: GameState, reason: ClosedShop['reason']): GameState {
  return { ...s, closed: { day: s.clock.day, reason } };
}

/** 폐업 정산: 통장 + 돌려받는 보증금 − 남은 대출. 권리금은 돌려받지 못한다. */
export function settlement(s: GameState) {
  const n = NEIGHBORHOODS[s.neighborhoodId].listing;
  const loan = s.bank.loan?.balance ?? 0;
  return { cash: s.cash, deposit: n.deposit, loan, keyMoney: n.keyMoney, total: s.cash + n.deposit - loan };
}

/** 개업부터 지금까지 이익(마감한 달 + 아직 마감 안 한 날) */
export function lifetimeProfit(s: GameState): number {
  const closedMonths = new Set(s.ledger.months.map((m) => m.monthIndex));
  const months = s.ledger.months.reduce((a, m) => a + profitOf(m), 0);
  const days = s.ledger.days.filter((d) => !closedMonths.has(d.monthIndex)).reduce((a, d) => a + profitOf(d), 0);
  return Math.round(months + days);
}
