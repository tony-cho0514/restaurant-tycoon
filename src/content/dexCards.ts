// 경영 개념 도감: 처음 겪을 때 한 장씩 쌓인다. 「방금 겪은 일」은 게임이 내 숫자로 채우고, 여기엔 개념 설명만 둔다.
// 설명은 표준 정의에 맞출 것(배움이 목적이라 틀린 설명은 치명적이다).

export type CardId =
  | 'revenueProfit' | 'fixedVariable' | 'contribution' | 'breakeven' | 'costRate' | 'cashflow'
  | 'elasticity' | 'reputation' | 'retention' | 'trust'
  | 'fx' | 'supplyShock' | 'hedging' | 'inventory'
  | 'bottleneck' | 'opportunityCost' | 'laborCost' | 'sustainability';

export interface CardDef {
  title: string;
  category: '돈의 기본' | '가격·손님' | '원가·재고' | '운영';
  icon: string;
  /** 쉬운 말 정의 */
  text: string;
  /** 아직 못 겪었을 때 보이는 귀띔 */
  howTo: string;
}

export const CARD_IDS: CardId[] = [
  'revenueProfit', 'fixedVariable', 'contribution', 'breakeven', 'costRate', 'cashflow',
  'elasticity', 'reputation', 'retention', 'trust',
  'fx', 'supplyShock', 'hedging', 'inventory',
  'bottleneck', 'opportunityCost', 'laborCost', 'sustainability',
];

export const CARDS: Record<CardId, CardDef> = {
  revenueProfit: {
    title: '매출과 이익', category: '돈의 기본', icon: '💰',
    text: '매출은 손님에게 받은 돈 전부, 이익은 거기서 모든 비용을 빼고 남는 돈이에요. 매출이 커도 비용이 더 크면 손해예요.',
    howTo: '하루 장사를 마치면 열려요.',
  },
  fixedVariable: {
    title: '고정비와 변동비', category: '돈의 기본', icon: '⚖️',
    text: '변동비는 팔수록 함께 늘어나는 비용(재료비·수수료·배달비), 고정비는 팔든 안 팔든 나가는 비용(월세·인건비·공과금)이에요.',
    howTo: '첫 달 부검 리포트에서 열려요.',
  },
  contribution: {
    title: '공헌이익', category: '돈의 기본', icon: '🧮',
    text: '매출에서 변동비만 뺀 돈이에요. 하나 팔 때마다 고정비를 메우는 데 보태는 몫이라, 이게 작으면 아무리 팔아도 고정비를 못 메워요.',
    howTo: '첫 달 부검 리포트에서 열려요.',
  },
  breakeven: {
    title: '손익분기점', category: '돈의 기본', icon: '📍',
    text: '이익이 딱 0이 되는 판매량이에요. 고정비 ÷ 하나당 공헌이익으로 구해요. 고정비가 크거나 하나에 남는 돈이 적을수록 높아져요.',
    howTo: '첫 달 부검 리포트에서 열려요.',
  },
  costRate: {
    title: '원가율', category: '돈의 기본', icon: '🧀',
    text: '매출 가운데 재료비가 차지하는 비율이에요. 재료값이 오르거나 가격을 내리면 올라가요.',
    howTo: '첫 달 부검 리포트에서 열려요.',
  },
  cashflow: {
    title: '현금흐름과 이익', category: '돈의 기본', icon: '🏦',
    text: '재료를 미리 사면 통장 돈은 바로 나가지만, 장부의 이익에는 그 재료를 쓸 때 비용으로 잡혀요. 그래서 이익이 나는데도 현금이 모자랄 수 있어요(흑자 도산).',
    howTo: '재료를 한꺼번에 많이 사거나 통장이 마이너스가 되면 열려요.',
  },
  elasticity: {
    title: '가격 탄력성', category: '가격·손님', icon: '🏷️',
    text: '가격이 바뀔 때 팔리는 양이 얼마나 따라 바뀌는지예요. 가격에 민감한 손님이 많을수록 조금만 올려도 손님이 크게 줄어요.',
    howTo: '피자값을 바꾸고 일주일이 지나면 열려요.',
  },
  reputation: {
    title: '평판과 리뷰', category: '가격·손님', icon: '⭐',
    text: '평점은 최근 손님들의 만족이 쌓여 움직이고, 평점이 다시 손님 수를 움직여요. 나쁜 경험 한 번이 다음 손님까지 줄일 수 있어요.',
    howTo: '별 1~2개 리뷰를 처음 받으면 열려요.',
  },
  retention: {
    title: '고객 유지', category: '가격·손님', icon: '🎟️',
    text: '떠나려는 손님을 붙잡는 데도 돈이 들고, 새 손님을 데려오는 데도 돈이 들어요. 흔히 있던 손님을 지키는 쪽이 더 싸게 먹힌다고 해요.',
    howTo: '쿠폰을 받은 손님이 다시 오면 열려요.',
  },
  trust: {
    title: '약속과 신뢰', category: '가격·손님', icon: '🤝',
    text: '약속은 기대를 만들어요. 지키면 신뢰가 쌓이고, 어기면 아무 말도 안 한 것보다 더 나빠질 수 있어요.',
    howTo: '손님과 한 메뉴 약속의 결과가 나오면 열려요.',
  },
  fx: {
    title: '환율과 수입 원가', category: '원가·재고', icon: '💱',
    text: '환율이 오르면(원화 가치가 내리면) 같은 수입 재료를 사는 데 원화가 더 들어요. 치즈·밀가루처럼 수입하는 재료일수록 영향을 받아요.',
    howTo: '환율이 크게 움직이면 열려요.',
  },
  supplyShock: {
    title: '공급 충격', category: '원가·재고', icon: '🌪️',
    text: '생산이나 유통에 문제가 생겨 물건이 줄면, 사려는 사람은 그대로라 값이 뛰어요. 반대로 풍년이면 값이 내려요.',
    howTo: '치즈 파동이나 채소 풍년이 오면 열려요.',
  },
  hedging: {
    title: '미리 사 두기(선매입)', category: '원가·재고', icon: '📦',
    text: '값이 오르기 전에 사 두면 오른 값을 피할 수 있어요. 대신 돈이 묶이고, 보관할 곳이 필요하고, 유통기한이 지나면 버려야 해요. 예상이 빗나가면 손해예요.',
    howTo: '위기 때 미리 있던 재고로 돈을 아끼면 열려요.',
  },
  inventory: {
    title: '재고와 폐기', category: '원가·재고', icon: '🗑️',
    text: '재고는 돈이 물건으로 묶여 있는 거예요. 너무 많으면 유통기한이 지나 버리고, 너무 적으면 재료가 떨어져 손님을 놓쳐요.',
    howTo: '재료를 처음 버리게 되면 열려요.',
  },
  bottleneck: {
    title: '병목', category: '운영', icon: '🍾',
    text: '여러 단계 가운데 가장 느린 곳이 전체 속도를 정해요. 손님이 아무리 많이 와도 한 시간에 만들 수 있는 피자 수를 넘으면 그 이상은 못 팔아요.',
    howTo: '일손이나 오븐이 모자라 주문을 여러 건 놓치면 열려요.',
  },
  opportunityCost: {
    title: '기회비용', category: '운영', icon: '🕳️',
    text: '하지 못해서 놓친 이익이에요. 장부에는 찍히지 않지만 실제로 잃은 돈이에요.',
    howTo: '놓친 주문이 있는 달의 부검 리포트에서 열려요.',
  },
  laborCost: {
    title: '인건비 구조', category: '운영', icon: '🧾',
    text: '알바비는 시급 × 시간만이 아니에요. 4대보험 사업주 부담이 더해지고, 한 주에 15시간 넘게 일하면 주휴수당(일한 시간의 5분의 1만큼)이 붙어요.',
    howTo: '알바가 하루 일하면 열려요.',
  },
  sustainability: {
    title: '지속 가능성', category: '운영', icon: '🔋',
    text: '사장 한 사람에게 모든 걸 기대는 가게는 사장이 쓰러지면 멈춰요. 쉬는 날과 맡길 사람이 있어야 오래가요.',
    howTo: '사장님이 많이 지치면 열려요.',
  },
};
