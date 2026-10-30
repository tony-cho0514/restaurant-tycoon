import { useState } from 'react';
import { INTERIOR_AND_EQUIPMENT, START_OPERATING_CASH } from '../../sim/balance';
import { NEIGHBORHOODS, type NeighborhoodId } from '../../sim/neighborhoods';
import { SaveImportError } from '../../sim/save';
import type { GameState } from '../../sim/types';
import { manwon } from '../format';
import { NEIGHBORHOOD_SCENE } from '../icons';
import { readSaveFile } from '../saveFile';

export const NEIGHBORHOOD_THUMBS: Record<NeighborhoodId, string> = { campus: '', office: '', residential: '' };

export function NewGame({ onStart, onImport, notice }: {
  onStart: (o: { neighborhoodId: NeighborhoodId; shopName: string }) => void;
  /** 저장 파일로 이어 하기 */
  onImport?: (s: GameState) => void;
  /** 저장을 못 읽었을 때 같은 안내 */
  notice?: string;
}) {
  const [shopName, setShopName] = useState('우리 동네 피자');
  const [importError, setImportError] = useState<string | null>(null);
  const name = shopName.trim().slice(0, 12) || '우리 동네 피자';

  const load = async (file: File | undefined) => {
    if (!file || !onImport) return;
    try {
      onImport(await readSaveFile(file));
    } catch (e) {
      setImportError(e instanceof SaveImportError ? e.message : '파일을 읽지 못했어요');
    }
  };

  return (
    <main className="newgame">
      {notice && <div className="notice card" role="alert">{notice}</div>}
      <header className="newgame-head">
        <h1>피자집 경영</h1>
        <p>어디에 첫 가게를 열까요?</p>
        {onImport && (
          <div className="import-row">
            <label className="btn file-label">
              저장 파일 불러오기
              <input
                type="file"
                accept="application/json,.json"
                aria-label="저장 파일 불러오기"
                onChange={(e) => { void load(e.target.files?.[0]); e.target.value = ''; }}
              />
            </label>
            <span className="sub">전에 내보내 둔 가게가 있으면 이어서 할 수 있어요.</span>
          </div>
        )}
        {importError && <p className="warn" role="status">{importError}</p>}
        <label className="field">
          <span>가게 이름</span>
          <input value={shopName} maxLength={12} onChange={(e) => setShopName(e.target.value)} />
        </label>
      </header>
      <div className="cards">
        {Object.values(NEIGHBORHOODS).map((n) => (
          <article key={n.id} className="card hood">
            <div className="thumb" data-hood={n.id}>
              {NEIGHBORHOOD_THUMBS[n.id]
                ? <img src={NEIGHBORHOOD_THUMBS[n.id]} alt="" />
                : <div className="thumb-scene" aria-hidden="true">{NEIGHBORHOOD_SCENE[n.id].map((e, i) => <span key={i} className={`ts ts${i}`}>{e}</span>)}</div>}
            </div>
            <h2>{n.name}</h2>
            <ul className="traits">
              {n.traits.map((t) => <li key={t}>{t}</li>)}
            </ul>
            <dl className="facts">
              <div><dt>보증금</dt><dd>{manwon(n.listing.deposit)}</dd></div>
              <div><dt>권리금</dt><dd>{manwon(n.listing.keyMoney)}</dd></div>
              <div><dt>인테리어·장비</dt><dd>{manwon(INTERIOR_AND_EQUIPMENT)}</dd></div>
              <div><dt>월세</dt><dd>{manwon(n.listing.monthlyRent)}</dd></div>
              <div><dt>다 내고 남는 운영 자금</dt><dd>{manwon(START_OPERATING_CASH)}</dd></div>
            </dl>
            <button className="btn primary" onClick={() => onStart({ neighborhoodId: n.id, shopName: name })}>여기서 개업</button>
          </article>
        ))}
      </div>
    </main>
  );
}
