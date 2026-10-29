// @vitest-environment jsdom
import { render, screen, act } from '@testing-library/react';
import { ShopScene, moodOf } from '../../src/ui/components/ShopScene';
import type { AnimEvents } from '../../src/sim/tick';

const anim = (o = {}) => ({ hour: 12, hallArrivals: 3, deliveriesOut: 2, pizzasBaked: 4, lostOrders: 0, revenue: 123000, weather: 'sunny', stockouts: [], ...o }) as AnimEvents;

afterEach(() => { vi.useRealTimers(); delete (window as { matchMedia?: unknown }).matchMedia; });

test('손님 3명·배달 2대·피자 4판', () => {
  vi.useFakeTimers(); const { container } = render(<ShopScene anim={anim()} hour={12} weather="sunny" mood="normal" />);
  act(() => { vi.advanceTimersByTime(500); });
  expect(container.querySelectorAll('[data-sprite="customer"]').length).toBe(3);
  expect(container.querySelectorAll('[data-sprite="rider"]').length).toBe(2);
  expect(container.querySelectorAll('[data-sprite="pizza"]').length).toBe(4);
  expect(screen.getByText('+123,000원')).toBeTruthy();
});

test('손님이 50명이어도 6명까지만', () => {
  vi.useFakeTimers(); const { container } = render(<ShopScene anim={anim({ hallArrivals: 50 })} hour={12} weather="sunny" mood="normal" />);
  act(() => { vi.advanceTimersByTime(2000); }); expect(container.querySelectorAll('[data-sprite="customer"]').length).toBeLessThanOrEqual(6);
});

test('움직임 줄이기 설정이면 이동 없이 제자리에서 나타났다 사라진다', () => {
  vi.useFakeTimers();
  window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener() {}, removeEventListener() {} }) as unknown as typeof window.matchMedia;
  const { container } = render(<ShopScene anim={anim()} hour={12} weather="sunny" mood="normal" />);
  act(() => { vi.advanceTimersByTime(500); });
  const sprites = [...container.querySelectorAll('[data-sprite]')];
  expect(sprites.length).toBe(9); expect(sprites.every((s) => s.classList.contains('still'))).toBe(true);
  expect(screen.getByText('+123,000원')).toBeTruthy();
});

test('분위기 판정', () => {
  expect(moodOf([{ type: 'CHEESE_SHORTAGE', untilDay: 9, magnitude: .4 }], 'normal')).toBe('crisis');
  expect(moodOf([{ type: 'FESTIVAL', untilDay: 9, magnitude: .6 }], 'normal')).toBe('opportunity');
  expect(moodOf([], 'recession')).toBe('crisis');
});
