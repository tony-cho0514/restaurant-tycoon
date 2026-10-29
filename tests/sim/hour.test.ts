import type { Economy } from '../../src/sim/economy';
import type { Levers } from '../../src/sim/levers';
import { NEIGHBORHOODS } from '../../src/sim/neighborhoods';
import { expectedOrders } from '../../src/sim/demand';
import { serveHour } from '../../src/sim/service';
import { updateRating } from '../../src/sim/ratings';
import { defaultMenuPrices } from './helpers';

const econ = { cycle: 'normal', cycleWeeksLeft: 30, fx: 1350, inflation: 1, minWage: 10030, pendingMinWage: null, weather: 'sunny' } as Economy;
const off: Levers = { freeCola: false, premiumCheese: false, insulatedBox: false, reviewReplies: false, appAds: false };
const def = defaultMenuPrices();
const inp = (o: object = {}) => ({ n: NEIGHBORHOODS.campus, hour: 11, isWeekend: false, economy: econ, menuPrices: def, ratings: { hall: 4.5, delivery: 4.5 }, levers: off, shock: { hall: 1, delivery: 1 }, ...o });
const daily = (o: object = {}) => { let h = 0, d = 0; for (let hour = 11; hour <= 21; hour++) { const e = expectedOrders(inp({ ...o, hour })); h += e.hall; d += e.delivery; } return { h, d, t: h + d }; };

test('기본 조건 대학가 하루 40건, 배달 60%', () => { expect(daily().t).toBeCloseTo(40); expect(daily().d).toBeCloseTo(24); });

test('비 오면 홀 0.7배·배달 1.25배', () => { const r = daily({ economy: { ...econ, weather: 'rain' } }); expect(r.h).toBeCloseTo(16 * 0.7); expect(r.d).toBeCloseTo(24 * 1.25); });

test('가격 20% 올리면 대학가 주문 × 1.2^-2.1', () => {
  const up = Object.fromEntries(Object.entries(def).map(([k, v]) => [k, v * 1.2])) as typeof def;
  expect(daily({ menuPrices: up }).t).toBeCloseTo(40 * Math.pow(1.2, -2.1), 2);
});

test('평점 3.6이면 0.512배, 침체면 0.85배, 앱 광고면 배달 1.15배', () => {
  expect(daily({ ratings: { hall: 3.6, delivery: 3.6 } }).t).toBeCloseTo(40 * 0.512);
  expect(daily({ economy: { ...econ, cycle: 'recession' } }).t).toBeCloseTo(34);
  expect(daily({ levers: { ...off, appAds: true } }).d).toBeCloseTo(24 * 1.15);
});

test('처리 능력을 넘으면 배달부터 잃는다', () => {
  const s = serveHour(10, 10, 14); expect(s.servedHall + s.servedDelivery).toBe(16); expect(s.lost).toBe(4); expect(s.servedHall).toBe(10);
  expect(serveHour(5, 5, 14).waitDelivery).toBe(35);
});

test('평점은 만족도를 따라가고, 답글은 하락을 줄인다', () => {
  let a = { hall: 4.5, delivery: 4.5 }, b = { ...a };
  for (let i = 0; i < 50; i++) { a = updateRating(a, 'delivery', 2, off); b = updateRating(b, 'delivery', 2, { ...off, reviewReplies: true }); }
  expect(b.delivery).toBeGreaterThan(a.delivery); expect(a.delivery).toBeGreaterThan(2);
});
