// @vitest-environment jsdom
// 저장 지키기: 아이패드 사파리 탭이면 홈 화면 추가 안내를 한 번, 오래 백업 안 했으면 내보내기를 권한다.
import { fireEvent, render, screen } from '@testing-library/react';
import { SaveGuard, noteBackup } from '../../src/ui/components/SaveGuard';
import { g } from '../sim/gameHelpers';

const DAY = 86_400_000;
const realUA = navigator.userAgent;
const setUA = (ua: string) => Object.defineProperty(window.navigator, 'userAgent', { value: ua, configurable: true });

beforeEach(() => { localStorage.clear(); setUA(realUA); });
afterAll(() => setUA(realUA));

test('개업하고 7일 넘게 백업이 없으면 내보내기를 권하고, 「나중에」로 닫힌다', () => {
  const s = { ...g(), createdAt: 0 };
  const { rerender } = render(<SaveGuard state={s} now={3 * DAY} />);
  expect(screen.queryByRole('note', { name: '백업 알림' })).toBeNull();
  rerender(<SaveGuard state={s} now={8 * DAY} />);
  expect(screen.getByRole('note', { name: '백업 알림' }).textContent).toContain('개업한 지 8일, 아직 백업이 없어요');
  fireEvent.click(screen.getByRole('button', { name: '나중에' }));
  expect(screen.queryByRole('note', { name: '백업 알림' })).toBeNull();
});

test('최근에 내보냈으면 알리지 않는다', () => {
  noteBackup(Date.now());
  render(<SaveGuard state={{ ...g(), createdAt: 0 }} now={Date.now() + 2 * DAY} />);
  expect(screen.queryByRole('note', { name: '백업 알림' })).toBeNull();
});

test('아이패드 사파리 탭에서는 홈 화면 추가 안내를 한 번 보여 준다(사파리와 홈 화면 앱은 저장이 따로라는 것까지)', () => {
  setUA('Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1');
  const s = { ...g(), createdAt: Date.now() };
  const { unmount } = render(<SaveGuard state={s} now={Date.now()} />);
  const card = screen.getByRole('note', { name: '홈 화면에 추가 안내' });
  expect(card.textContent).toContain('홈 화면에 추가');
  expect(card.textContent).toContain('저장이 따로');
  fireEvent.click(screen.getByRole('button', { name: '알겠어요' }));
  expect(screen.queryByRole('note', { name: '홈 화면에 추가 안내' })).toBeNull();
  unmount();
  render(<SaveGuard state={s} now={Date.now()} />);
  expect(screen.queryByRole('note', { name: '홈 화면에 추가 안내' })).toBeNull();
});
