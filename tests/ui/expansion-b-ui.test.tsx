// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react';
import { StaffPanel } from '../../src/ui/panels/StaffPanel';
import { ShopPanel } from '../../src/ui/panels/ShopPanel';
import { MenuPanel } from '../../src/ui/panels/MenuPanel';
import { SalesPanel } from '../../src/ui/panels/SalesPanel';
import { PauseModal } from '../../src/ui/components/PauseModal';
import { QUESTIONS } from '../../src/sim/staffing';
import type { GameState } from '../../src/sim/types';
import { g } from '../sim/gameHelpers';

type Fn = (s: GameState) => GameState;
const applicant = { id: 50, name: '테스트지원', age: 23, experience: '카페 1년', wantWage: 10500, shift: 'dinner' as const, traits: { speed: 0.8, kindness: 0.8, diligence: 0.8, quitRisk: 0.1 }, asked: [] };

test('직원: 면접 질문을 고르면 답이 보이고, 채용하면 직원이 는다', () => {
  let s: GameState = { ...g(), applicants: [applicant] }; const update = (fn: Fn) => { s = fn(s); };
  const { rerender } = render(<StaffPanel state={s} update={update} />);
  fireEvent.click(screen.getByRole('button', { name: `테스트지원에게 「${QUESTIONS[0].q}」` }));
  rerender(<StaffPanel state={s} update={update} />);
  expect(s.applicants[0].asked).toEqual([0]);
  expect(screen.getByText(/피자집에서 일했어요|카페에서|처음이에요/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '테스트지원 채용' }));
  expect(s.staff).toHaveLength(2);
});

test('직원: 채용 공고를 낸다', () => {
  let s = g(); const update = (fn: Fn) => { s = fn(s); };
  render(<StaffPanel state={s} update={update} />);
  fireEvent.click(screen.getByRole('button', { name: '채용 공고 내기' }));
  expect(s.jobPost).not.toBeNull();
});

test('가게: 오븐을 업그레이드한다', () => {
  let s = { ...g(), cash: 50_000_000 }; const update = (fn: Fn) => { s = fn(s); };
  render(<ShopPanel state={s} update={update} />);
  fireEvent.click(screen.getByRole('button', { name: '화덕 오븐 업그레이드' }));
  expect(s.upgrades.oven).toBe(2);
});

test('메뉴: 새 메뉴를 개발한다', () => {
  let s = g(); const update = (fn: Fn) => { s = fn(s); };
  render(<MenuPanel state={s} update={update} />);
  fireEvent.click(screen.getByRole('button', { name: '고구마 피자 L 개발하기' }));
  expect(s.menuActive.goguma).toBe(true);
});

test('매출·주문: 배달 구역 표가 있다', () => {
  render(<SalesPanel state={g()} update={() => {}} />);
  expect(screen.getByRole('table', { name: '배달 구역' })).toBeTruthy();
});

test('단체 주문 창: 받기를 누르면 수락한다', () => {
  const offer = { id: 77, title: '테스트 모임', dueDay: 3, dueHour: 12, items: [{ menu: 'cheese' as const, qty: 10 }], discount: 0.1, expiresDay: 1 };
  const s = { ...g(), groupOffers: [offer] };
  const onAccept = vi.fn(); const onDecline = vi.fn();
  render(<PauseModal reason={{ kind: 'groupOffer', offerId: 77 }} state={s} now={0} onDismiss={() => {}} onGoto={() => {}} onAccept={onAccept} onDecline={onDecline} />);
  expect(screen.getByText(/테스트 모임/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '받기' }));
  expect(onAccept).toHaveBeenCalledWith(77);
});
