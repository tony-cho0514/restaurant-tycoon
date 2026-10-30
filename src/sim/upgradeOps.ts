// 가게 업그레이드의 값과 효과. 단계는 state.upgrades에, 비용은 장부의 「투자」로 잡힌다.
import type { GameState } from './types';
import type { UpgradeId } from './upgrades';

export interface UpgradeDef {
  name: string;
  icon: string;
  /** 시작 단계(오토바이만 0) */
  start: number;
  max: number;
  /** costs[i] = 단계 start+i → start+i+1 비용 */
  costs: number[];
  /** 단계별 효과 설명 */
  effect: (level: number) => string;
}

const TABLES = [3, 4, 6];
const OVEN = [16, 24, 32];
const STORAGE = [1, 1.5, 2];
const INTERIOR = [0, 0.1, 0.2];
const SIGN = [1, 1.1];
const BIKE = [0, 5, 10];

export const UPGRADES: Record<UpgradeId, UpgradeDef> = {
  tables: { name: '식탁 늘리기', icon: '🍽️', start: 1, max: 3, costs: [2_000_000, 2_500_000], effect: (l) => `식탁 ${TABLES[l - 1]}개 · 시간당 홀 손님 최대 ${TABLES[l - 1] * 2}명` },
  oven: { name: '화덕 오븐', icon: '🔥', start: 1, max: 3, costs: [5_000_000, 8_000_000], effect: (l) => `시간당 피자 최대 ${OVEN[l - 1]}판` },
  storage: { name: '창고·냉장고', icon: '🧊', start: 1, max: 3, costs: [1_500_000, 3_000_000], effect: (l) => `미리 사 둘 수 있는 양 ×${STORAGE[l - 1]}` },
  interior: { name: '인테리어', icon: '🪴', start: 1, max: 3, costs: [4_000_000, 7_000_000], effect: (l) => (l === 1 ? '기본 인테리어' : `홀 만족도 +${INTERIOR[l - 1]}`) },
  sign: { name: '간판', icon: '🪧', start: 1, max: 2, costs: [2_000_000], effect: (l) => (l === 1 ? '작은 간판' : '눈에 띄는 간판 · 지나가는 손님 +10%') },
  bike: { name: '배달 오토바이', icon: '🛵', start: 0, max: 2, costs: [1_800_000, 1_800_000], effect: (l) => (l === 0 ? '대행 기사만 씀' : `배달 시간 −${BIKE[l]}분`) },
};

export const UPGRADE_IDS = Object.keys(UPGRADES) as UpgradeId[];

export const tableCount = (s: GameState) => TABLES[s.upgrades.tables - 1];
/** 시간당 받을 수 있는 홀 손님(좌석 2개짜리 식탁, 한 시간에 한 번 회전) */
export const hallSeatCap = (s: GameState) => tableCount(s) * 2;
export const ovenCap = (s: GameState) => OVEN[s.upgrades.oven - 1];
export const storageMult = (s: GameState) => STORAGE[s.upgrades.storage - 1];
export const interiorBonus = (s: GameState) => INTERIOR[s.upgrades.interior - 1];
export const signMult = (s: GameState) => SIGN[s.upgrades.sign - 1];
export const bikeMinutes = (s: GameState) => BIKE[s.upgrades.bike];

export function upgradeCost(s: GameState, id: UpgradeId): number | null {
  const def = UPGRADES[id];
  const level = s.upgrades[id];
  return level >= def.max ? null : def.costs[level - def.start];
}

/** 가게 등급: 기본에서 올린 단계의 합. 2호점 준비도 = 등급 / 최대 등급 */
export function shopGrade(s: GameState): number {
  return UPGRADE_IDS.reduce((a, id) => a + s.upgrades[id] - UPGRADES[id].start, 0);
}
export const MAX_GRADE = UPGRADE_IDS.reduce((a, id) => a + UPGRADES[id].max - UPGRADES[id].start, 0);

export function buyUpgrade(s: GameState, id: UpgradeId): GameState {
  const cost = upgradeCost(s, id);
  if (cost === null) throw new Error('이미 최고 단계예요');
  if (s.cash < cost) throw new Error('돈이 모자라요');
  return {
    ...s,
    cash: s.cash - cost,
    upgrades: { ...s.upgrades, [id]: s.upgrades[id] + 1 },
    today: { ...s.today, investment: (s.today.investment ?? 0) + cost },
  };
}
