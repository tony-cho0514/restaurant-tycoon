// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react';
import { PlaybackBar } from '../../src/ui/components/PlaybackBar';
import { StatusPanel } from '../../src/ui/panels/StatusPanel';
import { ShopPanel } from '../../src/ui/panels/ShopPanel';
import { VACATION_COST } from '../../src/sim/owner';
import type { GameState } from '../../src/sim/types';
import { g } from '../sim/gameHelpers';

type Fn = (s: GameState) => GameState;

test('재생 막대에 사장님 스트레스 게이지가 있다', () => {
  const s = { ...g(), owner: { ...g().owner, stress: 75 } };
  render(<PlaybackBar state={s} now={0} playing={false} speed={1} onPlay={() => {}} onStop={() => {}} onSpeed={() => {}} />);
  const m = screen.getByRole('meter', { name: '사장님 스트레스' });
  expect(m.getAttribute('aria-valuenow')).toBe('75');
  expect(m.textContent).toContain('😣');
});

test('현황 탭에 오늘 스트레스가 오른 이유가 보인다', () => {
  const s = { ...g(), owner: { ...g().owner, log: [{ reason: '주문이 밀림', delta: 1.2 }, { reason: '퇴근 후 잠', delta: -2 }] } };
  render(<StatusPanel state={s} update={() => {}} />);
  const list = screen.getByRole('list', { name: '오늘 스트레스가 오르내린 이유' });
  expect(list.textContent).toContain('주문이 밀림 +1.2');
  expect(list.textContent).toContain('퇴근 후 잠 −2.0');
});

test('가게 탭: 내일 하루 쉬기·휴가를 고를 수 있고, 휴가는 돈이 든다', () => {
  let s = g(); const update = (fn: Fn) => { s = fn(s); };
  const { rerender } = render(<ShopPanel state={s} update={update} />);
  fireEvent.click(screen.getByRole('button', { name: '쉬기' }));
  expect(s.owner.awayFrom).toBe(1);
  rerender(<ShopPanel state={s} update={update} />);
  expect(screen.getByText(/내일부터 하루 쉼/)).toBeTruthy();
  expect((screen.getByRole('button', { name: '떠나기' }) as HTMLButtonElement).disabled).toBe(true);

  let v = g(); const cash = v.cash;
  render(<ShopPanel state={v} update={(fn) => { v = fn(v); }} />);
  fireEvent.click(screen.getAllByRole('button', { name: '떠나기' }).at(-1)!);
  expect(v.cash).toBe(cash - VACATION_COST);
});

test('가게 탭: 일찍 퇴근하면 사장님이 근무에서 빠진다', () => {
  let s = g(); const update = (fn: Fn) => { s = fn(s); };
  render(<ShopPanel state={s} update={update} />);
  fireEvent.click(screen.getByRole('button', { name: '퇴근' }));
  expect(s.owner.leftEarly).toEqual({ day: 0, hour: 11 });
});
