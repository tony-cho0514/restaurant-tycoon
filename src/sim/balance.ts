// 밸런스 수치는 전부 여기 한 곳에 둔다. 밸런스 테스트가 실패하면 이 파일만 조정한다.
/** 보증금·권리금·인테리어·첫 달 월세·첫 재료를 다 내고 통장에 남는 운영 자금(동네와 상관없이 같다). 업그레이드는 벌어서 산다. */
export const START_OPERATING_CASH = 1_000_000;
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
/** 사장님 혼자 시간당 만드는 피자(계산·포장·응대도 하느라 알바보다 적다) */
export const OWNER_PIZZAS_PER_HOUR = 4;
/** 처리 능력의 80%를 넘는 주문이 들어오면 넘친 비율 × 이 값만큼 대기 시간이 늘어난다 */
export const OVERLOAD_WAIT_SLOPE = 3;

/** 운영 수단 없이 평범하게 장사할 때 손님 만족도의 평균. 평점은 이 값 근처로 수렴한다. */
export const SATISFACTION_BASE = 4.4;

/** 운영 수단이 손님 만족도에 더하는 값. 너무 크면 그 수단이 모든 동네에서 정답이 된다. */
export const LEVER_SAT_BONUS = { premiumCheese: 0.2, freeCola: 0.25, insulatedBox: 0.2 };

export const PRICE_ELASTICITY = 1.5;
/** 새 메뉴 개발비 */
export const MENU_DEV_COST = 300_000;
/** 메뉴가 다양하면 손님이 조금 는다: 피자 3종 넘는 1종마다 +3%, 최대 +12% */
export const VARIETY_BONUS_PER_MENU = 0.03;
export const VARIETY_BONUS_MAX = 0.12;
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

// ── 사장님 스트레스(0~100) ──────────────────────────
export const STRESS_START = 20;
/** 가게에서 일한 한 시간마다 */
export const STRESS_PER_WORK_HOUR = 0.25;
/** 알바 없이 혼자 가게를 본 한 시간마다 더 */
export const STRESS_SOLO_HOUR = 0.1;
/** 놓친 주문 한 건마다, 한 시간에 최대 */
export const STRESS_PER_LOST_ORDER = 0.3;
export const STRESS_LOST_MAX_PER_HOUR = 2;
/** 영업시간 중에 퇴근해서 쉰 한 시간마다 줄어듦 */
export const STRESS_REST_HOUR = 1.5;
/** 문 닫고 자는 밤마다 줄어듦 */
export const STRESS_SLEEP = 2;
/** 하루 10시간 넘게 일하면 넘는 한 시간마다 */
export const STRESS_LONG_DAY_HOURS = 10;
export const STRESS_LONG_HOUR = 0.8;
/** 쉬는 날 없이 5일 넘게 일하면 넘는 하루마다 */
export const STRESS_STREAK_FREE_DAYS = 5;
export const STRESS_STREAK_PER_DAY = 0.5;
export const STRESS_STREAK_MAX = 3;
/** 하루 통째로 쉬면(휴무·하루 쉬기·휴가) 줄어듦 */
export const STRESS_REST_DAY = 18;
/** 이 위면 지쳐서 실수가 늘고, 넘을 때 「좀 쉬세요」 알림 */
export const STRESS_TIRED = 70;
/** 알림을 다시 하려면 여기까지 내려와야 한다 */
export const STRESS_WARN_RESET = 60;
/** 이 위면 번아웃: 쓰러져서 며칠 쉰다 */
export const STRESS_BURNOUT = 90;
export const BURNOUT_DAYS = 2;
/** 이 아래면 컨디션이 좋아 응대가 조금 좋아진다 */
export const STRESS_GOOD = 30;
/** 홀 만족도 보정: 컨디션 좋을 때 / 지쳤을 때 */
export const MOOD_SAT_GOOD = 0.1;
export const MOOD_SAT_TIRED = -0.15;
/** 지쳤을 때 한 시간에 피자 한 판을 망쳐 버릴 확률 */
export const TIRED_MISTAKE_CHANCE = 0.25;
/** 휴가: 사흘, 사장님 개인 돈(장부 이익엔 안 잡힘) */
export const VACATION_DAYS = 3;
export const VACATION_COST = 300_000;
/** 사건별 스트레스 */
export const STRESS_EVENT = {
  staffAbsent: 2,
  staffQuit: 4,
  cashNegative: 8,
  badNews: 3,
  groupFail: 6,
  groupSuccess: -3,
  ratingDown: 3,
  ratingUp: -1.5,
  revenueRecord: -4,
};

// ── 메시지 답장 ──
/** 답장할 수 있는 날 수(그 뒤엔 답장 버튼이 사라진다) */
export const REPLY_DAYS = 3;
/** 리뷰에 직접 답글을 쓰는 수고 */
export const REPLY_STRESS = 0.5;
/** 속 시원하게 반박하면 */
export const REBUT_STRESS = -1;
/** 사과 답글이 그 리뷰가 깎은 평점을 되돌리는 비율(이 사이에서 무작위) */
export const APOLOGY_RESTORE: [number, number] = [0.3, 0.6];
/** 반박이 먹힐 확률. 안 먹히면 그 리뷰만큼 더 깎이고 덤으로 더 */
export const REBUT_WIN_CHANCE = 0.25;
export const REBUT_EXTRA_LOSS = 0.03;
/** 쿠폰: 다시 주문할 때만 빠지는 할인, 다시 올 확률, 며칠 안에 */
export const COUPON_VALUE = 3000;
export const COUPON_RETURN_CHANCE = 0.65;
export const COUPON_RETURN_DAYS = 5;
/** 쿠폰 받은 손님은 마음이 조금 풀려 있다(만족도 덤) */
export const COUPON_GOODWILL = 0.5;
/** 손님 요청: 가격 내리기 폭, 메뉴 약속 기한, 약속을 지키거나 어겼을 때 평점 */
export const PRICE_CUT = 0.05;
export const PROMISE_DAYS = 14;
export const PROMISE_RATING_UP = 0.03;
export const PROMISE_RATING_DOWN = 0.05;
