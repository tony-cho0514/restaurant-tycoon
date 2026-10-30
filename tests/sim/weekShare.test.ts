// 주간 결과 공유 문구: 요일별 칸과 흐름만, 금액·순위는 넣지 않는다.
import { lastFullWeek, weekShareText, weekSquares } from '../../src/sim/weekShare';
import { advanceTickInPlace } from '../../src/sim/tick';
import type { GameState } from '../../src/sim/types';
import { g } from './gameHelpers';

function playUntil(s: GameState, day: number): GameState {
  const c = structuredClone(s);
  while (c.clock.day < day) advanceTickInPlace(c);
  return c;
}

test('한 주가 끝나기 전엔 공유할 주가 없다', () => {
  expect(lastFullWeek(playUntil(g(), 6))).toBeNull();
  expect(lastFullWeek(playUntil(g(), 7))).toBe(0);
});

test('요일별 칸은 흑자 🟩·적자 🟥·쉰 날 ⬜, 문구엔 금액이 없다', () => {
  const s = playUntil({ ...g(), settings: { ...g().settings, closedDay: 6 } }, 15);
  const sq = weekSquares(s, 1);
  expect(sq).toHaveLength(7);
  expect(sq[6]).toBe('⬜');
  for (const x of sq) expect(['🟩', '🟥', '⬜']).toContain(x);
  const text = weekShareText(s, 1, 'https://example.com/');
  expect(text).toContain('2주차');
  expect(text).toMatch(/지난주보다 (더|덜) 벌었어요|지난주와 같아요/);
  expect(text).not.toMatch(/원/);
  expect(text.split('\n').at(-1)).toBe('https://example.com/');
});
