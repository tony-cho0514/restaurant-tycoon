// 저장 지키기: 아이패드 사파리는 한동안 안 연 사이트의 저장을 지울 수 있다.
// 홈 화면에 추가하면 더 안전하고, 그래도 가끔 저장 파일을 내보내 두는 게 가장 확실하다.
import { useState } from 'react';
import type { GameState } from '../../sim/types';
import { EXPORT_MESSAGE, exportSaveFile } from '../saveFile';

const LAST_BACKUP_KEY = 'rt-last-backup';
const HOME_GUIDE_KEY = 'rt-home-guide-done';
const DAY_MS = 86_400_000;
/** 마지막 내보내기(없으면 개업)에서 이만큼 지나면 백업을 권한다 */
export const BACKUP_REMIND_DAYS = 7;

function read(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function write(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* 저장이 막혀도 안내만 다시 뜰 뿐 */ }
}

export function noteBackup(nowMs: number) {
  write(LAST_BACKUP_KEY, String(nowMs));
}

export function lastBackupAt(): number | null {
  const v = Number(read(LAST_BACKUP_KEY));
  return Number.isFinite(v) && v > 0 ? v : null;
}

/** 아이패드·아이폰 사파리 탭에서 열었는지(홈 화면 앱이면 false) */
export function inIosSafariTab(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true
    || (typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches);
  return ios && !standalone;
}

export function backupAgeDays(state: GameState, nowMs: number): number {
  return Math.floor((nowMs - (lastBackupAt() ?? state.createdAt)) / DAY_MS);
}

export function SaveGuard({ state, now }: { state: GameState; now: number }) {
  const [homeDone, setHomeDone] = useState(() => read(HOME_GUIDE_KEY) === '1');
  const [backupHidden, setBackupHidden] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const backup = async () => {
    const r = await exportSaveFile(state, Date.now());
    if (r !== 'cancelled') noteBackup(Date.now());
    setMessage(EXPORT_MESSAGE[r]);
  };

  if (message) {
    return (
      <div className="save-guard card" role="status">
        <p>{message}</p>
        <button className="btn mini" onClick={() => { setMessage(null); setBackupHidden(true); }}>닫기</button>
      </div>
    );
  }

  if (!homeDone && inIosSafariTab()) {
    const done = () => { write(HOME_GUIDE_KEY, '1'); setHomeDone(true); };
    return (
      <div className="save-guard card" role="note" aria-label="홈 화면에 추가 안내">
        <b>📲 홈 화면에 추가하면 가게가 더 안전해요</b>
        <p className="sub">사파리는 한동안 안 연 사이트의 저장을 지울 수 있어요. 홈 화면 앱으로 열면 그럴 일이 훨씬 줄어요.</p>
        <ol className="home-steps">
          <li>지금 가게를 옮기려면 먼저 <b>저장 파일 내보내기</b>(「파일에 저장」)</li>
          <li>주소창 옆 <b>공유 버튼 ⬆︎</b> → <b>홈 화면에 추가</b></li>
          <li>홈 화면 아이콘으로 열고 <b>저장 파일 불러오기</b> (사파리와 홈 화면 앱은 저장이 따로예요)</li>
        </ol>
        <div className="save-guard-actions">
          <button className="btn primary" onClick={() => void backup()}>저장 파일 내보내기</button>
          <button className="btn" onClick={done}>알겠어요</button>
        </div>
      </div>
    );
  }

  const age = backupAgeDays(state, now);
  if (!backupHidden && age >= BACKUP_REMIND_DAYS) {
    return (
      <div className="save-guard card" role="note" aria-label="백업 알림">
        <b>💾 {lastBackupAt() ? `백업한 지 ${age}일 지났어요` : `개업한 지 ${age}일, 아직 백업이 없어요`}</b>
        <p className="sub">저장 파일을 내보내 두면 아이패드가 저장을 지워도 이어서 할 수 있어요. 공유에서 카톡 「나와의 채팅」으로 보내 둬도 돼요.</p>
        <div className="save-guard-actions">
          <button className="btn primary" onClick={() => void backup()}>지금 내보내기</button>
          <button className="btn" onClick={() => setBackupHidden(true)}>나중에</button>
        </div>
      </div>
    );
  }
  return null;
}
