// 메시지 답장: 나쁜 리뷰엔 사과·쿠폰·반박, 손님 요청엔 들어주기·약속·거절.
// 비용은 버튼에 정확히 보이고, 효과(평점이 얼마나 돌아오나, 손님이 다시 오나)는 해 봐야 안다.
import { FOLLOWUP_TEXT, NICKNAMES, REPLY_TEXT } from '../content/messageTemplates';
import {
  APOLOGY_RESTORE, COUPON_GOODWILL, COUPON_RETURN_CHANCE, COUPON_RETURN_DAYS, COUPON_VALUE, MENU_DEV_COST, PRICE_CUT, PROMISE_DAYS,
  PROMISE_RATING_DOWN, PROMISE_RATING_UP, REBUT_EXTRA_LOSS, REBUT_STRESS, REBUT_WIN_CHANCE, REPLY_STRESS, UTILITIES_PER_HOUR,
} from './balance';
import { dailyLabor } from './labor';
import { LEVERS, orderEconomics, previewLever, type LeverId, type MarginCtx } from './levers';
import { MENU, PIZZA_IDS, clampMenuPrice, type MenuItemId } from './menu';
import { developMenu, setMenuActive } from './menuDev';
import { messageRng, pushMessage, starsOf, type Ask, type FollowUp, type Message, type ReplyId, type ReviewSeed } from './messages';
import { NEIGHBORHOODS } from './neighborhoods';
import { addStress } from './owner';
import type { Channel } from './ratings';
import type { Rng } from './rng';
import { shiftHours } from './staffing';
import type { GameState } from './types';

export interface ReplyOption {
  id: ReplyId;
  label: string;
  /** 미리 보이는 비용(정확한 값) */
  cost: string;
  /** 지금 고를 수 없는 이유 */
  disabled?: string;
}

const LEVER_OF: Partial<Record<Ask, LeverId>> = { cheese: 'premiumCheese', cola: 'freeCola', box: 'insulatedBox', replies: 'reviewReplies' };

const won = (n: number) => `${Math.round(n).toLocaleString('ko-KR')}원`;
const signedWon = (n: number) => `${n >= 0 ? '+' : '−'}${won(Math.abs(n))}`;
const pp = (x: number) => `${x < 0 ? '−' : '+'}${Math.abs(x).toFixed(1)}%p`;
const fill = (text: string, vars: Record<string, string>) => text.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? '');
const pizzaName = (id: MenuItemId) => MENU[id].name.replace(/ L$/, '');

function ctxOf(s: GameState, patch: Partial<MarginCtx> = {}): MarginCtx {
  return {
    prices: s.prices, menuPrices: s.menuPrices, inflation: s.economy.inflation, levers: s.levers, n: NEIGHBORHOODS[s.neighborhoodId],
    cycle: s.economy.cycle, deliveryTip: s.settings.deliveryTip, active: s.menuActive, ...patch,
  };
}

/** 홀·배달을 동네 배달 비중으로 섞은 주문 하나의 매출과 이익률 */
function blended(ctx: MarginCtx) {
  const ds = ctx.n.deliveryShare;
  const h = orderEconomics(ctx, 'hall');
  const d = orderEconomics(ctx, 'delivery');
  return { revenue: (1 - ds) * h.revenuePerOrder + ds * d.revenuePerOrder, margin: (1 - ds) * h.marginRate + ds * d.marginRate };
}

function cutPrices(s: GameState): GameState['menuPrices'] {
  const p = { ...s.menuPrices };
  for (const id of PIZZA_IDS) p[id] = clampMenuPrice(p[id] * (1 - PRICE_CUT));
  return p;
}

/** 일주일 알바비 + 전기·가스(영업시간·휴무를 바꿀 때 비교용) */
function weeklyRunning(s: GameState): number {
  const openDays = 7 - (s.settings.closedDay === null ? 0 : 1);
  const labor = s.staff.reduce((a, x) => {
    const h = shiftHours(s, x.shift);
    return a + dailyLabor(h, x.wage, h * openDays);
  }, 0);
  return openDays * (labor + Math.round(UTILITIES_PER_HOUR * (s.settings.closeHour - s.settings.openHour)));
}

const withSettings = (s: GameState, patch: Partial<GameState['settings']>): GameState => ({ ...s, settings: { ...s.settings, ...patch } });

export function canReply(s: GameState, m: Message): boolean {
  return !!m.ask && (m.replyBy ?? -1) >= s.clock.day && (!m.reply || m.reply.id === 'auto');
}

/** 손님 요청을 들어주는 답장: 이미 있는 기능(운영 수단·가격·휴무·영업시간·메뉴)으로 바로 이어진다. */
function acceptOptions(s: GameState, m: Message): ReplyOption[] {
  const ask = m.ask!;
  const lever = LEVER_OF[ask];
  if (lever) {
    if (s.levers[lever]) return [{ id: 'accept', label: '✅ 이미 하고 있어요', cost: '없음' }];
    const p = previewLever(ctxOf(s), lever, true);
    const parts: string[] = [];
    if (p.perOrderCostDelta !== 0) parts.push(`주문당 원가 ${signedWon(p.perOrderCostDelta)}`);
    if (p.capacityDelta !== 0) parts.push(`시간당 피자 ${p.capacityDelta}판`);
    parts.push(`이익률 ${pp(p.marginDeltaPp)}`);
    return [{ id: 'accept', label: `✅ ${LEVERS[lever].name} 켜기`, cost: parts.join(' · ') }];
  }
  switch (ask) {
    case 'price': {
      const before = blended(ctxOf(s));
      const after = blended(ctxOf(s, { menuPrices: cutPrices(s) }));
      return [{ id: 'accept', label: `✅ 피자값 ${Math.round(PRICE_CUT * 100)}% 내리기`, cost: `주문당 매출 ${signedWon(after.revenue - before.revenue)} · 이익률 ${pp((after.margin - before.margin) * 100)}` }];
    }
    case 'closed': {
      if (s.settings.closedDay === null) return [{ id: 'accept', label: '✅ 이미 매일 열어요', cost: '없음' }];
      const delta = weeklyRunning(withSettings(s, { closedDay: null })) - weeklyRunning(s);
      return [{ id: 'accept', label: '✅ 정기 휴무 없애기', cost: `알바비·전기 주 ${signedWon(delta)} · 쉬는 날이 없어져 스트레스가 쌓여요` }];
    }
    case 'late': {
      const close = s.settings.closeHour + 1;
      if (close > 24) return [{ id: 'accept', label: '✅ 한 시간 더 열기', cost: '', disabled: '자정보다 늦게는 못 열어요' }];
      const delta = weeklyRunning(withSettings(s, { closeHour: close })) - weeklyRunning(s);
      return [{ id: 'accept', label: `✅ ${close === 24 ? '자정' : `${close}시`}까지 열기`, cost: `알바비·전기 주 ${signedWon(delta)} · 사장님 일하는 시간도 늘어요` }];
    }
    case 'menu': {
      const id = m.menu!;
      if (s.menuActive[id]) return [{ id: 'accept', label: '✅ 이미 팔고 있어요', cost: '없음' }];
      if (s.menuDeveloped[id]) return [{ id: 'accept', label: `✅ ${pizzaName(id)} 다시 팔기`, cost: '없음' }];
      try {
        const spent = s.cash - developMenu(s, id).cash;
        return [{ id: 'develop', label: `🧑‍🍳 ${pizzaName(id)} 바로 개발`, cost: `${won(spent)}(개발비 ${won(MENU_DEV_COST)} + 첫 재료)` }];
      } catch (e) {
        return [{ id: 'develop', label: `🧑‍🍳 ${pizzaName(id)} 바로 개발`, cost: `개발비 ${won(MENU_DEV_COST)} + 첫 재료`, disabled: (e as Error).message }];
      }
    }
    default:
      return [];
  }
}

/** 이 메시지에 고를 수 있는 답장(답장할 수 없으면 빈 목록) */
export function replyOptions(s: GameState, m: Message): ReplyOption[] {
  if (!canReply(s, m)) return [];
  if (m.ask === 'review') {
    const coupon: ReplyOption = { id: 'coupon', label: '🎟️ 사과 + 쿠폰', cost: `쿠폰 ${won(COUPON_VALUE)}(다시 시킬 때만 빠짐) · 스트레스 +${REPLY_STRESS}` };
    // 리뷰 답글 운영 수단이 이미 사과했으면 쿠폰만 더 줄 수 있다.
    if (m.reply?.id === 'auto') return [coupon];
    return [
      { id: 'apology', label: '🙏 사과 답글', cost: `스트레스 +${REPLY_STRESS}` },
      coupon,
      { id: 'rebut', label: '😤 반박', cost: '없음' },
    ];
  }
  const out = acceptOptions(s, m);
  if (m.ask === 'menu' && !s.menuDeveloped[m.menu!]) out.push({ id: 'promise', label: '🤝 약속하기', cost: `지금 드는 돈 없음 · ${PROMISE_DAYS}일 안에 개발해야 해요` });
  out.push({ id: 'decline', label: '🙅 정중히 거절', cost: '없음' });
  return out;
}

function bump(s: GameState, ch: Channel, delta: number): void {
  s.ratings = { ...s.ratings, [ch]: Math.min(5, Math.max(1, s.ratings[ch] + delta)) };
}

function stranger(s: GameState, ch: Channel, rng: Rng): string {
  return rng.pick(NICKNAMES[s.neighborhoodId][ch]);
}

/** 답장 고르기. 고를 수 없는 답장이면 이유를 담아 오류를 던진다. */
export function answerMessage(s0: GameState, msgId: number, id: ReplyId): GameState {
  const m0 = s0.messages.items.find((x) => x.id === msgId);
  if (!m0 || !canReply(s0, m0)) throw new Error('답장할 수 없는 메시지예요');
  const opt = replyOptions(s0, m0).find((o) => o.id === id);
  if (!opt) throw new Error('고를 수 없는 답장이에요');
  if (opt.disabled) throw new Error(opt.disabled);

  let s = structuredClone(s0);
  const m = s.messages.items.find((x) => x.id === msgId)!;
  const rng = messageRng(s, 64 + (msgId % 1024));
  const ch: Channel = m.channel ?? 'delivery';
  const restore = () => (m.hit ?? 0) * (APOLOGY_RESTORE[0] + rng.float() * (APOLOGY_RESTORE[1] - APOLOGY_RESTORE[0]));
  const ask = m.ask!;
  let text: string;
  switch (id) {
    case 'apology':
      addStress(s, '리뷰 답글 쓰기', REPLY_STRESS);
      bump(s, ch, restore());
      text = rng.pick(REPLY_TEXT.apology);
      break;
    case 'coupon': {
      addStress(s, '리뷰 답글 쓰기', REPLY_STRESS);
      if (m.reply?.id !== 'auto') bump(s, ch, restore());
      text = rng.pick(REPLY_TEXT.coupon);
      // 다시 올지는 지금 정해 두고, 오는 날 그 주문에서 쿠폰만큼 빠진다.
      if (rng.chance(COUPON_RETURN_CHANCE)) {
        const { openHour, closeHour } = s.settings;
        const f: FollowUp = { kind: 'coupon', msgId, name: m.name, channel: ch, day: s.clock.day + rng.int(1, COUPON_RETURN_DAYS), hour: rng.int(openHour, closeHour - 1) };
        s.messages = { ...s.messages, pending: [...s.messages.pending, f] };
      }
      break;
    }
    case 'rebut': {
      addStress(s, '속 시원하게 반박', REBUT_STRESS);
      text = rng.pick(REPLY_TEXT.rebut);
      const win = rng.chance(REBUT_WIN_CHANCE);
      bump(s, ch, win ? (m.hit ?? 0) * APOLOGY_RESTORE[1] : -((m.hit ?? 0) + REBUT_EXTRA_LOSS));
      pushMessage(s, {
        from: 'request', channel: ch, name: stranger(s, ch, rng), text: rng.pick(win ? FOLLOWUP_TEXT.rebutWin : FOLLOWUP_TEXT.rebutLose),
        detail: `「${m.name}」 리뷰에 단 사장님 답글을 보고`, tone: win ? 'good' : 'bad', important: !win,
      });
      break;
    }
    case 'accept': {
      const already = opt.label.startsWith('✅ 이미');
      const lever = LEVER_OF[ask];
      if (lever) s.levers = { ...s.levers, [lever]: true };
      else if (ask === 'price') s.menuPrices = cutPrices(s);
      else if (ask === 'closed') s.settings = { ...s.settings, closedDay: null };
      else if (ask === 'late') s.settings = { ...s.settings, closeHour: s.settings.closeHour + 1 };
      else if (ask === 'menu' && !s.menuActive[m.menu!]) s = setMenuActive(s, m.menu!, true);
      text = already ? REPLY_TEXT.already : ask === 'menu' ? REPLY_TEXT.accept.menu : REPLY_TEXT.accept[ask as Exclude<Ask, 'review'>];
      break;
    }
    case 'develop':
      s = developMenu(s, m.menu!);
      text = REPLY_TEXT.accept.menu;
      break;
    case 'promise': {
      const f: FollowUp = { kind: 'promise', msgId, name: m.name, channel: ch, menu: m.menu!, dueDay: s.clock.day + PROMISE_DAYS };
      s.messages = { ...s.messages, pending: [...s.messages.pending, f] };
      text = REPLY_TEXT.promise;
      break;
    }
    default:
      text = ask === 'price' || ask === 'closed' || ask === 'menu' ? REPLY_TEXT.decline[ask] : REPLY_TEXT.decline.other;
  }
  // 메시지 목록이 새로 만들어졌을 수 있으니(다른 손님 댓글) id로 다시 찾아 답장을 단다.
  s.messages = { ...s.messages, items: s.messages.items.map((x) => (x.id === msgId ? { ...x, reply: { id, text } } : x)) };
  return s;
}

// ── 답장 뒤에 일어날 일 ─────────────────────────────

/** 이 시각에 다시 오는 쿠폰 손님(약속한 시각이 지났는데 문을 닫았었다면 지금) */
export function dueCoupons(s: GameState, hour: number): FollowUp[] {
  return s.messages.pending.filter((f) => f.kind === 'coupon' && f.day === s.clock.day && hour >= f.hour);
}

/** 쿠폰 손님을 받은 뒤: 그 손님 몫의 주문에서 쿠폰만큼 빼고, 다시 남긴 리뷰를 보낸다. */
export function settleCoupons(s: GameState, coupons: FollowUp[], seeds: ReviewSeed[]): void {
  if (coupons.length === 0) return;
  const left = [...seeds];
  for (const c of coupons) {
    if (c.kind !== 'coupon') continue;
    const i = left.map((x) => x.ch).lastIndexOf(c.channel);
    if (i < 0) {
      // 일손이 모자라 주문을 못 받았다
      pushMessage(s, { from: 'review', channel: c.channel, name: c.name, text: '쿠폰 쓰려고 했는데 주문이 안 받아지네요 ㅠ', tone: 'bad' });
      continue;
    }
    const seed = left.splice(i, 1)[0];
    s.cash -= COUPON_VALUE;
    s.today.serviceCost += COUPON_VALUE;
    const sat = Math.min(5, seed.sat + COUPON_GOODWILL);
    bump(s, c.channel, (c.channel === 'hall' ? 0.02 : 0.03) * COUPON_GOODWILL);
    const stars = starsOf(sat);
    const rng = messageRng(s, 7);
    const pool = stars >= 4 ? FOLLOWUP_TEXT.couponGood : stars === 3 ? FOLLOWUP_TEXT.couponMeh : FOLLOWUP_TEXT.couponBad;
    pushMessage(s, { from: 'review', channel: c.channel, name: c.name, stars, text: rng.pick(pool), detail: `쿠폰 ${won(COUPON_VALUE)}을 쓰고 다시 주문했어요.`, tone: stars >= 4 ? 'good' : stars <= 2 ? 'bad' : 'neutral' });
  }
  s.messages = { ...s.messages, pending: s.messages.pending.filter((f) => !coupons.includes(f)) };
}

/** 마감 때: 못 온 쿠폰 손님, 메뉴 약속을 지켰는지 */
export function dayEndFollowUps(s: GameState): void {
  const day = s.clock.day;
  const rng = messageRng(s, 8);
  const keep: FollowUp[] = [];
  for (const f of s.messages.pending) {
    if (f.kind === 'coupon') {
      if (f.day > day) keep.push(f);
      else pushMessage(s, { from: 'review', channel: f.channel, name: f.name, text: rng.pick(FOLLOWUP_TEXT.couponMissed), tone: 'bad' });
      continue;
    }
    if (s.menuActive[f.menu]) {
      bump(s, f.channel, PROMISE_RATING_UP);
      pushMessage(s, { from: 'review', channel: f.channel, name: f.name, stars: 5, text: fill(rng.pick(FOLLOWUP_TEXT.promiseKept), { menu: pizzaName(f.menu) }), detail: '약속을 지켜 단골이 됐어요. 평점이 조금 올랐어요.', tone: 'good', important: true });
    } else if (day >= f.dueDay) {
      bump(s, f.channel, -PROMISE_RATING_DOWN);
      pushMessage(s, { from: 'review', channel: f.channel, name: f.name, stars: 2, text: fill(rng.pick(FOLLOWUP_TEXT.promiseBroken), { menu: pizzaName(f.menu) }), detail: '약속한 메뉴를 기한 안에 못 만들었어요. 평점이 깎였어요.', tone: 'bad', important: true, action: 'menu' });
    } else {
      keep.push(f);
    }
  }
  s.messages = { ...s.messages, pending: keep };
}
