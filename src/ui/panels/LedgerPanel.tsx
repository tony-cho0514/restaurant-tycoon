import { emptyDay, profitOf, type MonthRecord } from '../../sim/ledger';
import { calendar } from '../../sim/time';
import { won } from '../format';
import type { PanelProps } from './common';

const ROWS: { key: keyof MonthRecord; label: string; sign: 1 | -1 }[] = [
  { key: 'revenueHall', label: '매출(홀)', sign: 1 },
  { key: 'revenueDelivery', label: '매출(배달)', sign: 1 },
  { key: 'foodCost', label: '재료비', sign: -1 },
  { key: 'serviceCost', label: '서비스 비용', sign: -1 },
  { key: 'wasteCost', label: '폐기', sign: -1 },
  { key: 'labor', label: '인건비', sign: -1 },
  { key: 'rent', label: '월세', sign: -1 },
  { key: 'appFees', label: '배달앱 수수료', sign: -1 },
  { key: 'cardFees', label: '카드 수수료', sign: -1 },
  { key: 'deliveryFees', label: '배달비', sign: -1 },
  { key: 'utilities', label: '공과금', sign: -1 },
  { key: 'ads', label: '광고비', sign: -1 },
  { key: 'investment', label: '투자(메뉴 개발·업그레이드)', sign: -1 },
];

function monthToDate(state: PanelProps['state']): MonthRecord {
  const monthIndex = calendar(state.clock).monthIndex;
  const { day: _d, usage: _u, prices: _p, ...sum } = emptyDay(0, monthIndex);
  for (const d of [...state.ledger.days, state.today]) {
    if (d.monthIndex !== monthIndex) continue;
    for (const k of Object.keys(sum) as (keyof MonthRecord)[]) if (k !== 'monthIndex') sum[k] += d[k];
  }
  return sum;
}

export function LedgerPanel({ state }: PanelProps) {
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
      </div>
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
      <p className="note">장부상 이익과 통장 잔고는 달라요. 재료를 미리 사면 돈은 먼저 나가지만, 비용은 쓸 때 잡혀요.</p>
    </div>
  );
}
