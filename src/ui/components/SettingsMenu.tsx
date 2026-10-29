import { useState } from 'react';
import { exportSave, importSave, SaveImportError } from '../../sim/save';
import type { GameState } from '../../sim/types';

function todayStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

function readText(file: File): Promise<string> {
  if (typeof file.text === 'function') return file.text();
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsText(file);
  });
}

export function SettingsMenu({ state, onReplace, onReset }: {
  state: GameState;
  onReplace: (s: GameState) => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const download = () => {
    const blob = new Blob([exportSave(state, Date.now())], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `restaurant-tycoon-save-${todayStamp()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage('저장 파일을 내려받았어요. 「파일」 앱에 보관해 두세요.');
  };

  const load = async (file: File | undefined) => {
    if (!file) return;
    try {
      const s = importSave(await readText(file));
      onReplace(s);
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
          <button className="btn" onClick={download}>저장 파일 내보내기</button>
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
        </div>
      )}
    </div>
  );
}
