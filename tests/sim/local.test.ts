// 동네 사정: 장사가 안 되는 날엔 이유가 있고, 대부분 미리 귀띔이 온다. 해결책은 알려 주지 않는다.
import { LOCAL_DEMAND, MONSOON_RAIN_CHANCE, inMonsoon, localDemand, monsoonRain, paceVsUsual, type LocalEvent } from '../../src/sim/localEvents';
import { createNewGame } from '../../src/sim/newGame';
import type { NeighborhoodId } from '../../src/sim/neighborhoods';
import { Rng } from '../../src/sim/rng';
import { SAVE_KEY, loadGame } from '../../src/sim/save';
import { advanceTickInPlace } from '../../src/sim/tick';
import type { GameState } from '../../src/sim/types';
import { g } from './gameHelpers';

function playUntil(s: GameState, day: number, hour = 0): GameState {
  const c = structuredClone(s);
  while (c.clock.day < day || (c.clock.day === day && c.clock.hour < hour)) advanceTickInPlace(c);
  return c;
}
const at = (s: GameState, e: LocalEvent): GameState => ({ ...s, local: { events: [...s.local.events, e], nextId: e.id + 1 } });
const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, m }; };
const hood = (id: NeighborhoodId) => createNewGame({ seed: 1, neighborhoodId: id, shopName: 'x', nowMs: 0 });

test('가게 앞 공사: 미리 안내문이 오고, 공사 동안 홀 손님이 줄고, 끝나면 알려 준다', () => {
  let s = at(g(), { id: 1, type: 'roadwork', signalDay: 1, startDay: 4, endDay: 9 });
  expect(localDemand(s, 3)).toEqual({ hall: 1, delivery: 1 });
  expect(localDemand(s, 5).hall).toBe(LOCAL_DEMAND.roadwork.hall);
  s = playUntil(s, 11);
  const texts = s.messages.items.map((m) => `${m.day}:${m.text}`);
  expect(texts.some((t) => t.startsWith('1:가게 앞 도로를 3/5부터 3/10까지 공사한대요'))).toBe(true);
  expect(texts.some((t) => t.startsWith('4:공사 소음'))).toBe(true);
  expect(texts.some((t) => t.startsWith('10:가게 앞 공사가 드디어 끝났다'))).toBe(true);
});

test('경쟁 피자집: 일주일 전 귀띔, 오픈 할인 동안 크게, 그 뒤엔 조금 뺏기고 평점이 높으면 덜 뺏긴다', () => {
  const s = at(g(), { id: 1, type: 'competitor', signalDay: 0, startDay: 7, endDay: 50, discountEnd: 22, name: '피자왕국' });
  expect(localDemand(s, 10).delivery).toBe(LOCAL_DEMAND.competitorDiscount.delivery);
  expect(localDemand({ ...s, ratings: { hall: 4.2, delivery: 4.2 } }, 30).hall).toBe(LOCAL_DEMAND.competitorSettled);
  expect(localDemand({ ...s, ratings: { hall: 4.7, delivery: 4.7 } }, 30).hall).toBe(LOCAL_DEMAND.competitorSettledGood);
  expect(localDemand(s, 51)).toEqual({ hall: 1, delivery: 1 });
  const played = playUntil(s, 24);
  expect(played.messages.items.some((m) => m.day === 0 && m.text.includes('건너편에 피자집 인테리어 공사'))).toBe(true);
  expect(played.messages.items.some((m) => m.day === 7 && m.text.includes('「피자왕국」 개업'))).toBe(true);
  // 할인이 끝나는 날 경쟁 카드가 열린다
  expect(played.learning.dex.competition?.story).toMatch(/「피자왕국」이 할인하는 동안 하루 주문이 [\d.]+건 → [\d.]+건/);
});

test('배달앱 노출 하락: 귀띔 없이 오고 이틀 뒤에야 단서가 온다, 배달앱 광고를 켜 두면 덜 줄어든다', () => {
  const s = at(g(), { id: 1, type: 'appRank', signalDay: 5, startDay: 3, endDay: 9 });
  expect(localDemand(s, 4).delivery).toBe(LOCAL_DEMAND.appRank);
  expect(localDemand({ ...s, levers: { ...s.levers, appAds: true } }, 4).delivery).toBe(LOCAL_DEMAND.appRankWithAds);
  const played = playUntil(s, 6);
  const clue = played.messages.items.filter((m) => m.text.includes('배달앱에서 우리 가게'));
  expect(clue).toHaveLength(1);
  expect(clue[0].day).toBe(5);
});

test('해마다 같은 때: 대학가 방학, 오피스 여름 휴가철, 명절(주택가는 오히려 늘어남)', () => {
  const july = 4 * 28 + 3; // 7월
  expect(localDemand(hood('campus'), july).hall).toBe(LOCAL_DEMAND.campusVacation);
  expect(localDemand(hood('office'), july).hall).toBe(1);
  const aug = 5 * 28 + 2; // 8월 초
  expect(localDemand(hood('office'), aug).hall).toBe(LOCAL_DEMAND.officeSummerLeave);
  const chuseok = 6 * 28 + 17; // 9월 추석
  expect(localDemand(hood('office'), chuseok).hall).toBe(LOCAL_DEMAND.holiday.office);
  expect(localDemand(hood('residential'), chuseok).hall).toBeGreaterThan(1);
  // 방학 귀띔은 5일 전에
  const s = playUntil(hood('campus'), 4 * 28);
  expect(s.messages.items.some((m) => m.day === 4 * 28 - 5 && m.text.includes('종강'))).toBe(true);
});

test('장마: 7월 초~중순엔 비가 잦다', () => {
  const july = 4 * 28 + 5;
  expect(inMonsoon(july)).toBe(true);
  expect(inMonsoon(july - 28)).toBe(false);
  const rng = new Rng(7);
  let rain = 0;
  for (let i = 0; i < 2000; i++) if (monsoonRain(july, rng)) rain++;
  expect(rain / 2000).toBeCloseTo(MONSOON_RAIN_CHANCE, 1);
});

test('현황: 오늘 손님이 평소 이맘때보다 얼마나 적은지 보여 준다(이유는 말하지 않는다)', () => {
  const base = playUntil(hood('office'), 10);
  expect(paceVsUsual({ ...base, clock: { day: 10, hour: 11 } })).toBeNull();
  const slow = at(base, { id: 9, type: 'roadwork', signalDay: 10, startDay: 10, endDay: 20 });
  const both = at(slow, { id: 10, type: 'competitor', signalDay: 10, startDay: 10, endDay: 40, discountEnd: 25, name: '도우하우스' });
  const mid = playUntil(both, 10, 19);
  expect(paceVsUsual(mid)!).toBeLessThan(-0.1);
});

test('월말 리포트에 그달의 동네 사정이 나온다', () => {
  const s = playUntil(hood('campus'), 5 * 28);
  const july = s.learning.reports.find((r) => r.label.endsWith('7월'))!;
  expect(july.events.some((e) => e.text.startsWith('방학 7/1~7/28'))).toBe(true);
  expect(july.events.some((e) => e.text.startsWith('장마'))).toBe(true);
  expect(s.learning.dex.seasonality?.story).toMatch(/방학이 되자 하루 주문이 [\d.]+건 → [\d.]+건/);
});

test('같은 종류는 겹치지 않고, 경쟁 가게는 한동안 다시 안 생긴다(평균 5주에 한 번쯤)', () => {
  let total = 0;
  for (const seed of [2, 3, 4]) {
    const s = playUntil(createNewGame({ seed, neighborhoodId: 'residential', shopName: 'x', nowMs: 0 }), 28 * 8);
    for (const t of ['roadwork', 'competitor', 'appRank'] as const) {
      const evs = s.local.events.filter((e) => e.type === t).sort((a, b) => a.startDay - b.startDay);
      for (let i = 1; i < evs.length; i++) expect(evs[i].signalDay).toBeGreaterThan(evs[i - 1].endDay);
    }
    const comps = s.local.events.filter((e) => e.type === 'competitor').sort((a, b) => a.startDay - b.startDay);
    for (let i = 1; i < comps.length; i++) expect(comps[i].signalDay - comps[i - 1].endDay).toBeGreaterThanOrEqual(56);
    total += s.local.events.length;
  }
  expect(total / 3).toBeGreaterThan(3);
  expect(total / 3).toBeLessThan(12);
});

test('동네 사정 기록 없는 옛 저장도 열린다', () => {
  const raw = JSON.parse(JSON.stringify(g())); delete raw.local;
  const st = mem(); st.setItem(SAVE_KEY, JSON.stringify(raw));
  expect(loadGame(st)!.local).toEqual({ events: [], nextId: 1 });
});
