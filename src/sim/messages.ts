// 사이드 메시지: 손님 리뷰·요청, 알바 카톡, 거래처 귀띔, 사장님 혼잣말. 뉴스를 찾아 읽는 대신 말풍선으로 뜨고 메시지 탭에 쌓인다.
// 리뷰·요청은 실제 계산(기다린 시간·가격·운영 수단)에서 나온다. 문구는 따로 만든 난수로 골라서 장사 결과는 바뀌지 않는다.
import {
  NICKNAMES, OWNER_TEXT, REQUEST_TEXT, REVIEW_TEXT, SIGNAL_TIPS, STAFF_TEXT, type Topic,
} from '../content/messageTemplates';
import { REPLY_DAYS, STRESS_TIRED } from './balance';
import { INGREDIENTS, type IngredientId } from './ingredients';
import { stockOf } from './inventory';
import { MENU, PIZZA_IDS, activePizzas, type PizzaId } from './menu';
import { NEIGHBORHOODS } from './neighborhoods';
import type { NewsItem, ShockType } from './news';
import { ownerAway } from './owner';
import type { Channel } from './ratings';
import { Rng } from './rng';
import { DAY_NAMES } from './time';
import type { GameState } from './types';

export type { Topic };
export type Sender = 'review' | 'request' | 'group' | 'staff' | 'supplier' | 'news' | 'owner' | 'book';
/** 메시지에서 바로 가 볼 탭 */
export type MessageAction = 'menu' | 'inventory' | 'levers' | 'shop' | 'staff' | 'ledger' | 'learn' | 'sales';
/** 답장을 받을 수 있는 메시지: 나쁜 리뷰, 손님 요청(무엇을 바라는지) */
export type Ask = 'review' | 'price' | 'cheese' | 'cola' | 'box' | 'replies' | 'menu' | 'closed' | 'late';
export type ReplyId = 'auto' | 'apology' | 'coupon' | 'rebut' | 'accept' | 'develop' | 'promise' | 'decline';

/** 답장 뒤에 일어날 일: 쿠폰 손님이 다시 오기, 메뉴 약속 기한 */
export type FollowUp =
  | { kind: 'coupon'; msgId: number; name: string; channel: Channel; day: number; hour: number }
  | { kind: 'promise'; msgId: number; name: string; channel: Channel; menu: PizzaId; dueDay: number };

export interface Message {
  id: number;
  day: number;
  hour: number;
  from: Sender;
  name: string;
  text: string;
  /** 메시지 탭에서만 보이는 덧붙임(뉴스 원문 등) */
  detail?: string;
  /** 리뷰 별점 */
  stars?: number;
  channel?: Channel;
  tone: 'good' | 'bad' | 'neutral';
  /** 말풍선을 오래 띄우고 「중요」로 표시 */
  important?: boolean;
  topic?: Topic;
  shockType?: ShockType;
  /** 같은 날 같은 알림을 두 번 보내지 않기 위한 표시 */
  key?: string;
  action?: MessageAction;
  /** 답장 받기: 무엇에 대한 답장인지, 언제까지, 바라는 메뉴 */
  ask?: Ask;
  replyBy?: number;
  menu?: PizzaId;
  /** 이 나쁜 리뷰가 깎은 평점(사과로 되돌릴 몫) */
  hit?: number;
  /** 사장님이 단 답장(리뷰 답글 운영 수단이 켜져 있으면 자동 답글) */
  reply?: { id: ReplyId; text: string };
}

export interface MessageState {
  items: Message[];
  nextId: number;
  /** 답장 뒤에 일어날 일 */
  pending: FollowUp[];
}

export const MESSAGES_KEEP = 300;
/** 손님 한 명이 리뷰를 남길 확률(한 시간에 리뷰는 하나까지) */
const REVIEW_CHANCE = 0.07;
/** 영업 한 시간마다 손님 요청이 올 확률 */
const REQUEST_CHANCE = 0.06;
export const OWNER_NAME = '사장님(나)';
export const AUTO_REPLY = '불편 드려 죄송해요. 더 신경 쓸게요 🙏 (자동 답글)';

export function pushMessage(s: GameState, m: Omit<Message, 'id' | 'day' | 'hour'> & Partial<Pick<Message, 'day' | 'hour'>>): void {
  const msg: Message = { day: s.clock.day, hour: s.clock.hour, ...m, id: s.messages.nextId };
  s.messages = { ...s.messages, items: [...s.messages.items, msg].slice(-MESSAGES_KEEP), nextId: s.messages.nextId + 1 };
}

/** 메시지 문구 전용 난수: 날짜·시각·용도마다 새로 만든다(장사 난수를 건드리지 않는다). */
export function messageRng(s: GameState, salt: number): Rng {
  return new Rng((Math.imul(s.seed, 0x9e3779b1) ^ Math.imul(s.clock.day + 1, 0x85ebca6b) ^ Math.imul(s.clock.hour * 16 + salt + 1, 0xc2b2ae35)) >>> 0);
}

function fill(text: string, vars: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? '');
}

const pizzaName = (id: PizzaId) => MENU[id].name.replace(/ L$/, '');
const sentToday = (s: GameState, key: string) => s.messages.items.some((m) => m.key === key && m.day === s.clock.day);
const sentWithin = (s: GameState, key: string, days: number) => s.messages.items.some((m) => m.key === key && m.day > s.clock.day - days);

function manwon(n: number): string {
  return `${Math.round(n / 10000).toLocaleString('ko-KR')}만 원`;
}

// ── 영업 한 시간마다 ─────────────────────────────────

/** 손님 한 명의 경험: 리뷰 재료 */
export interface ReviewSeed {
  ch: Channel;
  sat: number;
  wait: number;
  pizza: PizzaId;
  gaveCola: boolean;
}

export interface HourCtx {
  seeds: ReviewSeed[];
  priceIndex: number;
  hallBonus: number;
  /** 사장님 컨디션이 응대에 준 값(지치면 음수) */
  mood: number;
  stockouts: IngredientId[];
  /** 지금 근무 중인 알바 이름 */
  staffNames: string[];
  /** 하루 예상 사용량 */
  usage: Record<IngredientId, number>;
  closeHour: number;
  openHour: number;
}

const TOPIC_ACTION: Partial<Record<Topic, MessageAction>> = { slow: 'staff', cold: 'levers', price: 'menu', tired: 'shop', meh: 'levers' };

export function starsOf(sat: number): number {
  return Math.min(5, Math.max(1, Math.round(sat)));
}

/** 별점이 왜 그렇게 나왔는지: 만족도를 실제로 깎거나 올린 이유에서 고른다. */
export function reviewTopic(r: ReviewSeed, c: Pick<HourCtx, 'priceIndex' | 'hallBonus' | 'mood'>, s: GameState, rng: Rng): Topic {
  const n = NEIGHBORHOODS[s.neighborhoodId];
  const waitPen = r.ch === 'delivery' ? Math.max(0, (r.wait - 35) / 20) : Math.max(0, (r.wait - 15) / 10);
  const pricePen = Math.max(0, c.priceIndex - 1) * 2 * n.priceSensitivity;
  const stars = starsOf(r.sat);
  if (stars <= 3) {
    const bar = stars <= 2 ? 0.3 : 0.2;
    if (waitPen >= pricePen && waitPen > bar) return r.ch === 'delivery' && r.wait >= 55 ? 'cold' : 'slow';
    if (pricePen > bar) return 'price';
    if (r.ch === 'hall' && c.mood < 0) return 'tired';
    return 'meh';
  }
  const good: { item: Topic; weight: number }[] = [{ item: 'tasty', weight: 1 }];
  if (s.levers.premiumCheese) good.push({ item: 'cheese', weight: 2 });
  if (r.gaveCola) good.push({ item: 'cola', weight: 2 });
  if (r.ch === 'delivery' && s.levers.insulatedBox) good.push({ item: 'hot', weight: 1.5 });
  if (r.ch === 'hall' && c.hallBonus > 0.05) good.push({ item: 'kind', weight: 2 });
  if (r.wait <= (r.ch === 'delivery' ? 30 : 12)) good.push({ item: 'fast', weight: 1.5 });
  if (c.priceIndex < 0.97) good.push({ item: 'cheap', weight: 2 });
  return rng.weighted(good);
}

function reviewMessage(s: GameState, c: HourCtx, rng: Rng): void {
  if (c.seeds.length === 0 || !rng.chance(1 - Math.pow(1 - REVIEW_CHANCE, c.seeds.length))) return;
  // 아주 나빴거나 아주 좋았던 손님이 리뷰를 더 잘 쓴다.
  const r = rng.weighted(c.seeds.map((x) => {
    const st = starsOf(x.sat);
    return { item: x, weight: st <= 2 ? 3 : st === 3 ? 0.8 : st === 4 ? 0.5 : 1.2 };
  }));
  const topic = reviewTopic(r, c, s, rng);
  const stars = starsOf(r.sat);
  const names = NICKNAMES[s.neighborhoodId][r.ch];
  // 별 1~2개 리뷰엔 답장할 수 있다. 리뷰 답글 운영 수단을 켜 두면 사과 답글이 자동으로 달린다.
  const bad = stars <= 2;
  const alpha = (r.ch === 'hall' ? 0.02 : 0.03) * (s.levers.reviewReplies ? 0.7 : 1);
  pushMessage(s, {
    ...(bad ? {
      ask: 'review' as const, replyBy: s.clock.day + REPLY_DAYS, hit: Math.max(0, s.ratings[r.ch] - r.sat) * alpha,
      reply: s.levers.reviewReplies ? { id: 'auto' as const, text: AUTO_REPLY } : undefined,
    } : {}),
    from: 'review', channel: r.ch, name: rng.pick(names), stars, topic,
    // 홀 대기는 한 시간에서 끊는다(그보다 오래면 손님은 그냥 기다린 것으로 말한다). 배달은 주문 기록의 분과 같게.
    text: fill(rng.pick(REVIEW_TEXT[topic][r.ch]), { pizza: pizzaName(r.pizza), min: String(Math.round(r.ch === 'hall' ? Math.min(r.wait, 60) : r.wait)) }),
    tone: stars >= 4 ? 'good' : stars <= 2 ? 'bad' : 'neutral',
    action: stars <= 3 ? TOPIC_ACTION[topic] : undefined,
  });
}

/** 지금 파는 메뉴·켜 둔 서비스에 쓰는 재료 */
function ingredientsInUse(s: GameState): Set<IngredientId> {
  const used = new Set<IngredientId>(['box']);
  for (const id of activePizzas(s.menuActive)) for (const ing of Object.keys(MENU[id].recipe) as IngredientId[]) used.add(ing);
  if (s.menuActive.cola) used.add('cola');
  if (s.levers.freeCola) used.add('cola500');
  return used;
}

function amountText(id: IngredientId, qty: number): string {
  const unit = INGREDIENTS[id].unit;
  return unit === 'kg' ? `${qty.toFixed(1)}kg` : `${Math.floor(qty)}${unit}`;
}

function stockMessages(s: GameState, c: HourCtx, rng: Rng): void {
  const say = (kind: 'out' | 'low', id: IngredientId, left: string) => {
    const speaker = c.staffNames.length > 0 ? rng.pick(c.staffNames) : null;
    const vars = { ing: INGREDIENTS[id].name, left };
    pushMessage(s, {
      from: speaker ? 'staff' : 'owner', name: speaker ?? OWNER_NAME,
      text: fill(rng.pick(speaker ? STAFF_TEXT[kind] : OWNER_TEXT[kind]), vars),
      tone: 'bad', important: kind === 'out', key: `${kind}-${id}`, action: 'inventory',
    });
  };
  for (const id of c.stockouts) if (!sentToday(s, `out-${id}`)) say('out', id, '');
  // 오늘 남은 영업에 필요한 양보다 적게 남은 재료
  const share = (c.closeHour - s.clock.hour - 1) / Math.max(1, c.closeHour - c.openHour);
  if (share <= 0) return;
  for (const id of ingredientsInUse(s)) {
    const have = stockOf(s.inventory, id);
    if (have <= 0 || have >= c.usage[id] * share || sentToday(s, `low-${id}`) || sentToday(s, `out-${id}`)) continue;
    say('low', id, amountText(id, have));
  }
}

function requestMessage(s: GameState, c: HourCtx, rng: Rng): void {
  if (c.seeds.length === 0 || !rng.chance(REQUEST_CHANCE)) return;
  const n = NEIGHBORHOODS[s.neighborhoodId];
  type Opt = { key: string; text: string; action?: MessageAction; ask?: Ask; menu?: PizzaId };
  const opts: { item: Opt; weight: number }[] = [];
  const add = (key: string, pool: string[], weight: number, action?: MessageAction, vars: Record<string, string> = {}, extra: Partial<Opt> = {}) => {
    if (!sentWithin(s, `req-${key}`, 7)) opts.push({ item: { key: `req-${key}`, text: fill(rng.pick(pool), vars), action, ...extra }, weight });
  };
  if (c.priceIndex > 1.08) add('price', REQUEST_TEXT.price, 3 * n.priceSensitivity, 'menu', {}, { ask: 'price' });
  if (!s.levers.premiumCheese) add('cheese', REQUEST_TEXT.cheese, 1.5, 'levers', {}, { ask: 'cheese' });
  if (!s.levers.freeCola && n.deliveryShare >= 0.5) add('cola', REQUEST_TEXT.cola, 1, 'levers', {}, { ask: 'cola' });
  if (!s.levers.insulatedBox && c.seeds.some((r) => r.ch === 'delivery' && r.wait >= 45)) add('box', REQUEST_TEXT.box, 2, 'levers', {}, { ask: 'box' });
  if (!s.levers.reviewReplies) add('replies', REQUEST_TEXT.replies, 0.7, 'levers', {}, { ask: 'replies' });
  const wish = PIZZA_IDS.filter((id) => !s.menuActive[id] && (n.prefs[id] ?? 0) >= 1.1);
  if (wish.length > 0) {
    const menu = rng.pick(wish);
    add('menu', REQUEST_TEXT.menu, 2, 'menu', { menu: pizzaName(menu) }, { ask: 'menu', menu });
  }
  if (s.settings.closedDay !== null) add('closed', REQUEST_TEXT.closedDay, 1, 'shop', { day: DAY_NAMES[s.settings.closedDay] }, { ask: 'closed' });
  if (s.settings.closeHour <= 22 && (n.extraHours[22] ?? 0) >= 0.5) add('late', REQUEST_TEXT.late, 0.8, 'shop', {}, { ask: 'late' });
  add('local', REQUEST_TEXT.local[n.id], 1);
  if (opts.length === 0) return;
  const pick = rng.weighted(opts);
  const ch: Channel = rng.chance(n.deliveryShare) ? 'delivery' : 'hall';
  pushMessage(s, {
    from: 'request', channel: ch, name: rng.pick(NICKNAMES[n.id][ch]), text: pick.text, tone: 'neutral', key: pick.key, action: pick.action,
    ...(pick.ask ? { ask: pick.ask, menu: pick.menu, replyBy: s.clock.day + REPLY_DAYS } : {}),
  });
}

/** 영업 한 시간이 끝날 때: 리뷰, 재료 알림, 손님 요청 */
export function hourMessages(s: GameState, c: HourCtx): void {
  const rng = messageRng(s, 1);
  reviewMessage(s, c, rng);
  stockMessages(s, c, rng);
  requestMessage(s, c, rng);
}

// ── 하루 단위 ────────────────────────────────────────

/** 개점 때: 결근한 알바의 카톡 */
export function absenceMessages(s: GameState): void {
  const rng = messageRng(s, 2);
  for (const id of s.absentToday ?? []) {
    const x = s.staff.find((y) => y.id === id);
    if (!x) continue;
    pushMessage(s, { from: 'staff', name: x.name, text: rng.pick(STAFF_TEXT.absent), detail: '오늘은 일손이 하나 모자라요.', tone: 'bad', action: 'staff' });
  }
}

/** 스트레스가 지침 선을 넘었을 때 사장님 혼잣말 */
export function tiredMessage(s: GameState): void {
  pushMessage(s, {
    from: 'owner', name: OWNER_NAME, text: messageRng(s, 3).pick(OWNER_TEXT.tired),
    detail: '스트레스가 70을 넘었어요. 지치면 피자를 덜 만들고, 응대가 거칠어지고, 실수로 버리는 피자가 생겨요. 가게 탭에서 일찍 퇴근·하루 쉬기·휴가를 고를 수 있어요.',
    tone: 'bad', important: true, action: 'shop',
  });
}

/** 마감 때: 오늘 장사 한 줄 정리(사장님이 쉰 날은 알바가, 아무도 안 연 날은 쉰 소감) */
export function dayEndMessage(s: GameState, closed: boolean, record: boolean): void {
  const rng = messageRng(s, 4);
  const t = s.today;
  const orders = t.hallOrders + t.deliveryOrders + t.groupOrders;
  const away = ownerAway(s);
  if (closed || orders === 0) {
    if (closed || away) {
      const text = s.owner.awayReason === 'burnout' ? '쓰러지고 나니 알겠다. 쉬는 것도 일이다 🛌' : rng.pick(OWNER_TEXT.restDay);
      pushMessage(s, { from: 'owner', name: OWNER_NAME, text, tone: 'good' });
    }
    return;
  }
  const revenue = t.revenueHall + t.revenueDelivery;
  const lost = t.lostOrders + t.stockoutOrders;
  const sum = `주문 ${orders}건, 매출 ${manwon(revenue)}.`;
  if (away) {
    const working = s.staff.filter((x) => !(s.absentToday ?? []).includes(x.id));
    const name = working.length > 0 ? rng.pick(working).name : '알바';
    pushMessage(s, {
      from: 'staff', name, text: `사장님, 오늘 장사 정리했어요! ${sum}${lost > 0 ? ` 놓친 주문이 ${lost}건 있었어요 ㅠ` : ' 푹 쉬세요 👍'}`,
      tone: 'neutral', action: 'ledger',
    });
    return;
  }
  let text = record ? `매출 신기록이다!! 🎉 ${sum}` : `오늘 장사 끝! ${sum}`;
  if (lost > 0) text += ` 놓친 주문 ${lost}건이 아깝다.`;
  const o = s.owner;
  if (o.stress >= STRESS_TIRED) text += ' 몸이 천근만근이다…';
  else if (o.stress >= 50) text += ' 어깨가 뻐근하다…';
  else if (o.daysWithoutRest >= 6) text += ` 쉬는 날 없이 ${o.daysWithoutRest}일째…`;
  pushMessage(s, { from: 'owner', name: OWNER_NAME, text, tone: record ? 'good' : 'neutral', important: record, action: 'ledger' });
}

// ── 뉴스 → 메시지 ────────────────────────────────────

const TAG = /^\[([^\]]+)\]\s*/;
const SHOCK_ACTION: Record<ShockType, MessageAction> = {
  FX_SPIKE: 'inventory', FX_DROP: 'inventory', CHEESE_SHORTAGE: 'inventory', VEG_HARVEST: 'inventory', FESTIVAL: 'inventory',
  RECESSION: 'menu', BOOM: 'menu', RECOVERY: 'menu',
};

/** 뉴스 한 건을 메시지로: 신호는 거래처·단골의 귀띔으로, 나머지는 보낸 쪽(직원·단체·사장님·뉴스)에 맞춰 */
export function fromNews(n: NewsItem, hour: number): Omit<Message, 'id'> {
  const tag = n.headline.match(TAG)?.[1];
  const headline = n.headline.replace(TAG, '');
  const base = { day: n.day, hour, tone: n.tone, shockType: n.shockType };
  if (n.kind === 'signal' && n.shockType) {
    const tips = SIGNAL_TIPS[n.shockType];
    const tip = tips[Number(n.id.slice(1)) % tips.length];
    return { ...base, from: tip.from, name: tip.name, text: tip.text, detail: `${headline} — ${n.body}`, important: true, action: SHOCK_ACTION[n.shockType] };
  }
  const important = n.important || n.tone === 'bad';
  switch (tag) {
    case '거래처':
      return { ...base, from: 'supplier', name: '거래처', text: headline, detail: n.body, important };
    case '손님':
      return { ...base, from: 'request', name: '단골 손님', text: headline, detail: n.body, important };
    case '직원':
    case '채용':
      return { ...base, from: 'staff', name: tag === '채용' ? '채용 소식' : '직원 소식', text: headline, detail: n.body, important, action: 'staff' };
    case '단체':
      return { ...base, from: 'group', name: '단체 주문', text: headline, detail: n.body, important };
    case '사장님':
      return { ...base, from: 'owner', name: OWNER_NAME, text: headline, detail: n.body, important, action: 'shop' };
    default:
      return {
        ...base, from: 'news', name: tag ? `${tag} 소식` : '소식', text: headline, detail: n.body, important,
        action: n.shockType ? SHOCK_ACTION[n.shockType] : tag === '노동' ? 'staff' : undefined,
      };
  }
}

/** 새 게임·옛 저장의 첫 메시지들 */
export function initialMessages(news: NewsItem[], openingDay: boolean): MessageState {
  const items: Message[] = news.slice(-60).map((n, i) => ({ ...fromNews(n, 11), id: i + 1 }));
  if (openingDay) items.push({ id: items.length + 1, day: 0, hour: 11, from: 'owner', name: OWNER_NAME, text: OWNER_TEXT.open[0], tone: 'good' });
  return { items, nextId: items.length + 1, pending: [] };
}
