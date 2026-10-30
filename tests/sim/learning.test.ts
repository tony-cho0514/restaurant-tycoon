// 배움 장치: 월말 부검 리포트(몫의 합 = 이익 변화), 위기 리포트(미리 있던 재고로 아낀 돈), 도감, 결정 기록.
import { CARD_IDS } from '../../src/content/dexCards';
import { profitOf } from '../../src/sim/ledger';
import { createNewGame } from '../../src/sim/newGame';
import type { NeighborhoodId } from '../../src/sim/neighborhoods';
import { SAVE_KEY, loadGame } from '../../src/sim/save';
import { advanceTickInPlace } from '../../src/sim/tick';
import type { GameState } from '../../src/sim/types';
import { g, midDay } from './gameHelpers';

function playUntil(s: GameState, day: number): GameState {
  const c = structuredClone(s);
  while (c.clock.day < day) advanceTickInPlace(c);
  return c;
}
const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, m }; };

test('월말 부검 리포트: 원인별 몫을 모두 더하면 이익 변화와 원 단위까지 같다', () => {
  for (const id of ['campus', 'office', 'residential'] as NeighborhoodId[]) {
    for (const seed of [3, 8]) {
      const s = playUntil(createNewGame({ seed, neighborhoodId: id, shopName: 'x', nowMs: 0 }), 28 * 5);
      const reports = s.learning.reports;
      expect(reports).toHaveLength(5);
      expect(reports[0].mode).toBe('structure');
      expect(reports[0].parts.reduce((a, p) => a + p.amount, 0)).toBe(reports[0].profit);
      for (const r of reports.slice(1)) {
        expect(r.mode).toBe('change');
        const m = s.ledger.months.find((x) => x.monthIndex === r.monthIndex)!;
        const p = s.ledger.months.find((x) => x.monthIndex === r.monthIndex - 1)!;
        expect(r.profit - r.prevProfit!).toBe(Math.round(profitOf(m)) - Math.round(profitOf(p)));
        expect(r.parts.reduce((a, x) => a + x.amount, 0)).toBe(r.profit - r.prevProfit!);
        for (const x of r.parts) expect(Number.isInteger(x.amount)).toBe(true);
      }
    }
  }
});

test('손익분기점 = 고정비 ÷ 주문당 남는 돈 ÷ 영업일', () => {
  const s = playUntil(g(), 28);
  const k = s.learning.reports[0].kpi;
  expect(k.breakevenPerDay).not.toBeNull();
  expect(k.breakevenPerDay! * k.contribution * k.openDays).toBeCloseTo(k.fixed, 0);
  expect(k.actualPerDay * k.openDays).toBeCloseTo(k.orders, 5);
});

test('치즈 값이 오른 달엔 「재료 시세」 몫이 마이너스이고 모짜렐라 치즈가 원인으로 나온다', () => {
  let s = playUntil(g(), 28);
  s.news.active.push({ type: 'CHEESE_SHORTAGE', untilDay: 200, magnitude: 0.5 });
  s = playUntil(s, 56);
  const part = s.learning.reports[1].parts.find((p) => p.key === 'ingredients')!;
  expect(part.amount).toBeLessThan(0);
  expect(part.detail).toContain('모짜렐라 치즈 더 듦');
});

test('내가 바꾼 결정이 기록되고, 리포트에 앞뒤 일주일 하루 주문이 붙는다', () => {
  let s = playUntil(g(), 9);
  s = { ...s, levers: { ...s.levers, premiumCheese: true }, menuPrices: { ...s.menuPrices, cheese: s.menuPrices.cheese + 2000 } };
  s = playUntil(s, 28);
  const texts = s.learning.decisions.map((d) => d.text);
  expect(texts).toContain('프리미엄 치즈 켬');
  expect(texts.some((t) => t.startsWith('가격 바꿈: 치즈 피자 18,900→20,900원'))).toBe(true);
  const d = s.learning.reports[0].decisions.find((x) => x.kind === 'lever')!;
  expect(d.before).toBeGreaterThan(0);
  expect(d.after).toBeGreaterThan(0);
  // 가격을 바꾸고 일주일 뒤 가격 탄력성 카드
  expect(s.learning.dex.elasticity?.story).toMatch(/피자값을 평균 \+\d+\.\d% 바꾼 뒤 하루 주문이/);
});

test('치즈 파동이 끝나면 위기 리포트: 미리 있던 재고로 아낀 돈과 선매입 카드', () => {
  let s = midDay();
  const day = s.clock.day;
  // 신호를 보고 치즈를 잔뜩 사 둔 상황
  s.inventory = { ...s.inventory, mozzarella: [...s.inventory.mozzarella, { qty: 60, unitCost: s.prices.mozzarella, expiresDay: day + 60 }] };
  s.news.pending.push({ id: 'x', type: 'CHEESE_SHORTAGE', signalDay: day, fireDay: day + 1, real: true, magnitude: 0.5 });
  s = playUntil(s, day + 2);
  expect(s.learning.shocks).toHaveLength(1);
  expect(s.learning.dex.supplyShock?.story).toMatch(/모짜렐라 치즈 값이 하루 만에 \d+% 뛰었어요/);
  const end = s.learning.shocks[0].endDay;
  s = playUntil(s, end + 1);
  const r = s.learning.shockReports.at(-1)!;
  expect(r.type).toBe('CHEESE_SHORTAGE');
  expect(r.extra).toBeGreaterThan(0);
  expect(r.saved).toBeGreaterThan(10_000);
  expect(r.text).toContain('미리 있던 재고 덕분에');
  expect(s.learning.dex.hedging).toBeTruthy();
  expect(s.messages.items.some((m) => m.from === 'book' && m.name === '치즈 파동 리포트')).toBe(true);
});

test('축제가 끝나면 늘어난 주문과 놓친 주문을 알려 준다', () => {
  let s = playUntil(g(), 8);
  s.news.pending.push({ id: 'f', type: 'FESTIVAL', signalDay: 8, fireDay: 9, real: true, magnitude: 0.6 });
  s = playUntil(s, 13);
  const r = s.learning.shockReports.at(-1)!;
  expect(r.type).toBe('FESTIVAL');
  expect(r.text).toMatch(/동네 축제 3일: 평소보다 주문 [+-]?\d+건/);
});

test('도감: 처음 겪을 때 내 숫자로 한 장씩 열리고 메시지가 온다', () => {
  const s1 = playUntil(g(), 1);
  expect(s1.learning.dex.revenueProfit?.story).toMatch(/오늘 매출은 [\d,]+원/);
  expect(s1.learning.dex.laborCost?.story).toMatch(/시간 × 시급 [\d,]+원/);
  expect(s1.messages.items.some((m) => m.from === 'book' && m.text.includes('매출과 이익'))).toBe(true);
  const s28 = playUntil(s1, 28);
  for (const id of ['fixedVariable', 'contribution', 'breakeven', 'costRate'] as const) expect(s28.learning.dex[id]).toBeTruthy();
  // 한 번 연 카드는 다시 열리지 않는다
  const once = s28.messages.items.filter((m) => m.from === 'book' && m.text.includes('매출과 이익'));
  expect(once).toHaveLength(1);
  expect(CARD_IDS).toHaveLength(20);
});

test('배움 기록 없는 옛 저장도 열린다', () => {
  const raw = JSON.parse(JSON.stringify(playUntil(g(), 3))); delete raw.learning;
  for (const d of raw.ledger.days) { delete d.used; delete d.paid; delete d.groupRevenue; }
  const st = mem(); st.setItem(SAVE_KEY, JSON.stringify(raw));
  const loaded = loadGame(st)!;
  expect(loaded).not.toBeNull();
  expect(loaded.learning.reports).toEqual([]);
  expect(loaded.ledger.days[0].groupRevenue).toBe(0);
  const later = playUntil(loaded, 30);
  expect(later.learning.reports).toHaveLength(1);
});
