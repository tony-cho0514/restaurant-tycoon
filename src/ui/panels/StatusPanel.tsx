import type { ActiveShock } from '../../sim/news';
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
        <div><span className="sub">홀 주문</span><strong>{t.hallOrders}건</strong></div>
        <div><span className="sub">배달 주문</span><strong>{t.deliveryOrders}건</strong></div>
        <div><span className="sub">오늘 매출</span><strong>{won(t.revenueHall + t.revenueDelivery)}</strong></div>
        <div><span className="sub">놓친 주문(일손 부족)</span><strong className={t.lostOrders ? 'neg' : ''}>{t.lostOrders}건</strong></div>
        <div><span className="sub">놓친 주문(재료 부족)</span><strong className={t.stockoutOrders ? 'neg' : ''}>{t.stockoutOrders}건</strong></div>
        <div><span className="sub">홀 평점</span><strong>{stars(state.ratings.hall)}</strong></div>
        <div><span className="sub">배달앱 평점</span><strong>{stars(state.ratings.delivery)}</strong></div>
      </div>
      {chips.length > 0 && (
        <div className="chips">
          {chips.map((c) => <span key={c.text} className={`chip tone-${c.tone}`}>{c.text}</span>)}
        </div>
      )}
      <h4>최근 7일 매출</h4>
      <Sparkline values={week} />
    </div>
  );
}
