// 첫 10분 안내: 처음엔 탭 세 개만 보이고, 나머지는 필요해질 때 하나씩 열린다. 첫 주엔 「지금 목표」 한 줄이 따라다닌다.
// 장사 계산(돈·평점·난수)은 건드리지 않는다. 화면에 보일 것과 메시지만 바꾼다.
import { profitOf } from './ledger';
import { OWNER_NAME, pushMessage, type MessageAction } from './messages';
import type { GameState } from './types';

export type TabKey = 'status' | 'sales' | 'menu' | 'inventory' | 'staff' | 'shop' | 'levers' | 'ledger' | 'messages' | 'learn';
export const ALL_TABS: TabKey[] = ['status', 'sales', 'menu', 'inventory', 'staff', 'shop', 'levers', 'ledger', 'messages', 'learn'];
export const START_TABS: TabKey[] = ['status', 'menu', 'messages'];

export type GoalId = 'start' | 'close' | 'menu' | 'reply' | 'week';

export interface GuideState {
  /** 열린 탭 */
  tabs: TabKey[];
  /** 한 번이라도 눌러 본 탭(새로 열린 탭 표시용) */
  seen: TabKey[];
  /** 지금 목표(첫 주 안내가 끝나면 null) */
  goal: GoalId | null;
}

export function initialGuide(): GuideState {
  return { tabs: [...START_TABS], seen: ['status'], goal: 'start' };
}

/** 옛 저장: 이미 하던 사람은 모든 탭이 열린 채로, 목표 줄 없이 */
export function finishedGuide(): GuideState {
  return { tabs: [...ALL_TABS], seen: [...ALL_TABS], goal: null };
}

interface Unlock { tab: TabKey; when: (s: GameState) => boolean; text: string }

/** 탭이 열리는 때와 그때 사장님 혼잣말(왜 지금 열렸는지). 첫 이틀은 탭을 늘리지 않는다(그 전 귀띔은 메시지의 바로 가기로 연다).
 *  사장님 혼잣말은 늘 반말, 화면 안내는 해요체. */
const UNLOCKS: Unlock[] = [
  { tab: 'sales', when: (s) => s.clock.day >= 1, text: '첫날 장사 끝! 「매출·주문」에서 어제 들어온 주문을 시간대별로 볼 수 있겠다.' },
  { tab: 'shop', when: (s) => s.clock.day >= 3 || s.owner.stress >= 40, text: '슬슬 몸이 무겁다… 「가게」에서 영업시간·쉬는 날·업그레이드를 정할 수 있다.' },
  { tab: 'inventory', when: (s) => s.clock.day >= 4 || (s.clock.day >= 2 && s.messages.items.some((m) => m.action === 'inventory' && m.key !== 'tab-inventory')), text: '재료는 정해 둔 규칙대로 알아서 발주되고 있었다. 「재고」에서 언제·얼마나 살지 바꿀 수 있다.' },
  { tab: 'staff', when: (s) => s.clock.day >= 5 || s.today.lostOrders >= 3, text: '일손이 모자라면 주문을 놓친다. 「직원」에서 알바를 뽑거나 근무 시간을 바꿀 수 있다.' },
  { tab: 'ledger', when: (s) => s.clock.day >= 7, text: '첫 주 마감! 「장부」에 한 주 동안 들어오고 나간 돈이 다 적혀 있다.' },
  { tab: 'levers', when: (s) => s.clock.day >= 9, text: '가게가 자리를 잡았다. 「운영 수단」에서 치즈·광고·서비스 같은 방법을 켜고 끌 수 있다. 비용은 미리 보이고, 효과는 해 봐야 안다.' },
  { tab: 'learn', when: (s) => s.learning.reports.length > 0 || s.clock.day >= 14, text: '「배움」이 열렸다. 겪은 경영 개념이 내 숫자로 카드에 쌓이고, 달마다 부검 리포트가 온다.' },
];

interface Goal { id: GoalId; text: string; done: (s: GameState) => boolean; skipFrom?: number }

/** 첫 주 목표: 하나씩 차례로. 못 해도 그날이 지나면 넘어간다(막히는 목표는 없다). */
export const GOALS: Goal[] = [
  { id: 'start', text: '▶ 재생을 눌러 첫 영업을 시작해요', done: (s) => s.clock.day > 0 || s.clock.hour > s.settings.openHour },
  { id: 'close', text: '첫날 마감까지 가 봐요. 문을 닫으면 오늘 장사를 한 줄로 정리해 줘요', done: (s) => s.clock.day >= 1 },
  { id: 'menu', text: '🍕 메뉴에서 피자 한 판에 얼마가 남는지 봐요', done: (s) => s.guide.seen.includes('menu'), skipFrom: 4 },
  { id: 'reply', text: '💬 답장을 기다리는 메시지에 답해 봐요', done: (s) => s.messages.items.some((m) => m.reply && m.reply.id !== 'auto'), skipFrom: 6 },
  { id: 'week', text: '첫 주를 흑자로 마감해요', done: (s) => s.clock.day >= 7 },
];

export function goalText(id: GoalId): string {
  return GOALS.find((g) => g.id === id)!.text;
}

/** 탭 열기·목표 넘기기. 바뀐 게 없으면 같은 객체를 그대로 돌려준다(화면 갱신 없이). */
export function checkGuide(s0: GameState): GameState {
  let s = s0;
  const edit = () => {
    if (s === s0) s = { ...s0, guide: { ...s0.guide, tabs: [...s0.guide.tabs] } };
    return s;
  };
  for (const u of UNLOCKS) {
    if (s.guide.tabs.includes(u.tab) || !u.when(s)) continue;
    edit().guide.tabs.push(u.tab);
    pushMessage(s, { from: 'owner', name: OWNER_NAME, text: u.text, tone: 'neutral', important: true, action: actionOf(u.tab), key: `tab-${u.tab}` });
  }
  while (s.guide.goal) {
    const i = GOALS.findIndex((g) => g.id === s.guide.goal);
    const goal = GOALS[i];
    if (!goal.done(s) && !(goal.skipFrom !== undefined && s.clock.day >= goal.skipFrom)) break;
    if (goal.id === 'week') weekResult(edit());
    edit().guide.goal = GOALS[i + 1]?.id ?? null;
  }
  return s;
}

/** 탭을 눌렀을 때: 아직 안 열렸어도(메시지·멈춤 창의 바로 가기) 연다 */
export function openTab(s0: GameState, tab: TabKey): GameState {
  if (s0.guide.tabs.includes(tab) && s0.guide.seen.includes(tab)) return s0;
  const tabs = s0.guide.tabs.includes(tab) ? s0.guide.tabs : [...s0.guide.tabs, tab];
  const seen = s0.guide.seen.includes(tab) ? s0.guide.seen : [...s0.guide.seen, tab];
  return checkGuide({ ...s0, guide: { ...s0.guide, tabs, seen } });
}

/** 설정의 「탭 모두 보기」: 안내 없이 바로 전부 */
export function showAllTabs(s: GameState): GameState {
  return { ...s, guide: { tabs: [...ALL_TABS], seen: [...new Set([...s.guide.seen, ...ALL_TABS])], goal: s.guide.goal } };
}

const actionOf = (tab: TabKey): MessageAction | undefined =>
  (['menu', 'inventory', 'levers', 'shop', 'staff', 'ledger', 'learn', 'sales'] as TabKey[]).includes(tab) ? (tab as MessageAction) : undefined;

function weekResult(s: GameState) {
  const week = s.ledger.days.filter((d) => d.day < 7);
  const profit = Math.round(week.reduce((a, d) => a + profitOf(d), 0));
  const won = Math.abs(profit).toLocaleString('ko-KR');
  pushMessage(s, {
    from: 'owner', name: OWNER_NAME, tone: profit >= 0 ? 'good' : 'bad', important: true, action: 'ledger', key: 'first-week',
    text: profit >= 0
      ? `첫 주 결산: ${won}원 남았다 🎉 이제부턴 내 방식대로 해 보자!`
      : `첫 주 결산: ${won}원 적자다. 장부에서 어디서 샜는지 찾아봐야겠다.`,
  });
}
