// 가게 업그레이드: 식탁·오븐·창고·인테리어·간판·배달 오토바이. 확장(2호점)으로 가는 길.
export type UpgradeId = 'tables' | 'oven' | 'storage' | 'interior' | 'sign' | 'bike';

export function defaultUpgrades(): Record<UpgradeId, number> {
  return { tables: 1, oven: 1, storage: 1, interior: 1, sign: 1, bike: 0 };
}
