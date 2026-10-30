// 사이드 메시지: 리뷰·요청·알바 카톡·거래처 귀띔이 실제 계산에서 나오고, 큰일만 멈춘다.
import { fromNews, reviewTopic, absenceMessages, type ReviewSeed } from '../../src/sim/messages';
import { createNewGame } from '../../src/sim/newGame';
import type { NeighborhoodId } from '../../src/sim/neighborhoods';
import { emptyInventory } from '../../src/sim/inventory';
import { SAVE_KEY, loadGame } from '../../src/sim/save';
import { Rng } from '../../src/sim/rng';
import { advanceTick, advanceTickInPlace, pausesFor } from '../../src/sim/tick';
import type { GameState } from '../../src/sim/types';
import { g, midDay } from './gameHelpers';

function playDays(s: GameState, n: number): GameState {
  const s2 = structuredClone(s);
  const end = s2.clock.day + n;
  while (s2.clock.day < end) advanceTickInPlace(s2);
  return s2;
}
const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, m }; };

test('하루에 메시지가 3~8개쯤 온다(동네마다 4주 평균)', () => {
  for (const id of ['campus', 'office', 'residential'] as NeighborhoodId[]) {
    const s = playDays(createNewGame({ seed: 11, neighborhoodId: id, shopName: 'x', nowMs: 0 }), 28);
    const perDay = s.messages.items.filter((m) => m.day >= 1).length / 27;
    expect(perDay).toBeGreaterThanOrEqual(3);
    expect(perDay).toBeLessThanOrEqual(8);
    expect(s.messages.items.some((m) => m.from === 'review')).toBe(true);
  }
});

test('리뷰 주제는 만족도를 실제로 깎은 이유에서 나온다', () => {
  const s = g(); const rng = new Rng(1);
  const ctx = { priceIndex: 1, hallBonus: 0, mood: 0 };
  const seed = (x: Partial<ReviewSeed>): ReviewSeed => ({ ch: 'delivery', sat: 1.6, wait: 35, pizza: 'cheese', gaveCola: false, ...x });
  expect(reviewTopic(seed({ wait: 80 }), ctx, s, rng)).toBe('cold');
  expect(reviewTopic(seed({ wait: 50 }), ctx, s, rng)).toBe('slow');
  expect(reviewTopic(seed({ ch: 'hall', wait: 30 }), ctx, s, rng)).toBe('slow');
  expect(reviewTopic(seed({}), { ...ctx, priceIndex: 1.4 }, s, rng)).toBe('price');
  expect(reviewTopic(seed({ ch: 'hall', wait: 15 }), { ...ctx, mood: -0.15 }, s, rng)).toBe('tired');
  // 좋은 리뷰는 켜 둔 운영 수단을 칭찬한다
  const cheese = { ...s, levers: { ...s.levers, premiumCheese: true } };
  const topics = new Set(Array.from({ length: 40 }, () => reviewTopic(seed({ sat: 4.8, wait: 40 }), ctx, cheese, rng)));
  expect(topics.has('cheese')).toBe(true);
  expect(topics.has('cola')).toBe(false);
});

test('가격을 크게 올리면 「비싸요」 리뷰가 온다', () => {
  const base = createNewGame({ seed: 5, neighborhoodId: 'campus', shopName: 'x', nowMs: 0 });
  const pricey = structuredClone(base);
  for (const k of Object.keys(pricey.menuPrices) as (keyof GameState['menuPrices'])[]) pricey.menuPrices[k] = Math.round(pricey.menuPrices[k] * 1.6);
  const count = (s: GameState) => s.messages.items.filter((m) => m.topic === 'price').length;
  expect(count(playDays(base, 28))).toBe(0);
  expect(count(playDays(pricey, 28))).toBeGreaterThan(0);
});

test('메시지는 장사 결과(돈·평점·난수)를 바꾸지 않는다', () => {
  const a = midDay();
  const b = structuredClone(a);
  // 지난 메시지가 달라 같은 알림을 거르는 결과가 달라도
  b.messages.items = [];
  const ra = playDays(a, 14); const rb = playDays(b, 14);
  expect(rb.cash).toBe(ra.cash);
  expect(rb.ratings).toEqual(ra.ratings);
  expect(rb.rngState).toBe(ra.rngState);
  // 같은 상태에서는 같은 메시지
  expect(playDays(a, 14).messages.items.map((m) => m.text)).toEqual(ra.messages.items.map((m) => m.text));
});

test('위기 신호는 멈추지 않고 거래처 귀띔으로, 실제로 터지면 멈춘다', () => {
  const signal = { id: 'n42', day: 3, kind: 'signal' as const, headline: '[산업] 치즈 수급 비상 우려', body: '치즈 값이 오를 수 있다.', important: true, tone: 'bad' as const, shockType: 'CHEESE_SHORTAGE' as const };
  const m = fromNews(signal, 11);
  expect(m.from).toBe('supplier');
  expect(m.important).toBe(true);
  expect(m.action).toBe('inventory');
  expect(m.text).not.toMatch(/\d/);
  expect(m.detail).toContain('치즈 수급 비상 우려');
  expect(pausesFor(signal)).toBe(false);
  expect(pausesFor({ ...signal, kind: 'fire' })).toBe(true);

  const s = g(); s.news.pending.push({ id: 'x', type: 'CHEESE_SHORTAGE', signalDay: 0, fireDay: 1, real: true, magnitude: 0.4 });
  let r = advanceTick(s);
  while (r.state.clock.day < 1 || r.state.openedDay < 1) r = advanceTick(r.state);
  expect(r.pauses.some((p) => p.kind === 'news')).toBe(true);
  // 터진 소식은 뉴스나 거래처 말로 온다(문구 틀에 따라)
  expect(r.state.messages.items.some((x) => x.day === 1 && x.shockType === 'CHEESE_SHORTAGE' && (x.from === 'news' || x.from === 'supplier'))).toBe(true);
});

test('작은 소식(단체 주문 실패)은 멈추지 않고 중요한 말풍선으로 온다', () => {
  let s = midDay();
  s.groupOrders = [{ id: 99, title: '동아리 MT', dueDay: s.clock.day, dueHour: 9, items: [{ menu: 'cheese', qty: 5 }], discount: 0.1, expiresDay: s.clock.day }];
  const d = s.clock.day; let paused = false;
  while (s.clock.day === d) { const r = advanceTick(s); s = r.state; paused ||= r.pauses.some((p) => p.kind === 'news'); }
  expect(paused).toBe(false);
  expect(s.messages.items.some((m) => m.from === 'group' && m.important && m.tone === 'bad')).toBe(true);
});

test('결근한 알바는 카톡으로 알린다', () => {
  const s = structuredClone(g());
  s.absentToday = [s.staff[0].id];
  absenceMessages(s);
  const m = s.messages.items.at(-1)!;
  expect(m.from).toBe('staff');
  expect(m.name).toBe(s.staff[0].name);
  expect(m.action).toBe('staff');
});

test('재료가 떨어지면 그날 한 번만 알린다', () => {
  let s = midDay();
  s.inventory = { ...s.inventory, mozzarella: emptyInventory().mozzarella };
  for (let i = 0; i < 4; i++) s = advanceTick(s).state;
  const out = s.messages.items.filter((m) => m.key === 'out-mozzarella');
  expect(out).toHaveLength(1);
  expect(out[0].action).toBe('inventory');
  expect(out[0].important).toBe(true);
});

test('마감 때 오늘 장사를 한 줄로 정리한다', () => {
  const s = playDays(g(), 2);
  const wrap = s.messages.items.filter((m) => m.from === 'owner' && m.text.includes('매출'));
  expect(wrap.length).toBeGreaterThanOrEqual(2);
  expect(wrap[0].text).toMatch(/주문 \d+건/);
});

test('메시지 없는 옛 저장도 열리고, 지난 뉴스가 메시지로 들어온다', () => {
  const raw = JSON.parse(JSON.stringify(playDays(g(), 3))); delete raw.messages;
  const st = mem(); st.setItem(SAVE_KEY, JSON.stringify(raw));
  const loaded = loadGame(st)!;
  expect(loaded).not.toBeNull();
  expect(loaded.messages.items.length).toBeGreaterThan(0);
  expect(loaded.messages.items.some((m) => m.text.includes('개업'))).toBe(true);
  expect(loaded.messages.nextId).toBeGreaterThan(loaded.messages.items.at(-1)!.id);
});
