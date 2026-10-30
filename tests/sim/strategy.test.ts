// 만능 설정은 없다: 동네마다 기본보다 나은 수가 따로 있고, 극단은 손해다(2026-10-30 점검, docs/balance-audit.md).
import { createNewGame } from '../../src/sim/newGame';
import { advanceTickInPlace } from '../../src/sim/tick';
import { profitOf } from '../../src/sim/ledger';
import type { NeighborhoodId } from '../../src/sim/neighborhoods';
import type { GameState } from '../../src/sim/types';

function median(id: NeighborhoodId, apply: (s: GameState) => void): number {
  const profits: number[] = [];
  for (let seed = 1; seed <= 2; seed++) {
    const s = createNewGame({ seed, neighborhoodId: id, shopName: 't', nowMs: 0 });
    s.settings = { ...s.settings, closedDay: 6 };
    apply(s);
    for (let i = 0; i < 12 * 28 * 11 && !s.closed; i++) advanceTickInPlace(s);
    profits.push(...s.ledger.months.map(profitOf));
  }
  profits.sort((a, b) => a - b);
  return profits[Math.floor(profits.length / 2)] ?? 0;
}
const raise = (k: number) => (s: GameState) => {
  for (const id of Object.keys(s.menuPrices) as (keyof GameState['menuPrices'])[]) s.menuPrices[id] = Math.round((s.menuPrices[id] * k) / 100) * 100;
};

test('동네마다 기본보다 나은 수가 다르다: 대학가는 늦게까지, 오피스는 가격, 주택가는 서비스', () => {
  expect(median('campus', (s) => { s.settings = { ...s.settings, closeHour: 24 }; })).toBeGreaterThan(median('campus', () => {}));
  expect(median('office', raise(1.1))).toBeGreaterThan(median('office', () => {}));
  expect(median('residential', (s) => { s.levers.freeCola = true; })).toBeGreaterThan(median('residential', () => {}));
}, 180_000);

test('운영 수단을 전부 켜면 비용이 쌓여 손해다', () => {
  const all = (s: GameState) => { for (const k of Object.keys(s.levers) as (keyof GameState['levers'])[]) s.levers[k] = true; };
  expect(median('office', all)).toBeLessThan(median('office', () => {}));
}, 180_000);
