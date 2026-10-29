// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react';
import { NewGame } from '../../src/ui/screens/NewGame';

test('동네 카드 3장과 개업', () => {
  const onStart = vi.fn(); render(<NewGame onStart={onStart} />);
  expect(screen.getByText('대학가 「새내기길」')).toBeTruthy(); expect(screen.getAllByRole('button', { name: '여기서 개업' })).toHaveLength(3);
  fireEvent.click(screen.getAllByRole('button', { name: '여기서 개업' })[2]);
  expect(onStart).toHaveBeenCalledWith({ neighborhoodId: 'residential', shopName: '우리 동네 피자' });
});
