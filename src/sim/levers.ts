// 운영 수단: 문제 앞에서 사장이 직접 골라 쓰는 수단들. 비용은 미리 정확히, 효과는 해 봐야 안다.
export type LeverId = 'freeCola' | 'premiumCheese' | 'insulatedBox' | 'reviewReplies' | 'appAds';
export type Levers = Record<LeverId, boolean>;
