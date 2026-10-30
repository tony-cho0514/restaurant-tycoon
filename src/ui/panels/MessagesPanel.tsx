import { useEffect, useState } from 'react';
import { BAD_TOPICS, TOPIC_HINT, TOPIC_LABEL, type Topic } from '../../content/messageTemplates';
import type { Message, MessageAction, Sender } from '../../sim/messages';
import { answerMessage, canReply, replyOptions } from '../../sim/replies';
import { formatClock } from '../../sim/time';
import type { GameState } from '../../sim/types';
import { starText } from '../components/MessageToasts';
import { messageIcon } from '../icons';
import type { PanelProps } from './common';

type Filter = 'all' | 'reply' | 'customer' | 'staff' | 'news' | 'owner' | 'important';

const FILTERS: { id: Filter; label: string; match: (m: Message, s: GameState) => boolean }[] = [
  { id: 'all', label: '전체', match: () => true },
  { id: 'reply', label: '답장', match: (m, s) => canReply(s, m) && m.reply?.id !== 'auto' },
  { id: 'customer', label: '손님', match: (m) => (['review', 'request', 'group'] as Sender[]).includes(m.from) },
  { id: 'staff', label: '직원', match: (m) => m.from === 'staff' },
  { id: 'news', label: '거래처·소식', match: (m) => m.from === 'supplier' || m.from === 'news' || m.from === 'book' },
  { id: 'owner', label: '나', match: (m) => m.from === 'owner' },
  { id: 'important', label: '중요', match: (m) => !!m.important },
];

const ACTION_LABEL: Record<MessageAction, string> = {
  menu: '메뉴 보기', inventory: '재고 보기', levers: '운영 수단 보기', shop: '가게 보기', staff: '직원 보기', ledger: '장부 보기', learn: '배움 탭 보기', sales: '매출 보기',
};

const dayText = (day: number) => formatClock({ day, hour: 0 }).replace(/ \d+시$/, '');

/** 최근 7일 리뷰: 평균 별점, 많이 나온 말, 불만이 쌓이면 손볼 곳 */
function Voices({ state }: { state: GameState }) {
  const since = state.clock.day - 6;
  const reviews = state.messages.items.filter((m) => m.from === 'review' && m.day >= since && m.stars !== undefined);
  if (reviews.length === 0) return <p className="sub">아직 리뷰가 없어요. 장사를 하면 손님 리뷰가 하나둘 와요.</p>;
  const avg = reviews.reduce((a, m) => a + m.stars!, 0) / reviews.length;
  const counts = new Map<Topic, number>();
  for (const m of reviews) if (m.topic) counts.set(m.topic, (counts.get(m.topic) ?? 0) + 1);
  const sorted = [...counts].sort((a, b) => b[1] - a[1]);
  const worst = sorted.find(([t, n]) => BAD_TOPICS.includes(t) && n >= 2);
  return (
    <section className="voices card" aria-label="최근 7일 손님 리뷰">
      <div className="voices-head">
        <strong>최근 7일 리뷰 {reviews.length}개</strong>
        <span>평균 <b className="stars">★ {avg.toFixed(1)}</b></span>
      </div>
      <div className="chips">
        {sorted.map(([t, n]) => (
          <span key={t} className={`chip tone-${BAD_TOPICS.includes(t) ? 'bad' : 'good'}`}>{TOPIC_LABEL[t]} {n}</span>
        ))}
      </div>
      {worst && TOPIC_HINT[worst[0]] && <p className="voices-hint">💡 「{TOPIC_LABEL[worst[0]]}」 리뷰가 {worst[1]}개예요. {TOPIC_HINT[worst[0]]}</p>}
    </section>
  );
}

/** 답장 고르기: 버튼마다 비용이 미리 보이고, 효과는 해 봐야 안다. */
function ReplyBox({ m, state, update }: PanelProps & { m: Message }) {
  const [err, setErr] = useState<string | null>(null);
  const opts = replyOptions(state, m);
  if (opts.length === 0) return null;
  const left = (m.replyBy ?? state.clock.day) - state.clock.day;
  return (
    <div className="reply-box" role="group" aria-label={`${m.name}에게 답장`}>
      <span className="reply-title">💬 답장 고르기 · {left === 0 ? '오늘까지' : `${left}일 남음`}</span>
      {opts.map((o) => (
        <button
          key={o.id}
          className="btn reply-btn"
          disabled={!!o.disabled}
          onClick={() => { try { update((s) => answerMessage(s, m.id, o.id)); setErr(null); } catch (e) { setErr((e as Error).message); } }}
        >
          <b>{o.label}</b>
          <span className="reply-cost">{o.disabled ?? o.cost}</span>
        </button>
      ))}
      {err && <span className="warn">{err}</span>}
      <span className="note">효과는 해 봐야 알아요.</span>
    </div>
  );
}

export function MessagesPanel({ state, update, onGoto, focusId = null }: PanelProps & { onGoto?: (tab: MessageAction) => void; focusId?: number | null }) {
  const [filter, setFilter] = useState<Filter>('all');
  // 말풍선을 눌러 들어오면 그 메시지로 스크롤
  useEffect(() => {
    if (focusId === null) return;
    setFilter('all');
    const id = requestAnimationFrame(() => document.getElementById(`msg-${focusId}`)?.scrollIntoView?.({ block: 'center' }));
    return () => cancelAnimationFrame(id);
  }, [focusId]);
  const match = FILTERS.find((f) => f.id === filter)!.match;
  const shown = [...state.messages.items].reverse().filter((m) => match(m, state));
  const waiting = state.messages.items.filter((m) => canReply(state, m) && m.reply?.id !== 'auto').length;
  const days: { day: number; items: Message[] }[] = [];
  for (const m of shown) {
    if (days.at(-1)?.day !== m.day) days.push({ day: m.day, items: [] });
    days.at(-1)!.items.push(m);
  }

  return (
    <div className="panel">
      <h3>메시지</h3>
      <Voices state={state} />
      {waiting > 0 && filter !== 'reply' && (
        <button className="btn waiting" onClick={() => setFilter('reply')}>💬 답장 기다리는 메시지 {waiting}개</button>
      )}
      <div className="msg-filters" role="group" aria-label="보낸 쪽 고르기">
        {FILTERS.map((f) => (
          <button key={f.id} className="btn mini" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>{f.label}</button>
        ))}
      </div>
      {days.length === 0 && <p className="sub">아직 메시지가 없어요.</p>}
      {days.map((d) => (
        <section key={d.day} className="msg-day">
          <h4 className="msg-day-title">{dayText(d.day)}</h4>
          <ul className="msgs">
            {d.items.map((m) => (
              <li key={m.id} id={`msg-${m.id}`} className={`msg from-${m.from} tone-${m.tone}${m.from === 'owner' ? ' mine' : ''}${m.id === focusId ? ' focus' : ''}`}>
                <span className="msg-avatar" aria-hidden="true">{messageIcon(m)}</span>
                <div className="msg-bubble">
                  <div className="msg-meta">
                    <b>{m.name}</b>
                    {m.channel && m.from !== 'owner' && <span className="sub">{m.channel === 'delivery' ? '배달앱' : '홀'}</span>}
                    {m.stars !== undefined && <span className="stars" aria-label={`별 ${m.stars}개`}>{starText(m.stars)}</span>}
                    <span className="sub">{m.hour}시</span>
                    {m.important && <span className="badge kind-signal">중요</span>}
                  </div>
                  <p className="msg-text">{m.text}</p>
                  {m.detail && <p className="msg-detail">{m.detail}</p>}
                  {m.reply && <p className="msg-reply"><b>↳ 내 답장</b> {m.reply.text}</p>}
                  <ReplyBox m={m} state={state} update={update} />
                  {m.action && onGoto && <button className="btn mini" onClick={() => onGoto(m.action!)}>{ACTION_LABEL[m.action]}</button>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
