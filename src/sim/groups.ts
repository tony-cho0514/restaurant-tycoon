// 단체 주문: 동네마다 성격이 다른 큰 주문 제안. 받으면 그 시각에 재료와 일손을 먼저 쓴다.
import type { PizzaId } from './menu';

export interface GroupOffer {
  id: number;
  title: string;
  dueDay: number;
  dueHour: number;
  items: { menu: PizzaId; qty: number }[];
  /** 요청한 할인율(0.1 = 10%) */
  discount: number;
  /** 이 날까지 답하지 않으면 사라진다 */
  expiresDay: number;
  /** 받은 뒤 미리 만들어 둔 판 수(메뉴별) */
  madeItems?: { menu: PizzaId; qty: number }[];
}
