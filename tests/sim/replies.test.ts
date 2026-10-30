// 메시지 답장: 비용은 미리 정확히, 효과는 해 봐야 안다. 쿠폰 손님은 다시 오고, 약속은 기한이 있다.
import { COUPON_VALUE, MENU_DEV_COST, PROMISE_DAYS, REPLY_STRESS } from '../../src/sim/balance';
import { pushMessage, type Message } from '../../src/sim/messages';
import { answerMessage, canReply, replyOptions } from '../../src/sim/replies';
import { advanceTickInPlace } from '../../src/sim/tick';
import type { GameState } from '../../src/sim/types';
import { g, midDay } from './gameHelpers';

type MsgIn = Omit<Message, 'id' | 'day' | 'hour'>;
const badReview = (x: Partial<MsgIn> = {}): MsgIn => ({ from: 'review', channel: 'delivery', name: '야식러', text: '식었어요', stars: 1, tone: 'bad', ask: 'review', replyBy: 99, hit: 0.09, ...x });
const request = (ask: Message['ask'], x: Partial<MsgIn> = {}): MsgIn => ({ from: 'request', channel: 'delivery', name: '새내기22', text: '요청', tone: 'neutral', ask, replyBy: 99, ...x });

function withMsg(s: GameState, m: MsgIn): { s: GameState; id: number } {
  const c = structuredClone(s);
  pushMessage(c, m);
  return { s: c, id: c.messages.items.at(-1)!.id };
}
function playUntil(s: GameState, day: number): GameState {
  const c = structuredClone(s);
  while (c.clock.day < day) advanceTickInPlace(c);
  return c;
}

test('나쁜 리뷰에 사과 답글: 스트레스가 조금 오르고 평점이 그 리뷰가 깎은 만큼보다 덜 돌아온다', () => {
  const { s, id } = withMsg(midDay(), badReview());
  const opts = replyOptions(s, s.messages.items.at(-1)!);
  expect(opts.map((o) => o.id)).toEqual(['apology', 'coupon', 'rebut']);
  expect(opts[1].cost).toContain(`${COUPON_VALUE.toLocaleString('ko-KR')}원`);
  const after = answerMessage(s, id, 'apology');
  const up = after.ratings.delivery - s.ratings.delivery;
  expect(up).toBeGreaterThan(0);
  expect(up).toBeLessThan(0.09);
  expect(after.owner.stress - s.owner.stress).toBeCloseTo(REPLY_STRESS);
  const m = after.messages.items.find((x) => x.id === id)!;
  expect(m.reply?.id).toBe('apology');
  expect(canReply(after, m)).toBe(false);
  expect(() => answerMessage(after, id, 'coupon')).toThrow();
});

test('반박은 대개 손해: 다른 손님이 끼어들고, 지면 그 리뷰보다 더 깎인다', () => {
  let wins = 0;
  const n = 40;
  for (let i = 0; i < n; i++) {
    let s = midDay();
    for (let k = 0; k < i; k++) pushMessage(s = structuredClone(s), { from: 'owner', name: 'x', text: 'x', tone: 'neutral' });
    const r = withMsg(s, badReview());
    const after = answerMessage(r.s, r.id, 'rebut');
    const delta = after.ratings.delivery - r.s.ratings.delivery;
    const comment = after.messages.items.at(-1)!;
    expect(comment.from).toBe('request');
    if (delta > 0) { wins++; expect(comment.tone).toBe('good'); } else { expect(delta).toBeLessThan(-0.09); expect(comment.tone).toBe('bad'); }
    expect(after.owner.stress).toBeLessThan(r.s.owner.stress);
  }
  expect(wins).toBeGreaterThan(0);
  expect(wins / n).toBeLessThan(0.5);
});

test('쿠폰: 다시 오면 그 주문에서 3,000원이 빠지고 다시 쓴 리뷰가 온다', () => {
  // 다시 오기로 정해지는 메시지를 찾는다(확률이라 몇 개 시도)
  let found: { s: GameState; id: number } | null = null;
  for (let k = 0; k < 20 && !found; k++) {
    let s = midDay();
    for (let j = 0; j < k; j++) pushMessage(s = structuredClone(s), { from: 'owner', name: 'x', text: 'x', tone: 'neutral' });
    const r = withMsg(s, badReview({ name: '쿠폰손님' }));
    const after = answerMessage(r.s, r.id, 'coupon');
    if (after.messages.pending.length > 0) found = { s: after, id: r.id };
  }
  expect(found).not.toBeNull();
  const f = found!.s.messages.pending[0];
  expect(f.kind).toBe('coupon');
  const end = playUntil(found!.s, (f.kind === 'coupon' ? f.day : 0) + 1);
  const back = end.messages.items.filter((m) => m.name === '쿠폰손님' && m.id > found!.id);
  expect(back).toHaveLength(1);
  expect(end.messages.pending).toHaveLength(0);
  if (back[0].stars !== undefined) {
    const dayRec = end.ledger.days.find((d) => d.day === (f.kind === 'coupon' ? f.day : -1))!;
    expect(dayRec.serviceCost).toBeGreaterThanOrEqual(COUPON_VALUE);
  }
});

test('리뷰 답글 운영 수단이 켜져 있으면 나쁜 리뷰엔 자동 답글이 달리고, 쿠폰만 더 줄 수 있다', () => {
  let s = midDay();
  s = { ...s, levers: { ...s.levers, reviewReplies: true }, menuPrices: { ...s.menuPrices, cheese: 40000, pepperoni: 42000, combo: 44000 } };
  const end = playUntil(s, s.clock.day + 7);
  const bad = end.messages.items.filter((m) => m.ask === 'review');
  expect(bad.length).toBeGreaterThan(0);
  for (const m of bad) expect(m.reply?.id).toBe('auto');
  const live = bad.find((m) => canReply(end, m));
  if (live) expect(replyOptions(end, live).map((o) => o.id)).toEqual(['coupon']);
});

test('요청 들어주기: 운영 수단·가격·영업시간·휴무가 바로 바뀌고, 비용은 버튼에 미리 보인다', () => {
  const base = midDay();
  let r = withMsg(base, request('cheese'));
  const cheese = replyOptions(r.s, r.s.messages.items.at(-1)!)[0];
  expect(cheese.label).toContain('프리미엄 치즈');
  expect(cheese.cost).toMatch(/주문당 원가 \+[\d,]+원 · 이익률 −\d\.\d%p/);
  expect(answerMessage(r.s, r.id, 'accept').levers.premiumCheese).toBe(true);

  r = withMsg(base, request('price'));
  expect(replyOptions(r.s, r.s.messages.items.at(-1)!)[0].cost).toMatch(/주문당 매출 −[\d,]+원/);
  const cut = answerMessage(r.s, r.id, 'accept');
  expect(cut.menuPrices.cheese).toBeLessThan(base.menuPrices.cheese);
  expect(cut.menuPrices.cola).toBe(base.menuPrices.cola);

  r = withMsg(base, request('late'));
  expect(replyOptions(r.s, r.s.messages.items.at(-1)!)[0].cost).toMatch(/알바비·전기 주 \+[\d,]+원/);
  expect(answerMessage(r.s, r.id, 'accept').settings.closeHour).toBe(base.settings.closeHour + 1);

  r = withMsg({ ...base, settings: { ...base.settings, closedDay: 6 } }, request('closed'));
  expect(answerMessage(r.s, r.id, 'accept').settings.closedDay).toBeNull();

  r = withMsg(base, request('cola'));
  const declined = answerMessage(r.s, r.id, 'decline');
  expect(declined.levers.freeCola).toBe(false);
  expect(declined.messages.items.find((m) => m.id === r.id)!.reply?.text).toBeTruthy();
});

test('메뉴 요청: 바로 개발하면 미리 보인 금액만큼 나가고, 돈이 모자라면 못 고른다', () => {
  const r = withMsg(midDay(), request('menu', { menu: 'goguma' }));
  const m = r.s.messages.items.at(-1)!;
  const dev = replyOptions(r.s, m).find((o) => o.id === 'develop')!;
  const after = answerMessage(r.s, r.id, 'develop');
  expect(after.menuActive.goguma).toBe(true);
  expect(dev.cost).toContain(`${(r.s.cash - after.cash).toLocaleString('ko-KR')}원`);
  expect(r.s.cash - after.cash).toBeGreaterThanOrEqual(MENU_DEV_COST);

  const poor = { ...r.s, cash: 1000 };
  const d2 = replyOptions(poor, m).find((o) => o.id === 'develop')!;
  expect(d2.disabled).toBe('돈이 모자라요');
  expect(() => answerMessage(poor, r.id, 'develop')).toThrow('돈이 모자라요');
});

test('메뉴 약속: 기한 안에 만들면 단골 ★5, 못 지키면 ★2', () => {
  const r = withMsg(midDay(), request('menu', { menu: 'goguma', name: '약속손님' }));
  const promised = answerMessage(r.s, r.id, 'promise');
  expect(promised.messages.pending).toHaveLength(1);

  const kept = playUntil(answerMessage(withMsg(promised, request('menu', { menu: 'goguma' })).s, promised.messages.nextId, 'develop'), promised.clock.day + 1);
  const ok = kept.messages.items.find((m) => m.name === '약속손님' && m.stars === 5);
  expect(ok?.text).toContain('고구마 피자');
  expect(kept.messages.pending).toHaveLength(0);

  const broken = playUntil(promised, promised.clock.day + PROMISE_DAYS + 1);
  const bad = broken.messages.items.find((m) => m.name === '약속손님' && m.stars === 2);
  expect(bad?.text).toContain('약속');
  expect(broken.messages.pending).toHaveLength(0);
});

test('답장 기한이 지나면 답장할 수 없다', () => {
  const r = withMsg(g(), badReview({ replyBy: 0 }));
  const later = { ...r.s, clock: { day: 1, hour: 12 } };
  expect(replyOptions(later, later.messages.items.at(-1)!)).toEqual([]);
  expect(() => answerMessage(later, r.id, 'apology')).toThrow();
});

test('게임이 만든 나쁜 리뷰·요청에는 답장 칸이 붙는다', () => {
  const s = playUntil(createPricey(), 29);
  const bad = s.messages.items.filter((m) => m.from === 'review' && (m.stars ?? 5) <= 2 && m.ask === undefined && !m.detail);
  expect(bad).toHaveLength(0);
  expect(s.messages.items.some((m) => m.ask === 'review' && m.replyBy === m.day + 3 && (m.hit ?? 0) > 0)).toBe(true);
  expect(s.messages.items.some((m) => m.from === 'request' && m.ask !== undefined)).toBe(true);
});

function createPricey(): GameState {
  const s = g();
  return { ...s, menuPrices: { ...s.menuPrices, cheese: 30000, pepperoni: 32000, combo: 34000 } };
}
