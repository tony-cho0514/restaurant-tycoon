import { useState } from 'react';
import { NEIGHBORHOODS, cashAfterSetup, type NeighborhoodId } from '../../sim/neighborhoods';
import { manwon } from '../format';

export const NEIGHBORHOOD_THUMBS: Record<NeighborhoodId, string> = { campus: '', office: '', residential: '' };

export function NewGame({ onStart }: { onStart: (o: { neighborhoodId: NeighborhoodId; shopName: string }) => void }) {
  const [shopName, setShopName] = useState('우리 동네 피자');
  const name = shopName.trim().slice(0, 12) || '우리 동네 피자';

  return (
    <main className="newgame">
      <header className="newgame-head">
        <h1>피자집 경영</h1>
        <p>어디에 첫 가게를 열까요?</p>
        <label className="field">
          <span>가게 이름</span>
          <input value={shopName} maxLength={12} onChange={(e) => setShopName(e.target.value)} />
        </label>
      </header>
      <div className="cards">
        {Object.values(NEIGHBORHOODS).map((n) => (
          <article key={n.id} className="card hood">
            <div className="thumb" data-hood={n.id}>
              {NEIGHBORHOOD_THUMBS[n.id] && <img src={NEIGHBORHOOD_THUMBS[n.id]} alt="" />}
            </div>
            <h2>{n.name}</h2>
            <ul className="traits">
              {n.traits.map((t) => <li key={t}>{t}</li>)}
            </ul>
            <dl className="facts">
              <div><dt>보증금</dt><dd>{manwon(n.listing.deposit)}</dd></div>
              <div><dt>권리금</dt><dd>{manwon(n.listing.keyMoney)}</dd></div>
              <div><dt>월세</dt><dd>{manwon(n.listing.monthlyRent)}</dd></div>
              <div><dt>인테리어 후 남는 돈</dt><dd>{manwon(cashAfterSetup(n))}</dd></div>
            </dl>
            <button className="btn primary" onClick={() => onStart({ neighborhoodId: n.id, shopName: name })}>여기서 개업</button>
          </article>
        ))}
      </div>
    </main>
  );
}
