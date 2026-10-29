// 가상 경제. 숫자는 지어낸 것이지만 현실 원리대로 움직인다.
// 경기 전환은 여기서 하지 않고, news.ts가 신호와 함께 일으킨다.
import { START_MIN_WAGE } from './balance';
import type { Rng } from './rng';
import type { Season } from './time';

export type Cycle = 'boom' | 'normal' | 'recession';
export type Weather = 'sunny' | 'cloudy' | 'rain' | 'heat' | 'cold';

export interface Economy {
  cycle: Cycle;
  cycleWeeksLeft: number;
  fx: number;
  inflation: number;
  minWage: number;
  pendingMinWage: number | null;
  weather: Weather;
}

export const CYCLE_DEMAND: Record<Cycle, number> = { boom: 1.1, normal: 1.0, recession: 0.85 };

const FX_DRIFT: Record<Cycle, number> = { boom: -0.001, normal: 0, recession: 0.003 };
const INFLATION_WEEKLY: Record<Cycle, number> = { boom: 0.0009, normal: 0.0006, recession: 0.0003 };

const WEATHER_ODDS: Record<Season, { item: Weather; weight: number }[]> = {
  spring: [{ item: 'sunny', weight: 0.5 }, { item: 'cloudy', weight: 0.3 }, { item: 'rain', weight: 0.2 }],
  summer: [{ item: 'sunny', weight: 0.3 }, { item: 'cloudy', weight: 0.2 }, { item: 'rain', weight: 0.3 }, { item: 'heat', weight: 0.2 }],
  autumn: [{ item: 'sunny', weight: 0.55 }, { item: 'cloudy', weight: 0.3 }, { item: 'rain', weight: 0.15 }],
  winter: [{ item: 'sunny', weight: 0.4 }, { item: 'cloudy', weight: 0.3 }, { item: 'cold', weight: 0.3 }],
};

export function initialEconomy(rng: Rng): Economy {
  return {
    cycle: 'normal',
    cycleWeeksLeft: rng.int(20, 36),
    fx: 1350,
    inflation: 1,
    minWage: START_MIN_WAGE,
    pendingMinWage: null,
    weather: 'sunny',
  };
}

export function stepEconomyWeek(e: Economy, rng: Rng): Economy {
  const fx = Math.min(1800, Math.max(1000, e.fx * (1 + rng.normal(FX_DRIFT[e.cycle], 0.008))));
  return {
    ...e,
    fx,
    inflation: e.inflation * (1 + INFLATION_WEEKLY[e.cycle]),
    cycleWeeksLeft: Math.max(0, e.cycleWeeksLeft - 1),
  };
}

export function rollWeather(season: Season, rng: Rng): Weather {
  return rng.weighted(WEATHER_ODDS[season]);
}
