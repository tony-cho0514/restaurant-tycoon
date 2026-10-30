// @vitest-environment jsdom
import { render, screen, fireEvent, within } from '@testing-library/react';
import { SalesPanel } from '../../src/ui/panels/SalesPanel';
import { ShopPanel } from '../../src/ui/panels/ShopPanel';
import { MenuPanel } from '../../src/ui/panels/MenuPanel';
import { InventoryPanel } from '../../src/ui/panels/InventoryPanel';
import { advanceTick } from '../../src/sim/tick';
import { ordersOn } from '../../src/sim/orders';
import type { GameState } from '../../src/sim/types';
import { g } from '../sim/gameHelpers';

type Fn = (s: GameState) => GameState;
const oneDay = () => { let s = g(); for (let i = 0; i < 11; i++) s = advanceTick(s).state; return s; };

test('매출·주문: 고른 날의 주문 목록과 시간대별 매출이 숫자로 보인다', () => {
  const s = oneDay();
  render(<SalesPanel state={s} update={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: /어제/ }));
  const list = screen.getByRole('list', { name: '주문 목록' });
  expect(within(list).getAllByRole('listitem')).toHaveLength(ordersOn(s.orders, 0).length);
  expect(screen.getByRole('table', { name: '시간대별 매출' })).toBeTruthy();
  expect(screen.getByRole('table', { name: '최근 7일' })).toBeTruthy();
});

test('매출·주문: 배달만 골라 볼 수 있다', () => {
  const s = oneDay();
  render(<SalesPanel state={s} update={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: /어제/ }));
  fireEvent.click(screen.getByRole('button', { name: '배달' }));
  const n = ordersOn(s.orders, 0).filter((o) => o.channel === 'delivery').length;
  expect(within(screen.getByRole('list', { name: '주문 목록' })).queryAllByRole('listitem')).toHaveLength(n);
});

test('가게: 운영시간·휴무·배달팁을 바꾼다', () => {
  let s = g(); const update = (fn: Fn) => { s = fn(s); };
  const { rerender } = render(<ShopPanel state={s} update={update} />);
  fireEvent.click(screen.getByRole('button', { name: '닫는 시각 늦추기' })); rerender(<ShopPanel state={s} update={update} />);
  expect(s.settings.closeHour).toBe(23);
  fireEvent.click(screen.getByRole('button', { name: '월요일 휴무' })); rerender(<ShopPanel state={s} update={update} />);
  expect(s.settings.closedDay).toBe(0);
  fireEvent.click(screen.getByRole('button', { name: '배달팁 올리기' }));
  expect(s.settings.deliveryTip).toBe(1500);
});

test('메뉴: 재료 보기를 누르면 들어가는 재료가 보인다', () => {
  render(<MenuPanel state={g()} update={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: '콤비네이션 피자 L 재료 보기' }));
  expect(within(screen.getByRole('list', { name: '콤비네이션 피자 L 재료' })).getByText(/채소 믹스/)).toBeTruthy();
});

test('재고: 여러 개를 골라 한 번에 발주, 서비스 콜라도 0원이 아니다', () => {
  let s = g(); const cash0 = s.cash; const update = (fn: Fn) => { s = fn(s); };
  render(<InventoryPanel state={s} update={update} />);
  fireEvent.click(screen.getByRole('checkbox', { name: '모짜렐라 치즈 선택' }));
  fireEvent.click(screen.getByRole('checkbox', { name: '콜라 500ml(서비스용) 선택' }));
  expect(screen.getByText(/선택 2개/)).toBeTruthy();
  expect(screen.queryByText(/합계 0원/)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '한 번에 발주' }));
  expect(s.cash).toBeLessThan(cash0);
});
