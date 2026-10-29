import { useEffect, useState } from 'react';
import type { GameState } from '../../sim/types';
import { PauseModal, type TabId } from '../components/PauseModal';
import { PlaybackBar } from '../components/PlaybackBar';
import { usePlayback } from '../hooks/usePlayback';

export function Main({ initial, now = Date.now, persist }: {
  initial: GameState;
  now?: () => number;
  persist: (s: GameState) => void;
}) {
  const pb = usePlayback(initial, { now, persist });
  const [tab, setTab] = useState<TabId>('status');
  const [clockNow, setClockNow] = useState(now());

  // 멈춰 있을 때도 남은 충전 표시가 갱신되게 30초마다 시각을 새로 읽는다.
  useEffect(() => {
    const id = setInterval(() => setClockNow(now()), 30_000);
    return () => clearInterval(id);
  }, [now]);
  useEffect(() => setClockNow(now()), [pb.state, now]);

  return (
    <main className="main">
      <section className="stage">
        <div className="scene-slot" />
        <PlaybackBar
          state={pb.state}
          now={clockNow}
          playing={pb.playing}
          speed={pb.speed}
          onPlay={pb.play}
          onStop={pb.stop}
          onSpeed={pb.setSpeed}
        />
      </section>
      <section className="panels" data-tab={tab} />
      {pb.pauses[0] && (
        <PauseModal reason={pb.pauses[0]} state={pb.state} now={clockNow} onDismiss={pb.dismissPause} onGoto={setTab} />
      )}
    </main>
  );
}
