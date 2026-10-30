// 화면 곳곳에 쓰는 그림 문자(아이패드의 컬러 이모지로 그려진다).
import type { IngredientId } from '../sim/ingredients';
import type { LeverId } from '../sim/levers';
import type { MenuItemId } from '../sim/menu';
import type { NeighborhoodId } from '../sim/neighborhoods';
import type { Message, Sender } from '../sim/messages';
import type { NewsItem, ShockType } from '../sim/news';

export const INGREDIENT_ICON: Record<IngredientId, string> = {
  flour: '🌾',
  mozzarella: '🧀',
  tomatoSauce: '🍅',
  pepperoni: '🍖',
  veg: '🫑',
  box: '📦',
  cola: '🥤',
  cola500: '🥫',
  potato: '🥔',
  bulgogi: '🥩',
  sweetPotato: '🍠',
  pineapple: '🍍',
  ham: '🥓',
};

export const MENU_ICON: Record<MenuItemId, string> = {
  cheese: '🧀',
  pepperoni: '🍖',
  combo: '🫑',
  potato: '🥔',
  bulgogi: '🥩',
  goguma: '🍠',
  hawaiian: '🍍',
  cola: '🥤',
};

export const LEVER_ICON: Record<LeverId, string> = {
  freeCola: '🥤',
  premiumCheese: '🧀',
  insulatedBox: '🔥',
  reviewReplies: '💬',
  appAds: '📣',
};

/** 새 게임 화면의 동네 그림: 여러 그림 문자로 꾸민 작은 풍경 */
export const NEIGHBORHOOD_SCENE: Record<NeighborhoodId, string[]> = {
  campus: ['🏫', '🎓', '📚', '🚲', '☕', '🧑‍🎓'],
  office: ['🏢', '💼', '🚇', '☕', '🏙️', '👩‍💼'],
  residential: ['🏡', '🌳', '🛝', '🐕', '🏘️', '👨‍👩‍👧'],
};

export const CUSTOMER_ICONS = ['🧑‍🎓', '👩‍💼', '👨‍👩‍👧', '👵', '🧑', '👨‍🍳'];
export const RIDER_ICON = '🛵';
export const PIZZA_ICON = '🍕';

const SHOCK_ICON: Record<ShockType, string> = {
  FX_SPIKE: '💱',
  FX_DROP: '💱',
  CHEESE_SHORTAGE: '🧀',
  VEG_HARVEST: '🥬',
  FESTIVAL: '🎉',
  RECESSION: '📉',
  BOOM: '📈',
  RECOVERY: '⚖️',
};

export function newsIcon(n: Pick<NewsItem, 'kind'> & { shockType?: ShockType }): string {
  if (n.shockType) return SHOCK_ICON[n.shockType];
  if (n.kind === 'announce') return '📢';
  return '📰';
}

const SENDER_ICON: Record<Sender, string> = {
  review: '⭐',
  request: '💬',
  group: '🎉',
  staff: '👷',
  supplier: '🚚',
  news: '📰',
  owner: '🧑‍🍳',
  book: '📚',
  landlord: '🏢',
  bank: '🏦',
};

/** 메시지 보낸 쪽 그림: 리뷰는 배달앱·홀, 뉴스는 사건 종류마다 */
export function messageIcon(m: Pick<Message, 'from' | 'channel' | 'shockType'>): string {
  if (m.from === 'review') return m.channel === 'hall' ? '🍽️' : '📱';
  if (m.from === 'news' && m.shockType) return SHOCK_ICON[m.shockType];
  return SENDER_ICON[m.from];
}

export const TAB_ICON = { status: '📊', sales: '🧾', menu: '🍕', inventory: '📦', staff: '👥', shop: '🏪', levers: '🛠️', ledger: '📒', messages: '💬', learn: '📚' } as const;
