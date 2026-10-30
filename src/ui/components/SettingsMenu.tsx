import { useState } from 'react';
import { showAllTabs } from '../../sim/guide';
import { setSoundOn, soundOn } from '../sound';
import { SaveImportError } from '../../sim/save';
import type { GameState } from '../../sim/types';
import { EXPORT_MESSAGE, exportSaveFile, readSaveFile } from '../saveFile';
import { BACKUP_REMIND_DAYS, backupAgeDays, lastBackupAt, noteBackup } from './SaveGuard';

export function SettingsMenu({ state, onReplace, onReset }: {
  state: GameState;
  onReplace: (s: GameState) => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [sound, setSound] = useState(soundOn);

  const download = async () => {
    const r = await exportSaveFile(state, Date.now());
    if (r !== 'cancelled') noteBackup(Date.now());
    setMessage(EXPORT_MESSAGE[r]);
  };

  const load = async (file: File | undefined) => {
    if (!file) return;
    try {
      onReplace(await readSaveFile(file));
      setMessage('저장 파일을 불러왔어요.');
    } catch (e) {
      setMessage(e instanceof SaveImportError ? e.message : '파일을 읽지 못했어요');
    }
  };

  const reset = () => {
    if (!window.confirm('지금 가게를 정리하고 처음부터 다시 시작할까요?')) return;
    if (!window.confirm('정말요? 저장 파일을 내보내 두지 않았다면 지금 가게는 되돌릴 수 없어요.')) return;
    onReset();
  };

  return (
    <div className="settings">
      <button className="btn settings-toggle" aria-label="설정" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        ⚙{backupAgeDays(state, Date.now()) >= BACKUP_REMIND_DAYS && <span className="dot" aria-label="백업할 때가 됐어요" />}
      </button>
      {open && (
        <div className="settings-menu card">
          <button className="btn" onClick={() => void download()}>저장 파일 내보내기</button>
          <p className="sub">{lastBackupAt() ? `마지막 백업: ${backupAgeDays(state, Date.now())}일 전` : '아직 백업한 적이 없어요'}</p>
          <label className="btn file-label">
            저장 파일 불러오기
            <input
              type="file"
              accept="application/json,.json"
              aria-label="저장 파일 불러오기"
              onChange={(e) => { void load(e.target.files?.[0]); e.target.value = ''; }}
            />
          </label>
          {state.guide.tabs.length < 10 && (
            <button className="btn" onClick={() => { onReplace(showAllTabs(state)); setMessage('모든 탭을 열었어요.'); }}>탭 모두 바로 보기</button>
          )}
          <button className="btn" aria-pressed={sound} onClick={() => { setSoundOn(!sound); setSound(!sound); }}>{sound ? '🔊 효과음 켜짐' : '🔇 효과음 꺼짐'}</button>
          <button className="btn danger" onClick={reset}>처음부터 다시</button>
          {message && <p className="sub" role="status">{message}</p>}
          <p className="credit">3D 모형·효과음: Kenney (kenney.nl, CC0)</p>
        </div>
      )}
    </div>
  );
}
