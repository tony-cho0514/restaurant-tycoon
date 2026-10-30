// 1년 결산: 12달째 마감에 한 해를 돌아보고 칭호를 붙인다(그달은 월말 창 대신 결산 창).
import { profitOf } from '../../src/sim/ledger';
import { advanceTick } from '../../src/sim/tick';
import type { GameState } from '../../src/sim/types';
import { yearEndReport } from '../../src/sim/yearEnd';
import { g } from './gameHelpers';

test('12달째 마감에 결산 창이 뜨고, 한 해 이익은 12달 장부를 더한 값이다', () => {
  let s: GameState = { ...g(), settings: { ...g().settings, closedDay: 6 } };
  const pauses: string[] = [];
  while (s.clock.day < 336) {
    const r = advanceTick(s);
    s = r.state;
    for (const p of r.pauses) if (p.kind === 'yearEnd' || p.kind === 'monthEnd') pauses.push(`${p.kind}@${s.clock.day}`);
  }
  expect(pauses.filter((p) => p.startsWith('monthEnd'))).toHaveLength(11);
  expect(pauses.at(-1)).toBe('yearEnd@336');
  const y = s.learning.years![0];
  expect(y.year).toBe(1);
  expect(y.profit).toBe(Math.round(s.ledger.months.reduce((a, m) => a + profitOf(m), 0)));
  expect(y.titles.length).toBeGreaterThan(0);
  expect(y.titles.length).toBeLessThanOrEqual(3);
  expect(s.messages.items.some((m) => m.from === 'book' && m.text.startsWith('1년차 결산이 나왔어요'))).toBe(true);
});

test('한 해의 마지막 달이 아니면 결산을 만들지 않는다', () => {
  expect(yearEndReport(g(), 5)).toBeNull();
});
