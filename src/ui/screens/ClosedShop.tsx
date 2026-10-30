// 폐업 부검: 몇 날 버텼는지, 모두 얼마를 벌었는지, 자주 나온 원인, 정산. 도감은 다음 가게로 이어진다.
import { CARD_IDS } from '../../content/dexCards';
import { lifetimeProfit, settlement } from '../../sim/bank';
import { NEIGHBORHOODS } from '../../sim/neighborhoods';
import type { GameState } from '../../sim/types';
import { manwon, won } from '../format';

export function ClosedShop({ state, onNewShop }: { state: GameState; onNewShop: () => void }) {
  const st = settlement(state);
  const profit = lifetimeProfit(state);
  const reports = state.learning.reports;
  const best = [...reports].sort((a, b) => b.profit - a.profit)[0];
  const worst = [...reports].sort((a, b) => a.profit - b.profit)[0];
  // 자주 나온 원인(첫 달·잘된 달 빼고)
  const counts = new Map<string, { n: number; text: string }>();
  for (const r of reports) {
    if (!r.causeKey || r.causeKey === 'first' || r.causeKey === 'good') continue;
    const c = counts.get(r.causeKey) ?? { n: 0, text: r.cause };
    counts.set(r.causeKey, { n: c.n + 1, text: r.cause });
  }
  const causes = [...counts.values()].sort((a, b) => b.n - a.n).slice(0, 3);
  const got = CARD_IDS.filter((id) => state.learning.dex[id]).length;
  const bankrupt = state.closed?.reason === 'bankrupt';
  return (
    <main className="closed-shop">
      <div className="card closed-card" role="region" aria-label="폐업 부검">
        <div className="modal-icon" aria-hidden="true">{bankrupt ? '🥀' : '🚪'}</div>
        <h1>{bankrupt ? `「${state.shopName}」 문을 닫았어요` : `「${state.shopName}」 정리를 마쳤어요`}</h1>
        <p className="sub">{NEIGHBORHOODS[state.neighborhoodId].name} · {state.clock.day}일 운영{bankrupt ? ' · 통장 마이너스가 4주 이어졌어요' : ''}</p>
        <dl className="facts">
          <div><dt>개업부터 모두 번 돈(장부 이익)</dt><dd className={profit < 0 ? 'neg' : ''}>{manwon(profit)}</dd></div>
          {best && <div><dt>가장 좋았던 달</dt><dd>{best.label} {manwon(best.profit)}</dd></div>}
          {worst && worst !== best && <div><dt>가장 아팠던 달</dt><dd className={worst.profit < 0 ? 'neg' : ''}>{worst.label} {manwon(worst.profit)}</dd></div>}
        </dl>
        {causes.length > 0 && (
          <>
            <h4>🔍 자주 나온 원인</h4>
            <ol className="report-list">{causes.map((c) => <li key={c.text}>{c.text} <span className="sub">({c.n}번)</span></li>)}</ol>
          </>
        )}
        <h4>🧾 정산</h4>
        <dl className="facts">
          <div><dt>통장</dt><dd className={st.cash < 0 ? 'neg' : ''}>{won(st.cash)}</dd></div>
          <div><dt>돌려받는 보증금</dt><dd>+{won(st.deposit)}</dd></div>
          {st.loan > 0 && <div><dt>남은 대출</dt><dd className="neg">−{won(st.loan)}</dd></div>}
          <div><dt>손에 남는 돈</dt><dd className={st.total < 0 ? 'neg' : ''}><b>{won(st.total)}</b></dd></div>
        </dl>
        <p className="sub">권리금 {manwon(st.keyMoney)}은 돌려받지 못해요. 장사를 접을 때 가장 크게 사라지는 돈이에요.</p>
        <p>📚 도감 {got}/{CARD_IDS.length}장은 다음 가게로 그대로 이어져요.</p>
        <button className="btn primary" onClick={onNewShop}>새 가게 열기</button>
      </div>
    </main>
  );
}
