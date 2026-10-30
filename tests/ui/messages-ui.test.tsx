// @vitest-environment jsdom
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import type { Message } from '../../src/sim/messages';
import { MessageToasts } from '../../src/ui/components/MessageToasts';
import { MessagesPanel } from '../../src/ui/panels/MessagesPanel';
import { Main } from '../../src/ui/screens/Main';
import type { GameState } from '../../src/sim/types';
import { g, midDay } from '../sim/gameHelpers';

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

const msg = (id: number, x: Partial<Message> = {}): Message => ({ id, day: 1, hour: 12, from: 'review', channel: 'delivery', name: '야식러', text: `리뷰 ${id}`, tone: 'neutral', ...x });

test('새 메시지만 말풍선으로 잠깐 뜨고, 누르면 메시지 탭으로 간다', () => {
  const onOpen = vi.fn();
  const old = [msg(1)];
  const { rerender } = render(<MessageToasts items={old} onOpen={onOpen} />);
  expect(screen.queryByText('리뷰 1')).toBeNull();
  rerender(<MessageToasts items={[...old, msg(2, { stars: 1, text: '40분 걸려서 식었어요' })]} onOpen={onOpen} />);
  expect(screen.getByText('40분 걸려서 식었어요')).toBeTruthy();
  expect(screen.getByLabelText('별 1개')).toBeTruthy();
  // 매 틱 다시 그려져도 사라지는 시간은 그대로
  act(() => { vi.advanceTimersByTime(4000); });
  rerender(<MessageToasts items={[...old, msg(2, { stars: 1, text: '40분 걸려서 식었어요' })]} onOpen={onOpen} />);
  act(() => { vi.advanceTimersByTime(2100); });
  expect(screen.queryByText('40분 걸려서 식었어요')).toBeNull();

  rerender(<MessageToasts items={[...old, msg(2), msg(3, { text: '치즈 추가 되나요?' })]} onOpen={onOpen} />);
  fireEvent.click(screen.getByText('치즈 추가 되나요?'));
  expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 3 }));
  expect(screen.queryByText('치즈 추가 되나요?')).toBeNull();
});

test('말풍선은 셋까지만 보인다', () => {
  const { rerender } = render(<MessageToasts items={[]} onOpen={() => {}} />);
  rerender(<MessageToasts items={[1, 2, 3, 4, 5].map((i) => msg(i))} onOpen={() => {}} />);
  expect(screen.getAllByRole('button')).toHaveLength(3);
  expect(screen.queryByText('리뷰 1')).toBeNull();
});

test('메시지 탭: 최근 리뷰 요약·보낸 쪽 고르기·바로 가기', () => {
  const s: GameState = { ...g(), clock: { day: 3, hour: 15 } };
  s.messages = {
    items: [
      msg(1, { day: 2, stars: 2, topic: 'slow', text: '50분 걸렸어요', tone: 'bad', action: 'staff' }),
      msg(2, { day: 3, stars: 1, topic: 'slow', text: '너무 늦어요', tone: 'bad', action: 'staff' }),
      msg(3, { day: 3, stars: 5, topic: 'tasty', text: '맛있어요', tone: 'good' }),
      msg(4, { day: 3, from: 'staff', name: '김하늘', text: '치즈 얼마 안 남았어요', channel: undefined, action: 'inventory' }),
      msg(5, { day: 3, from: 'owner', name: '사장님(나)', text: '오늘 장사 끝!', channel: undefined }),
    ],
    nextId: 6,
  };
  const onGoto = vi.fn();
  render(<MessagesPanel state={s} update={() => {}} onGoto={onGoto} />);
  const voices = screen.getByRole('region', { name: '최근 7일 손님 리뷰' });
  expect(voices.textContent).toContain('최근 7일 리뷰 3개');
  expect(voices.textContent).toContain('늦어요 2');
  expect(voices.textContent).toContain('직원 탭');

  fireEvent.click(screen.getByRole('button', { name: '직원' }));
  expect(screen.getByText('치즈 얼마 안 남았어요')).toBeTruthy();
  expect(screen.queryByText('맛있어요')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '재고 보기' }));
  expect(onGoto).toHaveBeenCalledWith('inventory');

  fireEvent.click(screen.getByRole('button', { name: '나' }));
  expect(screen.getByText('오늘 장사 끝!').closest('li')!.className).toContain('mine');
});

test('뉴스 탭 자리에 메시지 탭이 있고, 안 읽은 메시지 수가 뜬다', () => {
  const s = { ...midDay(), charge: { ticks: 77, lastAccruedAt: 0 } };
  render(<Main initial={s} now={() => 0} persist={() => {}} />);
  expect(screen.queryByRole('tab', { name: /뉴스/ })).toBeNull();
  const tab = screen.getByRole('tab', { name: /메시지/ });
  expect(within(tab).queryByLabelText(/새 메시지/)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '재생' }));
  act(() => { vi.advanceTimersByTime(1948 * 11); });
  expect(within(tab).getByLabelText(/새 메시지 \d+개/)).toBeTruthy();
  fireEvent.click(tab);
  expect(within(screen.getByRole('tab', { name: /메시지/ })).queryByLabelText(/새 메시지/)).toBeNull();
  expect(screen.getByRole('heading', { name: '메시지' })).toBeTruthy();
});
