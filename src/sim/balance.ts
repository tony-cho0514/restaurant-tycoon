// 밸런스 수치는 전부 여기 한 곳에 둔다. 밸런스 테스트가 실패하면 이 파일만 조정한다.
export const START_CAPITAL = 100_000_000;
export const INTERIOR_AND_EQUIPMENT = 30_000_000;

export const FX_BASE = 1350;
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
