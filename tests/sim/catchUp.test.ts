// 몰아 돌리기: 쌓인 충전만큼 한 번에 돌리고, 큰일이 생기면 거기서 멈추고, 결과는 하나씩 돌린 것과 같다.
import { catchUp } from '../../src/sim/catchUp';
import { profitOf } from '../../src/sim/ledger';
import { playTick } from '../../src/sim/tick';
import type { GameState } from '../../src/sim/types';
import { g } from './gameHelpers';

const charged = (ticks: number): GameState => ({ ...g(), charge: { ticks, lastAccruedAt: 0 } });

test('충전을 다 쓸 때까지 돌리고, 하나씩 돌린 것과 결과가 같다(멈춤이 없으면)', () => {
  const start = charged(33); // 3일치
  const { state, summary } = catchUp(start, 0);
  let s = start;
  for (;;) { const r = playTick(s, 0); if (!r) break; s = r.state; if (r.pauses.length) break; }
  expect(state.cash).toBe(s.cash);
  expect(state.clock).toEqual(s.clock);
  if (!summary.stoppedBy) expect(summary.days).toBe(3);
  expect(summary.profit).toBe(Math.round(state.ledger.days.filter((d) => d.day < state.clock.day).reduce((a, d) => a + profitOf(d), 0)));
  expect(summary.cashBefore).toBe(start.cash);
});

test('큰일이 생기면 거기서 멈추고 까닭을 알려 준다', () => {
  const start = charged(21 * 11);
  start.news.pending.push({ id: 'x', type: 'CHEESE_SHORTAGE', signalDay: 0, fireDay: 2, real: true, magnitude: 0.4 });
  const { state, pauses, summary } = catchUp(start, 0);
  expect(pauses.length).toBeGreaterThan(0);
  expect(summary.stoppedBy).toBe(pauses[0].kind);
  expect(state.clock.day).toBeLessThan(21);
  expect(state.charge.ticks).toBeGreaterThan(0);
});

test('충전이 없으면 아무것도 바뀌지 않는다', () => {
  const start = charged(0);
  const { state, summary } = catchUp(start, 0);
  expect(state.clock).toEqual(start.clock);
  expect(summary.days).toBe(0);
});
