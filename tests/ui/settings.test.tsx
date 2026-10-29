// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsMenu } from '../../src/ui/components/SettingsMenu';
import { exportSave } from '../../src/sim/save';
import { g } from '../sim/gameHelpers';

test('엉뚱한 파일을 불러오면 오류 문구', async () => {
  render(<SettingsMenu state={g()} onReplace={() => {}} onReset={() => {}} />); fireEvent.click(screen.getByRole('button', { name: '설정' }));
  const file = new File(['{"hello":1}'], 'x.json', { type: 'application/json' });
  fireEvent.change(screen.getByLabelText('저장 파일 불러오기'), { target: { files: [file] } });
  expect(await screen.findByText('이 게임의 저장 파일이 아니에요')).toBeTruthy();
});

test('제대로 된 저장 파일이면 바꿔 끼운다', async () => {
  const onReplace = vi.fn(); const s = g();
  render(<SettingsMenu state={s} onReplace={onReplace} onReset={() => {}} />); fireEvent.click(screen.getByRole('button', { name: '설정' }));
  const file = new File([exportSave(s, 0)], 'save.json', { type: 'application/json' });
  fireEvent.change(screen.getByLabelText('저장 파일 불러오기'), { target: { files: [file] } });
  await vi.waitFor(() => expect(onReplace).toHaveBeenCalledWith(s));
});

test('처음부터 다시는 확인 두 번', () => {
  const onReset = vi.fn(); window.confirm = vi.fn().mockReturnValue(true);
  render(<SettingsMenu state={g()} onReplace={() => {}} onReset={onReset} />); fireEvent.click(screen.getByRole('button', { name: '설정' }));
  fireEvent.click(screen.getByRole('button', { name: '처음부터 다시' })); expect(window.confirm).toHaveBeenCalledTimes(2); expect(onReset).toHaveBeenCalled();
});
