import { useCallback, useEffect, useState } from 'react';
import { createNewGame } from '../sim/newGame';
import { BACKUP_KEY, SAVE_KEY, loadGame, saveGame } from '../sim/save';
import type { GameState } from '../sim/types';
import { Main } from './screens/Main';
import { NewGame } from './screens/NewGame';
import './styles.css';

export function App() {
  const [game, setGame] = useState<GameState | null>(() => loadGame(localStorage));
  const [saveFailed, setSaveFailed] = useState(false);

  // 아이패드 사파리가 오래 안 쓴 사이트 저장을 지우지 않게 영구 저장을 요청한다(지원할 때만).
  useEffect(() => {
    void navigator.storage?.persist?.().catch(() => undefined);
  }, []);

  const persist = useCallback((s: GameState) => {
    setSaveFailed(!saveGame(s, localStorage).ok);
  }, []);

  if (!game) {
    return (
      <NewGame
        onStart={({ neighborhoodId, shopName }) => {
          const now = Date.now();
          const s = createNewGame({ seed: now >>> 0, neighborhoodId, shopName, nowMs: now });
          persist(s);
          setGame(s);
        }}
      />
    );
  }
  return (
    <Main
      key={game.createdAt}
      initial={game}
      persist={persist}
      saveFailed={saveFailed}
      onReset={() => {
        localStorage.removeItem(SAVE_KEY);
        localStorage.removeItem(BACKUP_KEY);
        setGame(null);
      }}
    />
  );
}
