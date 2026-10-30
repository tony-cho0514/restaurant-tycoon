import { useState } from 'react';
import { MENU } from '../../sim/menu';
import { hourlyRevenue, ordersOn, type OrderRecord } from '../../sim/orders';
import { formatClock } from '../../sim/time';
import { won } from '../format';
import type { PanelProps } from './common';

type Filter = 'all' | OrderRecord['channel'];
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'hall', label: '홀' },
  { id: 'delivery', label: '배달' },
  { id: 'group', label: '단체' },
];
const CHANNEL_LABEL: Record<OrderRecord['channel'], string> = { hall: '🍽️ 홀', delivery: '🛵 배달', group: '🎉 단체' };

function dayLabel(day: number, today: number): string {
  if (day === today) return '오늘';
  if (day === today - 1) return '어제';
  return formatClock({ day, hour: 11 }).replace(/^\d+년차 /, '').replace(/ \d+시$/, '');
}

function itemsText(o: OrderRecord): string {
  return o.items.map((i) => `${MENU[i.menu].name.replace(/ L$/, '').replace(/ 1\.25L$/, '')}${i.qty > 1 ? ` ×${i.qty}` : ''}`).join(', ');
}

export function SalesPanel({ state }: PanelProps) {
  const today = state.clock.day;
  const [day, setDay] = useState(today);
  const [filter, setFilter] = useState<Filter>('all');
  const days = Array.from({ length: 7 }, (_, i) => today - i).filter((d) => d >= 0);

  const dayOrders = ordersOn(state.orders, day);
  const shown = dayOrders.filter((o) => filter === 'all' || o.channel === filter).slice().reverse();
  const total = dayOrders.reduce((a, o) => a + o.amount, 0);
  const hourly = hourlyRevenue(state.orders, day);
  const hours = Array.from({ length: Math.max(0, state.settings.closeHour - state.settings.openHour) }, (_, i) => state.settings.openHour + i);

  const recent = [...state.ledger.days.slice(-6), state.today].filter((d) => d.day >= today - 6);

  return (
    <div className="panel">
      <h3>매출·주문</h3>
      <div className="day-picker" role="group" aria-label="날짜">
        {days.map((d) => (
          <button key={d} className="btn mini" aria-pressed={d === day} onClick={() => setDay(d)}>{dayLabel(d, today)}</button>
        ))}
      </div>

      <div className="stats">
        <div><span className="sub">주문</span><strong>{dayOrders.length}건</strong></div>
        <div><span className="sub">매출</span><strong>{won(total)}</strong></div>
        <div><span className="sub">객단가</span><strong>{dayOrders.length ? won(total / dayOrders.length) : '—'}</strong></div>
      </div>

      <h4>시간대별 매출</h4>
      <table className="ledger" aria-label="시간대별 매출">
        <thead><tr><th>시각</th><th>주문</th><th>매출</th></tr></thead>
        <tbody>
          {hours.map((h) => {
            const r = hourly.get(h);
            return <tr key={h}><th>{h}시</th><td>{r ? `${r.count}건` : '—'}</td><td>{r ? won(r.amount) : '—'}</td></tr>;
          })}
        </tbody>
      </table>

      <h4>최근 7일</h4>
      <table className="ledger" aria-label="최근 7일">
        <thead><tr><th>날짜</th><th>홀</th><th>배달</th><th>매출</th><th>객단가</th></tr></thead>
        <tbody>
          {recent.slice().reverse().map((d) => {
            const n = d.hallOrders + d.deliveryOrders;
            const rev = d.revenueHall + d.revenueDelivery;
            return (
              <tr key={d.day}>
                <th>{dayLabel(d.day, today)}</th>
                <td>{d.hallOrders}</td>
                <td>{d.deliveryOrders}</td>
                <td>{won(rev)}</td>
                <td>{n ? won(rev / n) : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="panel-head">
        <h4>주문 목록</h4>
        <div className="day-picker" role="group" aria-label="주문 종류">
          {FILTERS.map((f) => (
            <button key={f.id} className="btn mini" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>{f.label}</button>
          ))}
        </div>
      </div>
      <ul className="order-list" aria-label="주문 목록">
        {shown.map((o, i) => (
          <li key={i} className={`order ch-${o.channel}`}>
            <span className="order-time">{o.hour}시</span>
            <span className="order-ch">{CHANNEL_LABEL[o.channel]}</span>
            <span className="order-items">{itemsText(o)}{o.zone ? ` · ${o.zone}` : ''}</span>
            <strong className="order-amount">{won(o.amount)}</strong>
          </li>
        ))}
      </ul>
      {shown.length === 0 && <p className="sub">아직 주문이 없어요.</p>}
    </div>
  );
}
