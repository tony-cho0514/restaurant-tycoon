import { useEffect, useRef, useState } from 'react';
import { acceptGroup, declineGroup } from '../../sim/groupOrders';
import { goalText, openTab } from '../../sim/guide';
import { ownerWorking } from '../../sim/owner';
import { staffWorking } from '../../sim/staffing';
import { tableCount } from '../../sim/upgradeOps';
import type { GameState } from '../../sim/types';
import { MessageToasts } from '../components/MessageToasts';
import { PauseModal, type TabId } from '../components/PauseModal';
import { PlaybackBar } from '../components/PlaybackBar';
import { SaveGuard } from '../components/SaveGuard';
import { CatchUpModal } from '../components/CatchUpModal';
import type { CatchUpSummary } from '../../sim/catchUp';
import { ClosedShop } from './ClosedShop';
import { SettingsMenu } from '../components/SettingsMenu';
import { ShopScene, moodOf } from '../components/ShopScene';
import '../scene.css';
import { usePlayback } from '../hooks/usePlayback';
import { play, unlockAudio } from '../sound';
import { TAB_ICON } from '../icons';
import type { PanelProps } from '../panels/common';
import { InventoryPanel } from '../panels/InventoryPanel';
import { LearnPanel } from '../panels/LearnPanel';
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
  { id: 'learn', label: '배움' },
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
    case 'learn': return <LearnPanel {...p} onGoto={onGoto} />;
  }
}

export function Main({ initial, now = Date.now, persist, saveFailed = false, onReset = () => {}, onNewShop = () => {} }: {
  initial: GameState;
  now?: () => number;
  persist: (s: GameState) => void;
  saveFailed?: boolean;
  onReset?: () => void;
  /** 문 닫은 가게를 경력에 남기고 새 가게로 */
  onNewShop?: (closed: GameState) => void;
}) {
  const pb = usePlayback(initial, { now, persist });
  const [tab, setTab] = useState<TabId>('status');
  const guide = pb.state.guide;
  const [skipView, setSkipView] = useState<'ask' | CatchUpSummary | null>(null);
  // 탭을 누르거나 메시지·멈춤 창에서 바로 가면, 아직 안 열린 탭도 열고 「새로」 표시를 지운다
  const goto = (t: TabId) => { setTab(t); pb.update((s) => openTab(s, t)); };
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

  // 효과음: 판매(4배속에선 생략), 자동 멈춤, 새 카드·새 탭, 한 주 마감. 아이패드는 첫 터치 뒤에만 소리가 난다.
  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock);
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);
  useEffect(() => {
    if (pb.lastAnim && pb.lastAnim.revenue > 0 && pb.speed < 4) play('sale');
  }, [pb.lastAnim, pb.speed]);
  const firstPause = pb.pauses[0];
  useEffect(() => { if (firstPause) play('pause'); }, [firstPause]);
  const heardMsg = useRef(lastMsgId);
  useEffect(() => {
    const fresh = pb.state.messages.items.filter((m) => m.id > heardMsg.current);
    heardMsg.current = lastMsgId;
    if (fresh.some((m) => m.from === 'book' || m.key?.startsWith('tab-'))) play('card');
  }, [lastMsgId, pb.state.messages.items]);
  const day = pb.state.clock.day;
  const prevDay = useRef(day);
  useEffect(() => {
    if (day > prevDay.current && day % 7 === 0) play('week');
    prevDay.current = day;
  }, [day]);

  // 멈춰 있을 때도 남은 충전 표시가 갱신되게 30초마다 시각을 새로 읽는다.
  useEffect(() => {
    const id = setInterval(() => setClockNow(now()), 30_000);
    return () => clearInterval(id);
  }, [now]);
  useEffect(() => setClockNow(now()), [pb.state, now]);

  if (pb.state.closed) return <ClosedShop state={pb.state} onNewShop={() => onNewShop(pb.state)} />;

  return (
    <main className="main">
      {saveFailed && <div className="save-warning" role="alert">저장 공간이 부족해요. 설정에서 저장 파일을 내보내 두세요.</div>}
      {!pb.playing && !pb.pauses[0] && !skipView && <SaveGuard state={pb.state} now={clockNow} />}
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
          <MessageToasts items={pb.state.messages.items} muted={tab === 'messages'} onOpen={(m) => { goto('messages'); setFocusMsg(m.id); }} />
        </div>
        <PlaybackBar
          state={pb.state}
          now={clockNow}
          playing={pb.playing}
          speed={pb.speed}
          onPlay={pb.play}
          onStop={pb.stop}
          onSpeed={pb.setSpeed}
          onSkip={() => setSkipView('ask')}
        />
        {guide.goal && (
          <div className="goal-line" role="status" key={guide.goal}>
            <span className="goal-tag">🎯 지금 목표</span> {goalText(guide.goal)}
          </div>
        )}
      </section>
      <section className="panels">
        <nav className="tabs" role="tablist">
          {TABS.filter((t) => guide.tabs.includes(t.id)).map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} className="tab" onClick={() => goto(t.id)}>
              <span className="tab-icon" aria-hidden="true">{TAB_ICON[t.id]}</span><span>{t.label}</span>
              {t.id === 'messages' && unread > 0 && tab !== 'messages' && <span className="tab-badge" aria-label={`새 메시지 ${unread}개`}>{unread > 9 ? '9+' : unread}</span>}
              {!guide.seen.includes(t.id) && tab !== t.id && <span className="tab-new" aria-label="새로 열림">새로</span>}
            </button>
          ))}
        </nav>
        <div className="panel-body">
          <ActivePanel tab={tab} state={pb.state} update={pb.update} onGoto={goto} focusId={focusMsg} />
        </div>
      </section>
      {skipView && (
        <CatchUpModal
          view={skipView}
          state={pb.state}
          onRun={() => setSkipView(pb.skip())}
          onClose={() => setSkipView(null)}
          onGoto={(t) => { setSkipView(null); goto(t); }}
        />
      )}
      {!skipView && pb.pauses[0] && (
        <PauseModal
          reason={pb.pauses[0]}
          state={pb.state}
          now={clockNow}
          onDismiss={pb.dismissPause}
          onGoto={goto}
          onAccept={(id) => pb.update((s) => acceptGroup(s, id))}
          onDecline={(id) => pb.update((s) => declineGroup(s, id))}
        />
      )}
    </main>
  );
}
