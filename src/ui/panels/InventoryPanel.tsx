import { useState } from 'react';
import { INGREDIENTS, INGREDIENT_IDS, type IngredientId } from '../../sim/ingredients';
import { manualBuyDays, stockOf } from '../../sim/inventory';
import { estimatedUsage } from '../../sim/tick';
import { calendar } from '../../sim/time';
import { won } from '../format';
import { INGREDIENT_ICON } from '../icons';
import type { PanelProps } from './common';

const BUY_DAYS = [7, 30, 60];

export function InventoryPanel({ state, update }: PanelProps) {
  const [pending, setPending] = useState<{ id: IngredientId; days: number } | null>(null);
  const usage = estimatedUsage(state);
  const monthIndex = calendar(state.clock).monthIndex;
  const waste = state.ledger.days.filter((d) => d.monthIndex === monthIndex).reduce((s, d) => s + d.wasteCost, 0) + state.today.wasteCost;
  const weekAgo = state.ledger.days.length >= 7 ? state.ledger.days[state.ledger.days.length - 7].prices : null;

  const setRule = (id: IngredientId, key: 'reorderDays' | 'targetDays', delta: number) =>
    update((s) => {
      const r = s.rules[id];
      const max = INGREDIENTS[id].storageMaxDays;
      const next = key === 'reorderDays'
        ? { ...r, reorderDays: Math.min(r.targetDays, Math.max(0, r.reorderDays + delta)) }
        : { ...r, targetDays: Math.min(max, Math.max(r.reorderDays, 1, r.targetDays + delta)) };
      return { ...s, rules: { ...s.rules, [id]: next } };
    });

  const preview = pending && manualBuyDays(state.inventory, pending.id, pending.days, usage, state.prices, state.clock.day);
  const roomDays = pending && usage[pending.id] > 0
    ? Math.floor((INGREDIENTS[pending.id].storageMaxDays * usage[pending.id] - stockOf(state.inventory, pending.id)) / usage[pending.id])
    : 0;

  return (
    <div className="panel">
      <h3>재고와 발주</h3>
      <p className="sub">이번 달 폐기 {won(waste)}</p>
      <ul className="rows">
        {INGREDIENT_IDS.map((id) => {
          const def = INGREDIENTS[id];
          const stock = stockOf(state.inventory, id);
          const days = usage[id] > 0 ? stock / usage[id] : null;
          const before = weekAgo?.[id];
          const change = before ? state.prices[id] / before - 1 : 0;
          return (
            <li key={id} className="row inv">
              <span className="row-icon" aria-hidden="true">{INGREDIENT_ICON[id]}</span>
              <div className="row-main">
                <strong>{def.name}</strong>
                <span className="sub">
                  재고 {days === null ? '—' : `${days.toFixed(1)}일치`} · {won(state.prices[id])}/{def.unit}
                  {before ? <span className={change > 0.005 ? 'up' : change < -0.005 ? 'down' : ''}> {change > 0.005 ? '▲' : change < -0.005 ? '▼' : '–'}{Math.abs(change * 100).toFixed(1)}%</span> : null}
                </span>
                <span className="rule">
                  <span>자동 발주</span>
                  <span className="mini-stepper">
                    <span>기준</span>
                    <button className="btn mini" aria-label={`${def.name} 발주 기준 줄이기`} onClick={() => setRule(id, 'reorderDays', -1)}>−</button>
                    <b>{state.rules[id].reorderDays}일</b>
                    <button className="btn mini" aria-label={`${def.name} 발주 기준 늘리기`} onClick={() => setRule(id, 'reorderDays', 1)}>+</button>
                  </span>
                  <span className="mini-stepper">
                    <span>목표</span>
                    <button className="btn mini" aria-label={`${def.name} 목표 줄이기`} onClick={() => setRule(id, 'targetDays', -1)}>−</button>
                    <b>{state.rules[id].targetDays}일</b>
                    <button className="btn mini" aria-label={`${def.name} 목표 늘리기`} onClick={() => setRule(id, 'targetDays', 1)}>+</button>
                  </span>
                </span>
              </div>
              <div className="buys">
                {BUY_DAYS.map((d) => (
                  <button key={d} className="btn mini" aria-label={`${def.name} ${d}일치 미리 사기`} onClick={() => setPending({ id, days: d })}>{d}일치</button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
      {pending && preview && (
        <div className="preview card">
          <strong>{INGREDIENTS[pending.id].name} {pending.days}일치 미리 사기</strong>
          {preview.capped && <p className="warn">창고가 꽉 차서 {Math.max(0, roomDays)}일치까지만 살 수 있어요.</p>}
          <p>지금 시세로 {won(preview.spent)}이 바로 나가요. 비용은 재료를 쓸 때 장부에 잡혀요.</p>
          <div className="apply-bar">
            <button className="btn" onClick={() => setPending(null)}>취소</button>
            <button
              className="btn primary"
              disabled={preview.spent === 0}
              onClick={() => {
                update((s) => {
                  const r = manualBuyDays(s.inventory, pending.id, pending.days, estimatedUsage(s), s.prices, s.clock.day);
                  return { ...s, inventory: r.inv, cash: s.cash - r.spent, today: { ...s.today, purchases: s.today.purchases + r.spent } };
                });
                setPending(null);
              }}
            >
              구매 확정
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
