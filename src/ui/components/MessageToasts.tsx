import { useEffect, useRef, useState } from 'react';
import type { Message } from '../../sim/messages';
import { messageIcon } from '../icons';

/** 한 번에 보이는 말풍선 수 */
const MAX_TOASTS = 3;
const TOAST_MS = 6000;
const IMPORTANT_MS = 11000;
/** 한꺼번에 이보다 많이 들어오면(저장 파일을 불러올 때 등) 띄우지 않는다 */
const FLOOD = 8;

export function starText(n: number): string {
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

function Toast({ m, onOpen, onDone }: { m: Message; onOpen: () => void; onDone: () => void }) {
  const ms = m.important ? IMPORTANT_MS : TOAST_MS;
  // 화면이 매 틱 다시 그려져도 시간이 처음부터 다시 흐르지 않게, 처음 뜰 때 한 번만 맞춘다.
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    const id = setTimeout(() => done.current(), ms);
    return () => clearTimeout(id);
  }, [ms]);
  return (
    <button
      className={`toast from-${m.from} tone-${m.tone}${m.important ? ' important' : ''}`}
      style={{ '--toast-ms': `${ms}ms` } as React.CSSProperties}
      onClick={onOpen}
    >
      <span className="toast-icon" aria-hidden="true">{messageIcon(m)}</span>
      <span className="toast-body">
        <span className="toast-name">
          {m.name}
          {m.regular && <span className="regular-tag">단골</span>}
          {m.stars !== undefined && <span className="stars" aria-label={`별 ${m.stars}개`}>{starText(m.stars)}</span>}
          {m.ask && !m.reply && <span className="toast-tag">답장</span>}
        </span>
        <span className="toast-text">{m.text}</span>
      </span>
    </button>
  );
}

/** 가게 화면 위에 새 메시지를 말풍선으로 잠깐 띄운다. 누르면 메시지 탭으로. */
export function MessageToasts({ items, muted = false, onOpen }: { items: Message[]; muted?: boolean; onOpen: (m: Message) => void }) {
  const lastId = items.at(-1)?.id ?? 0;
  // 처음 열 때 이미 있던 메시지는 띄우지 않는다.
  const seen = useRef(lastId);
  const [toasts, setToasts] = useState<Message[]>([]);

  useEffect(() => {
    const fresh = items.filter((m) => m.id > seen.current);
    seen.current = lastId;
    if (fresh.length === 0 || fresh.length > FLOOD || muted) return;
    setToasts((t) => [...t, ...fresh].slice(-MAX_TOASTS));
  }, [items, lastId, muted]);

  useEffect(() => {
    if (muted) setToasts([]);
  }, [muted]);

  const remove = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));

  return (
    <div className="toasts" aria-live="polite" aria-label="새 메시지">
      {toasts.map((m) => (
        <Toast key={m.id} m={m} onOpen={() => { remove(m.id); onOpen(m); }} onDone={() => remove(m.id)} />
      ))}
    </div>
  );
}
