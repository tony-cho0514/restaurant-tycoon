import { DELIVERY_COST_TOTAL, STRESS_REST_DAY, STRESS_REST_HOUR, UTILITIES_PER_HOUR } from '../../sim/balance';
import { dailyLabor } from '../../sim/labor';
import { AWAY_LABEL, VACATION_COST, VACATION_DAYS, leaveEarly, ownerAway, ownerWorking, takeDayOff, takeVacation } from '../../sim/owner';
import { shiftHours, staffWorking } from '../../sim/staffing';
import type { GameState, Settings } from '../../sim/types';
import { MAX_GRADE, UPGRADES, UPGRADE_IDS, buyUpgrade, shopGrade, upgradeCost } from '../../sim/upgradeOps';
import { won } from '../format';
import type { PanelProps } from './common';

const DAY_NAMES = ['월', '화', '수', '목', '금', '토', '일'];
const OPEN_RANGE = [10, 12];
const CLOSE_RANGE = [20, 24];

function can(f: () => unknown): boolean {
  try {
    f();
    return true;
  } catch {
    return false;
  }
}

/** 사장님 휴식: 일찍 퇴근, 내일 하루 쉬기, 휴가. 무엇을 잃고 얼마나 쉬는지 미리 보여 준다. */
function RestSection({ state, update }: PanelProps) {
  const st = state.settings;
  const from = Math.max(state.clock.hour, st.openHour);
  const left = Math.max(0, st.closeHour - from);
  let covered = 0;
  for (let h = from; h < st.closeHour; h++) if (staffWorking(state, h).length > 0) covered++;
  // 내일은 결근을 모르니 근무 시간대로만 센다
  const tomorrow = { ...state, absentToday: [] } as GameState;
  let tomorrowCovered = 0;
  for (let h = st.openHour; h < st.closeHour; h++) if (staffWorking(tomorrow, h).length > 0) tomorrowCovered++;
  const hours = st.closeHour - st.openHour;
  const o = state.owner;
  const scheduled = o.awayUntil >= state.clock.day && o.awayReason
    ? `${o.awayFrom <= state.clock.day ? '지금' : o.awayFrom - state.clock.day === 1 ? '내일부터' : `${o.awayFrom - state.clock.day}일 뒤부터`} ${AWAY_LABEL[o.awayReason]}${o.awayUntil > o.awayFrom ? `(${o.awayUntil - o.awayFrom + 1}일)` : ''}`
    : null;
  const shopText = (n: number, total: number) => (n === 0 ? '알바가 없어 가게 문을 닫아요' : n >= total ? '알바가 가게를 봐요' : `알바 있는 ${n}시간만 열고 나머지는 닫아요`);

  return (
    <>
      <h4>🛋️ 사장님 휴식</h4>
      {scheduled && <p className="sub"><b>{scheduled}</b> 예정이에요.</p>}
      <ul className="rows rest-actions">
        <li className="row">
          <span className="row-icon" aria-hidden="true">🏃</span>
          <div className="row-main">
            <strong>오늘 일찍 퇴근</strong>
            <span className="sub">
              {ownerAway(state) ? '오늘은 쉬는 날이에요' : !ownerWorking(state, from) ? '이미 퇴근했어요' : `남은 ${left}시간: ${shopText(covered, left)} · 스트레스 약 −${Math.round(left * STRESS_REST_HOUR)}`}
            </span>
          </div>
          <button className="btn" disabled={!can(() => leaveEarly(state))} onClick={() => update(leaveEarly)}>퇴근</button>
        </li>
        <li className="row">
          <span className="row-icon" aria-hidden="true">🛌</span>
          <div className="row-main">
            <strong>내일 하루 쉬기</strong>
            <span className="sub">{shopText(tomorrowCovered, hours)} · 스트레스 −{STRESS_REST_DAY}</span>
          </div>
          <button className="btn" disabled={!can(() => takeDayOff(state))} onClick={() => update(takeDayOff)}>쉬기</button>
        </li>
        <li className="row">
          <span className="row-icon" aria-hidden="true">🏖️</span>
          <div className="row-main">
            <strong>휴가 {VACATION_DAYS}일</strong>
            <span className="sub">내일부터 {VACATION_DAYS}일 · 사장님 개인 돈 {won(VACATION_COST)}(가게 이익과 별개) · 그동안 {shopText(tomorrowCovered, hours)} · 스트레스 −{STRESS_REST_DAY * VACATION_DAYS}</span>
          </div>
          <button className="btn" disabled={!can(() => takeVacation(state))} onClick={() => update(takeVacation)}>떠나기</button>
        </li>
      </ul>
      <p className="sub">정기 휴무도 하루 통째로 쉬는 날이에요. 쉬지 않고 계속 일하면 스트레스가 쌓여 결국 쓰러져요. 알바를 뽑아 두면 쉬는 동안에도 가게를 열 수 있어요.</p>
    </>
  );
}

export function ShopPanel({ state, update }: PanelProps) {
  const st = state.settings;
  const set = (patch: Partial<Settings>) => update((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  const hours = st.closeHour - st.openHour;
  const openDays = 7 - (st.closedDay === null ? 0 : 1);
  // 지금 직원 그대로 이 영업시간이면 하루 알바비가 얼마인지
  const labor = state.staff.reduce((a, x) => {
    const h = shiftHours(state, x.shift);
    return a + dailyLabor(h, x.wage, h * openDays);
  }, 0);
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

      <RestSection state={state} update={update} />

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
