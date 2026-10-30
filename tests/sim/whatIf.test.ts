// 지난달 다시 돌려 보기: 그 달 첫날에서 아무것도 안 바꾸면 실제와 똑같고, 하나를 바꾸면 그만큼 달라진다.
import { profitOf } from '../../src/sim/ledger';
import { advanceTickInPlace } from '../../src/sim/tick';
import type { GameState } from '../../src/sim/types';
import { monthStartSnapshot, replayMonth, whatIf, whatIfOptions } from '../../src/sim/whatIf';
import { g } from './gameHelpers';

function playUntil(s: GameState, day: number): GameState {
  const c = structuredClone(s);
  while (c.clock.day < day) advanceTickInPlace(c);
  return c;
}

test('달이 바뀌어 문을 열기 전에만 그 달 첫날 사진을 찍는다(메시지 글은 뺀다)', () => {
  const s = playUntil(g(), 28);
  const snap = monthStartSnapshot(s)!;
  expect(snap.clock.day).toBe(28);
  expect(snap.messages.items).toEqual([]);
  const opened = structuredClone(s); advanceTickInPlace(opened);
  expect(monthStartSnapshot(opened)).toBeNull();
});

test('아무것도 안 바꾸고 다시 돌리면 실제 그 달 이익과 같다(달 중간에 바꾼 게 없을 때)', () => {
  const start = monthStartSnapshot(playUntil(g(), 28))!;
  const actual = playUntil(start, 56);
  const m = actual.ledger.months.find((x) => x.monthIndex === 1)!;
  expect(replayMonth(start).profit).toBe(Math.round(profitOf(m)));
});

test('설정 하나를 바꾸면 결과가 달라지고, 실제 상태는 그대로다', () => {
  const start = monthStartSnapshot(playUntil(g(), 28))!;
  const before = JSON.stringify(start);
  const r = whatIf(start, 'price+10');
  expect(r.changed.profit).not.toBe(r.base.profit);
  expect(JSON.stringify(start)).toBe(before);
  expect(whatIfOptions(start).map((o) => o.label)).toContain('배달앱 광고를 켰다면');
});
