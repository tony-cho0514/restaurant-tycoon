// 몰아 돌리기 창: 먼저 무엇을 하는지 알려 주고, 돌린 뒤엔 한 장 요약을 보여 준다.
import { CARDS } from '../../content/dexCards';
import { accrueCharge, formatCharge } from '../../sim/charge';
import type { CatchUpSummary } from '../../sim/catchUp';
import type { TabKey } from '../../sim/guide';
import type { PauseReason } from '../../sim/tick';
import type { GameState } from '../../sim/types';
import { won } from '../format';

const STOP_TEXT: Partial<Record<PauseReason['kind'], string>> = {
  news: '큰 소식이 있어서 멈췄어요',
  monthEnd: '한 달이 끝나서 멈췄어요',
  yearEnd: '한 해가 끝나서 멈췄어요',
  groupOffer: '단체 주문 요청이 와서 멈췄어요',
  cashNegative: '통장이 마이너스가 돼서 멈췄어요',
  distress: '폐업 위기라서 멈췄어요',
  closed: '가게가 문을 닫았어요',
};

const signed = (n: number) => `${n >= 0 ? '+' : '−'}${won(Math.abs(n))}`;
const rating = (a: number, b: number) => `★ ${a.toFixed(1)} → ${b.toFixed(1)}`;

export function CatchUpModal({ view, state, onRun, onClose, onGoto }: {
  view: 'ask' | CatchUpSummary;
  state: GameState;
  onRun: () => void;
  onClose: () => void;
  onGoto: (t: TabKey) => void;
}) {
  if (view === 'ask') {
    return (
      <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="몰아 돌리기">
        <div className="modal card">
          <div className="modal-icon" aria-hidden="true">⏩</div>
          <h2>몰아 돌리기</h2>
          <p>쌓인 영업 {formatCharge(accrueCharge(state.charge, Date.now()).ticks)}을 <b>지금 설정 그대로</b> 한 번에 돌리고 요약을 보여 드려요.</p>
          <p className="sub">위기·단체 주문·월말처럼 큰일이 생기면 거기서 멈춰요. 하나하나 보면서 정하는 쪽이 배우기엔 더 좋아요.</p>
          <div className="modal-actions">
            <button className="btn" onClick={onClose}>직접 돌릴게요</button>
            <button className="btn primary" onClick={onRun}>몰아 돌리기</button>
          </div>
        </div>
      </div>
    );
  }
  const v = view;
  const title = v.days === 0 && !v.stoppedBy ? '돌릴 영업이 없었어요' : `${v.days}일을 몰아 돌렸어요`;
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="몰아 돌린 결과">
      <div className={`modal card tone-${v.profit >= 0 ? 'good' : 'bad'}`}>
        <div className="modal-icon" aria-hidden="true">📋</div>
        <h2>{title}</h2>
        {v.stoppedBy && STOP_TEXT[v.stoppedBy] && <p><b>{STOP_TEXT[v.stoppedBy]}.</b> 확인을 누르면 그 일을 보여 드려요.</p>}
        <dl className="facts">
          <div><dt>주문</dt><dd>{v.orders}건</dd></div>
          <div><dt>매출</dt><dd>{won(v.revenue)}</dd></div>
          <div><dt>장부 이익</dt><dd className={v.profit < 0 ? 'neg' : ''}>{signed(v.profit)}</dd></div>
          <div><dt>통장</dt><dd>{won(v.cashBefore)} → {won(v.cashAfter)}</dd></div>
          <div><dt>홀 평점</dt><dd>{rating(v.ratingBefore.hall, v.ratingAfter.hall)}</dd></div>
          <div><dt>배달앱 평점</dt><dd>{rating(v.ratingBefore.delivery, v.ratingAfter.delivery)}</dd></div>
        </dl>
        {v.events.length > 0 && (
          <>
            <h4>🗓️ 그동안 있었던 일</h4>
            <ul className="catchup-events">{v.events.slice(0, 6).map((e) => <li key={e}>{e}</li>)}</ul>
          </>
        )}
        {v.cards.length > 0 && <p>📚 새 카드: {v.cards.map((id) => `${CARDS[id].icon} ${CARDS[id].title}`).join(' · ')}</p>}
        <div className="modal-actions">
          {v.newMessages > 0 && <button className="btn" onClick={() => onGoto('messages')}>💬 메시지 {v.newMessages}개 보기</button>}
          <button className="btn primary" onClick={onClose}>확인</button>
        </div>
      </div>
    </div>
  );
}
