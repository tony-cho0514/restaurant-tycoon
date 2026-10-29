// @vitest-environment jsdom
// 전체 검토에서 나온 화면 쪽 지적을 고정하는 회귀 테스트
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import { usePlayback } from '../../src/ui/hooks/usePlayback';
import { PauseModal } from '../../src/ui/components/PauseModal';
import { ErrorBoundary } from '../../src/ui/components/ErrorBoundary';
import { NewGame } from '../../src/ui/screens/NewGame';
import { App } from '../../src/ui/App';
import { exportSaveFile } from '../../src/ui/saveFile';
import { CORRUPT_KEY, SAVE_KEY, exportSave } from '../../src/sim/save';
import { midDay, g } from '../sim/gameHelpers';

afterEach(() => { vi.useRealTimers(); localStorage.clear(); });

test('「보기」로 창을 닫으면 다시 재생하지 않는다', () => {
  vi.useFakeTimers();
  const s = midDay(); s.news.pending.push({ id: 'p', type: 'FESTIVAL', signalDay: 0, fireDay: 2, real: true, magnitude: 0.6 });
  const { result } = renderHook(() => usePlayback(s, { now: () => 0, persist: () => {} }));
  act(() => result.current.play()); act(() => { vi.advanceTimersByTime(1948 * 11); });
  expect(result.current.pauses.length).toBeGreaterThan(0);
  for (let i = 0; i < 5 && result.current.pauses.length; i++) act(() => result.current.dismissPause({ resume: false }));
  expect(result.current.playing).toBe(false);
});

test('신호 뉴스 창의 「재고·발주 보기」는 재생 없이 닫는다', () => {
  const s = g(); s.news.items.push({ id: 'n99', day: 0, kind: 'signal', headline: '신호', body: '몸', important: true, tone: 'bad', shockType: 'FX_SPIKE' });
  const onDismiss = vi.fn(); const onGoto = vi.fn();
  render(<PauseModal reason={{ kind: 'news', newsId: 'n99' }} state={s} now={0} onDismiss={onDismiss} onGoto={onGoto} />);
  fireEvent.click(screen.getByRole('button', { name: '재고·발주 보기' }));
  expect(onGoto).toHaveBeenCalledWith('inventory'); expect(onDismiss).toHaveBeenCalledWith({ resume: false });
});

test('화면이 깨지면 하얀 화면 대신 복구 안내', () => {
  const Boom = () => { throw new Error('x'); };
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
  render(<ErrorBoundary actions={{ restoreBackup: () => {}, exportRaw: () => {}, reset: () => {} }}><Boom /></ErrorBoundary>);
  expect(screen.getByText(/화면을 그리다 문제가 생겼어요/)).toBeTruthy();
  expect(screen.getByRole('button', { name: '백업으로 되돌리기' })).toBeTruthy();
  expect(screen.getByRole('button', { name: '저장 원본 내보내기' })).toBeTruthy();
  spy.mockRestore();
});

test('시작 화면에서도 저장 파일을 불러올 수 있다', async () => {
  const onImport = vi.fn(); const s = g();
  render(<NewGame onStart={() => {}} onImport={onImport} />);
  const file = new File([exportSave(s, 0)], 'save.json', { type: 'application/json' });
  fireEvent.change(screen.getByLabelText('저장 파일 불러오기'), { target: { files: [file] } });
  await vi.waitFor(() => expect(onImport).toHaveBeenCalledWith(s));
});

test('저장을 못 읽으면 안내하고 원본은 따로 보관한다', () => {
  localStorage.setItem(SAVE_KEY, '{깨짐');
  render(<App />);
  expect(screen.getByText(/저장된 가게를 읽지 못했어요/)).toBeTruthy();
  expect(localStorage.getItem(CORRUPT_KEY)).toBe('{깨짐');
});

test('내보내기는 가능하면 공유 시트(파일에 저장)를 쓴다', async () => {
  const share = vi.fn().mockResolvedValue(undefined);
  Object.assign(navigator, { canShare: () => true, share });
  expect(await exportSaveFile(g(), 0)).toBe('shared');
  expect(share.mock.calls[0][0].files[0].name).toMatch(/^restaurant-tycoon-save-\d{8}\.json$/);
  delete (navigator as { canShare?: unknown }).canShare; delete (navigator as { share?: unknown }).share;
});

test('공유가 안 되면 내려받기 주소를 60초 넘게 살려 둔다', async () => {
  vi.useFakeTimers();
  const revoke = vi.fn(); Object.assign(URL, { createObjectURL: () => 'blob:x', revokeObjectURL: revoke });
  expect(await exportSaveFile(g(), 0)).toBe('downloaded');
  vi.advanceTimersByTime(59_000); expect(revoke).not.toHaveBeenCalled();
  vi.advanceTimersByTime(2_000); expect(revoke).toHaveBeenCalled();
});
