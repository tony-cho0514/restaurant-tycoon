import { useEffect, useState } from 'react';
import type { GameState } from '../../sim/types';
import { PauseModal, type TabId } from '../components/PauseModal';
import { PlaybackBar } from '../components/PlaybackBar';
import { SettingsMenu } from '../components/SettingsMenu';
import { ShopScene, moodOf } from '../components/ShopScene';
import '../scene.css';
import { usePlayback } from '../hooks/usePlayback';
import { TAB_ICON } from '../icons';
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

export function Main({ initial, now = Date.now, persist, saveFailed = false, onReset = () => {} }: {
  initial: GameState;
  now?: () => number;
  persist: (s: GameState) => void;
  saveFailed?: boolean;
  onReset?: () => void;
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
      {saveFailed && <div className="save-warning" role="alert">저장 공간이 부족해요. 설정에서 저장 파일을 내보내 두세요.</div>}
      <section className="stage">
        <div className="shop-title">
          <strong>{pb.state.shopName}</strong>
          <SettingsMenu state={pb.state} onReplace={pb.replace} onReset={onReset} />
        </div>
        <ShopScene
          anim={pb.lastAnim}
          hour={pb.lastAnim?.hour ?? pb.state.clock.hour}
          weather={pb.state.economy.weather}
          mood={moodOf(pb.state.news.active.filter((a) => a.untilDay >= pb.state.clock.day), pb.state.economy.cycle)}
        />
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
            <button key={t.id} role="tab" aria-selected={tab === t.id} className="tab" onClick={() => setTab(t.id)}><span className="tab-icon" aria-hidden="true">{TAB_ICON[t.id]}</span><span>{t.label}</span></button>
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
