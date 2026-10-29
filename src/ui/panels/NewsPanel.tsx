import { useState } from 'react';
import type { NewsItem } from '../../sim/news';
import { formatClock } from '../../sim/time';
import { newsIcon } from '../icons';
import type { PanelProps } from './common';

const BADGE: Partial<Record<NewsItem['kind'], string>> = { signal: '신호', fire: '발생', fizzle: '빗나감', announce: '발표' };

export function NewsPanel({ state }: PanelProps) {
  const [importantOnly, setImportantOnly] = useState(false);
  const items = [...state.news.items].reverse().filter((n) => !importantOnly || n.important || n.kind === 'fizzle');

  return (
    <div className="panel">
      <div className="panel-head">
        <h3>뉴스</h3>
        <button className="btn mini" aria-pressed={importantOnly} onClick={() => setImportantOnly((v) => !v)}>중요한 것만</button>
      </div>
      <ul className="news">
        {items.map((n) => (
          <li key={n.id} className={`news-item tone-${n.tone}`}>
            <div className="news-meta">
              <span className="news-icon" aria-hidden="true">{newsIcon(n)}</span>
              {BADGE[n.kind] && <span className={`badge kind-${n.kind}`}>{BADGE[n.kind]}</span>}
              <span className="sub">{formatClock({ day: n.day, hour: 11 }).replace(/ \d+시$/, '')}</span>
            </div>
            <strong>{n.headline}</strong>
            <p>{n.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
