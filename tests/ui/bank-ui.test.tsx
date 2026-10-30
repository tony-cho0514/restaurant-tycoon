// @vitest-environment jsdom
// 대출 카드, 폐업 부검 화면, 지난 가게 기록
import { fireEvent, render, screen, within } from '@testing-library/react';
import { borrow } from '../../src/sim/bank';
import type { GameState } from '../../src/sim/types';
import { recordClosedShop, loadCareer, withCareerDex } from '../../src/ui/career';
import { LedgerPanel } from '../../src/ui/panels/LedgerPanel';
import { ClosedShop } from '../../src/ui/screens/ClosedShop';
import { NewGame } from '../../src/ui/screens/NewGame';
import { g } from '../sim/gameHelpers';

beforeEach(() => localStorage.clear());

test('장부: 통장이 마이너스면 긴급 대출 카드가 뜨고, 빌리면 상환표가 보인다', () => {
  let s: GameState = { ...g(), cash: -100_000 };
  const update = (fn: (x: GameState) => GameState) => { s = fn(s); };
  const { rerender } = render(<LedgerPanel state={s} update={update} />);
  const card = screen.getByRole('region', { name: '긴급 대출' });
  expect(card.textContent).toContain('한도는 월세 석 달치');
  fireEvent.click(within(card).getByRole('button', { name: '대출 금액 줄이기' }));
  fireEvent.click(within(card).getByRole('button', { name: /빌리기/ }));
  expect(s.bank.loan!.principal).toBe(4_000_000);
  rerender(<LedgerPanel state={s} update={update} />);
  expect(screen.getByRole('table', { name: '상환표' })).toBeTruthy();
});

test('넉넉하면 대출 카드가 없다', () => {
  render(<LedgerPanel state={{ ...g(), cash: 80_000_000 }} update={() => {}} />);
  expect(screen.queryByRole('region', { name: '긴급 대출' })).toBeNull();
});

test('폐업 부검: 정산과 권리금, 도감이 이어진다는 안내, 새 가게 열기', () => {
  const s = { ...borrow({ ...g(), cash: -100_000 }, 2_000_000), closed: { day: 3, reason: 'bankrupt' as const } };
  const onNew = vi.fn();
  render(<ClosedShop state={s} onNewShop={onNew} />);
  const r = screen.getByRole('region', { name: '폐업 부검' });
  expect(r.textContent).toContain('문을 닫았어요');
  expect(r.textContent).toContain('남은 대출');
  expect(r.textContent).toContain('권리금');
  expect(r.textContent).toMatch(/도감 \d+\/\d+장은 다음 가게로/);
  fireEvent.click(screen.getByRole('button', { name: '새 가게 열기' }));
  expect(onNew).toHaveBeenCalled();
});

test('문 닫은 가게는 경력에 남고, 새 가게는 도감을 이어받으며, 시작 화면에 지난 가게가 보인다', () => {
  const closed = { ...g(), closed: { day: 30, reason: 'voluntary' as const }, learning: { ...g().learning, dex: { revenueProfit: { day: 1, story: '첫날' } } } };
  recordClosedShop(closed, 123);
  const c = loadCareer();
  expect(c.shops).toHaveLength(1);
  expect(withCareerDex(g(), c).learning.dex.revenueProfit?.story).toBe('첫날');
  render(<NewGame onStart={() => {}} career={c.shops} />);
  expect(screen.getByRole('region', { name: '지난 가게' }).textContent).toContain('「테스트 피자」');
  expect(screen.getByText('이번엔 어디에 가게를 열까요?')).toBeTruthy();
});
