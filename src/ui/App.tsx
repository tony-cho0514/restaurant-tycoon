import { useState } from 'react';
import { createNewGame } from '../sim/newGame';
import { loadGame, saveGame } from '../sim/save';
import type { GameState } from '../sim/types';
import { NewGame } from './screens/NewGame';
import './styles.css';

export function App() {
  const [game, setGame] = useState<GameState | null>(() => loadGame(localStorage));

  if (!game) {
    return (
      <NewGame
        onStart={({ neighborhoodId, shopName }) => {
          const now = Date.now();
          const s = createNewGame({ seed: now >>> 0, neighborhoodId, shopName, nowMs: now });
          saveGame(s, localStorage);
          setGame(s);
        }}
      />
    );
  }
  return <p>가게 화면 준비 중</p>;
}
