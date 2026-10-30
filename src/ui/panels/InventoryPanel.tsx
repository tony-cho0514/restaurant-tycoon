import { useState } from 'react';
import { INGREDIENTS, INGREDIENT_IDS, type IngredientId } from '../../sim/ingredients';
import { MIN_STORAGE_UNITS, stockOf } from '../../sim/inventory';
import { buyCart, type CartItem } from '../../sim/purchasing';
import { estimatedUsage } from '../../sim/tick';
import { calendar } from '../../sim/time';
import { won } from '../format';
import { INGREDIENT_ICON } from '../icons';
import type { PanelProps } from './common';

const DAY_STEPS = [3, 7, 14, 30, 60];
const UNIT_STEP: Record<IngredientId, number> = { flour: 5, mozzarella: 2, tomatoSauce: 2, pepperoni: 1, veg: 1, box: 20, cola: 6, cola500: 6 };

function fmtQty(id: IngredientId, qty: number): string {
  const unit = INGREDIENTS[id].unit;
  return unit === 'kg' ? `${qty.toFixed(1)}kg` : `${Math.round(qty)}${unit}`;
}

export function InventoryPanel({ state, update }: PanelProps) {
  const [cart, setCart] = useState<Partial<Record<IngredientId, CartItem>>>({});
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

  // 하루 사용량이 있으면 「n일치」, 없으면(예: 서비스를 꺼 둔 서비스용 콜라) 개수로 산다.
  const defaultItem = (id: IngredientId): CartItem =>
    usage[id] > 0 ? { id, mode: 'days', qty: 7 } : { id, mode: 'units', qty: Math.round(MIN_STORAGE_UNITS[id] / 2) };
  const toggle = (id: IngredientId) =>
    setCart((c) => {
      const next = { ...c };
      if (next[id]) delete next[id];
      else next[id] = defaultItem(id);
      return next;
    });
  const step = (id: IngredientId, dir: 1 | -1) =>
    setCart((c) => {
      const item = c[id] ?? defaultItem(id);
      if (item.mode === 'days') {
        const i = Math.max(0, DAY_STEPS.indexOf(item.qty));
        return { ...c, [id]: { ...item, qty: DAY_STEPS[Math.min(DAY_STEPS.length - 1, Math.max(0, i + dir))] } };
      }
      return { ...c, [id]: { ...item, qty: Math.max(UNIT_STEP[id], item.qty + dir * UNIT_STEP[id]) } };
    });

  const items = Object.values(cart).filter((x): x is CartItem => !!x);
  const preview = items.length > 0 ? buyCart(state, items) : null;
  const capped = preview?.lines.filter((l) => l.capped) ?? [];

  return (
    <div className="panel">
      <h3>재고와 발주</h3>
      <p className="sub">이번 달 폐기 {won(waste)} · 여러 재료를 골라 한 번에 발주할 수 있어요.</p>
      <ul className="rows">
        {INGREDIENT_IDS.map((id) => {
          const def = INGREDIENTS[id];
          const stock = stockOf(state.inventory, id);
          const days = usage[id] > 0 ? stock / usage[id] : null;
          const before = weekAgo?.[id];
          const change = before ? state.prices[id] / before - 1 : 0;
          const item = cart[id];
          const line = preview?.lines.find((l) => l.id === id);
          return (
            <li key={id} className={`row inv ${item ? 'picked' : ''}`}>
              <input
                type="checkbox"
                className="pick"
                aria-label={`${def.name} 선택`}
                checked={!!item}
                onChange={() => toggle(id)}
              />
              <span className="row-icon" aria-hidden="true">{INGREDIENT_ICON[id]}</span>
              <div className="row-main">
                <strong>{def.name}</strong>
                <span className="sub">
                  재고 {days === null ? fmtQty(id, stock) : `${days.toFixed(1)}일치`} · {won(state.prices[id])}/{def.unit}
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
              {item && (
                <div className="buy-qty">
                  <button className="btn mini" aria-label={`${def.name} 수량 줄이기`} onClick={() => step(id, -1)}>−</button>
                  <b>{item.mode === 'days' ? `${item.qty}일치` : fmtQty(id, item.qty)}</b>
                  <button className="btn mini" aria-label={`${def.name} 수량 늘리기`} onClick={() => step(id, 1)}>+</button>
                  <span className="sub">{line ? won(line.spent) : ''}</span>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {preview && (
        <div className="cart card">
          <div className="cart-sum">
            <strong>선택 {items.length}개 · 합계 {won(preview.spent)}</strong>
            <span className="sub">지금 시세로 바로 나가요. 비용은 재료를 쓸 때 장부에 잡혀요.</span>
          </div>
          {capped.length > 0 && (
            <p className="warn">창고가 꽉 차서 일부만 사요: {capped.map((l) => INGREDIENTS[l.id].name).join(', ')}</p>
          )}
          <div className="apply-bar">
            <button className="btn" onClick={() => setCart({})}>비우기</button>
            <button
              className="btn primary"
              disabled={preview.spent === 0}
              onClick={() => {
                update((s) => buyCart(s, items).state);
                setCart({});
              }}
            >
              한 번에 발주
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
