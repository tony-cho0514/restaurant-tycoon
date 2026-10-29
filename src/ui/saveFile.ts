// 저장 파일 내보내기·읽기(화면 쪽). 아이패드에서는 공유 시트의 「파일에 저장」이 가장 확실하다.
import { exportSave, importSave } from '../sim/save';
import type { GameState } from '../sim/types';

/** 내려받기 주소를 살려 두는 시간. 아이패드 사파리는 「다운로드할까요?」를 먼저 묻는다. */
const REVOKE_AFTER_MS = 60_000;

function stamp(nowMs: number): string {
  const d = new Date(nowMs);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

export async function exportSaveFile(state: GameState, nowMs: number): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const name = `restaurant-tycoon-save-${stamp(nowMs)}.json`;
  const text = exportSave(state, nowMs);
  const file = new File([text], name, { type: 'application/json' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (typeof nav.canShare === 'function' && typeof nav.share === 'function' && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file] });
      return 'shared';
    } catch (e) {
      if ((e as { name?: string })?.name === 'AbortError') return 'cancelled';
      // 공유가 막히면 아래 내려받기로 넘어간다.
    }
  }
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_AFTER_MS + 1_000);
  return 'downloaded';
}

export const EXPORT_MESSAGE: Record<'shared' | 'downloaded' | 'cancelled', string> = {
  shared: '저장 파일을 넘겼어요. 「파일에 저장」을 골랐다면 「파일」 앱에 있어요.',
  downloaded: '저장 파일 내려받기를 시작했어요. 「파일」 앱의 다운로드 폴더를 확인해 주세요.',
  cancelled: '내보내기를 취소했어요.',
};

export async function readSaveFile(file: File): Promise<GameState> {
  const text = typeof file.text === 'function'
    ? await file.text()
    : await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(r.error);
      r.readAsText(file);
    });
  return importSave(text);
}
