// 밸런스 수치는 전부 여기 한 곳에 둔다. 밸런스 테스트가 실패하면 이 파일만 조정한다.
export const START_CAPITAL = 100_000_000;
export const INTERIOR_AND_EQUIPMENT = 30_000_000;

export const FX_BASE = 1350;
/** 환율이 기준(FX_BASE)에서 멀어지면 매주 그 차이(로그)의 이만큼씩 되돌아온다. */
export const FX_MEAN_REVERSION = 0.03;
export const IMPORT_PASS_THROUGH = 0.7;
export const PREMIUM_CHEESE_MULT = 1.3;
export const MISC_COST_PER_PIZZA = 800;
export const COLA_ATTACH_RATE = 0.45;

export const APP_FEE_RATE = 0.128;
export const DELIVERY_FEE_OWNER = 3000;
export const INSULATED_BOX_COST = 400;
export const APP_ADS_WEEKLY = 88_000;
export const APP_ADS_DEMAND = 1.15;

export const UTILITIES_PER_DAY = 30_000;
export const LABOR_OVERHEAD = 1.2;
export const START_MIN_WAGE = 10_030;
export const STAFF_COUNT = 2;
export const PIZZAS_PER_STAFF_HOUR = 7;
export const OVEN_CAP_PER_HOUR = 16;

/** 운영 수단 없이 평범하게 장사할 때 손님 만족도의 평균. 평점은 이 값 근처로 수렴한다. */
export const SATISFACTION_BASE = 4.4;

export const PRICE_ELASTICITY = 1.5;
export const RECESSION_SENSITIVITY_MULT = 1.3;

export const VEG_SEASONAL: Record<number, number> = {
  1: 1.25, 2: 1.3, 3: 1.15, 4: 1.0, 5: 0.9, 6: 0.85, 7: 0.95, 8: 1.2, 9: 1.1, 10: 0.9, 11: 0.85, 12: 1.1,
};

export const WEATHER_DEMAND = {
  sunny: { hall: 1, delivery: 1 },
  cloudy: { hall: 1, delivery: 1 },
  rain: { hall: 0.7, delivery: 1.25 },
  heat: { hall: 0.85, delivery: 1.15 },
  cold: { hall: 0.9, delivery: 1.1 },
} as const;
