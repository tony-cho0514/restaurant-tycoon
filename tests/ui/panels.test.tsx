// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react';
import { MenuPanel } from '../../src/ui/panels/MenuPanel';
import { LeversPanel } from '../../src/ui/panels/LeversPanel';
import { InventoryPanel } from '../../src/ui/panels/InventoryPanel';
import { LedgerPanel } from '../../src/ui/panels/LedgerPanel';
import { advanceTick } from '../../src/sim/tick';
import type { GameState } from '../../src/sim/types';
import { g } from '../sim/gameHelpers';

type Fn = (s: GameState) => GameState;

test('가격을 내려도 1,000원 아래로는 안 간다', () => {
  let s = g(); s.menuPrices.cola = 1000; const update = (fn: Fn) => { s = fn(s); };
  const { rerender } = render(<MenuPanel state={s} update={update} />);
  fireEvent.click(screen.getByRole('button', { name: '콜라 1.25L 500원 내리기' })); fireEvent.click(screen.getByRole('button', { name: '적용' }));
  rerender(<MenuPanel state={s} update={update} />); expect(s.menuPrices.cola).toBe(1000);
});

test('가격을 올리고 적용하면 바뀐다', () => {
  let s = g(); const update = (fn: Fn) => { s = fn(s); };
  render(<MenuPanel state={s} update={update} />);
  fireEvent.click(screen.getByRole('button', { name: '치즈 피자 L 500원 올리기' })); fireEvent.click(screen.getByRole('button', { name: '적용' }));
  expect(s.menuPrices.cheese).toBe(19400);
});

test('콜라 서비스 미리보기 문구', () => {
  render(<LeversPanel state={g()} update={() => {}} />); fireEvent.click(screen.getByRole('button', { name: /콜라 서비스/ }));
  expect(screen.getByText(/−3\.6%p/)).toBeTruthy(); expect(screen.getByText(/주문당 원가 \+800원/)).toBeTruthy();
});

test('운영 수단을 확정하면 켜진다', () => {
  let s = g(); const update = (fn: Fn) => { s = fn(s); };
  render(<LeversPanel state={s} update={update} />); fireEvent.click(screen.getByRole('button', { name: /보온 포장/ }));
  fireEvent.click(screen.getByRole('button', { name: '켜기 확정' })); expect(s.levers.insulatedBox).toBe(true);
});

test('미리 사기는 현금을 줄이고 상한이면 안내', () => {
  let s = g(); const cash0 = s.cash; const update = (fn: Fn) => { s = fn(s); };
  render(<InventoryPanel state={s} update={update} />);
  fireEvent.click(screen.getByRole('button', { name: '모짜렐라 치즈 60일치 미리 사기' }));
  expect(screen.getByText(/창고가 꽉 차서/)).toBeTruthy(); fireEvent.click(screen.getByRole('button', { name: '구매 확정' }));
  expect(s.cash).toBeLessThan(cash0);
});

test('장부에 이익이 원화로', () => {
  let s = g(); for (let i = 0; i < 28 * 11; i++) s = advanceTick(s).state;
  render(<LedgerPanel state={s} update={() => {}} />); expect(screen.getAllByText(/[\d,]+원/).length).toBeGreaterThan(5);
});
