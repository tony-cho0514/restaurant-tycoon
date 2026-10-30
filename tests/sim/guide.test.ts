// 첫 10분 안내: 탭은 필요해질 때 하나씩 열리고, 첫 주엔 목표 한 줄이 따라다닌다. 장사 결과는 바꾸지 않는다.
import { ALL_TABS, START_TABS, finishedGuide, openTab } from '../../src/sim/guide';
import { SAVE_KEY, loadGame } from '../../src/sim/save';
import { advanceTickInPlace } from '../../src/sim/tick';
import type { GameState } from '../../src/sim/types';
import { g } from './gameHelpers';

function playUntil(s: GameState, day: number): GameState {
  const c = structuredClone(s);
  while (c.clock.day < day) advanceTickInPlace(c);
  return c;
}
const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); } }; };

test('개업 직후엔 현황·메뉴·메시지 세 탭과 첫 목표만 보인다', () => {
  const s = g();
  expect(s.guide.tabs).toEqual(START_TABS);
  expect(s.guide.goal).toBe('start');
});

test('첫 주 동안 탭이 하나씩 열리고, 열릴 때마다 사장님이 왜 열렸는지 말한다', () => {
  const day1 = playUntil(g(), 1);
  expect(day1.guide.tabs).toContain('sales');
  expect(day1.guide.tabs).not.toContain('ledger');
  // 첫날 넘긴 직후엔 매출·주문 하나만 늘어난다(한꺼번에 열리지 않게)
  expect(day1.guide.tabs).toEqual([...START_TABS, 'sales']);
  expect(day1.messages.items.some((m) => m.key === 'tab-sales' && m.action === 'sales')).toBe(true);

  const week = playUntil(g(), 9);
  for (const t of ['sales', 'shop', 'inventory', 'staff', 'ledger', 'levers'] as const) expect(week.guide.tabs).toContain(t);
  // 같은 탭을 두 번 알리지 않는다
  expect(week.messages.items.filter((m) => m.key === 'tab-ledger')).toHaveLength(1);
});

test('첫 주 목표는 차례로 넘어가고, 못 한 목표는 기한이 지나면 넘어가며, 첫 주 결산으로 끝난다', () => {
  let s = playUntil(g(), 1);
  expect(s.guide.goal).toBe('menu');
  s = openTab(s, 'menu');
  expect(s.guide.goal).toBe('reply');
  s = playUntil(s, 7);
  expect(s.guide.goal).toBeNull();
  const result = s.messages.items.find((m) => m.key === 'first-week')!;
  expect(result.text).toMatch(/^첫 주 결산: [\d,]+원 (남았다|적자다)/);
  expect(result.action).toBe('ledger');
});

test('안내는 장사 결과(돈·평점·난수)를 바꾸지 않는다', () => {
  const a = playUntil(g(), 20);
  const b = playUntil({ ...g(), guide: finishedGuide() }, 20);
  expect(b.cash).toBe(a.cash);
  expect(b.ratings).toEqual(a.ratings);
  expect(b.rngState).toBe(a.rngState);
});

test('아직 안 열린 탭도 바로 가기로 가면 열리고 「새로」 표시가 지워진다', () => {
  const s = openTab(g(), 'learn');
  expect(s.guide.tabs).toContain('learn');
  expect(s.guide.seen).toContain('learn');
  expect(openTab(s, 'learn')).toBe(s);
});

test('안내 기록이 없는 옛 저장은 모든 탭이 열린 채로, 목표 없이 열린다', () => {
  const raw = JSON.parse(JSON.stringify(g())); delete raw.guide;
  const st = mem(); st.setItem(SAVE_KEY, JSON.stringify(raw));
  const loaded = loadGame(st)!;
  expect(loaded.guide.tabs).toEqual(ALL_TABS);
  expect(loaded.guide.goal).toBeNull();
});
