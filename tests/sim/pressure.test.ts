// 숨 돌릴 틈: 첫 달엔 큰 악재 하나까지, 악재 뒤엔 7일 이상 쉬고, 적자 달 다음엔 악재가 준다.
import { createNewGame } from '../../src/sim/newGame';
import { isBadShock, shockDays } from '../../src/sim/news';
import { ACUTE_DAYS, AFTER_LOSS_ROOM, CALM_DAYS, badEventRoom } from '../../src/sim/pressure';
import { advanceTickInPlace } from '../../src/sim/tick';
import type { GameState } from '../../src/sim/types';
import type { NeighborhoodId } from '../../src/sim/neighborhoods';
import { g } from './gameHelpers';

function playUntil(s: GameState, day: number): GameState {
  const c = structuredClone(s);
  while (c.clock.day < day) advanceTickInPlace(c);
  return c;
}

/** 실제로 있었던 악재(터진 위기 + 동네 사정)의 [시작, 끝] */
function badSpans(s: GameState) {
  const spans = s.news.items
    .filter((n) => (n.kind === 'signal' || n.kind === 'fire') && n.shockType && isBadShock(n.shockType))
    .map((n) => ({ start: n.day, end: n.day + (n.kind === 'fire' ? Math.min(shockDays(n.shockType!), ACUTE_DAYS) : 0), id: `${n.shockType}` }));
  // 신호와 발생은 한 악재: 신호~발생 끝을 한 구간으로 묶는다
  const merged: { start: number; end: number }[] = [];
  for (const x of spans.sort((a, b) => a.start - b.start)) {
    const open = merged.find((m) => x.start <= m.end + 21 && x.id === (m as { id?: string }).id);
    if (open) open.end = Math.max(open.end, x.end); else merged.push({ ...x });
  }
  return [...merged, ...s.local.events.map((e) => ({ start: e.signalDay, end: e.endDay }))].sort((a, b) => a.start - b.start);
}

test('첫 달엔 큰 악재가 하나까지만 시작된다', () => {
  for (const id of ['campus', 'office', 'residential'] as NeighborhoodId[]) {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const s = playUntil(createNewGame({ seed, neighborhoodId: id, shopName: 'x', nowMs: 0 }), 28);
      expect(badSpans(s).filter((x) => x.start < 28).length).toBeLessThanOrEqual(1);
    }
  }
});

test('악재가 끝나고 7일이 지나기 전엔 새 악재가 시작되지 않는다', () => {
  for (const seed of [1, 2, 3]) {
    const spans = badSpans(playUntil(createNewGame({ seed, neighborhoodId: 'residential', shopName: 'x', nowMs: 0 }), 28 * 6));
    expect(spans.length).toBeGreaterThan(1);
    for (let i = 1; i < spans.length; i++) expect(spans[i].start - spans[i - 1].end).toBeGreaterThanOrEqual(CALM_DAYS);
  }
});

test('지난달이 적자면 새 악재가 반으로 준다', () => {
  const s = playUntil(g(), 60);
  const day = 200;
  const calm = { ...s, news: { ...s.news, pending: [], items: [] }, local: { events: [], nextId: 1 } };
  expect(badEventRoom(calm, day)).toBe(1);
  const loss = { ...calm, ledger: { ...calm.ledger, months: [...calm.ledger.months, { ...calm.ledger.months[0], revenueHall: 0, revenueDelivery: 0 }] } };
  expect(badEventRoom(loss, day)).toBe(AFTER_LOSS_ROOM);
});
