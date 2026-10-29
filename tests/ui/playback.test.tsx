// @vitest-environment jsdom
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import { usePlayback } from '../../src/ui/hooks/usePlayback';
import { Main } from '../../src/ui/screens/Main';
import { midDay } from '../sim/gameHelpers';

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

test('1×에서 1,948ms마다 1틱, 4×면 487ms', () => {
  const { result } = renderHook(() => usePlayback(midDay(), { now: () => 0, persist: () => {} }));
  act(() => result.current.play()); act(() => { vi.advanceTimersByTime(1948); }); expect(result.current.state.clock.hour).toBe(13);
  act(() => result.current.setSpeed(4)); act(() => { vi.advanceTimersByTime(487); }); expect(result.current.state.clock.hour).toBe(14);
});

test('충전이 떨어지면 멈추고 안내', () => {
  const s = { ...midDay(), charge: { ticks: 1, lastAccruedAt: 0 } }; render(<Main initial={s} now={() => 0} persist={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: '재생' })); act(() => { vi.advanceTimersByTime(1948 * 2); });
  expect(screen.getByText(/오늘 충전된 시간을 다 썼어요/)).toBeTruthy();
});

test('중요 뉴스면 멈추고, 창을 다 닫으면 이어서 재생', () => {
  const s = midDay(); s.news.pending.push({ id: 'p', type: 'FESTIVAL', signalDay: 0, fireDay: 2, real: true, magnitude: 0.6 });
  const { result } = renderHook(() => usePlayback(s, { now: () => 0, persist: () => {} }));
  act(() => result.current.play()); act(() => { vi.advanceTimersByTime(1948 * 11); });
  expect(result.current.playing).toBe(false); expect(result.current.pauses[0].kind).toBe('news');
  for (let i = 0; i < 5 && result.current.pauses.length; i++) act(() => result.current.dismissPause());
  expect(result.current.playing).toBe(true);
});

test('화면이 숨겨지면 멈추고 저장', () => {
  const persist = vi.fn(); const { result } = renderHook(() => usePlayback(midDay(), { now: () => 0, persist }));
  act(() => result.current.play()); Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
  act(() => { document.dispatchEvent(new Event('visibilitychange')); }); expect(result.current.playing).toBe(false); expect(persist).toHaveBeenCalled();
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
});
