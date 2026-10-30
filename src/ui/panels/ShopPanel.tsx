import { DELIVERY_COST_TOTAL, UTILITIES_PER_HOUR } from '../../sim/balance';
import { dailyLabor } from '../../sim/labor';
import type { Settings } from '../../sim/types';
import { MAX_GRADE, UPGRADES, UPGRADE_IDS, buyUpgrade, shopGrade, upgradeCost } from '../../sim/upgradeOps';
import { won } from '../format';
import type { PanelProps } from './common';

const DAY_NAMES = ['월', '화', '수', '목', '금', '토', '일'];
const OPEN_RANGE = [10, 12];
const CLOSE_RANGE = [20, 24];

export function ShopPanel({ state, update }: PanelProps) {
  const st = state.settings;
  const set = (patch: Partial<Settings>) => update((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  const hours = st.closeHour - st.openHour;
  const openDays = 7 - (st.closedDay === null ? 0 : 1);
  const labor = dailyLabor(hours, state.economy.minWage, hours * openDays);
  const utilities = Math.round(UTILITIES_PER_HOUR * hours);
  const clampTip = (v: number) => Math.min(DELIVERY_COST_TOTAL, Math.max(0, v));

  return (
    <div className="panel">
      <h3>가게</h3>

      <h4>⏰ 운영시간</h4>
      <div className="setting-row">
        <span>여는 시각</span>
        <button className="btn mini" aria-label="여는 시각 앞당기기" disabled={st.openHour <= OPEN_RANGE[0]} onClick={() => set({ openHour: st.openHour - 1 })}>−</button>
        <b>{st.openHour}시</b>
        <button className="btn mini" aria-label="여는 시각 늦추기" disabled={st.openHour >= OPEN_RANGE[1]} onClick={() => set({ openHour: st.openHour + 1 })}>+</button>
      </div>
      <div className="setting-row">
        <span>닫는 시각</span>
        <button className="btn mini" aria-label="닫는 시각 앞당기기" disabled={st.closeHour <= CLOSE_RANGE[0]} onClick={() => set({ closeHour: st.closeHour - 1 })}>−</button>
        <b>{st.closeHour === 24 ? '자정' : `${st.closeHour}시`}</b>
        <button className="btn mini" aria-label="닫는 시각 늦추기" disabled={st.closeHour >= CLOSE_RANGE[1]} onClick={() => set({ closeHour: st.closeHour + 1 })}>+</button>
      </div>
      <p className="sub">
        하루 {hours}시간 영업 · 알바비 약 {won(labor)}/일 · 공과금 약 {won(utilities)}/일.
        늦게까지 열면 야식 배달이 들어와요(대학가·주택가). 영업 중에 닫는 시각을 앞당기면 그 자리에서 마감해요.
      </p>

      <h4>📅 정기 휴무</h4>
      <div className="day-picker" role="group" aria-label="정기 휴무">
        <button className="btn mini" aria-pressed={st.closedDay === null} onClick={() => set({ closedDay: null })}>휴무 없음</button>
        {DAY_NAMES.map((d, i) => (
          <button key={d} className="btn mini" aria-label={`${d}요일 휴무`} aria-pressed={st.closedDay === i} onClick={() => set({ closedDay: i })}>{d}</button>
        ))}
      </div>
      <p className="sub">휴무일엔 매출·알바비·공과금이 없고 월세는 그대로 나가요. 충전된 시간도 쓰지 않아요.</p>

      <h4>🛵 배달팁</h4>
      <div className="setting-row">
        <span>손님이 내는 배달팁</span>
        <button className="btn mini" aria-label="배달팁 내리기" disabled={st.deliveryTip <= 0} onClick={() => set({ deliveryTip: clampTip(st.deliveryTip - 500) })}>−</button>
        <b>{won(st.deliveryTip)}</b>
        <button className="btn mini" aria-label="배달팁 올리기" disabled={st.deliveryTip >= DELIVERY_COST_TOTAL} onClick={() => set({ deliveryTip: clampTip(st.deliveryTip + 500) })}>+</button>
      </div>
      <p className="sub">배달 한 건 비용 {won(DELIVERY_COST_TOTAL)} 중 사장 부담 {won(DELIVERY_COST_TOTAL - st.deliveryTip)}. 손님 몫을 올리면 배달 주문이 줄어요.</p>

      <h4>🛠️ 업그레이드</h4>
      <div className="grade">
        <span>가게 등급 {shopGrade(state)} / {MAX_GRADE} · 2호점 준비도</span>
        <div className="bar" role="progressbar" aria-valuenow={shopGrade(state)} aria-valuemin={0} aria-valuemax={MAX_GRADE}>
          <div style={{ width: `${(shopGrade(state) / MAX_GRADE) * 100}%` }} />
        </div>
      </div>
      <ul className="rows">
        {UPGRADE_IDS.map((id) => {
          const def = UPGRADES[id];
          const level = state.upgrades[id];
          const cost = upgradeCost(state, id);
          return (
            <li key={id} className="row">
              <span className="row-icon" aria-hidden="true">{def.icon}</span>
              <div className="row-main">
                <strong>{def.name} <span className="sub">{level}/{def.max}단계</span></strong>
                <span className="sub">지금: {def.effect(level)}</span>
                {cost !== null && <span className="sub">다음: {def.effect(level + 1)}</span>}
              </div>
              {cost === null ? (
                <span className="badge on">최고</span>
              ) : (
                <button
                  className="btn primary"
                  aria-label={`${def.name} 업그레이드`}
                  disabled={state.cash < cost}
                  onClick={() => update((s) => buyUpgrade(s, id))}
                >
                  {won(cost)}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <p className="sub">업그레이드 비용은 장부의 「투자」로 잡혀서 그달 이익이 줄어 보여요. 길게 보고 정하세요.</p>
    </div>
  );
}
