import { INTERIOR_AND_EQUIPMENT, START_CAPITAL } from './balance';

export type NeighborhoodId = 'campus' | 'office' | 'residential';

export interface Neighborhood {
  id: NeighborhoodId;
  name: string;
  traits: string[];
  baseDailyOrders: number;
  deliveryShare: number;
  priceSensitivity: number;
  weekendFactor: number;
  /** hour 11..21의 상대 손님 비중 */
  hourCurve: number[];
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
    listing: { deposit: 15_000_000, monthlyRent: 1_100_000, keyMoney: 15_000_000, sizePyeong: 10 },
  },
};

export function cashAfterSetup(n: Neighborhood): number {
  return START_CAPITAL - n.listing.deposit - n.listing.keyMoney - INTERIOR_AND_EQUIPMENT;
}
