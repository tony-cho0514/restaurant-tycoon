import type { PizzaId } from './menu';

export type NeighborhoodId = 'campus' | 'office' | 'residential';

export interface Neighborhood {
  id: NeighborhoodId;
  name: string;
  traits: string[];
  baseDailyOrders: number;
  deliveryShare: number;
  priceSensitivity: number;
  weekendFactor: number;
  /** hour 11..21의 상대 손님 비중(하루 기본 주문 수의 기준) */
  hourCurve: number[];
  /** 그 밖의 시각(10시, 22·23시)에 문을 열었을 때의 손님 비중 */
  extraHours: Partial<Record<number, number>>;
  /** 배달 구역: 주문 비중과 추가 배달 시간(분) */
  zones: { id: string; name: string; share: number; extraMin: number }[];
  /** 새 메뉴 선호(곱). 개업 메뉴 3종은 1 */
  prefs: Partial<Record<PizzaId, number>>;
  listing: { deposit: number; monthlyRent: number; keyMoney: number; sizePyeong: number };
}

export const NEIGHBORHOODS: Record<NeighborhoodId, Neighborhood> = {
  campus: {
    id: 'campus',
    name: '대학가 「새내기길」',
    traits: ['학생 손님이 많고 가격에 민감해요', '배달 주문이 절반을 넘어요', '저녁과 밤에 붐비고 주말엔 조금 한산해요'],
    baseDailyOrders: 40,
    deliveryShare: 0.6,
    priceSensitivity: 1.4,
    weekendFactor: 0.9,
    hourCurve: [0.6, 1.0, 0.9, 0.5, 0.5, 0.6, 0.9, 1.2, 1.3, 1.1, 0.8],
    extraHours: { 10: 0.3, 22: 0.9, 23: 0.7 },
    zones: [
      { id: 'oneroom', name: '원룸촌', share: 0.35, extraMin: 0 },
      { id: 'dorm', name: '기숙사 앞', share: 0.25, extraMin: 5 },
      { id: 'gate', name: '학교 정문', share: 0.2, extraMin: 3 },
      { id: 'officetel', name: '오피스텔', share: 0.2, extraMin: 8 },
    ],
    prefs: { potato: 1.0, bulgogi: 0.8, goguma: 0.9, hawaiian: 1.1 },
    listing: { deposit: 20_000_000, monthlyRent: 1_500_000, keyMoney: 30_000_000, sizePyeong: 12 },
  },
  office: {
    id: 'office',
    name: '오피스 상권 「유리타워 앞」',
    traits: ['직장인 점심 손님이 몰려요', '가격보다 빠른 음식을 중요하게 봐요', '주말에는 손님이 절반으로 줄어요'],
    baseDailyOrders: 42,
    deliveryShare: 0.4,
    priceSensitivity: 0.8,
    weekendFactor: 0.5,
    hourCurve: [0.8, 1.6, 1.2, 0.4, 0.3, 0.4, 0.8, 1.0, 0.7, 0.4, 0.2],
    extraHours: { 10: 0.3, 22: 0.1, 23: 0 },
    zones: [
      { id: 'tower', name: '유리타워', share: 0.35, extraMin: 0 },
      { id: 'gov', name: '공공기관 청사', share: 0.2, extraMin: 6 },
      { id: 'officetel', name: '오피스텔', share: 0.25, extraMin: 4 },
      { id: 'apt', name: '강변 아파트', share: 0.2, extraMin: 10 },
    ],
    prefs: { potato: 1.0, bulgogi: 1.4, goguma: 0.8, hawaiian: 0.8 },
    listing: { deposit: 25_000_000, monthlyRent: 2_300_000, keyMoney: 25_000_000, sizePyeong: 15 },
  },
  residential: {
    id: 'residential',
    name: '주택가 「은행나무 마을」',
    traits: ['가족 손님 위주라 배달이 대부분이에요', '지나다니는 사람은 적지만 주변에 집이 많아요', '저녁과 주말에 주문이 몰려요'],
    baseDailyOrders: 38,
    deliveryShare: 0.75,
    priceSensitivity: 1.0,
    weekendFactor: 1.3,
    hourCurve: [0.4, 0.7, 0.6, 0.4, 0.4, 0.6, 1.1, 1.5, 1.4, 1.0, 0.6],
    extraHours: { 10: 0.2, 22: 0.5, 23: 0.3 },
    zones: [
      { id: 'apt1', name: '은행나무 1단지', share: 0.3, extraMin: 0 },
      { id: 'apt2', name: '은행나무 2단지', share: 0.25, extraMin: 4 },
      { id: 'villa', name: '빌라촌', share: 0.2, extraMin: 6 },
      { id: 'academy', name: '학원가', share: 0.15, extraMin: 3 },
      { id: 'mall', name: '상가', share: 0.1, extraMin: 2 },
    ],
    prefs: { potato: 1.3, bulgogi: 1.1, goguma: 1.4, hawaiian: 0.8 },
    listing: { deposit: 15_000_000, monthlyRent: 1_100_000, keyMoney: 15_000_000, sizePyeong: 10 },
  },
};
