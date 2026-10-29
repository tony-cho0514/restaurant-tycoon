import { useState } from 'react';
import { SaveImportError } from '../../sim/save';
import type { GameState } from '../../sim/types';
import { EXPORT_MESSAGE, exportSaveFile, readSaveFile } from '../saveFile';

export function SettingsMenu({ state, onReplace, onReset }: {
  state: GameState;
  onReplace: (s: GameState) => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const download = async () => {
    setMessage(EXPORT_MESSAGE[await exportSaveFile(state, Date.now())]);
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
      <button className="btn settings-toggle" aria-label="설정" aria-expanded={open} onClick={() => setOpen((v) => !v)}>⚙</button>
      {open && (
        <div className="settings-menu card">
          <button className="btn" onClick={() => void download()}>저장 파일 내보내기</button>
          <label className="btn file-label">
            저장 파일 불러오기
            <input
              type="file"
              accept="application/json,.json"
              aria-label="저장 파일 불러오기"
              onChange={(e) => { void load(e.target.files?.[0]); e.target.value = ''; }}
            />
          </label>
          <button className="btn danger" onClick={reset}>처음부터 다시</button>
          {message && <p className="sub" role="status">{message}</p>}
          <p className="credit">3D 소재: Kenney (kenney.nl, CC0)</p>
        </div>
      )}
    </div>
  );
}
