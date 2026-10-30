// 2호점: 홀 없는 배달 전문점을 매니저가 사장님이 정한 규칙대로 돌린다. 1호점처럼 시간 단위로 그리지 않고 하루 단위로 계산한다.
// 경기·환율·치즈 파동·명절은 1호점과 같은 세상을 겪고, 동네 사정은 그 동네의 해마다 같은 때만 따른다.
// 1호점의 장사 난수는 쓰지 않는다(2호점 전용 난수). 통장은 하나라 2호점 이익이 같은 통장으로 들어온다.
import {
  APP_ADS_DEMAND, APP_ADS_WEEKLY, APP_FEE_RATE, CARD_FEE_RATE, DELIVERY_COST_TOTAL, HOLIDAY_PAY_RATE, INSULATED_BOX_COST, INSURANCE_RATE,
} from './balance';
import { loanSchedule, monthlyPayment, type Loan } from './bank';
import { unlockCard } from './learning';
import { profitOf } from './ledger';
import { calendarDemand } from './localEvents';
import { MENU, activePizzas, unitCost } from './menu';
import { pushMessage } from './messages';
import { NEIGHBORHOODS, type NeighborhoodId } from './neighborhoods';
import { demandShock } from './news';
import { reportMoney as money } from './report';
import { Rng } from './rng';
import { DAYS_PER_MONTH, calendar } from './time';
import type { GameState } from './types';

export const BRANCH_DEPOSIT = 10_000_000;
export const BRANCH_KEY_MONEY = 5_000_000;
export const BRANCH_EQUIPMENT = 15_000_000;
export const BRANCH_COST = BRANCH_DEPOSIT + BRANCH_KEY_MONEY + BRANCH_EQUIPMENT;
export const BRANCH_REQ = { days: 6 * DAYS_PER_MONTH, profitMonths: 3, cash: 15_000_000 };
export const STARTUP_LOAN_MAX = 15_000_000;
export const STARTUP_LOAN_RATE = 0.05;
export const STARTUP_LOAN_MONTHS = 24;
export const STARTUP_LOAN_STEP = 500_000;
export const BRANCH_RENT: Record<NeighborhoodId, number> = { campus: 800_000, office: 1_200_000, residential: 600_000 };
/** 요일별(월~일) 기본 배달 주문 */
export const BRANCH_BASE_ORDERS: Record<NeighborhoodId, number[]> = {
  campus: [42, 42, 42, 42, 46, 36, 34],
  office: [46, 46, 46, 46, 46, 16, 12],
  residential: [36, 36, 36, 36, 44, 56, 56],
};
/** 가격에 얼마나 민감한가(동네 손님 성격) */
export const BRANCH_ELASTICITY: Record<NeighborhoodId, number> = { campus: 2.0, office: 0.8, residential: 1.2 };
/** 「동네에 맞게」면 매니저가 고르는 가격 수준 */
export const LOCAL_PRICE_INDEX: Record<NeighborhoodId, number> = { campus: 1.0, office: 1.1, residential: 1.0 };
/** 같은 동네면 1호점 배달 손님이 이만큼 2호점으로 */
export const CANNIBAL = 0.15;
/** 1호점과 함께 사면 재료비 할인 */
export const BULK_DISCOUNT = 0.05;
export const STAFF_ORDERS = 12;
export const STAFF_HOURS = 6;
export const BRANCH_UTILITIES = 20_000;
export const FREE_COLA_COST = 700;
const DAYS_KEEP = 60;

export type ManagerTrait = 'careful' | 'fast' | 'kind';
export const TRAIT_LABEL: Record<ManagerTrait, string> = { careful: '꼼꼼함', fast: '손이 빠름', kind: '친절함' };
export const TRAIT_TEXT: Record<ManagerTrait, string> = {
  careful: '재료를 덜 버리고 발주 실수가 적어요',
  fast: '바쁜 시간에 주문을 덜 놓쳐요',
  kind: '평점이 잘 올라요',
};
const MANAGER_CAP: Record<ManagerTrait, number> = { careful: 20, fast: 28, kind: 20 };
const MISTAKE: Record<ManagerTrait, number> = { careful: 0.01, fast: 0.04, kind: 0.03 };
const MANAGER_NAMES = ['김도윤', '이서연', '박지호', '최유나', '정민재', '한소율', '오태경', '윤하린', '장건우', '임채원', '강다온', '서지안'];

export interface Manager { name: string; trait: ManagerTrait; exp: number; salary: number }

export interface BranchRules {
  /** 가격: 1호점과 같게 / 동네에 맞게 매니저가 */
  price: 'same' | 'local';
  /** 재료를 며칠치 유지하나(적으면 떨어지기 쉽고, 많으면 버린다) */
  stockDays: number;
  /** 바쁜 시간 알바 수 */
  staff: number;
  /** 나쁜 리뷰: 매니저가 자동 사과 / 사장님께 보고 */
  reviews: 'apology' | 'report';
  /** 1호점과 함께 사기(공동구매) */
  bulk: boolean;
  appAds: boolean;
  freeCola: boolean;
  insulatedBox: boolean;
}

export const DEFAULT_RULES: BranchRules = { price: 'same', stockDays: 4, staff: 1, reviews: 'apology', bulk: true, appAds: false, freeCola: false, insulatedBox: false };

export interface BranchDay {
  day: number; monthIndex: number; orders: number; lost: number; revenue: number;
  food: number; fees: number; labor: number; rent: number; other: number; saved: number; mistake: boolean; profit: number;
}

export interface BranchMonth {
  monthIndex: number; orders: number; lost: number; revenue: number; food: number; fees: number; labor: number; rent: number;
  other: number; saved: number; mistakes: number; profit: number; rating: number;
}

export interface BranchState {
  neighborhoodId: NeighborhoodId;
  openedDay: number;
  manager: Manager;
  rules: BranchRules;
  rating: number;
  morale: number;
  days: BranchDay[];
  months: BranchMonth[];
  loan: Loan | null;
}

const branchRng = (s: GameState, salt: number) => new Rng((Math.imul(s.seed ^ 0x2b2b2b2b, 0x9e3779b1) ^ Math.imul(s.clock.day + 7, 0x85ebca6b) ^ Math.imul(salt + 1, 0xc2b2ae35)) >>> 0);

// ── 열기 ──────────────────────────────────────────

export function branchChecklist(s: GameState) {
  const last = s.ledger.months.slice(-BRANCH_REQ.profitMonths);
  return {
    days: s.clock.day >= BRANCH_REQ.days,
    profit: last.length >= BRANCH_REQ.profitMonths && last.every((m) => profitOf(m) > 0),
    cash: s.cash >= BRANCH_REQ.cash,
  };
}

export function canOpenBranch(s: GameState): boolean {
  const c = branchChecklist(s);
  return !s.branch && !s.closed && c.days && c.profit && c.cash;
}

/** 이번 주 면접에 온 매니저 후보 셋(성향이 모두 다르다). 한 주 동안은 같은 사람들이다. */
export function managerCandidates(s: GameState): Manager[] {
  const rng = new Rng((Math.imul(s.seed ^ 0x5eed, 0x9e3779b1) ^ Math.imul(Math.floor(s.clock.day / 7) + 3, 0x85ebca6b)) >>> 0);
  const names = [...MANAGER_NAMES];
  const traits: ManagerTrait[] = ['careful', 'fast', 'kind'];
  return traits.map((trait) => {
    const name = names.splice(rng.int(0, names.length - 1), 1)[0];
    const exp = rng.int(1, 7);
    const salary = Math.min(3_500_000, 2_800_000 + exp * 100_000 + (trait === 'fast' ? 100_000 : 0));
    return { name, trait, exp, salary };
  });
}

export function openBranch(s0: GameState, o: { neighborhoodId: NeighborhoodId; manager: Manager; loan: number }): GameState {
  if (!canOpenBranch(s0)) throw new Error('아직 2호점을 열 수 없어요');
  if (o.loan < 0 || o.loan > STARTUP_LOAN_MAX || o.loan % STARTUP_LOAN_STEP !== 0) throw new Error('대출 금액이 맞지 않아요');
  if (s0.cash + o.loan < BRANCH_COST) throw new Error('돈이 모자라요');
  const s = structuredClone(s0);
  s.cash += o.loan - BRANCH_COST;
  const loan: Loan | null = o.loan > 0
    ? { principal: o.loan, balance: o.loan, payment: monthlyPayment(o.loan, STARTUP_LOAN_RATE, STARTUP_LOAN_MONTHS), paymentsLeft: STARTUP_LOAN_MONTHS, startDay: s.clock.day, interestPaid: 0 }
    : null;
  s.branch = { neighborhoodId: o.neighborhoodId, openedDay: s.clock.day + 1, manager: o.manager, rules: { ...DEFAULT_RULES }, rating: 4.2, morale: 0.7, days: [], months: [], loan };
  const hood = NEIGHBORHOODS[o.neighborhoodId].name;
  pushMessage(s, {
    from: 'staff', name: `${o.manager.name} 매니저`, tone: 'good', important: true, action: 'shop',
    text: `사장님, ${hood} 2호점 내일 문 열어요! 정해 주신 규칙대로 잘 해 볼게요 💪`,
  });
  unlockCard(s, 'delegation', `${o.manager.name} 매니저(${TRAIT_LABEL[o.manager.trait]})에게 2호점을 맡겼어요. 월급 ${money(o.manager.salary)}으로 내 시간을 사고, 대신 가게를 내 눈으로 매일 보지는 못해요.`);
  return s;
}

export function setBranchRules(s: GameState, rules: Partial<BranchRules>): GameState {
  if (!s.branch) throw new Error('2호점이 없어요');
  const next = { ...s.branch.rules, ...rules };
  next.stockDays = Math.min(10, Math.max(1, next.stockDays));
  next.staff = Math.min(4, Math.max(0, next.staff));
  return { ...s, branch: { ...s.branch, rules: next } };
}

/** 2호점 정리: 보증금은 돌려받고, 권리금·장비 값은 날아간다. 남은 창업 대출은 갚는다. */
export function closeBranch(s0: GameState): GameState {
  const b = s0.branch;
  if (!b) throw new Error('2호점이 없어요');
  const s = structuredClone(s0);
  const loan = b.loan?.balance ?? 0;
  s.cash += BRANCH_DEPOSIT - loan;
  s.branch = null;
  pushMessage(s, { from: 'owner', name: '사장님(나)', tone: 'neutral', text: `2호점을 정리했다. 보증금 ${money(BRANCH_DEPOSIT)}은 돌아왔지만 권리금·장비 ${money(BRANCH_KEY_MONEY + BRANCH_EQUIPMENT)}은 날아갔다.${loan > 0 ? ` 남은 대출 ${money(loan)}도 갚았다.` : ''}` });
  return s;
}

// ── 하루 계산 ───────────────────────────────────────

/** 1호점 배달 손님 중 2호점으로 간 몫(같은 동네일 때만) */
export function branchShare(s: GameState): { hall: number; delivery: number } {
  return s.branch && s.branch.neighborhoodId === s.neighborhoodId && s.clock.day >= s.branch.openedDay ? { hall: 1, delivery: 1 - CANNIBAL } : { hall: 1, delivery: 1 };
}

function avgPizza(s: GameState, premium: boolean) {
  const ids = activePizzas(s.menuActive);
  const price = ids.reduce((a, id) => a + s.menuPrices[id], 0) / ids.length;
  const defaultPrice = ids.reduce((a, id) => a + MENU[id].defaultPrice, 0) / ids.length;
  const cost = ids.reduce((a, id) => a + unitCost(id, s.prices, { premiumCheese: premium }), 0) / ids.length;
  return { price, index: price / defaultPrice, defaultPrice, cost };
}

export function priceIndexOf(s: GameState, b: BranchState): number {
  return b.rules.price === 'same' ? avgPizza(s, false).index : LOCAL_PRICE_INDEX[b.neighborhoodId];
}

/** 마감 때: 2호점의 하루 장사(매니저 실수·사장님 들르기 포함), 통장에 이익을 더하고 매니저가 카톡으로 보고한다 */
export function branchEvening(s: GameState, visited: boolean): void {
  const b = s.branch;
  const day = s.clock.day;
  if (!b || day < b.openedDay) return;
  const rng = branchRng(s, 1);
  const cal = calendar(s.clock);
  const r = b.rules;
  const m = b.manager;
  const idx = priceIndexOf(s, b);
  const pizza = avgPizza(s, false);
  // 수요: 요일 × 가격 × 평점 × 경기·위기 × 동네 해마다 같은 때 × 광고 × 들쭉날쭉
  const cycle = s.economy.cycle === 'boom' ? 1.06 : s.economy.cycle === 'recession' ? 0.92 : 1;
  const demand = BRANCH_BASE_ORDERS[b.neighborhoodId][cal.dayOfWeek]
    * idx ** -BRANCH_ELASTICITY[b.neighborhoodId]
    * (b.rating / 4.3) ** 2
    * cycle * demandShock(s.news.active, day).delivery * calendarDemand(b.neighborhoodId, day)
    * (r.appAds ? APP_ADS_DEMAND : 1)
    * (0.9 + rng.float() * 0.2);
  // 매니저 실수: 재료 떨어진 날(꼼꼼함·경력·의욕·재고 일수에 따라)
  const mistakeChance = MISTAKE[m.trait] * (1 - m.exp * 0.05) * (b.morale < 0.4 ? 2 : 1) * (r.stockDays <= 2 ? 2 : 1);
  const mistake = rng.chance(mistakeChance);
  const cap = (MANAGER_CAP[m.trait] + m.exp) + r.staff * STAFF_ORDERS;
  const wanted = Math.round(demand);
  const orders = Math.round(Math.min(wanted, cap) * (mistake ? 0.4 : 1));
  const lost = Math.max(0, wanted - orders);
  const ticket = pizza.defaultPrice * idx * 1.12;
  const revenue = Math.round(orders * ticket);
  const wasteRate = Math.max(0, r.stockDays - 3) * 0.004 * (m.trait === 'careful' ? 0.5 : 1);
  const foodFull = orders * pizza.cost * 1.08 * (1 + wasteRate);
  const saved = r.bulk ? Math.round(foodFull * BULK_DISCOUNT) : 0;
  const food = Math.round(foodFull) - saved;
  const fees = Math.round(revenue * (APP_FEE_RATE + CARD_FEE_RATE) + orders * (DELIVERY_COST_TOTAL - s.settings.deliveryTip));
  const labor = Math.round(r.staff * STAFF_HOURS * s.economy.minWage * (1 + INSURANCE_RATE) * (1 + HOLIDAY_PAY_RATE) + m.salary / DAYS_PER_MONTH);
  const other = Math.round(BRANCH_UTILITIES + (r.appAds ? APP_ADS_WEEKLY / 7 : 0) + orders * ((r.freeCola ? FREE_COLA_COST : 0) + (r.insulatedBox ? INSULATED_BOX_COST : 0)));
  // 월세·창업 대출은 매달 첫날
  let rent = 0;
  if (cal.dayOfMonth === 0 && day > b.openedDay) {
    rent = BRANCH_RENT[b.neighborhoodId];
    if (b.loan) {
      const interest = Math.round(b.loan.balance * (STARTUP_LOAN_RATE / 12));
      const principal = b.loan.paymentsLeft <= 1 ? b.loan.balance : Math.min(b.loan.balance, b.loan.payment - interest);
      rent += interest;
      s.cash -= principal;
      const balance = b.loan.balance - principal;
      b.loan = balance <= 0 ? null : { ...b.loan, balance, paymentsLeft: b.loan.paymentsLeft - 1, interestPaid: b.loan.interestPaid + interest };
    }
  }
  const profit = revenue - food - fees - labor - rent - other;
  s.cash += profit;
  // 평점: 놓친 주문·실수는 깎고, 친절·서비스·사장님 방문·의욕은 올린다
  const lostRatio = wanted > 0 ? lost / wanted : 0;
  const target = 4.2 + (m.trait === 'kind' ? 0.25 : 0) + (r.freeCola ? 0.15 : 0) + (r.insulatedBox ? 0.15 : 0) + (r.reviews === 'apology' ? 0.05 : 0)
    + (visited ? 0.3 : 0) + (b.morale - 0.5) * 0.4 - lostRatio * 1.5 - (mistake ? 0.5 : 0);
  const rating = Math.min(5, Math.max(2, b.rating + (target - b.rating) * 0.05));
  const morale = Math.min(1, Math.max(0, b.morale - 0.01 + (visited ? 0.25 : 0)));
  const rec: BranchDay = { day, monthIndex: cal.monthIndex, orders, lost, revenue, food, fees, labor, rent, other, saved, mistake, profit };
  s.branch = { ...b, rating, morale, days: [...b.days, rec].slice(-DAYS_KEEP) };
  const name = `${m.name} 매니저`;
  if (mistake) {
    pushMessage(s, { from: 'staff', name, tone: 'bad', important: true, action: 'shop', text: `사장님 죄송해요… 2호점 발주를 놓쳐서 오늘 재료가 떨어졌어요. 주문을 ${lost}건 못 받았어요 ㅠ` });
  } else {
    const lostText = lost > 0 ? ` 일손이 모자라 ${lost}건 놓쳤어요.` : ' 별일 없었어요.';
    const badText = r.reviews === 'report' && rating < b.rating - 0.01 ? ' 나쁜 리뷰가 있었는데 답은 안 달았어요.' : '';
    pushMessage(s, { from: 'staff', name, tone: profit >= 0 ? 'neutral' : 'bad', action: 'shop', text: `사장님, 2호점 오늘 주문 ${orders}건, 매출 ${money(revenue)}이에요.${lostText}${badText}${visited ? ' 오늘 와 주셔서 힘났어요 🙌' : ''}` });
  }
}

/** 월말: 2호점 한 달 정리, 공동구매·자기잠식 카드 */
export function branchMonthEnd(s: GameState, monthIndex: number): BranchMonth | null {
  const b = s.branch;
  if (!b) return null;
  const days = b.days.filter((d) => d.monthIndex === monthIndex);
  if (days.length === 0) return null;
  const sum = (k: keyof BranchDay) => days.reduce((a, d) => a + (d[k] as number), 0);
  const month: BranchMonth = {
    monthIndex, orders: sum('orders'), lost: sum('lost'), revenue: sum('revenue'), food: sum('food'), fees: sum('fees'), labor: sum('labor'),
    rent: sum('rent'), other: sum('other'), saved: sum('saved'), mistakes: days.filter((d) => d.mistake).length, profit: sum('profit'), rating: b.rating,
  };
  s.branch = { ...b, months: [...b.months, month].slice(-24) };
  if (month.saved > 0) unlockCard(s, 'scale', `1호점과 재료를 함께 사서 2호점 재료비를 한 달에 ${money(month.saved)} 아꼈어요.`);
  if (b.neighborhoodId === s.neighborhoodId) {
    unlockCard(s, 'cannibalization', `2호점이 같은 동네라 1호점 배달 손님의 약 ${Math.round(CANNIBAL * 100)}%가 2호점으로 갔어요. 두 가게를 합친 이번 달 2호점 주문은 ${month.orders}건이었어요.`);
  }
  return month;
}

/** 2호점 한 달 평가 한 줄(매니저 성향과 숫자) */
export function managerReview(b: BranchState, m: BranchMonth): string {
  const parts: string[] = [];
  if (m.mistakes > 0) parts.push(`발주 실수 ${m.mistakes}번`);
  if (m.lost > m.orders * 0.1) parts.push(`일손이 모자라 ${m.lost}건 놓침`);
  if (m.saved > 0) parts.push(`공동구매로 ${money(m.saved)} 아낌`);
  parts.push(`평점 ★ ${m.rating.toFixed(1)}`);
  return `${b.manager.name} 매니저(${TRAIT_LABEL[b.manager.trait]}): ${parts.join(' · ')}`;
}

export const branchLoanSchedule = (amount: number) => loanSchedule(amount, STARTUP_LOAN_RATE, STARTUP_LOAN_MONTHS);
