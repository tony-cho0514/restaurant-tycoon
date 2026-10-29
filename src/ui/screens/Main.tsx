import { useEffect, useState } from 'react';
import type { GameState } from '../../sim/types';
import { PauseModal, type TabId } from '../components/PauseModal';
import { PlaybackBar } from '../components/PlaybackBar';
import { usePlayback } from '../hooks/usePlayback';
import type { PanelProps } from '../panels/common';
import { InventoryPanel } from '../panels/InventoryPanel';
import { LedgerPanel } from '../panels/LedgerPanel';
import { LeversPanel } from '../panels/LeversPanel';
import { MenuPanel } from '../panels/MenuPanel';
import { NewsPanel } from '../panels/NewsPanel';
import { StatusPanel } from '../panels/StatusPanel';

const TABS: { id: TabId; label: string }[] = [
  { id: 'status', label: '현황' },
  { id: 'news', label: '뉴스' },
  { id: 'menu', label: '메뉴·가격' },
  { id: 'inventory', label: '재고·발주' },
  { id: 'levers', label: '운영 수단' },
  { id: 'ledger', label: '장부' },
];

function ActivePanel({ tab, ...p }: PanelProps & { tab: TabId }) {
  switch (tab) {
    case 'status': return <StatusPanel {...p} />;
    case 'news': return <NewsPanel {...p} />;
    case 'menu': return <MenuPanel {...p} />;
    case 'inventory': return <InventoryPanel {...p} />;
    case 'levers': return <LeversPanel {...p} />;
    case 'ledger': return <LedgerPanel {...p} />;
  }
}

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
      <section className="panels">
        <nav className="tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} className="tab" onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </nav>
        <div className="panel-body">
          <ActivePanel tab={tab} state={pb.state} update={pb.update} />
        </div>
      </section>
      {pb.pauses[0] && (
        <PauseModal reason={pb.pauses[0]} state={pb.state} now={clockNow} onDismiss={pb.dismissPause} onGoto={setTab} />
      )}
    </main>
  );
}
