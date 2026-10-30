// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { createNewGame } from '../../src/sim/newGame';
import { paceVsUsual } from '../../src/sim/localEvents';
import { advanceTickInPlace } from '../../src/sim/tick';
import { StatusPanel } from '../../src/ui/panels/StatusPanel';

test('현황 탭: 손님이 평소보다 많이 적으면 「평소 이맘때보다 ○% 적어요」만 보이고 이유는 안 보인다', () => {
  const s = createNewGame({ seed: 1, neighborhoodId: 'office', shopName: 'x', nowMs: 0 });
  while (s.clock.day < 10) advanceTickInPlace(s);
  s.local = { events: [
    { id: 1, type: 'roadwork', signalDay: 10, startDay: 10, endDay: 20 },
    { id: 2, type: 'competitor', signalDay: 10, startDay: 10, endDay: 40, discountEnd: 25, name: '도우하우스' },
  ], nextId: 3 };
  while (s.clock.hour < 19) advanceTickInPlace(s);
  expect(paceVsUsual(s)!).toBeLessThan(-0.15);
  render(<StatusPanel state={s} update={() => {}} />);
  const line = screen.getByRole('status');
  expect(line.textContent).toMatch(/오늘 손님이 평소 이맘때보다 \d+% 적어요/);
  expect(line.textContent).not.toMatch(/공사|경쟁|도우하우스/);
});
