import { useState } from 'react';
import { LOAN_MONTHS, LOAN_RATE, LOAN_STEP, borrow, canBorrow, loanLimit, loanSchedule, monthlyPayment, repayAll } from '../../sim/bank';
import { emptyDay, profitOf, type MonthRecord } from '../../sim/ledger';
import { calendar } from '../../sim/time';
import { won } from '../format';
import type { PanelProps } from './common';

const ROWS: { key: keyof MonthRecord; label: string; sign: 1 | -1 }[] = [
  { key: 'revenueHall', label: '매출(홀)', sign: 1 },
  { key: 'revenueDelivery', label: '매출(배달)', sign: 1 },
  { key: 'foodCost', label: '재료비', sign: -1 },
  { key: 'serviceCost', label: '서비스 비용(콜라·보온 포장·쿠폰)', sign: -1 },
  { key: 'wasteCost', label: '폐기', sign: -1 },
  { key: 'labor', label: '인건비', sign: -1 },
  { key: 'rent', label: '월세', sign: -1 },
  { key: 'appFees', label: '배달앱 수수료', sign: -1 },
  { key: 'cardFees', label: '카드 수수료', sign: -1 },
  { key: 'deliveryFees', label: '배달비', sign: -1 },
  { key: 'utilities', label: '공과금', sign: -1 },
  { key: 'ads', label: '광고비', sign: -1 },
  { key: 'investment', label: '투자(메뉴 개발·업그레이드)', sign: -1 },
  { key: 'interest', label: '대출 이자', sign: -1 },
];

function monthToDate(state: PanelProps['state']): MonthRecord {
  const monthIndex = calendar(state.clock).monthIndex;
  const { day: _d, usage: _u, prices: _p, used: _us, paid: _pa, ...sum } = emptyDay(0, monthIndex);
  for (const d of [...state.ledger.days, state.today]) {
    if (d.monthIndex !== monthIndex) continue;
    for (const k of Object.keys(sum) as (keyof MonthRecord)[]) if (k !== 'monthIndex') sum[k] += d[k];
  }
  return sum;
}

/** 긴급 대출: 받을 수 있을 때 금액을 고르고, 받은 뒤엔 상환표와 한 번에 갚기 */
function LoanCard({ state, update }: PanelProps) {
  const limit = loanLimit(state);
  const [amount, setAmount] = useState(limit);
  const loan = state.bank.loan;
  if (loan) {
    const rows = loanSchedule(loan.principal).slice(LOAN_MONTHS - loan.paymentsLeft);
    return (
      <section className="loan card" aria-label="대출">
        <h4>🏦 대출 {won(loan.principal)} · 남은 원금 {won(loan.balance)}</h4>
        <p className="sub">매달 1일에 {won(loan.payment)}씩 · 남은 {loan.paymentsLeft}번 · 지금까지 낸 이자 {won(loan.interestPaid)}</p>
        <table className="ledger loan-table" aria-label="상환표">
          <thead><tr><th>회차</th><th>이자</th><th>원금</th><th>남은 원금</th></tr></thead>
          <tbody>{rows.slice(0, 4).map((r) => <tr key={r.n}><th>{r.n}</th><td>{won(r.interest)}</td><td>{won(r.principal)}</td><td>{won(r.balance)}</td></tr>)}</tbody>
        </table>
        <button className="btn" disabled={state.cash < loan.balance} onClick={() => update((s) => repayAll(s))}>남은 {won(loan.balance)} 한 번에 갚기</button>
      </section>
    );
  }
  if (!canBorrow(state) || limit <= 0) return null;
  const a = Math.min(Math.max(LOAN_STEP, amount), limit);
  const interest = loanSchedule(a).reduce((x, r) => x + r.interest, 0);
  return (
    <section className="loan card tight" aria-label="긴급 대출">
      <h4>🏦 긴급 대출을 받을 수 있어요</h4>
      <p className="sub">통장이 마이너스거나 2주도 못 버틸 때만 열려요. 한도는 월세 석 달치({won(limit)}), 연 {LOAN_RATE * 100}%, {LOAN_MONTHS}개월 동안 매달 갚아요.</p>
      <div className="setting-row">
        <span>빌릴 돈</span>
        <button className="btn mini" aria-label="대출 금액 줄이기" disabled={a <= LOAN_STEP} onClick={() => setAmount(a - LOAN_STEP)}>−</button>
        <b>{won(a)}</b>
        <button className="btn mini" aria-label="대출 금액 늘리기" disabled={a >= limit} onClick={() => setAmount(a + LOAN_STEP)}>+</button>
      </div>
      <p className="sub">매달 {won(monthlyPayment(a))} × {LOAN_MONTHS}번 · 이자 모두 약 {won(interest)}</p>
      <button className="btn primary" onClick={() => update((s) => borrow(s, a))}>{won(a)} 빌리기</button>
    </section>
  );
}

/** 2호점 장부: 이번 달(오늘까지)과 지난달 */
function BranchLedger({ state }: { state: PanelProps['state'] }) {
  const b = state.branch;
  if (!b) return null;
  const monthIndex = calendar(state.clock).monthIndex;
  const days = b.days.filter((d) => d.monthIndex === monthIndex);
  const sum = (k: 'revenue' | 'food' | 'fees' | 'labor' | 'rent' | 'other' | 'profit' | 'orders') => days.reduce((a, d) => a + d[k], 0);
  const last = b.months.at(-1);
  const rows: [string, number, number | undefined][] = [
    ['매출', sum('revenue'), last?.revenue],
    ['재료비', -sum('food'), last && -last.food],
    ['수수료·배달비', -sum('fees'), last && -last.fees],
    ['인건비(매니저·알바)', -sum('labor'), last && -last.labor],
    ['월세·창업 대출 이자', -sum('rent'), last && -last.rent],
    ['공과금·광고·서비스', -sum('other'), last && -last.other],
  ];
  return (
    <section className="card branch-ledger" aria-label="2호점 장부">
      <h4>🏬 2호점 장부 <span className="sub">(통장은 1호점과 함께 써요)</span></h4>
      <table className="ledger">
        <thead><tr><th /><th>이번 달(오늘까지)</th>{last && <th>지난달</th>}</tr></thead>
        <tbody>
          {rows.map(([label, cur, prev]) => <tr key={label}><th>{label}</th><td>{won(cur || 0)}</td>{last && <td>{won(prev || 0)}</td>}</tr>)}
          <tr className="total"><th>이익</th><td className={sum('profit') < 0 ? 'neg' : ''}>{won(sum('profit'))}</td>{last && <td className={last.profit < 0 ? 'neg' : ''}>{won(last.profit)}</td>}</tr>
        </tbody>
      </table>
      <p className="sub">이번 달 주문 {sum('orders')}건{last ? ` · 지난달 ${last.orders}건` : ''}</p>
    </section>
  );
}

export function LedgerPanel({ state, update }: PanelProps) {
  const cal = calendar(state.clock);
  const current = monthToDate(state);
  const past = [...state.ledger.months].filter((m) => m.monthIndex !== cal.monthIndex).slice(-2).reverse();
  const cols: { title: string; rec: MonthRecord }[] = [
    { title: `${cal.month}월(오늘까지)`, rec: current },
    ...past.map((m) => ({ title: `${calendar({ day: m.monthIndex * 28, hour: 11 }).month}월`, rec: m })),
  ];

  return (
    <div className="panel">
      <h3>장부</h3>
      <div className="ledger-top">
        <div><span className="sub">통장 잔고</span><strong className={state.cash < 0 ? 'neg' : ''}>{won(state.cash)}</strong></div>
        <div><span className="sub">이번 달 재료 구입(현금)</span><strong>{won(current.purchases)}</strong></div>
        {current.ownerDraw > 0 && <div><span className="sub">사장님 개인 지출(휴가, 이익과 별개)</span><strong>{won(current.ownerDraw)}</strong></div>}
      </div>
      <LoanCard state={state} update={update} />
      <table className="ledger">
        <thead>
          <tr><th />{cols.map((c) => <th key={c.title}>{c.title}</th>)}</tr>
        </thead>
        <tbody>
          {ROWS.map((r) => (
            <tr key={r.key}>
              <th>{r.label}</th>
              {cols.map((c) => <td key={c.title}>{r.sign < 0 && (c.rec[r.key] as number) > 0 ? '−' : ''}{won(c.rec[r.key] as number)}</td>)}
            </tr>
          ))}
          <tr className="total">
            <th>이익</th>
            {cols.map((c) => {
              const p = profitOf(c.rec);
              return <td key={c.title} className={p < 0 ? 'neg' : ''}>{won(p)}</td>;
            })}
          </tr>
        </tbody>
      </table>
      <BranchLedger state={state} />
      <p className="note">장부상 이익과 통장 잔고는 달라요. 재료를 미리 사면 돈은 먼저 나가지만, 비용은 쓸 때 잡혀요.</p>
    </div>
  );
}
