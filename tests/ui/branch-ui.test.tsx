// @vitest-environment jsdom
// 가게 탭의 2호점: 조건 체크리스트 → 동네·매니저·창업 대출 고르고 열기 → 규칙·들르기
import { fireEvent, render, screen, within } from '@testing-library/react';
import { BRANCH_REQ } from '../../src/sim/branch';
import { createNewGame } from '../../src/sim/newGame';
import { advanceTickInPlace } from '../../src/sim/tick';
import type { GameState } from '../../src/sim/types';
import { BranchSection } from '../../src/ui/panels/BranchSection';
import { g } from '../sim/gameHelpers';

let ready: GameState;
beforeAll(() => {
  const s = createNewGame({ seed: 3, neighborhoodId: 'residential', shopName: 'x', nowMs: 0 });
  s.settings = { ...s.settings, closedDay: 6 };
  while (s.clock.day < BRANCH_REQ.days) advanceTickInPlace(s);
  s.cash = 20_000_000;
  ready = s;
});

test('조건이 안 차면 체크리스트만 보인다', () => {
  render(<BranchSection state={g()} update={() => {}} />);
  const list = screen.getByRole('list', { name: '2호점 열기 조건' });
  expect(within(list).getAllByText(/⬜/).length).toBe(3);
  expect(screen.queryByRole('group', { name: '2호점 열기' })).toBeNull();
});

test('조건이 차면 동네와 매니저를 고르고 창업 대출을 정해 연다', () => {
  let s = ready;
  const update = (fn: (x: GameState) => GameState) => { s = fn(s); };
  const { rerender } = render(<BranchSection state={s} update={update} />);
  const form = screen.getByRole('group', { name: '2호점 열기' });
  const open = within(form).getByRole('button', { name: '2호점 열기' });
  expect((open as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(within(form).getByRole('button', { name: /대학가/ }));
  fireEvent.click(within(form).getAllByRole('button', { name: /꼼꼼함|손이 빠름|친절함/ })[1]);
  fireEvent.click(open);
  expect(s.branch?.neighborhoodId).toBe('campus');
  rerender(<BranchSection state={s} update={update} />);
  expect(screen.getByLabelText('2호점 현황').textContent).toContain('매니저');
  // 규칙: 알바 늘리기, 광고 켜기
  fireEvent.click(screen.getByRole('button', { name: '2호점 알바 늘리기' }));
  expect(s.branch!.rules.staff).toBe(2);
  rerender(<BranchSection state={s} update={update} />);
  fireEvent.click(screen.getByRole('checkbox', { name: /배달앱 광고/ }));
  expect(s.branch!.rules.appAds).toBe(true);
  rerender(<BranchSection state={s} update={update} />);
  fireEvent.click(screen.getByRole('button', { name: '🚗 내일 2호점 들르기' }));
  expect(s.owner.awayReason).toBe('branch');
});
