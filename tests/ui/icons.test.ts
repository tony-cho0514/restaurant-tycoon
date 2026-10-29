import { INGREDIENT_IDS } from '../../src/sim/ingredients';
import { LEVER_IDS } from '../../src/sim/levers';
import { MENU } from '../../src/sim/menu';
import { NEIGHBORHOODS } from '../../src/sim/neighborhoods';
import { INGREDIENT_ICON, LEVER_ICON, MENU_ICON, NEIGHBORHOOD_SCENE, newsIcon, CUSTOMER_ICONS } from '../../src/ui/icons';

test('재료·메뉴·운영 수단·동네마다 그림이 있다', () => {
  for (const id of INGREDIENT_IDS) expect(INGREDIENT_ICON[id]).toBeTruthy();
  for (const id of Object.keys(MENU)) expect(MENU_ICON[id as keyof typeof MENU_ICON]).toBeTruthy();
  for (const id of LEVER_IDS) expect(LEVER_ICON[id]).toBeTruthy();
  for (const id of Object.keys(NEIGHBORHOODS)) expect(NEIGHBORHOOD_SCENE[id as keyof typeof NEIGHBORHOOD_SCENE].length).toBeGreaterThanOrEqual(4);
  expect(CUSTOMER_ICONS.length).toBeGreaterThanOrEqual(4);
});

test('뉴스는 종류마다 그림이 다르다', () => {
  expect(newsIcon({ kind: 'signal', shockType: 'CHEESE_SHORTAGE' })).not.toBe(newsIcon({ kind: 'signal', shockType: 'FESTIVAL' }));
  expect(newsIcon({ kind: 'flavor' })).toBeTruthy();
});
