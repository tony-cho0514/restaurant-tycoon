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
/** 배달 한 건 비용. 손님이 배달팁으로 일부를 내고 나머지를 사장이 낸다. */
export const DELIVERY_COST_TOTAL = 4000;
export const DELIVERY_TIP_DEFAULT = 1000;
/** 손님 배달팁이 1,000원 오를 때마다 배달 주문이 줄어드는 비율 */
export const DELIVERY_TIP_ELASTICITY = 0.08;
/** 홀 카드 결제 수수료(영세 가맹점 수준) */
export const CARD_FEE_RATE = 0.015;
export const INSULATED_BOX_COST = 400;
export const APP_ADS_WEEKLY = 88_000;
export const APP_ADS_DEMAND = 1.15;

/** 공과금(전기·가스·수도)은 영업 시간에 비례: 11시간이면 약 3만 원 */
export const UTILITIES_PER_HOUR = 2_730;
/** 4대보험 사업주 부담 비율 */
export const INSURANCE_RATE = 0.09;
/** 주휴수당: 주 15시간 이상 일하면 근무시간의 1/5만큼 더 */
export const HOLIDAY_PAY_RATE = 0.2;
export const HOLIDAY_PAY_MIN_WEEKLY_HOURS = 15;
export const START_MIN_WAGE = 10_030;
export const STAFF_COUNT = 2;
export const PIZZAS_PER_STAFF_HOUR = 7;
export const OVEN_CAP_PER_HOUR = 16;

/** 운영 수단 없이 평범하게 장사할 때 손님 만족도의 평균. 평점은 이 값 근처로 수렴한다. */
export const SATISFACTION_BASE = 4.4;

/** 운영 수단이 손님 만족도에 더하는 값. 너무 크면 그 수단이 모든 동네에서 정답이 된다. */
export const LEVER_SAT_BONUS = { premiumCheese: 0.2, freeCola: 0.25, insulatedBox: 0.2 };

export const PRICE_ELASTICITY = 1.5;
/** 경기별 가격 민감도 배수: 불황엔 가격에 더 민감, 호황엔 덜 민감 */
export const CYCLE_SENSITIVITY = { boom: 0.85, normal: 1, recession: 1.3 };
/** 경기별 메뉴 쏠림: 양수면 싼 메뉴 쪽으로(불황), 음수면 비싼 메뉴 쪽으로(호황) */
export const CYCLE_MIX_TILT = { boom: -1, normal: 0, recession: 2 };

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
