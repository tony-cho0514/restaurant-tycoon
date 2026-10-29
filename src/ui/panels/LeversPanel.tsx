import { useState } from 'react';
import { LEVERS, LEVER_IDS, previewLever, type LeverId } from '../../sim/levers';
import { pct, pp, won } from '../format';
import { LEVER_ICON } from '../icons';
import { marginCtx, type PanelProps } from './common';

const CHANNEL_LABEL = { hall: '홀', delivery: '배달', all: '전체' } as const;

function signedWon(n: number): string {
  return `${n >= 0 ? '+' : '−'}${won(Math.abs(n))}`;
}

export function LeversPanel({ state, update }: PanelProps) {
  const [selected, setSelected] = useState<LeverId | null>(null);
  const ctx = marginCtx(state);

  return (
    <div className="panel">
      <h3>운영 수단</h3>
      <p className="sub">쓰기 전에 비용은 정확히 보여 드려요. 효과는 해 봐야 알아요.</p>
      <ul className="rows">
        {LEVER_IDS.map((id) => (
          <li key={id}>
            <button className={`row lever ${selected === id ? 'selected' : ''}`} onClick={() => setSelected(id)}>
              <span className="row-icon" aria-hidden="true">{LEVER_ICON[id]}</span>
              <span className="row-main">
                <strong>{LEVERS[id].name}</strong>
                <span className="sub">{LEVERS[id].description}</span>
              </span>
              <span className={`badge ${state.levers[id] ? 'on' : ''}`}>{state.levers[id] ? '켜짐' : '꺼짐'}</span>
            </button>
          </li>
        ))}
      </ul>
      {selected && (() => {
        const turnOn = !state.levers[selected];
        const p = previewLever(ctx, selected, turnOn);
        return (
          <div className="preview card">
            <strong>{LEVERS[selected].name} {turnOn ? '켜면' : '끄면'}</strong>
            {p.perOrderCostDelta !== 0 && <p>주문당 원가 {signedWon(p.perOrderCostDelta)}</p>}
            {p.weeklyFixedDelta !== 0 && <p>매주 고정비 {signedWon(p.weeklyFixedDelta)}</p>}
            {p.capacityDelta !== 0 && <p>시간당 만들 수 있는 피자 {p.capacityDelta > 0 ? '+' : '−'}{Math.abs(p.capacityDelta)}판</p>}
            {Math.abs(p.marginDeltaPp) >= 0.05 && (
              <p>{CHANNEL_LABEL[p.channel]} 이익률 {pct(p.marginBefore)} → {pct(p.marginAfter)} ({pp(p.marginDeltaPp)})</p>
            )}
            <p className="hint">효과: {p.effectHint}</p>
            <div className="apply-bar">
              <button className="btn" onClick={() => setSelected(null)}>취소</button>
              <button
                className="btn primary"
                onClick={() => {
                  update((s) => ({ ...s, levers: { ...s.levers, [selected]: turnOn } }));
                  setSelected(null);
                }}
              >
                {turnOn ? '켜기 확정' : '끄기 확정'}
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
