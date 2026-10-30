import { paceVsUsual } from '../../sim/localEvents';
import { runwayWeeks, weeklyFixed } from '../../sim/runway';
import { lastFullWeek, weekShareText, weekSquares } from '../../sim/weekShare';
import { useState } from 'react';
import type { ActiveShock } from '../../sim/news';
import { AWAY_LABEL, STRESS_BURNOUT, STRESS_GOOD, STRESS_TIRED, ownerAway, ownerWorking, stressFace } from '../../sim/owner';
import { capacityAt, staffWorking } from '../../sim/staffing';
import type { GameState } from '../../sim/types';
import { stars, won } from '../format';
import type { PanelProps } from './common';

const SHOCK_LABEL: Record<ActiveShock['type'], { text: string; tone: 'bad' | 'good' }> = {
  CHEESE_SHORTAGE: { text: '치즈 파동', tone: 'bad' },
  VEG_HARVEST: { text: '채소 풍년', tone: 'good' },
  FESTIVAL: { text: '동네 축제', tone: 'good' },
};

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return <p className="sub">매출 그래프는 이틀 뒤부터 보여요.</p>;
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${40 - (v / max) * 36}`).join(' ');
  return (
    <svg className="spark" viewBox="0 0 100 42" preserveAspectRatio="none" role="img" aria-label="최근 7일 매출">
      <polyline points={pts} fill="none" stroke="var(--tomato)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** 오늘 손님이 평소 이맘때와 얼마나 다른지. 왜인지는 말하지 않는다(사장님이 찾아낼 몫). */
function Pace({ state }: { state: GameState }) {
  const p = paceVsUsual(state);
  if (p === null || Math.abs(p) < 0.15) return null;
  const pct = Math.round(Math.abs(p) * 100);
  return (
    <p className={`pace ${p < 0 ? 'down' : 'up'}`} role="status">
      {p < 0 ? `📉 오늘 손님이 평소 이맘때보다 ${pct}% 적어요` : `📈 오늘 손님이 평소 이맘때보다 ${pct}% 많아요`}
    </p>
  );
}

function conditionText(stress: number): string {
  if (stress >= STRESS_BURNOUT) return '쓰러지기 직전이에요';
  if (stress >= STRESS_TIRED) return '지쳤어요 — 피자를 덜 만들고 실수가 늘어요';
  if (stress < STRESS_GOOD) return '컨디션 좋아요 — 손님 응대가 조금 좋아요';
  return '버틸 만해요';
}

function restPlan(s: GameState): string | null {
  const o = s.owner;
  if (o.awayUntil < s.clock.day || !o.awayReason) return null;
  const label = AWAY_LABEL[o.awayReason];
  const from = o.awayFrom - s.clock.day;
  const to = o.awayUntil - s.clock.day;
  const when = (d: number) => (d === 0 ? '오늘' : d === 1 ? '내일' : `${d}일 뒤`);
  return from === to ? `${when(from)} ${label}` : `${when(Math.max(0, from))}~${when(to)} ${label}`;
}

/** 한 주 고정비와 통장으로 버틸 수 있는 기간(손님이 하나도 없어도 나가는 돈 기준) */
function Runway({ state }: { state: GameState }) {
  const f = weeklyFixed(state);
  const w = runwayWeeks(state);
  const parts = [`월세 ${won(f.rent)}`, f.labor > 0 && `알바비 ${won(f.labor)}`, `공과금 ${won(f.utilities)}`, f.ads > 0 && `광고 ${won(f.ads)}`].filter(Boolean).join(' · ');
  const text = state.cash < 0 ? '통장이 마이너스예요' : w >= 20 ? '통장 돈으로 20주 넘게 버텨요' : w < 1 ? '통장 돈으로 1주도 못 버텨요' : `통장 돈으로 약 ${Math.floor(w)}주 버텨요`;
  return (
    <div className={`runway ${w < 2 ? 'tight' : ''}`} aria-label="고정비와 버틸 수 있는 기간">
      <p><b>🧾 한 주 고정비 약 {won(f.total)}</b> <span className="sub">({parts})</span></p>
      <p className={w < 2 ? 'neg' : ''}>{w < 2 ? '⚠️ ' : ''}{text} <span className="sub">· 손님이 하나도 없어도 나가는 돈 기준</span></p>
    </div>
  );
}

/** 지난주 결과 칸과 복사(금액·순위 없이 카톡에 붙여넣기) */
function WeekShare({ state }: { state: GameState }) {
  const [msg, setMsg] = useState<string | null>(null);
  const week = lastFullWeek(state);
  if (week === null) return null;
  const copy = async () => {
    const text = weekShareText(state, week, `${location.origin}${location.pathname}`);
    try {
      await navigator.clipboard.writeText(text);
      setMsg('복사했어요! 카톡에 붙여넣어 보세요.');
    } catch {
      try { await navigator.share?.({ text }); setMsg(null); } catch { setMsg('복사하지 못했어요.'); }
    }
  };
  return (
    <div className="week-share">
      <span className="sub">{week + 1}주차</span>
      <span className="week-squares" aria-label="요일별 흑자·적자">{weekSquares(state, week).join('')}</span>
      <button className="btn mini" onClick={() => void copy()}>결과 복사</button>
      {msg && <span className="sub" role="status">{msg}</span>}
    </div>
  );
}

/** 사장님 컨디션: 스트레스, 오늘 오르내린 이유, 쉬는 계획 */
function OwnerCondition({ state }: { state: GameState }) {
  const o = state.owner;
  const v = Math.round(o.stress);
  const reasons = o.log.filter((x) => Math.abs(x.delta) >= 0.05).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const total = o.log.reduce((a, x) => a + x.delta, 0);
  const plan = restPlan(state);
  return (
    <>
      <h4>{stressFace(v)} 사장님 컨디션</h4>
      <p className="sub">
        스트레스 <b className={v >= STRESS_TIRED ? 'neg' : ''}>{v}</b>/100 · {conditionText(v)}
        {o.daysWithoutRest > 0 && ` · 쉬는 날 없이 ${o.daysWithoutRest}일째`}
        {plan && ` · ${plan}`}
      </p>
      {reasons.length > 0 && (
        <>
          <p className="sub">오늘 {total >= 0 ? '+' : '−'}{Math.abs(total).toFixed(1)}</p>
          <ul className="stress-reasons" aria-label="오늘 스트레스가 오르내린 이유">
            {reasons.map((x) => (
              <li key={x.reason} className={x.delta > 0 ? 'up' : 'down'}>{x.reason} {x.delta > 0 ? '+' : '−'}{Math.abs(x.delta).toFixed(1)}</li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

export function StatusPanel({ state }: PanelProps) {
  const t = state.today;
  const week = state.ledger.days.slice(-7).map((d) => d.revenueHall + d.revenueDelivery);
  const chips = state.news.active.filter((a) => a.untilDay >= state.clock.day).map((a) => SHOCK_LABEL[a.type]);
  if (state.economy.cycle === 'boom') chips.push({ text: '호황', tone: 'good' });
  if (state.economy.cycle === 'recession') chips.push({ text: '불황', tone: 'bad' });

  return (
    <div className="panel">
      <h3>오늘 현황</h3>
      <div className="stats">
        <div><span className="stat-icon" aria-hidden="true">🍽️</span><span className="sub">홀 주문</span><strong>{t.hallOrders}건</strong></div>
        <div><span className="stat-icon" aria-hidden="true">🛵</span><span className="sub">배달 주문</span><strong>{t.deliveryOrders}건</strong></div>
        <div><span className="stat-icon" aria-hidden="true">💰</span><span className="sub">오늘 매출</span><strong>{won(t.revenueHall + t.revenueDelivery)}</strong></div>
        <div><span className="stat-icon" aria-hidden="true">😓</span><span className="sub">놓친 주문(일손 부족)</span><strong className={t.lostOrders ? 'neg' : ''}>{t.lostOrders}건</strong></div>
        <div><span className="stat-icon" aria-hidden="true">🫙</span><span className="sub">놓친 주문(재료 부족)</span><strong className={t.stockoutOrders ? 'neg' : ''}>{t.stockoutOrders}건</strong></div>
        <div><span className="stat-icon" aria-hidden="true">🍽️</span><span className="sub">홀 평점</span><strong>{stars(state.ratings.hall)}</strong></div>
        <div><span className="stat-icon" aria-hidden="true">📱</span><span className="sub">배달앱 평점</span><strong>{stars(state.ratings.delivery)}</strong></div>
      </div>
      <Pace state={state} />
      <Runway state={state} />
      {chips.length > 0 && (
        <div className="chips">
          {chips.map((c, i) => <span key={`${c.text}-${i}`} className={`chip tone-${c.tone}`}>{c.text}</span>)}
        </div>
      )}
      <OwnerCondition state={state} />
      <h4>👥 지금 근무</h4>
      <p className="sub">{[ownerWorking(state, state.clock.hour) ? '사장님' : null, ...staffWorking(state, state.clock.hour).map((x) => x.name)].filter(Boolean).join(', ') || '아무도 없어요(문 닫음)'}{!ownerWorking(state, state.clock.hour) && (ownerAway(state) ? ' · 사장님 쉬는 날' : ' · 사장님 퇴근')} · 시간당 피자 최대 {capacityAt(state, state.clock.hour)}판{(state.absentToday ?? []).length ? ` · 결근 ${(state.absentToday ?? []).length}명` : ''}</p>
      {state.groupOrders.length > 0 && (
        <>
          <h4>🎉 받아 둔 단체 주문</h4>
          <ul className="rows">
            {state.groupOrders.map((o) => (
              <li key={o.id} className="row"><span className="row-main"><strong>{o.title}</strong><span className="sub">{o.dueDay - state.clock.day === 0 ? '오늘' : `${o.dueDay - state.clock.day}일 뒤`} {o.dueHour}시 · 피자 {o.items.reduce((a, i) => a + i.qty, 0)}판</span></span></li>
            ))}
          </ul>
        </>
      )}
      <h4>최근 7일 매출</h4>
      <Sparkline values={week} />
      <WeekShare state={state} />
    </div>
  );
}
