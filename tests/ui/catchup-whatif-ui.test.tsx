// @vitest-environment jsdom
// 몰아 돌리기 버튼과 요약 창, 부검 리포트의 「다시 돌려 보기」
import { fireEvent, render, screen, within } from '@testing-library/react';
import { advanceTickInPlace } from '../../src/sim/tick';
import type { GameState } from '../../src/sim/types';
import { monthStartSnapshot } from '../../src/sim/whatIf';
import { saveMonthStart } from '../../src/ui/monthSnapshots';
import { LearnPanel } from '../../src/ui/panels/LearnPanel';
import { Main } from '../../src/ui/screens/Main';
import { g } from '../sim/gameHelpers';

beforeEach(() => localStorage.clear());

test('충전이 이틀치 넘게 쌓이면 몰아 돌리기를 고를 수 있고, 돌리면 한 장 요약이 뜬다', () => {
  const s: GameState = { ...g(), charge: { ticks: 33, lastAccruedAt: 0 } };
  render(<Main initial={s} now={() => 0} persist={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: '⏩ 몰아 돌리기' }));
  const ask = screen.getByRole('dialog', { name: '몰아 돌리기' });
  expect(ask.textContent).toContain('지금 설정 그대로');
  fireEvent.click(within(ask).getByRole('button', { name: '몰아 돌리기' }));
  const done = screen.getByRole('dialog', { name: '몰아 돌린 결과' });
  expect(done.textContent).toMatch(/\d+일을 몰아 돌렸어요/);
  expect(done.textContent).toContain('장부 이익');
  fireEvent.click(within(done).getByRole('button', { name: '확인' }));
  expect(screen.queryByRole('dialog', { name: '몰아 돌린 결과' })).toBeNull();
});

test('충전이 조금뿐이면 몰아 돌리기 버튼이 없다', () => {
  render(<Main initial={{ ...g(), charge: { ticks: 5, lastAccruedAt: 0 } }} now={() => 0} persist={() => {}} />);
  expect(screen.queryByRole('button', { name: '⏩ 몰아 돌리기' })).toBeNull();
});

test('부검 리포트에서 지난달을 하나만 바꿔 다시 돌려 볼 수 있다', () => {
  const s = structuredClone(g());
  while (s.clock.day < 28) advanceTickInPlace(s);
  saveMonthStart(monthStartSnapshot(s)!);
  while (s.clock.day < 56) advanceTickInPlace(s);
  render(<LearnPanel state={s} update={() => {}} />);
  const box = screen.getByRole('region', { name: '다시 돌려 보기' });
  fireEvent.click(within(box).getByRole('button', { name: '피자값을 10% 올렸다면' }));
  expect(within(box).getByRole('status').textContent).toMatch(/피자값을 10% 올렸다면 이익 [+−][\d,]+원 · 주문 [+-]?\d+건/);
});

test('첫날 기록이 없는 달은 다시 돌려 볼 수 없다고 알려 준다', () => {
  const s = structuredClone(g());
  while (s.clock.day < 28) advanceTickInPlace(s);
  render(<LearnPanel state={s} update={() => {}} />);
  expect(screen.getByText(/첫날 기록이 없어 다시 돌려 볼 수 없어요/)).toBeTruthy();
});
