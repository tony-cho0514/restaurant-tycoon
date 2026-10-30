// 확장 검토에서 나온 지적을 고정하는 회귀 테스트
import { SAVE_KEY, loadGame } from '../../src/sim/save';
import { advanceTick, advanceTickInPlace, playTick, tickCost } from '../../src/sim/tick';
import { createNewGame } from '../../src/sim/newGame';
import { profitOf } from '../../src/sim/ledger';
import { acceptGroup, morningGroupOffers, groupFeasible } from '../../src/sim/groupOrders';
import { Rng } from '../../src/sim/rng';
import { calendar } from '../../src/sim/time';
import { hire } from '../../src/sim/staffing';
import { developMenu } from '../../src/sim/menuDev';
import { hallSeatCap } from '../../src/sim/upgradeOps';
import type { GameState } from '../../src/sim/types';
import { g } from './gameHelpers';

const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, m }; };

/** 진짜 옛 저장 모양: v3 필드도, 하루 기록의 새 숫자 필드도 없다 */
function oldSave(version: 1 | 2): string {
  let s = g(); for (let i = 0; i < 3 * 11; i++) s = advanceTick(s).state;
  const raw = JSON.parse(JSON.stringify(s)) as Record<string, any>;
  const strip = (r: Record<string, unknown>) => { delete r.investment; if (version === 1) delete r.cardFees; };
  strip(raw.today); raw.ledger.days.forEach(strip); raw.ledger.months.forEach(strip);
  for (const k of ['menuActive', 'menuDeveloped', 'staff', 'applicants', 'jobPost', 'upgrades', 'groupOffers', 'groupOrders', 'nextStaffId', 'absentToday']) delete raw[k];
  if (version === 1) for (const k of ['settings', 'orders', 'openedDay']) delete raw[k];
  raw.version = version;
  return JSON.stringify(raw);
}

for (const v of [1, 2] as const) {
  test(`버전 ${v} 저장으로 이어 해도 장부에 NaN이 안 생긴다`, () => {
    const st = mem(); st.m.set(SAVE_KEY, oldSave(v));
    const s = loadGame(st)!;
    for (let i = 0; i < 28 * 11; i++) advanceTickInPlace(s);
    for (const m of s.ledger.months) expect(Number.isFinite(profitOf(m))).toBe(true);
    expect(Number.isFinite(profitOf(s.today))).toBe(true);
  });
}

test('이미 NaN이 들어간 기록도 불러올 때 0으로 고친다', () => {
  const raw = JSON.parse(oldSave(2)); raw.ledger.days[0].investment = null; raw.today.cardFees = 'x';
  const st = mem(); st.m.set(SAVE_KEY, JSON.stringify(raw));
  const s = loadGame(st)!;
  expect(s.ledger.days[0].investment).toBe(0); expect(s.today.cardFees).toBe(0);
});

test('영업 중에 오늘을 휴무로 바꿔도 남은 영업은 충전을 쓴다', () => {
  let s = g(); s = advanceTick(s).state; // 0일 개점함
  s.settings = { ...s.settings, closedDay: calendar(s.clock).dayOfWeek };
  expect(tickCost(s)).toBeCloseTo(1);
  const before = s.charge.ticks; s = playTick(s, 0)!.state;
  expect(before - s.charge.ticks).toBeCloseTo(1);
});

test('단체 주문 제안은 영업일·영업시간 안이고, 만들 수 있는 판 수다', () => {
  for (const id of ['campus', 'office', 'residential'] as const) {
    for (let seed = 1; seed <= 40; seed++) {
      const s = createNewGame({ seed, neighborhoodId: id, shopName: 't', nowMs: 0 });
      s.settings = { ...s.settings, closeHour: 20, closedDay: 5 };
      const r = morningGroupOffers(s, new Rng(seed * 7919));
      for (const o of r.state.groupOffers) {
        expect(o.dueHour).toBeGreaterThanOrEqual(s.settings.openHour + 1); expect(o.dueHour).toBeLessThan(s.settings.closeHour);
        expect(calendar({ day: o.dueDay, hour: 11 }).dayOfWeek).not.toBe(5);
        expect(groupFeasible(r.state, o).maxPizzas).toBeGreaterThanOrEqual(o.items.reduce((a, i) => a + i.qty, 0));
      }
    }
  }
});

test('오는 단체 주문을 다 받아도 대부분 지킨다', () => {
  let ok = 0, all = 0;
  for (const id of ['campus', 'office', 'residential'] as const) {
    for (let seed = 1; seed <= 3; seed++) {
      let s = createNewGame({ seed, neighborhoodId: id, shopName: 't', nowMs: 0 });
      for (let i = 0; i < 8 * 7 * 11; i++) {
        const r = advanceTick(s); s = r.state;
        for (const p of r.pauses) if (p.kind === 'groupOffer') s = acceptGroup(s, p.offerId);
      }
      for (const n of s.news.items) if (n.headline.startsWith('[단체]') && /배달 완료/.test(n.headline)) ok++;
      for (const n of s.news.items) if (n.headline.startsWith('[단체]') && /(배달 완료|만 보냈어요|못 지켰어요)/.test(n.headline)) all++;
    }
  }
  expect(all).toBeGreaterThan(3); expect(ok / all).toBeGreaterThan(0.7);
}, 120_000);

test('단체 주문도 판당 기타 비용·사용량·주문 수가 장부에 잡힌다', () => {
  const offer = { id: 77, title: '테스트', dueDay: 1, dueHour: 13, items: [{ menu: 'cheese' as const, qty: 4 }], discount: 0, expiresDay: 1 };
  let s = acceptGroup({ ...g(), groupOffers: [offer] }, 77);
  while (!(s.clock.day === 2)) s = advanceTick(s).state;
  const d = s.ledger.days[1];
  expect(d.groupOrders).toBe(1);
  expect(d.usage.mozzarella).toBeGreaterThan(0);
});

test('만료된 단체 주문 제안은 받을 수 없다', () => {
  const offer = { id: 77, title: '테스트', dueDay: 5, dueHour: 13, items: [{ menu: 'cheese' as const, qty: 4 }], discount: 0, expiresDay: 0 };
  let s = { ...g(), groupOffers: [offer] }; s.clock = { day: 1, hour: 12 };
  expect(() => acceptGroup(s, 77)).toThrow();
});

test('시작 알바 시급은 최저임금보다 500원 높고, 처음 4주는 그만두지 않는다', () => {
  let s = g(); expect(s.staff[0].wage).toBe(s.economy.minWage + 500);
  s.staff = [{ ...s.staff[0], traits: { ...s.staff[0].traits, quitRisk: 1, diligence: 1 } }];
  for (let i = 0; i < 27 * 11; i++) s = advanceTick(s).state;
  expect(s.staff).toHaveLength(1);
});

test('바쁜 시간대 알바 1명: 오피스·주택가는 확실히 이득, 손님이 적은 대학가는 본전 근처', () => {
  const year = (id: 'campus' | 'office' | 'residential', withStaff: boolean) => {
    let sum = 0;
    for (let seed = 1; seed <= 4; seed++) {
      const s = createNewGame({ seed, neighborhoodId: id, shopName: 't', nowMs: 0 });
      s.staff = withStaff ? [{ ...s.staff[0], traits: { ...s.staff[0].traits, quitRisk: 0, diligence: 1 } }] : [];
      for (let i = 0; i < 6 * 28 * 11; i++) advanceTickInPlace(s);
      sum += s.ledger.months.reduce((a, m) => a + profitOf(m), 0);
    }
    return sum;
  };
  for (const id of ['office', 'residential'] as const) expect(year(id, true), id).toBeGreaterThan(year(id, false));
  expect(year('campus', true)).toBeGreaterThan(year('campus', false) * 0.95);
}, 300_000);

test('처음엔 식탁 3개(시간당 홀 손님 6명)라 바쁜 시간엔 자리가 모자랄 수 있다', () => {
  expect(hallSeatCap(g())).toBe(6);
});

test('최저임금이 오른 뒤 뽑아도 최저임금 아래로는 안 뽑힌다', () => {
  const s: GameState = { ...g(), applicants: [{ id: 50, name: 'x', age: 20, experience: '처음이에요', wantWage: 9000, shift: 'lunch', traits: { speed: 0.5, kindness: 0.5, diligence: 0.5, quitRisk: 0.5 }, asked: [] }] };
  expect(hire(s, 50).staff[1].wage).toBeGreaterThanOrEqual(s.economy.minWage);
});

test('돈이 모자라면 메뉴를 개발할 수 없다', () => {
  expect(() => developMenu({ ...g(), cash: 100_000 }, 'goguma')).toThrow('돈');
});
