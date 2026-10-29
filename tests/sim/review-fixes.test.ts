// 전체 검토에서 나온 지적을 고정하는 회귀 테스트
import { APP_ADS_WEEKLY } from '../../src/sim/balance';
import { initialEconomy, stepEconomyWeek, type Economy } from '../../src/sim/economy';
import { expectedOrders, orderMix } from '../../src/sim/demand';
import { createNewGame } from '../../src/sim/newGame';
import { NEIGHBORHOODS } from '../../src/sim/neighborhoods';
import { planWeek, fireDue, type NewsState } from '../../src/sim/news';
import { satisfaction } from '../../src/sim/ratings';
import { Rng } from '../../src/sim/rng';
import { BACKUP_KEY, SAVE_KEY, exportSave, importSave, loadGame, saveGame } from '../../src/sim/save';
import { advanceTick, advanceTickInPlace } from '../../src/sim/tick';
import { profitOf } from '../../src/sim/ledger';
import { allOff, defaultMenuPrices } from './helpers';
import { g } from './gameHelpers';

const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, m }; };

test('배달앱 광고비는 켜 둔 날만큼 하루씩 나간다(일요일에 꺼도 공짜가 아님)', () => {
  let s = g(); s.levers.appAds = true;
  for (let i = 0; i < 6 * 11; i++) s = advanceTick(s).state;
  s.levers.appAds = false;
  for (let i = 0; i < 11; i++) s = advanceTick(s).state;
  const ads = s.ledger.days.reduce((a, d) => a + d.ads, 0);
  expect(ads).toBe(6 * Math.round(APP_ADS_WEEKLY / 7));
});

test('서비스 콜라를 실제로 못 줬으면 만족도 효과도 없다', () => {
  const ctx = { wait: 35, priceIndex: 1, priceSensitivity: 1 };
  const without = satisfaction('delivery', { ...ctx, levers: allOff() }, new Rng(5));
  const notGiven = satisfaction('delivery', { ...ctx, levers: { ...allOff(), freeCola: true }, gaveCola: false }, new Rng(5));
  const given = satisfaction('delivery', { ...ctx, levers: { ...allOff(), freeCola: true }, gaveCola: true }, new Rng(5));
  expect(notGiven).toBe(without); expect(given).toBeGreaterThan(without);
});

test('불황에는 비싼 메뉴부터 덜 팔리고, 호황에는 반대', () => {
  const p = defaultMenuPrices();
  const rec = orderMix(p, 1, 1, 'recession'); const boom = orderMix(p, 1, 1, 'boom'); const norm = orderMix(p, 1, 1, 'normal');
  expect(rec.combo).toBeLessThan(norm.combo); expect(rec.cheese).toBeGreaterThan(norm.cheese);
  expect(boom.combo).toBeGreaterThan(norm.combo); expect(boom.cheese).toBeLessThan(norm.cheese);
});

test('호황에는 가격을 올려도 손님이 덜 빠진다', () => {
  const econ = (cycle: Economy['cycle']) => ({ cycle, cycleWeeksLeft: 30, fx: 1350, inflation: 1, minWage: 10030, pendingMinWage: null, weather: 'sunny' }) as Economy;
  const up = Object.fromEntries(Object.entries(defaultMenuPrices()).map(([k, v]) => [k, v * 1.2])) as ReturnType<typeof defaultMenuPrices>;
  const ratio = (cycle: Economy['cycle']) => {
    const base = { n: NEIGHBORHOODS.campus, hour: 18, isWeekend: false, ratings: { hall: 4.5, delivery: 4.5 }, levers: allOff(), shock: { hall: 1, delivery: 1 } };
    const a = expectedOrders({ ...base, economy: econ(cycle), menuPrices: up }); const b = expectedOrders({ ...base, economy: econ(cycle), menuPrices: defaultMenuPrices() });
    return (a.hall + a.delivery) / (b.hall + b.delivery);
  };
  expect(ratio('boom')).toBeGreaterThan(ratio('normal'));
});

test('형태만 흉내 낸 저장 파일은 거절한다', () => {
  const shallow = { version: 1, cash: 1, clock: { day: 0, hour: 11 }, ledger: {}, news: {} };
  expect(() => importSave(JSON.stringify({ app: 'restaurant-tycoon', version: 1, state: shallow }))).toThrow('저장 파일이 손상됐어요');
});

test('본 저장이 형태만 맞고 속이 망가졌으면 백업에서', () => {
  const st = mem(); const a = g(); saveGame(a, st); saveGame(advanceTick(a).state, st);
  st.m.set(SAVE_KEY, JSON.stringify({ version: 1, cash: 1, clock: { day: 0, hour: 11 }, ledger: {}, news: {} }));
  expect(loadGame(st)).toEqual(a);
  expect(st.m.get(BACKUP_KEY)).toBeTruthy();
});

test('불러온 충전값은 0~231로 묶인다', () => {
  const s = g(); s.charge = { ticks: 999, lastAccruedAt: 9e15 };
  expect(importSave(exportSave(s, 0)).charge.ticks).toBe(231);
  s.charge = { ticks: -5, lastAccruedAt: 0 };
  expect(importSave(exportSave(s, 0)).charge.ticks).toBe(0);
});

test('같은 종류의 사건은 진행 중일 때 또 겹치지 않는다', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const r = new Rng(seed); let econ = initialEconomy(r); let ns: NewsState = { pending: [], active: [], items: [], nextId: 1 };
    for (let d = 0; d < 104 * 7; d++) {
      if (d % 7 === 0) { econ = stepEconomyWeek(econ, r); ({ news: ns, economy: econ } = planWeek(ns, econ, d, r, '새내기길')); }
      ({ news: ns, economy: econ } = fireDue(ns, econ, d, r, '새내기길'));
      const live = ns.active.filter((a) => a.untilDay >= d).map((a) => a.type);
      expect(new Set(live).size).toBe(live.length);
    }
  }
});

test('프리미엄 치즈가 어느 동네에서나 정답은 아니다(적어도 한 동네에선 손해)', () => {
  const yearProfit = (id: 'campus' | 'office' | 'residential', premium: boolean) => {
    let sum = 0;
    for (let seed = 1; seed <= 3; seed++) {
      const s = createNewGame({ seed, neighborhoodId: id, shopName: 't', nowMs: 0 }); s.levers.premiumCheese = premium;
      for (let i = 0; i < 12 * 28 * 11; i++) advanceTickInPlace(s);
      sum += s.ledger.months.reduce((a, m) => a + profitOf(m), 0);
    }
    return sum;
  };
  const losers = (['campus', 'office', 'residential'] as const).filter((id) => yearProfit(id, true) < yearProfit(id, false));
  expect(losers.length).toBeGreaterThan(0);
}, 300_000);
