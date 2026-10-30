// @vitest-environment jsdom
import { render, screen, fireEvent, within } from '@testing-library/react';
import { advanceTickInPlace } from '../../src/sim/tick';
import type { GameState } from '../../src/sim/types';
import { PauseModal } from '../../src/ui/components/PauseModal';
import { LearnPanel } from '../../src/ui/panels/LearnPanel';
import { g } from '../sim/gameHelpers';

let twoMonths: GameState;
beforeAll(() => {
  twoMonths = structuredClone(g());
  while (twoMonths.clock.day < 56) advanceTickInPlace(twoMonths);
});

test('배움 탭: 최근 부검 리포트에 원인별 몫·핵심 지표·힌트가 보인다', () => {
  render(<LearnPanel state={twoMonths} update={() => {}} />);
  const r = screen.getByRole('article', { name: /4월 부검 리포트/ });
  expect(within(r).getByText('🔍 왜 달라졌나')).toBeTruthy();
  const parts = within(r).getByRole('list', { name: '원인별 몫' });
  expect(within(parts).getAllByRole('listitem').length).toBeGreaterThan(1);
  expect(within(r).getByText(/몫을 모두 더하면 이익 변화/)).toBeTruthy();
  // 맨 위엔 한 줄 결론과 가장 크게 움직인 곳만, 지표 표는 눌러야 펼쳐진다
  expect(r.querySelector('.report-headline')!.textContent).toMatch(/지난달보다 [\d,.]+만 원 (더|덜) 벌었어요|지난달과 거의 같아요/);
  expect(within(r).getByText(/가장 크게 움직인 곳/)).toBeTruthy();
  expect(within(r).queryByRole('table')).toBeNull();
  fireEvent.click(within(r).getByRole('button', { name: /더 보기/ }));
  expect(within(r).getByRole('table')).toBeTruthy();
  expect(within(r).getByText('손익분기점(하루 주문)')).toBeTruthy();
  expect(r.textContent).toContain('💡');
  // 지난달 리포트로 바꾸면 구조 리포트
  fireEvent.click(screen.getByRole('button', { name: '3월' }));
  expect(screen.getByText('🔍 이번 달 돈이 어디로 갔나')).toBeTruthy();
});

test('도감: 연 카드는 내 숫자와 설명, 못 연 카드는 여는 법', () => {
  render(<LearnPanel state={twoMonths} update={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: /도감 \d+\/25/ }));
  const dex = screen.getByRole('list', { name: '경영 개념 도감' });
  const cards = within(dex).getAllByRole('listitem');
  expect(cards).toHaveLength(25);
  const be = cards.find((c) => c.textContent!.includes('손익분기점'))!;
  expect(be.textContent).toContain('방금 겪은 일');
  expect(be.textContent).toMatch(/하루 주문 [\d.]+건/);
  const trust = cards.find((c) => c.textContent!.includes('약속과 신뢰'))!;
  expect(trust.className).toContain('locked');
  expect(trust.textContent).toContain('메뉴 약속');
});

test('월말 창의 「부검 리포트 보기」는 배움 탭으로 간다', () => {
  const onGoto = vi.fn(); const onDismiss = vi.fn();
  render(<PauseModal reason={{ kind: 'monthEnd', monthIndex: 0 }} state={twoMonths} now={0} onDismiss={onDismiss} onGoto={onGoto} />);
  fireEvent.click(screen.getByRole('button', { name: /부검 리포트 보기/ }));
  expect(onGoto).toHaveBeenCalledWith('learn');
  expect(onDismiss).toHaveBeenCalledWith({ resume: false });
});

test('리포트가 아직 없으면 언제 나오는지 알려 준다', () => {
  render(<LearnPanel state={g()} update={() => {}} />);
  expect(screen.getByText(/첫 부검 리포트는 이번 달 마지막 날/)).toBeTruthy();
});
