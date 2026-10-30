import { useMemo, useState } from 'react';
import { whatIf, whatIfOptions, type MonthRun } from '../../sim/whatIf';
import { loadMonthStart } from '../monthSnapshots';
import { CARDS, CARD_IDS } from '../../content/dexCards';
import type { MonthReport } from '../../sim/learning';
import type { YearReport } from '../../sim/yearEnd';
import type { TabKey } from '../../sim/guide';
import type { Kpi, PartKey, ReportPart } from '../../sim/report';
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

/** 몫마다 손볼 수 있는 탭(「고치러 가기」) */
const PART_TAB: Record<PartKey, TabKey> = {
  revenue: 'menu', perOrder: 'menu', volume: 'sales', group: 'sales',
  food: 'inventory', ingredients: 'inventory', waste: 'inventory',
  fees: 'shop', rentUtil: 'shop', investment: 'shop',
  service: 'levers', ads: 'levers', labor: 'staff', interest: 'ledger',
};
const TAB_NAME: Record<TabKey, string> = {
  status: '현황', sales: '매출·주문', menu: '메뉴', inventory: '재고', staff: '직원', shop: '가게', levers: '운영 수단', ledger: '장부', messages: '메시지', learn: '배움',
};

/** 가장 크게 움직인 몫: 달라진 달은 절댓값이 가장 큰 것, 첫 달은 돈이 가장 많이 나간 곳 */
export function topPart(r: MonthReport): ReportPart | null {
  const pool = r.mode === 'change' ? r.parts : r.parts.filter((p) => p.amount < 0);
  return pool.reduce<ReportPart | null>((a, p) => (!a || Math.abs(p.amount) > Math.abs(a.amount) ? p : a), null);
}

/** 사장님 목소리 한 줄 결론 */
export function headline(r: MonthReport): string {
  if (r.prevProfit === null) return r.profit >= 0 ? `첫 달, ${manwon(r.profit)} 남겼어요! 🎉` : `첫 달은 ${manwon(-r.profit)} 적자예요. 어디서 샜는지 볼까요?`;
  const diff = r.profit - r.prevProfit;
  const tail = r.profit < 0 ? ' 이번 달은 적자예요.' : '';
  if (Math.abs(diff) < 10_000) return `지난달과 거의 같아요.${tail}`;
  return diff > 0 ? `지난달보다 ${manwon(diff)} 더 벌었어요 😊${tail}` : `지난달보다 ${manwon(-diff)} 덜 벌었어요 😓${tail}`;
}

const KPI_ROWS: { label: string; get: (k: Kpi) => string }[] = [
  { label: '원가율(재료비 ÷ 매출)', get: (k) => pctText(k.costRate) },
  { label: '인건비율', get: (k) => pctText(k.laborRate) },
  { label: '주문 하나에 남는 돈', get: (k) => won(k.contribution) },
  { label: '한 달 고정비', get: (k) => manwon(k.fixed) },
  { label: '손익분기점(하루 주문)', get: (k) => (k.breakevenPerDay === null ? '계산 안 됨(주문에 남는 돈 없음)' : `${k.breakevenPerDay.toFixed(1)}건`) },
  { label: '실제 하루 평균 주문', get: (k) => `${k.actualPerDay.toFixed(1)}건` },
];

/** 힌트는 원인마다 줄어든다: 처음 겪는 원인은 써 볼 수단까지, 한 번 고쳤으면 원인만, 두 번이면 눌러서 보기(석 달 연속 적자면 다시 다).
 *  옛 저장의 리포트엔 깊이가 없어서 번호로 정한다. */
function Hint({ r }: { r: MonthReport }) {
  const [open, setOpen] = useState(false);
  const level = r.hintLevel ?? (r.number <= 3 ? 'full' : r.number <= 6 ? 'cause' : 'none');
  if (open || level === 'full') {
    return <p className="report-hint">💡 <b>{r.cause}.</b> {r.hint}</p>;
  }
  return (
    <div className="report-hint">
      {level === 'cause' ? <p>💡 <b>{r.cause}.</b></p> : <p>🤔 이번 달 가장 아팠던 원인은 뭐였을까요? 아래 몫을 보고 먼저 짐작해 보세요.</p>}
      <button className="btn mini" onClick={() => setOpen(true)}>{level === 'cause' ? '써 볼 수단 보기' : '원인 보기'}</button>
    </div>
  );
}

/** 지난달 다시 돌려 보기: 그 달 첫날로 돌아가 하나만 바꿔 한 달을 다시 돌린다 */
function WhatIf({ r, createdAt }: { r: MonthReport; createdAt: number }) {
  const start = useMemo(() => loadMonthStart(createdAt, r.monthIndex), [createdAt, r.monthIndex]);
  const [result, setResult] = useState<{ label: string; base: MonthRun; changed: MonthRun } | null>(null);
  if (!start) return <p className="sub">🔁 이 달은 첫날 기록이 없어 다시 돌려 볼 수 없어요. 앞으로 오는 리포트부터 돼요.</p>;
  return (
    <section className="whatif" aria-label="다시 돌려 보기">
      <h4>🔁 {r.label.replace(/^\d+년차 /, '')}을 다시 돌려 본다면?</h4>
      <p className="sub">그 달 첫날로 돌아가 하나만 바꿔서 한 달을 다시 돌려요. 실제 가게는 바뀌지 않아요.</p>
      <div className="whatif-options">
        {whatIfOptions(start).map((o) => (
          <button key={o.id} className="btn mini" aria-pressed={result?.label === o.label} onClick={() => setResult({ label: o.label, ...whatIf(start, o.id) })}>{o.label}</button>
        ))}
      </div>
      {result && (
        <p className="whatif-result" role="status">
          <b>{result.label}</b> 이익 <b className={result.changed.profit < result.base.profit ? 'neg' : ''}>{signed(result.changed.profit - result.base.profit)}</b>
          {' '}· 주문 {result.changed.orders - result.base.orders >= 0 ? '+' : ''}{result.changed.orders - result.base.orders}건
          <span className="sub"> (그대로였다면 {manwon(result.base.profit)} → {manwon(result.changed.profit)})</span>
        </p>
      )}
      <p className="sub">둘 다 그 달 첫날 설정 그대로 돌린 결과라, 달 중간에 바꾼 게 있으면 실제 이익과 조금 달라요.</p>
    </section>
  );
}

function ReportView({ r, onGoto, createdAt }: { r: MonthReport; onGoto?: (t: TabKey) => void; createdAt?: number }) {
  const [more, setMore] = useState(false);
  const top = topPart(r);
  const max = Math.max(1, ...r.parts.map((p) => Math.abs(p.amount)));
  const diff = r.prevProfit === null ? null : r.profit - r.prevProfit;
  const k = r.kpi;
  return (
    <article className="report" aria-label={`${r.label} 부검 리포트`}>
      <h4 className="report-title">
        {r.label} 이익 <span className={r.profit < 0 ? 'neg' : ''}>{manwon(r.profit)}</span>
        {diff !== null && <span className={`sub ${diff < 0 ? 'neg' : ''}`}> (지난달보다 {diff >= 0 ? '+' : '−'}{manwon(Math.abs(diff))})</span>}
      </h4>
      <div className="report-lead">
        <p className="report-headline">{headline(r)}</p>
        {top && (
          <p>
            {r.mode === 'change' ? '가장 크게 움직인 곳' : '돈이 가장 많이 나간 곳'}: <b>{top.label}</b> {signed(top.amount)}
            {onGoto && <button className="btn mini primary" onClick={() => onGoto(PART_TAB[top.key])}>{TAB_NAME[PART_TAB[top.key]]}에서 손보기 →</button>}
          </p>
        )}
      </div>
      <Hint r={r} />

      <h4>{r.mode === 'change' ? '🔍 왜 달라졌나' : '🔍 이번 달 돈이 어디로 갔나'}</h4>
      <ul className="parts" aria-label="원인별 몫">
        {r.parts.map((p) => (
          <li key={p.key} className={`part ${p.amount < 0 ? 'down' : 'up'}`}>
            <div className="part-head">
              <span>{p.label}</span><b>{signed(p.amount)}</b>
              {onGoto && <button className="btn mini part-go" aria-label={`${p.label}: ${TAB_NAME[PART_TAB[p.key]]} 탭으로`} onClick={() => onGoto(PART_TAB[p.key])}>{TAB_NAME[PART_TAB[p.key]]} →</button>}
            </div>
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

      {(r.events.length > 0) && <h4>🗓️ 이번 달 있었던 일</h4>}
      {r.events.length > 0 && (
        <ul className="report-list">
          {r.events.map((e, i) => <li key={i} className={`tone-${e.tone}`}><span className="sub">{shortDay(e.day)}</span> {e.text}</li>)}
        </ul>
      )}
      {createdAt !== undefined && <WhatIf key={r.monthIndex} r={r} createdAt={createdAt} />}
      <button className="btn mini" aria-expanded={more} onClick={() => setMore((v) => !v)}>{more ? '접기' : '📏 핵심 지표·내가 바꾼 것 더 보기'}</button>
      {more && (<>
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

      {r.decisions.length > 0 && (
        <>
          <h4>✍️ 내가 바꾼 것</h4>
          <p className="sub">(앞뒤 일주일 하루 주문, 날씨·경기 같은 다른 이유도 섞여 있어요)</p>
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
      </>)}
    </article>
  );
}

function YearCard({ y }: { y: YearReport }) {
  return (
    <article className="report year-card" aria-label={`${y.year}년차 결산`}>
      <h4 className="report-title">🎊 {y.year}년차 결산 · 이익 <span className={y.profit < 0 ? 'neg' : ''}>{manwon(y.profit)}</span></h4>
      <div className="chips">{y.titles.map((t) => <span key={t} className="chip tone-good">{t}</span>)}</div>
      <p className="sub">
        매출 {manwon(y.revenue)} · 적자 난 달 {y.lossMonths}달 · 겪은 악재 {y.hardships}번{y.burnout ? ' · 사장님이 쓰러진 적 있음' : ''} · 도감 {y.dex}장
        {y.best && ` · 가장 좋았던 달 ${y.best.label}(${manwon(y.best.profit)})`}{y.worst && ` · 가장 아팠던 달 ${y.worst.label}(${manwon(y.worst.profit)})`}
      </p>
    </article>
  );
}

function Reports({ state, onGoto }: { state: GameState; onGoto?: (t: TabKey) => void }) {
  const reports = state.learning.reports;
  const years = state.learning.years ?? [];
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
      {years.length > 0 && <YearCard y={years[years.length - 1]} />}
      {r && <ReportView r={r} onGoto={onGoto} createdAt={state.createdAt} />}
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

export function LearnPanel({ state, onGoto }: PanelProps & { onGoto?: (t: TabKey) => void }) {
  const [view, setView] = useState<'report' | 'dex'>('report');
  const got = CARD_IDS.filter((id) => state.learning.dex[id]).length;
  return (
    <div className="panel">
      <h3>배움</h3>
      <div className="msg-filters" role="group" aria-label="배움 보기">
        <button className="btn mini" aria-pressed={view === 'report'} onClick={() => setView('report')}>📊 부검 리포트</button>
        <button className="btn mini" aria-pressed={view === 'dex'} onClick={() => setView('dex')}>📚 도감 {got}/{CARD_IDS.length}</button>
      </div>
      {view === 'report' ? <Reports state={state} onGoto={onGoto} /> : <Dex state={state} />}
    </div>
  );
}
