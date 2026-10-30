import { useState } from 'react';
import { previewMenuPrice } from '../../sim/levers';
import { MISC_COST_PER_PIZZA } from '../../sim/balance';
import { INGREDIENTS } from '../../sim/ingredients';
import { MENU, PIZZA_IDS, clampMenuPrice, recipeLines, unitCost, type MenuItemId, type PizzaId } from '../../sim/menu';
import { MENU_DEV_COST, developMenu, setMenuActive } from '../../sim/menuDev';
import { NEIGHBORHOODS } from '../../sim/neighborhoods';
import { pct, won } from '../format';
import { INGREDIENT_ICON, MENU_ICON, PIZZA_ICON } from '../icons';
import { marginCtx, type PanelProps } from './common';

const IDS = Object.keys(MENU) as MenuItemId[];

function prefText(v: number | undefined): string {
  if (v === undefined || v === 1) return '이 동네 반응 보통';
  return v > 1 ? '이 동네에서 인기 있을 메뉴' : '이 동네에선 덜 찾을 메뉴';
}

export function MenuPanel({ state, update }: PanelProps) {
  const [draft, setDraft] = useState<Record<MenuItemId, number>>(state.menuPrices);
  const [openRecipe, setOpenRecipe] = useState<MenuItemId | null>(null);
  const developed = IDS.filter((id) => state.menuDeveloped[id]);
  const notYet = PIZZA_IDS.filter((id) => !state.menuDeveloped[id]);
  const [msg, setMsg] = useState<string | null>(null);
  const changed = developed.filter((id) => draft[id] !== state.menuPrices[id]);
  const ctx = marginCtx(state);
  const step = (id: MenuItemId, delta: number) => setDraft((d) => ({ ...d, [id]: clampMenuPrice(d[id] + delta) }));

  return (
    <div className="panel">
      <h3>메뉴와 가격</h3>
      <ul className="rows">
        {developed.map((id) => {
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
                  <ul className="recipe" aria-label={`${def.name} 재료`}>
                    {recipeLines(id, state.prices, state.levers.premiumCheese).map((l) => {
                      const ing = INGREDIENTS[l.ingredient];
                      const amount = ing.unit === 'kg' ? `${Math.round(l.qty * 1000)}g` : `${l.qty}${ing.unit}`;
                      return <li key={l.ingredient}><span aria-hidden="true">{INGREDIENT_ICON[l.ingredient]}</span> {ing.name} {amount} <b>{won(l.cost)}</b></li>;
                    })}
                    {def.isPizza && <li><span aria-hidden="true">🫒</span> 기타(올리브유·피클·소스) <b>{won(MISC_COST_PER_PIZZA)}</b></li>}
                  </ul>
                )}
              </div>
              {def.isPizza && (
                <button
                  className="btn mini"
                  aria-label={`${def.name} ${state.menuActive[id] ? '판매 중지' : '다시 판매'}`}
                  aria-pressed={state.menuActive[id]}
                  onClick={() => { try { update((s) => setMenuActive(s, id, !s.menuActive[id])); setMsg(null); } catch (e) { setMsg((e as Error).message); } }}
                >
                  {state.menuActive[id] ? '판매 중' : '중지됨'}
                </button>
              )}
              <div className="stepper">
                <button className="btn" aria-label={`${def.name} 500원 내리기`} onClick={() => step(id, -500)}>−</button>
                <span className={`price ${price !== state.menuPrices[id] ? 'pending' : ''}`}>{won(price)}</span>
                <button className="btn" aria-label={`${def.name} 500원 올리기`} onClick={() => step(id, 500)}>+</button>
              </div>
            </li>
          );
        })}
      </ul>
      {msg && <p className="warn" role="status">{msg}</p>}
      {notYet.length > 0 && (
        <>
          <h4>🧪 새 메뉴 개발</h4>
          <ul className="rows">
            {notYet.map((id: PizzaId) => {
              const def = MENU[id];
              const pref = NEIGHBORHOODS[state.neighborhoodId].prefs[id];
              return (
                <li key={id} className="row">
                  <span className="row-icon" aria-hidden="true">{PIZZA_ICON}<small>{MENU_ICON[id]}</small></span>
                  <div className="row-main">
                    <strong>{def.name}</strong>
                    <span className="sub">기본가 {won(def.defaultPrice)} · 원가 약 {won(unitCost(id, state.prices, { premiumCheese: state.levers.premiumCheese }))} · {prefText(pref)}</span>
                    <span className="sub">재료: {recipeLines(id, state.prices, false).map((l) => INGREDIENTS[l.ingredient].name).join(', ')}</span>
                  </div>
                  <button
                    className="btn primary"
                    aria-label={`${def.name} 개발하기`}
                    disabled={state.cash < MENU_DEV_COST}
                    onClick={() => update((s) => developMenu(s, id))}
                  >
                    개발 {won(MENU_DEV_COST)}
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="sub">개발하면 바로 팔기 시작하고, 그 메뉴에만 쓰는 재료를 사흘치 같이 들여와요. 메뉴가 많으면 손님이 조금 늘지만 재료 관리가 어려워져요.</p>
        </>
      )}
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
