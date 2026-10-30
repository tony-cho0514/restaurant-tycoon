import { useEffect, useState } from 'react';
import { acceptGroup, declineGroup } from '../../sim/groupOrders';
import { ownerWorking } from '../../sim/owner';
import { staffWorking } from '../../sim/staffing';
import { tableCount } from '../../sim/upgradeOps';
import type { GameState } from '../../sim/types';
import { MessageToasts } from '../components/MessageToasts';
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
import { MessagesPanel } from '../panels/MessagesPanel';
import { SalesPanel } from '../panels/SalesPanel';
import { ShopPanel } from '../panels/ShopPanel';
import { StaffPanel } from '../panels/StaffPanel';
import { StatusPanel } from '../panels/StatusPanel';

const TABS: { id: TabId; label: string }[] = [
  { id: 'status', label: '현황' },
  { id: 'sales', label: '매출·주문' },
  { id: 'menu', label: '메뉴' },
  { id: 'inventory', label: '재고' },
  { id: 'staff', label: '직원' },
  { id: 'shop', label: '가게' },
  { id: 'levers', label: '운영 수단' },
  { id: 'ledger', label: '장부' },
  { id: 'messages', label: '메시지' },
];

function ActivePanel({ tab, onGoto, focusId, ...p }: PanelProps & { tab: TabId; onGoto: (tab: TabId) => void; focusId: number | null }) {
  switch (tab) {
    case 'status': return <StatusPanel {...p} />;
    case 'messages': return <MessagesPanel {...p} onGoto={onGoto} focusId={focusId} />;
    case 'menu': return <MenuPanel {...p} />;
    case 'inventory': return <InventoryPanel {...p} />;
    case 'levers': return <LeversPanel {...p} />;
    case 'ledger': return <LedgerPanel {...p} />;
    case 'sales': return <SalesPanel {...p} />;
    case 'staff': return <StaffPanel {...p} />;
    case 'shop': return <ShopPanel {...p} />;
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
  const lastMsgId = pb.state.messages.items.at(-1)?.id ?? 0;
  // 메시지 탭을 마지막으로 본 뒤 온 메시지 수(처음 열 때는 0)
  const [readId, setReadId] = useState(lastMsgId);
  // 말풍선을 눌러 메시지 탭으로 가면 그 메시지를 보여 준다
  const [focusMsg, setFocusMsg] = useState<number | null>(null);
  useEffect(() => {
    if (tab === 'messages') setReadId(lastMsgId);
  }, [tab, lastMsgId]);
  const unread = pb.state.messages.items.filter((m) => m.id > readId).length;

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
        <div className="scene-wrap">
          <ShopScene
            anim={pb.lastAnim}
            hour={pb.lastAnim?.hour ?? pb.state.clock.hour}
            weather={pb.state.economy.weather}
            mood={moodOf(pb.state.news.active.filter((a) => a.untilDay >= pb.state.clock.day), pb.state.economy.cycle)}
            tables={tableCount(pb.state)}
            staff={(ownerWorking(pb.state, pb.state.clock.hour) ? 1 : 0) + staffWorking(pb.state, pb.state.clock.hour).length}
          />
          <MessageToasts items={pb.state.messages.items} muted={tab === 'messages'} onOpen={(m) => { setTab('messages'); setFocusMsg(m.id); }} />
        </div>
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
            <button key={t.id} role="tab" aria-selected={tab === t.id} className="tab" onClick={() => setTab(t.id)}>
              <span className="tab-icon" aria-hidden="true">{TAB_ICON[t.id]}</span><span>{t.label}</span>
              {t.id === 'messages' && unread > 0 && tab !== 'messages' && <span className="tab-badge" aria-label={`새 메시지 ${unread}개`}>{unread > 9 ? '9+' : unread}</span>}
            </button>
          ))}
        </nav>
        <div className="panel-body">
          <ActivePanel tab={tab} state={pb.state} update={pb.update} onGoto={setTab} focusId={focusMsg} />
        </div>
      </section>
      {pb.pauses[0] && (
        <PauseModal
          reason={pb.pauses[0]}
          state={pb.state}
          now={clockNow}
          onDismiss={pb.dismissPause}
          onGoto={setTab}
          onAccept={(id) => pb.update((s) => acceptGroup(s, id))}
          onDecline={(id) => pb.update((s) => declineGroup(s, id))}
        />
      )}
    </main>
  );
}
