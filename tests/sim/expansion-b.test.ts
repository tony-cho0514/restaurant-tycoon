// 확장 2차: 배달 구역, 새 메뉴, 저장 v3
import { NEIGHBORHOODS } from '../../src/sim/neighborhoods';
import { zoneStats } from '../../src/sim/orders';
import { developMenu, setMenuActive, MENU_DEV_COST } from '../../src/sim/menuDev';
import { orderMix } from '../../src/sim/demand';
import { SAVE_KEY, loadGame } from '../../src/sim/save';
import { advanceTick } from '../../src/sim/tick';
import type { GameState } from '../../src/sim/types';
import { defaultMenuPrices } from './helpers';
import { g } from './gameHelpers';

function playDay(s: GameState): GameState { const d = s.clock.day; while (s.clock.day === d) s = advanceTick(s).state; return s; }
const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, m }; };

test('동네마다 배달 구역이 있고 비중 합은 1', () => {
  for (const n of Object.values(NEIGHBORHOODS)) {
    expect(n.zones.length).toBeGreaterThanOrEqual(4);
    expect(n.zones.reduce((a, z) => a + z.share, 0)).toBeCloseTo(1);
  }
});

test('배달 주문마다 구역과 배달 시간이 남고, 구역 통계 합이 배달 주문 수와 같다', () => {
  const s = playDay(g());
  const del = s.orders.filter((o) => o.channel === 'delivery');
  expect(del.every((o) => typeof o.zone === 'string' && typeof o.minutes === 'number')).toBe(true);
  const stats = zoneStats(s.orders, NEIGHBORHOODS.campus);
  expect(stats.reduce((a, z) => a + z.count, 0)).toBe(del.length);
  const far = stats.find((z) => z.name === '오피스텔')!; const near = stats.find((z) => z.name === '원룸촌')!;
  if (far.count && near.count) expect(far.avgMinutes).toBeGreaterThan(near.avgMinutes);
});

test('새 메뉴를 개발하면 판매가 시작되고 개발비가 나간다', () => {
  const s = g(); const r = developMenu(s, 'goguma');
  expect(r.menuActive.goguma).toBe(true);
  expect(r.cash).toBe(s.cash - MENU_DEV_COST - (r.today.purchases - s.today.purchases));
  expect(r.today.purchases).toBeGreaterThan(s.today.purchases); // 고구마무스를 사흘치 같이 들여옴
  expect(() => developMenu(r, 'goguma')).toThrow();
});

test('판매하지 않는 메뉴는 주문이 들어오지 않는다', () => {
  const s = playDay(g());
  expect(s.orders.some((o) => o.items.some((i) => i.menu === 'potato' || i.menu === 'goguma'))).toBe(false);
});

test('주택가는 고구마를, 오피스는 불고기를 더 좋아한다', () => {
  const p = defaultMenuPrices();
  const all = { cheese: true, pepperoni: true, combo: true, potato: true, bulgogi: true, goguma: true, hawaiian: true, cola: true };
  const res = orderMix(p, 1, 1, 'normal', all, NEIGHBORHOODS.residential.prefs);
  expect(res.goguma).toBeGreaterThan(res.hawaiian);
  const off = orderMix(p, 1, 1, 'normal', all, NEIGHBORHOODS.office.prefs);
  expect(off.bulgogi).toBeGreaterThan(off.goguma);
});

test('피자를 전부 내릴 수는 없다', () => {
  let s = g(); s = setMenuActive(s, 'cheese', false); s = setMenuActive(s, 'pepperoni', false);
  expect(() => setMenuActive(s, 'combo', false)).toThrow();
});

test('버전 2 저장은 버전 3으로 옮겨지고 새 필드가 채워진다', () => {
  const st = mem(); const s = g() as unknown as Record<string, unknown>;
  const v2: Record<string, unknown> = { ...s, version: 2 };
  for (const k of ['menuActive', 'menuDeveloped', 'staff', 'applicants', 'jobPost', 'upgrades', 'groupOffers', 'groupOrders', 'nextStaffId']) delete v2[k];
  const prices = { ...(s.prices as Record<string, number>) }; for (const k of ['potato', 'bulgogi', 'sweetPotato', 'pineapple', 'ham']) delete prices[k];
  v2.prices = prices;
  st.m.set(SAVE_KEY, JSON.stringify(v2));
  const back = loadGame(st)!;
  expect(back.version).toBe(3);
  expect(back.menuActive.cheese).toBe(true); expect(back.menuActive.goguma).toBe(false);
  expect(back.prices.potato).toBeGreaterThan(0); expect(back.staff).toHaveLength(1);
  expect(back.upgrades.tables).toBe(1);
});
