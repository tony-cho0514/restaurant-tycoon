import { useCallback, useEffect, useState } from 'react';
import { createNewGame } from '../sim/newGame';
import { BACKUP_KEY, CORRUPT_KEY, SAVE_KEY, loadGame, quarantineCorrupt, saveGame } from '../sim/save';
import type { GameState } from '../sim/types';
import { ErrorBoundary, type RecoveryActions } from './components/ErrorBoundary';
import { loadCareer, recordClosedShop, withCareerDex } from './career';
import { Main } from './screens/Main';
import { NewGame } from './screens/NewGame';
import './styles.css';

const CORRUPT_NOTICE = '저장된 가게를 읽지 못했어요. 내보내 둔 저장 파일이 있으면 「저장 파일 불러오기」로 이어서 할 수 있어요. 읽지 못한 원본은 지우지 않고 따로 보관해 뒀어요.';

function initialLoad(): { game: GameState | null; corrupt: boolean } {
  const game = loadGame(localStorage);
  return { game, corrupt: game ? false : quarantineCorrupt(localStorage) };
}

const recovery: RecoveryActions = {
  restoreBackup: () => {
    const bak = localStorage.getItem(BACKUP_KEY);
    if (!bak) {
      window.alert('되돌릴 백업이 없어요. 저장 원본을 내보낸 뒤 처음부터 시작해 주세요.');
      return;
    }
    localStorage.setItem(SAVE_KEY, bak);
    location.reload();
  },
  exportRaw: () => {
    const raw = localStorage.getItem(SAVE_KEY) ?? localStorage.getItem(CORRUPT_KEY) ?? '';
    const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'restaurant-tycoon-save-raw.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 61_000);
  },
  reset: () => {
    if (!window.confirm('지금 가게를 정리하고 처음부터 시작할까요? 원본은 따로 보관해 둘게요.')) return;
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) localStorage.setItem(CORRUPT_KEY, raw);
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem(BACKUP_KEY);
    location.reload();
  },
};

export function App() {
  const [{ game, corrupt }, setLoaded] = useState(initialLoad);
  const [saveFailed, setSaveFailed] = useState(false);

  // 아이패드 사파리가 오래 안 쓴 사이트 저장을 지우지 않게 영구 저장을 요청한다(지원할 때만).
  useEffect(() => {
    void navigator.storage?.persist?.().catch(() => undefined);
  }, []);

  const persist = useCallback((s: GameState) => {
    setSaveFailed(!saveGame(s, localStorage).ok);
  }, []);

  const begin = (s: GameState) => {
    persist(s);
    setLoaded({ game: s, corrupt: false });
  };

  if (!game) {
    return (
      <NewGame
        career={loadCareer().shops}
        notice={corrupt ? CORRUPT_NOTICE : undefined}
        onImport={begin}
        onStart={({ neighborhoodId, shopName }) => {
          const now = Date.now();
          begin(withCareerDex(createNewGame({ seed: now >>> 0, neighborhoodId, shopName, nowMs: now }), loadCareer()));
        }}
      />
    );
  }
  return (
    <ErrorBoundary actions={recovery}>
      <Main
        key={game.createdAt}
        initial={game}
        persist={persist}
        saveFailed={saveFailed}
        onReset={() => {
          localStorage.removeItem(SAVE_KEY);
          localStorage.removeItem(BACKUP_KEY);
          setLoaded({ game: null, corrupt: false });
        }}
        onNewShop={(closed) => {
          recordClosedShop(closed, Date.now());
          localStorage.removeItem(SAVE_KEY);
          localStorage.removeItem(BACKUP_KEY);
          setLoaded({ game: null, corrupt: false });
        }}
      />
    </ErrorBoundary>
  );
}
