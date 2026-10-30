// 이름 있는 단골: 리뷰 일부가 동네 단골 이름으로 오고, 사장님 답장을 기억하고, 계속 실망하면 발길을 끊는다.
import { REGULARS, REGULAR_TEXT } from '../../src/content/regulars';
import { answerMessage } from '../../src/sim/replies';
import { COMEBACK_DAYS, LEAVE_MOOD, NOTICE_DAYS, pickRegular, regularReview, regularsEvening } from '../../src/sim/regulars';
import { Rng } from '../../src/sim/rng';
import { advanceTickInPlace } from '../../src/sim/tick';
import type { GameState } from '../../src/sim/types';
import { g } from './gameHelpers';

const campus = REGULARS.campus;
const deliveryRegular = campus.find((r) => r.ch === 'delivery')!;

test('한 달 동안 리뷰 일부는 그 동네 단골 이름으로 온다(말버릇이 붙는다)', () => {
  const s = structuredClone(g());
  while (s.clock.day < 28) advanceTickInPlace(s);
  const byRegular = s.messages.items.filter((m) => m.regular);
  expect(byRegular.length).toBeGreaterThan(0);
  for (const m of byRegular) {
    const def = campus.find((r) => r.id === m.regular)!;
    expect(m.name).toBe(def.name);
  }
});

test('사과한 단골은 다음 좋은 리뷰에서 그걸 기억한다', () => {
  const s: GameState = structuredClone(g());
  s.messages.regulars = { [deliveryRegular.id]: { mood: -1, lastReply: 'apology' } };
  const text = regularReview(s, deliveryRegular, 5, '맛있어요', new Rng(1));
  expect(REGULAR_TEXT.thanks.some((t) => text.startsWith(t))).toBe(true);
  expect(s.messages.regulars![deliveryRegular.id].lastReply).toBeUndefined();
});

test('나쁜 리뷰가 쌓이면 발길을 끊고, 며칠 뒤 사장님이 알아채며, 한 달 뒤엔 다시 와 볼 수 있다', () => {
  const s: GameState = structuredClone(g());
  for (let i = 0; i > LEAVE_MOOD; i--) regularReview(s, deliveryRegular, 1, '별로예요', new Rng(i + 10));
  const gone = s.messages.regulars![deliveryRegular.id];
  expect(gone.goneDay).toBe(s.clock.day);
  // 끊은 단골은 고르지 않는다
  for (let i = 0; i < 50; i++) expect(pickRegular(s, 'delivery', new Rng(i))?.id).not.toBe(deliveryRegular.id);
  s.clock = { day: s.clock.day + NOTICE_DAYS, hour: 21 };
  regularsEvening(s);
  expect(s.messages.items.at(-1)!.text).toContain(`「${deliveryRegular.name}」님이 안 보이네`);
  s.clock = { day: gone.goneDay! + COMEBACK_DAYS, hour: 12 };
  const back = regularReview(s, deliveryRegular, 4, '괜찮아요', new Rng(3));
  expect(REGULAR_TEXT.back.some((t) => back.startsWith(t))).toBe(true);
  expect(s.messages.regulars![deliveryRegular.id].goneDay).toBeUndefined();
});

test('단골의 나쁜 리뷰에 답장하면 그 답장을 기억한다', () => {
  const s: GameState = structuredClone({ ...g(), clock: { day: 3, hour: 15 } });
  s.messages = {
    ...s.messages,
    items: [{ id: 1, day: 3, hour: 14, from: 'review', channel: 'delivery', name: deliveryRegular.name, regular: deliveryRegular.id, text: '식었어요', tone: 'bad', stars: 1, topic: 'cold', ask: 'review', replyBy: 6, hit: 0.05 }],
    nextId: 2,
  };
  const after = answerMessage(s, 1, 'rebut');
  expect(after.messages.regulars![deliveryRegular.id].lastReply).toBe('rebut');
});
