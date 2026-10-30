import { CHARGE_TICKS_PER_REAL_DAY, accrueCharge } from '../../sim/charge';
import { profitOf } from '../../sim/ledger';
import type { PauseReason } from '../../sim/tick';
import type { GameState } from '../../sim/types';
import { won } from '../format';
import { newsIcon } from '../icons';
import { MENU } from '../../sim/menu';
import { groupFeasible } from '../../sim/groupOrders';

function dayText(day: number, today: number): string {
  const d = day - today;
  return d === 0 ? '오늘' : d === 1 ? '내일' : d === 2 ? '모레' : `${d}일 뒤`;
}

export type TabId = 'status' | 'sales' | 'menu' | 'inventory' | 'staff' | 'shop' | 'levers' | 'ledger' | 'messages';

const MS_PER_CHARGE_TICK = 86_400_000 / CHARGE_TICKS_PER_REAL_DAY;

function minutesToNextHour(state: GameState, now: number): number {
  const ticks = accrueCharge(state.charge, now).ticks;
  return Math.max(1, Math.ceil(((1 - (ticks % 1)) * MS_PER_CHARGE_TICK) / 60_000));
}

export function PauseModal({ reason, state, now, onDismiss, onGoto, onAccept = () => {}, onDecline = () => {} }: {
  reason: PauseReason;
  state: GameState;
  now: number;
  onDismiss: (opts?: { resume?: boolean }) => void;
  onGoto: (tab: TabId) => void;
  onAccept?: (offerId: number) => void;
  onDecline?: (offerId: number) => void;
}) {
  let title = '';
  let body: React.ReactNode = null;
  let extra: React.ReactNode = null;
  let tone = 'neutral';
  let icon = '📰';

  if (reason.kind === 'news') {
    const item = state.news.items.find((n) => n.id === reason.newsId);
    title = item?.headline ?? '새 소식';
    if (item) icon = newsIcon(item);
    body = <p>{item?.body}</p>;
    tone = item?.tone ?? 'neutral';
    if (item?.kind === 'signal') {
      extra = <button className="btn" onClick={() => { onGoto('inventory'); onDismiss({ resume: false }); }}>재고·발주 보기</button>;
    } else if (item?.headline.startsWith('[사장님]')) {
      extra = <button className="btn" onClick={() => { onGoto('shop'); onDismiss({ resume: false }); }}>쉬는 방법 보기</button>;
    }
  } else if (reason.kind === 'groupOffer') {
    const o = state.groupOffers.find((x) => x.id === reason.offerId);
    icon = '🎉';
    tone = 'good';
    title = o ? `단체 주문 요청: ${o.title}` : '단체 주문 요청';
    if (o) {
      const total = o.items.reduce((a, i) => a + i.qty, 0);
      const feasible = groupFeasible(state, o);
      const amount = Math.round(o.items.reduce((a, i) => a + i.qty * state.menuPrices[i.menu], 0) * (1 - o.discount));
      body = (
        <dl className="facts">
          <div><dt>언제</dt><dd>{dayText(o.dueDay, state.clock.day)} {o.dueHour}시</dd></div>
          <div><dt>무엇을</dt><dd>{o.items.map((i) => `${MENU[i.menu].name} ${i.qty}판`).join(', ')}</dd></div>
          <div><dt>할인 요청</dt><dd>{Math.round(o.discount * 100)}%</dd></div>
          <div><dt>받을 돈</dt><dd>{won(amount)} ({total}판)</dd></div>
          <div><dt>그 시각까지 만들 수 있는 양</dt><dd>최대 {feasible!.maxPizzas}판 · 지금 재고로 {feasible!.stockPizzas}판</dd></div>
        </dl>
      );
      extra = (
        <>
          <button className="btn" onClick={() => { onDecline(o.id); onDismiss({ resume: false }); }}>거절</button>
          <button className="btn primary" onClick={() => { onAccept(o.id); onDismiss(); }}>받기</button>
        </>
      );
    }
  } else if (reason.kind === 'monthEnd') {
    const months = state.ledger.months;
    const i = months.findIndex((m) => m.monthIndex === reason.monthIndex);
    const m = months[i];
    const prev = i > 0 ? months[i - 1] : null;
    const profit = m ? profitOf(m) : 0;
    title = '한 달 장사가 끝났어요';
    icon = '📒';
    body = m && (
      <dl className="facts">
        <div><dt>매출</dt><dd>{won(m.revenueHall + m.revenueDelivery)}</dd></div>
        <div><dt>이익</dt><dd className={profit < 0 ? 'neg' : ''}>{won(profit)}</dd></div>
        {prev && <div><dt>지난달 대비 이익</dt><dd>{profit - profitOf(prev) >= 0 ? '▲ ' : '▼ '}{won(Math.abs(profit - profitOf(prev)))}</dd></div>}
      </dl>
    );
    tone = profit >= 0 ? 'good' : 'bad';
    extra = <button className="btn" onClick={() => { onGoto('ledger'); onDismiss({ resume: false }); }}>장부 보기</button>;
  } else if (reason.kind === 'cashNegative') {
    title = '통장이 마이너스예요';
    icon = '💸';
    body = <p>지금 쓸 돈이 바닥났어요. 재료를 너무 많이 사 두지 않았는지, 가격이 원가보다 낮지 않은지 장부를 확인해 보세요.</p>;
    tone = 'bad';
    extra = <button className="btn" onClick={() => { onGoto('ledger'); onDismiss({ resume: false }); }}>장부 보기</button>;
  } else {
    title = '오늘 충전된 시간을 다 썼어요';
    icon = '🌙';
    body = <p>내일 다시 와 주세요. 다음 1시간 영업은 약 {minutesToNextHour(state, now)}분 뒤에 충전돼요.</p>;
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={title}>
      <div className={`modal card tone-${tone}`}>
        <div className="modal-icon" aria-hidden="true">{icon}</div>
        <h2>{title}</h2>
        {body}
        <div className="modal-actions">
          {extra}
          {(reason.kind !== 'groupOffer' || !state.groupOffers.some((x) => x.id === reason.offerId)) && (
            <button className="btn primary" onClick={() => onDismiss()}>확인</button>
          )}
        </div>
      </div>
    </div>
  );
}
