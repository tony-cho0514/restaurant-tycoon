import { useState } from 'react';
import { previewMenuPrice } from '../../sim/levers';
import { MISC_COST_PER_PIZZA } from '../../sim/balance';
import { INGREDIENTS } from '../../sim/ingredients';
import { MENU, clampMenuPrice, recipeLines, unitCost, type MenuItemId } from '../../sim/menu';
import { pct, won } from '../format';
import { INGREDIENT_ICON, MENU_ICON, PIZZA_ICON } from '../icons';
import { marginCtx, type PanelProps } from './common';

const IDS = Object.keys(MENU) as MenuItemId[];

export function MenuPanel({ state, update }: PanelProps) {
  const [draft, setDraft] = useState<Record<MenuItemId, number>>(state.menuPrices);
  const [openRecipe, setOpenRecipe] = useState<MenuItemId | null>(null);
  const changed = IDS.filter((id) => draft[id] !== state.menuPrices[id]);
  const ctx = marginCtx(state);
  const step = (id: MenuItemId, delta: number) => setDraft((d) => ({ ...d, [id]: clampMenuPrice(d[id] + delta) }));

  return (
    <div className="panel">
      <h3>메뉴와 가격</h3>
      <ul className="rows">
        {IDS.map((id) => {
          const def = MENU[id];
          const cost = unitCost(id, state.prices, { premiumCheese: state.levers.premiumCheese });
          const price = draft[id];
          return (
            <li key={id} className="row">
              <span className="row-icon" aria-hidden="true">{def.isPizza ? <>{PIZZA_ICON}<small>{MENU_ICON[id]}</small></> : MENU_ICON[id]}</span>
              <div className="row-main">
                <strong>{def.name}</strong>
                <span className="sub">원가 {won(cost)} · 원가율 {pct(cost / state.menuPrices[id])} · {def.isPizza ? '한 판' : '한 병'} 이익 {won(state.menuPrices[id] - cost)}</span>
                <button className="link-btn" aria-label={`${def.name} 재료 보기`} aria-expanded={openRecipe === id} onClick={() => setOpenRecipe(openRecipe === id ? null : id)}>
                  {openRecipe === id ? '재료 접기 ▲' : '재료 보기 ▼'}
                </button>
                {openRecipe === id && (
                  <ul className="recipe">
                    {recipeLines(id, state.prices, state.levers.premiumCheese).map((l) => {
                      const ing = INGREDIENTS[l.ingredient];
                      const amount = ing.unit === 'kg' ? `${Math.round(l.qty * 1000)}g` : `${l.qty}${ing.unit}`;
                      return <li key={l.ingredient}><span aria-hidden="true">{INGREDIENT_ICON[l.ingredient]}</span> {ing.name} {amount} <b>{won(l.cost)}</b></li>;
                    })}
                    {def.isPizza && <li><span aria-hidden="true">🫒</span> 기타(올리브유·피클·소스) <b>{won(MISC_COST_PER_PIZZA)}</b></li>}
                  </ul>
                )}
              </div>
              <div className="stepper">
                <button className="btn" aria-label={`${def.name} 500원 내리기`} onClick={() => step(id, -500)}>−</button>
                <span className={`price ${price !== state.menuPrices[id] ? 'pending' : ''}`}>{won(price)}</span>
                <button className="btn" aria-label={`${def.name} 500원 올리기`} onClick={() => step(id, 500)}>+</button>
              </div>
            </li>
          );
        })}
      </ul>
      {changed.length > 0 && (
        <div className="preview card">
          {changed.map((id) => {
            const p = previewMenuPrice(ctx, id, draft[id]);
            return (
              <div key={id} className="preview-item">
                <strong>{MENU[id].name}: {won(state.menuPrices[id])} → {won(draft[id])}</strong>
                <p>한 판 이익 {won(p.unitMarginBefore)} → {won(p.unitMarginAfter)} · 원가율 {pct(p.costRateAfter)}</p>
                {p.effectHint && <p className="hint">{p.effectHint}</p>}
              </div>
            );
          })}
        </div>
      )}
      <div className="apply-bar">
        <button className="btn" disabled={changed.length === 0} onClick={() => setDraft(state.menuPrices)}>취소</button>
        <button
          className="btn primary"
          disabled={changed.length === 0}
          onClick={() => update((s) => ({ ...s, menuPrices: { ...s.menuPrices, ...Object.fromEntries(changed.map((id) => [id, draft[id]])) } }))}
        >
          적용
        </button>
      </div>
    </div>
  );
}
