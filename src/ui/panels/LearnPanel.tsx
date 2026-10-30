import { useState } from 'react';
import { CARDS, CARD_IDS } from '../../content/dexCards';
import type { MonthReport } from '../../sim/learning';
import type { Kpi } from '../../sim/report';
import { calendar } from '../../sim/time';
import type { GameState } from '../../sim/types';
import { manwon, won } from '../format';
import type { PanelProps } from './common';

const signed = (n: number) => `${n >= 0 ? '+' : '−'}${won(Math.abs(n))}`;
const shortDay = (day: number) => {
  const c = calendar({ day, hour: 0 });
  return `${c.month}/${c.dayOfMonth + 1}`;
};
const pctText = (x: number) => `${(x * 100).toFixed(1)}%`;

const KPI_ROWS: { label: string; get: (k: Kpi) => string }[] = [
  { label: '원가율(재료비 ÷ 매출)', get: (k) => pctText(k.costRate) },
  { label: '인건비율', get: (k) => pctText(k.laborRate) },
  { label: '주문 하나에 남는 돈', get: (k) => won(k.contribution) },
  { label: '한 달 고정비', get: (k) => manwon(k.fixed) },
  { label: '손익분기점(하루 주문)', get: (k) => (k.breakevenPerDay === null ? '계산 안 됨(주문에 남는 돈 없음)' : `${k.breakevenPerDay.toFixed(1)}건`) },
  { label: '실제 하루 평균 주문', get: (k) => `${k.actualPerDay.toFixed(1)}건` },
];

/** 힌트는 점점 줄어든다: 1~3번째 리포트는 원인+써 볼 수단, 4~6번째는 원인만, 그 뒤엔 숨김(눌러서 보기) */
function Hint({ r }: { r: MonthReport }) {
  const [open, setOpen] = useState(false);
  const level = r.number <= 3 ? 'full' : r.number <= 6 ? 'cause' : 'none';
  if (open || level === 'full') {
    return <p className="report-hint">💡 <b>{r.cause}.</b> {r.hint}</p>;
  }
  return (
    <div className="report-hint">
      {level === 'cause' && <p>💡 <b>{r.cause}.</b></p>}
      <button className="btn mini" onClick={() => setOpen(true)}>{level === 'cause' ? '써 볼 수단 보기' : '힌트 보기'}</button>
    </div>
  );
}

function ReportView({ r }: { r: MonthReport }) {
  const max = Math.max(1, ...r.parts.map((p) => Math.abs(p.amount)));
  const diff = r.prevProfit === null ? null : r.profit - r.prevProfit;
  const k = r.kpi;
  return (
    <article className="report" aria-label={`${r.label} 부검 리포트`}>
      <h4 className="report-title">
        {r.label} 이익 <span className={r.profit < 0 ? 'neg' : ''}>{manwon(r.profit)}</span>
        {diff !== null && <span className={`sub ${diff < 0 ? 'neg' : ''}`}> (지난달보다 {diff >= 0 ? '+' : '−'}{manwon(Math.abs(diff))})</span>}
      </h4>
      <Hint r={r} />

      <h4>{r.mode === 'change' ? '🔍 왜 달라졌나' : '🔍 이번 달 돈이 어디로 갔나'}</h4>
      <ul className="parts" aria-label="원인별 몫">
        {r.parts.map((p) => (
          <li key={p.key} className={`part ${p.amount < 0 ? 'down' : 'up'}`}>
            <div className="part-head"><span>{p.label}</span><b>{signed(p.amount)}</b></div>
            <span className="part-bar"><span style={{ width: `${(Math.abs(p.amount) / max) * 100}%` }} /></span>
            {p.detail && <span className="sub">{p.detail}</span>}
          </li>
        ))}
      </ul>
      <p className="note">
        {r.mode === 'change'
          ? `몫을 모두 더하면 이익 변화 ${signed(diff ?? 0)}이 돼요.`
          : `모두 더하면 이번 달 이익 ${signed(r.profit)}이에요. 다음 달부터는 지난달과 견줘 무엇이 달라졌는지 쪼개 보여 드려요.`}
      </p>
      {r.lost.staff + r.lost.stock > 0 && (
        <p className="report-lost">🕳️ 놓친 기회: 일손 부족 {r.lost.staff}건 · 재료 부족 {r.lost.stock}건 ≈ 이익 {manwon(r.lost.value)} (장부엔 안 보여요)</p>
      )}

      <h4>📏 핵심 지표</h4>
      <table className="kpi">
        <thead><tr><th></th>{r.prevKpi && <th>지난달</th>}<th>이번 달</th></tr></thead>
        <tbody>
          {KPI_ROWS.map((row) => (
            <tr key={row.label}><th scope="row">{row.label}</th>{r.prevKpi && <td>{row.get(r.prevKpi)}</td>}<td>{row.get(k)}</td></tr>
          ))}
        </tbody>
      </table>
      {k.breakevenPerDay !== null && (
        <p className="sub">
          하루 주문이 손익분기점보다 {k.actualPerDay >= k.breakevenPerDay ? `${(k.actualPerDay - k.breakevenPerDay).toFixed(1)}건 많았어요(여유)` : `${(k.breakevenPerDay - k.actualPerDay).toFixed(1)}건 모자랐어요`}.
        </p>
      )}

      {(r.events.length > 0 || r.decisions.length > 0) && <h4>🗓️ 이번 달 있었던 일</h4>}
      {r.events.length > 0 && (
        <ul className="report-list">
          {r.events.map((e, i) => <li key={i} className={`tone-${e.tone}`}><span className="sub">{shortDay(e.day)}</span> {e.text}</li>)}
        </ul>
      )}
      {r.decisions.length > 0 && (
        <>
          <p className="sub">내가 바꾼 것(앞뒤 일주일 하루 주문, 날씨·경기 같은 다른 이유도 섞여 있어요)</p>
          <ul className="report-list">
            {r.decisions.map((d, i) => (
              <li key={i}>
                <span className="sub">{shortDay(d.day)}</span> {d.text}
                <span className="sub"> · {d.before === null ? '비교할 기록 없음' : d.after === null ? `하루 ${d.before}건 → 지켜보는 중` : `하루 ${d.before}건 → ${d.after}건`}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {r.voices.count > 0 && (
        <p className="sub">💬 리뷰 {r.voices.count}개 · 평균 ★ {r.voices.avg!.toFixed(1)}{r.voices.top && ` · 많이 나온 불만 ${r.voices.top}`}</p>
      )}
    </article>
  );
}

function Reports({ state }: { state: GameState }) {
  const reports = state.learning.reports;
  const [sel, setSel] = useState<number | null>(null);
  const r = reports.find((x) => x.monthIndex === sel) ?? reports.at(-1);
  const shocks = [...state.learning.shockReports].reverse();
  return (
    <>
      {!r && <p className="sub">첫 부검 리포트는 이번 달 마지막 날(28일) 장사를 마치면 나와요.</p>}
      {reports.length > 1 && (
        <div className="msg-filters" role="group" aria-label="리포트 달 고르기">
          {reports.slice(-6).map((x) => (
            <button key={x.monthIndex} className="btn mini" aria-pressed={x === r} onClick={() => setSel(x.monthIndex)}>{x.label.replace(/^\d+년차 /, '')}</button>
          ))}
        </div>
      )}
      {r && <ReportView r={r} />}
      {shocks.length > 0 && (
        <>
          <h4>🌪️ 위기·기회 리포트</h4>
          <ul className="report-list">
            {shocks.map((x, i) => (
              <li key={i} className={`tone-${x.tone}`}><b>{x.title}</b> <span className="sub">{shortDay(x.startDay)}~{shortDay(x.endDay)}</span><br />{x.text}</li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

function Dex({ state }: { state: GameState }) {
  const dex = state.learning.dex;
  const got = CARD_IDS.filter((id) => dex[id]).length;
  return (
    <>
      <p className="sub">처음 겪을 때마다 한 장씩 쌓여요. {CARD_IDS.length}장 중 <b>{got}장</b></p>
      <ul className="dex" aria-label="경영 개념 도감">
        {CARD_IDS.map((id) => {
          const c = CARDS[id];
          const d = dex[id];
          return (
            <li key={id} className={`dex-card${d ? '' : ' locked'}`}>
              <div className="dex-head"><span aria-hidden="true">{d ? c.icon : '❔'}</span><b>{c.title}</b><span className="sub">{c.category}</span></div>
              {d ? (
                <>
                  <p className="dex-story"><b>방금 겪은 일</b> ({shortDay(d.day)}) {d.story}</p>
                  <p className="dex-text">{c.text}</p>
                </>
              ) : (
                <p className="sub">{c.howTo}</p>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

export function LearnPanel({ state }: PanelProps) {
  const [view, setView] = useState<'report' | 'dex'>('report');
  const got = CARD_IDS.filter((id) => state.learning.dex[id]).length;
  return (
    <div className="panel">
      <h3>배움</h3>
      <div className="msg-filters" role="group" aria-label="배움 보기">
        <button className="btn mini" aria-pressed={view === 'report'} onClick={() => setView('report')}>📊 부검 리포트</button>
        <button className="btn mini" aria-pressed={view === 'dex'} onClick={() => setView('dex')}>📚 도감 {got}/{CARD_IDS.length}</button>
      </div>
      {view === 'report' ? <Reports state={state} /> : <Dex state={state} />}
    </div>
  );
}
