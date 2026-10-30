import { won } from '../format';
import type { PanelProps } from './common';

export function StaffPanel({ state }: PanelProps) {
  const st = state.settings;
  return (
    <div className="panel">
      <h3>직원</h3>
      <ul className="rows">
        <li className="row"><span className="row-icon" aria-hidden="true">🧑‍🍳</span><span className="row-main"><strong>사장님(나)</strong><span className="sub">항상 근무 · 급여 없음</span></span></li>
        <li className="row"><span className="row-icon" aria-hidden="true">🧑</span><span className="row-main"><strong>알바 1명</strong><span className="sub">종일({st.openHour}시~{st.closeHour}시) · 시급 {won(state.economy.minWage)}(최저임금)</span></span></li>
      </ul>
      <p className="sub">채용 공고·면접·근무 시간 배치는 다음 업데이트에서 열려요.</p>
    </div>
  );
}
