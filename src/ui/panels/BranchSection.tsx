// 가게 탭의 2호점: 열기 전엔 체크리스트와 열기 준비(동네·매니저·창업 대출), 연 뒤엔 숫자·규칙·들르기·정리하기.
import { useState } from 'react';
import {
  BRANCH_COST, BRANCH_DEPOSIT, BRANCH_EQUIPMENT, BRANCH_KEY_MONEY, BRANCH_RENT, BRANCH_REQ, CANNIBAL, FREE_COLA_COST, STAFF_HOURS,
  STARTUP_LOAN_MAX, STARTUP_LOAN_MONTHS, STARTUP_LOAN_RATE, STARTUP_LOAN_STEP, TRAIT_LABEL, TRAIT_TEXT, branchChecklist, branchLoanSchedule,
  canOpenBranch, closeBranch, managerCandidates, openBranch, setBranchRules, type BranchRules,
} from '../../sim/branch';
import { monthlyPayment } from '../../sim/bank';
import { APP_ADS_WEEKLY, HOLIDAY_PAY_RATE, INSULATED_BOX_COST, INSURANCE_RATE } from '../../sim/balance';
import { NEIGHBORHOODS, type NeighborhoodId } from '../../sim/neighborhoods';
import { ownerAway, visitBranch } from '../../sim/owner';
import { calendar } from '../../sim/time';
import { manwon, won } from '../format';
import type { PanelProps } from './common';

const HOODS: NeighborhoodId[] = ['campus', 'office', 'residential'];
const HOOD_NOTE: Record<NeighborhoodId, string> = {
  campus: '배달 손님이 꾸준하지만 가격에 민감하고, 방학엔 확 줄어요',
  office: '평일엔 바쁘지만 주말엔 손님이 거의 없어요',
  residential: '주말에 주문이 몰리고, 가족 손님이 많아요',
};
const check = (ok: boolean) => (ok ? '✅' : '⬜');

function OpenForm({ state, update }: PanelProps) {
  const candidates = managerCandidates(state);
  const [hood, setHood] = useState<NeighborhoodId | null>(null);
  const [mi, setMi] = useState<number | null>(null);
  const need = Math.max(0, BRANCH_COST - state.cash + 2_000_000);
  const [loan, setLoan] = useState(Math.min(STARTUP_LOAN_MAX, Math.ceil(need / STARTUP_LOAN_STEP) * STARTUP_LOAN_STEP));
  const left = state.cash + loan - BRANCH_COST;
  const interest = loan > 0 ? branchLoanSchedule(loan).reduce((a, r) => a + r.interest, 0) : 0;
  return (
    <div className="branch-open card" role="group" aria-label="2호점 열기">
      <p className="sub">배달 전문점(홀 없음): 보증금 {manwon(BRANCH_DEPOSIT)} + 권리금 {manwon(BRANCH_KEY_MONEY)} + 장비 {manwon(BRANCH_EQUIPMENT)} = <b>{manwon(BRANCH_COST)}</b></p>
      <h5>① 어느 동네에?</h5>
      <div className="choice-list">
        {HOODS.map((h) => (
          <button key={h} className="btn choice" aria-pressed={hood === h} onClick={() => setHood(h)}>
            <b>{NEIGHBORHOODS[h].name}</b>
            <span className="sub">월세 {manwon(BRANCH_RENT[h])} · {HOOD_NOTE[h]}</span>
            {h === state.neighborhoodId && <span className="sub neg">1호점과 같은 동네: 1호점 배달 손님 약 {Math.round(CANNIBAL * 100)}%를 나눠 가져요</span>}
          </button>
        ))}
      </div>
      <h5>② 매니저 면접 (이번 주 후보)</h5>
      <div className="choice-list">
        {candidates.map((m, i) => (
          <button key={m.name} className="btn choice" aria-pressed={mi === i} onClick={() => setMi(i)}>
            <b>{m.name} · {TRAIT_LABEL[m.trait]}</b>
            <span className="sub">{TRAIT_TEXT[m.trait]} · 경력 {m.exp}년 · 월급 {manwon(m.salary)}</span>
          </button>
        ))}
      </div>
      <h5>③ 창업 대출</h5>
      <div className="setting-row">
        <span>빌릴 돈</span>
        <button className="btn mini" aria-label="창업 대출 줄이기" disabled={loan <= 0} onClick={() => setLoan(loan - STARTUP_LOAN_STEP)}>−</button>
        <b>{won(loan)}</b>
        <button className="btn mini" aria-label="창업 대출 늘리기" disabled={loan >= STARTUP_LOAN_MAX} onClick={() => setLoan(loan + STARTUP_LOAN_STEP)}>+</button>
      </div>
      <p className="sub">
        최대 {manwon(STARTUP_LOAN_MAX)} · 연 {STARTUP_LOAN_RATE * 100}% · {STARTUP_LOAN_MONTHS}개월{loan > 0 ? ` · 매달 ${won(monthlyPayment(loan, STARTUP_LOAN_RATE, STARTUP_LOAN_MONTHS))} · 이자 모두 약 ${won(interest)}` : ''}
      </p>
      <p className={left < 0 ? 'neg' : ''}>열고 나면 통장: <b>{won(left)}</b></p>
      <button
        className="btn primary"
        disabled={hood === null || mi === null || left < 0}
        onClick={() => update((s) => openBranch(s, { neighborhoodId: hood!, manager: candidates[mi!], loan }))}
      >
        2호점 열기
      </button>
    </div>
  );
}

function Rules({ state, update }: PanelProps) {
  const r = state.branch!.rules;
  const set = (x: Partial<BranchRules>) => update((s) => setBranchRules(s, x));
  const staffDay = Math.round(STAFF_HOURS * state.economy.minWage * (1 + INSURANCE_RATE) * (1 + HOLIDAY_PAY_RATE));
  const toggle = (key: 'bulk' | 'appAds' | 'freeCola' | 'insulatedBox', label: string, note: string) => (
    <label className="setting-row toggle">
      <input type="checkbox" checked={r[key]} onChange={(e) => set({ [key]: e.target.checked })} />
      <span>{label}</span><span className="sub">{note}</span>
    </label>
  );
  return (
    <div className="branch-rules" role="group" aria-label="2호점 규칙">
      <div className="setting-row">
        <span>가격</span>
        <button className="btn mini" aria-pressed={r.price === 'same'} onClick={() => set({ price: 'same' })}>1호점과 같게</button>
        <button className="btn mini" aria-pressed={r.price === 'local'} onClick={() => set({ price: 'local' })}>동네에 맞게(매니저가)</button>
      </div>
      <div className="setting-row">
        <span>재료 유지</span>
        <button className="btn mini" aria-label="재료 유지 일수 줄이기" onClick={() => set({ stockDays: r.stockDays - 1 })}>−</button>
        <b>{r.stockDays}일치</b>
        <button className="btn mini" aria-label="재료 유지 일수 늘리기" onClick={() => set({ stockDays: r.stockDays + 1 })}>+</button>
        <span className="sub">적으면 떨어지기 쉽고 많으면 버려요</span>
      </div>
      <div className="setting-row">
        <span>바쁜 시간 알바</span>
        <button className="btn mini" aria-label="2호점 알바 줄이기" onClick={() => set({ staff: r.staff - 1 })}>−</button>
        <b>{r.staff}명</b>
        <button className="btn mini" aria-label="2호점 알바 늘리기" onClick={() => set({ staff: r.staff + 1 })}>+</button>
        <span className="sub">한 명에 하루 약 {won(staffDay)}</span>
      </div>
      <div className="setting-row">
        <span>나쁜 리뷰</span>
        <button className="btn mini" aria-pressed={r.reviews === 'apology'} onClick={() => set({ reviews: 'apology' })}>매니저가 자동 사과</button>
        <button className="btn mini" aria-pressed={r.reviews === 'report'} onClick={() => set({ reviews: 'report' })}>사장님께 보고만</button>
      </div>
      {toggle('bulk', '1호점과 재료 함께 사기', '공동구매로 재료비 5% 할인')}
      {toggle('appAds', '배달앱 광고', `주 ${won(APP_ADS_WEEKLY)}`)}
      {toggle('freeCola', '콜라 서비스', `주문마다 ${won(FREE_COLA_COST)}`)}
      {toggle('insulatedBox', '보온 포장', `주문마다 ${won(INSULATED_BOX_COST)}`)}
    </div>
  );
}

export function BranchSection({ state, update }: PanelProps) {
  const b = state.branch;
  if (!b) {
    const c = branchChecklist(state);
    return (
      <>
        <h4>🏬 2호점</h4>
        <ul className="checklist" aria-label="2호점 열기 조건">
          <li>{check(c.days)} 개업 6개월 이상 <span className="sub">(지금 {state.clock.day}일째 / {BRANCH_REQ.days}일)</span></li>
          <li>{check(c.profit)} 최근 {BRANCH_REQ.profitMonths}달 연속 흑자</li>
          <li>{check(c.cash)} 통장 {manwon(BRANCH_REQ.cash)} 이상</li>
        </ul>
        {canOpenBranch(state) ? <OpenForm state={state} update={update} /> : <p className="sub">세 가지가 다 차면 매니저에게 맡기는 배달 전문 2호점을 열 수 있어요.</p>}
      </>
    );
  }
  const week = b.days.slice(-7);
  const monthIndex = calendar(state.clock).monthIndex;
  const month = b.days.filter((d) => d.monthIndex === monthIndex);
  const sum = (ds: typeof week, k: 'orders' | 'profit') => ds.reduce((a, d) => a + d[k], 0);
  const scheduled = state.owner.awayReason === 'branch' && state.owner.awayUntil >= state.clock.day;
  return (
    <>
      <h4>🏬 2호점 · {NEIGHBORHOODS[b.neighborhoodId].name}</h4>
      <div className="branch-card card" aria-label="2호점 현황">
        <p><b>{b.manager.name} 매니저</b> <span className="sub">{TRAIT_LABEL[b.manager.trait]} · 경력 {b.manager.exp}년 · 월급 {manwon(b.manager.salary)}</span></p>
        <p>평점 ★ {b.rating.toFixed(1)} · 매니저 의욕 <span className="stress-bar inline"><span style={{ width: `${Math.round(b.morale * 100)}%` }} /></span></p>
        <p>
          지난 7일 주문 {sum(week, 'orders')}건 · 이익 <b className={sum(week, 'profit') < 0 ? 'neg' : ''}>{won(sum(week, 'profit'))}</b>
          {' '}· 이번 달 이익 <b className={sum(month, 'profit') < 0 ? 'neg' : ''}>{won(sum(month, 'profit'))}</b>
        </p>
        {b.loan && <p className="sub">창업 대출 남은 원금 {won(b.loan.balance)} · 매달 {won(b.loan.payment)}</p>}
      </div>
      <Rules state={state} update={update} />
      <div className="setting-row">
        <button className="btn" disabled={scheduled || (state.owner.awayUntil >= state.clock.day + 1)} onClick={() => update((s) => visitBranch(s))}>🚗 내일 2호점 들르기</button>
        <span className="sub">{scheduled || ownerAway(state) ? '이미 정해 둔 일정이 있어요' : '1호점은 알바가 봐요 · 스트레스 조금 ↑ · 2호점 평점·매니저 의욕 ↑'}</span>
      </div>
      <button className="btn danger" onClick={() => { if (window.confirm(`2호점을 정리할까요? 보증금 ${manwon(BRANCH_DEPOSIT)}은 돌려받고 권리금·장비 ${manwon(BRANCH_KEY_MONEY + BRANCH_EQUIPMENT)}은 날아가요.`)) update((s) => closeBranch(s)); }}>2호점 정리하기</button>
    </>
  );
}
