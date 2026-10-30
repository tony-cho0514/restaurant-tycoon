// 경력: 문을 닫은 가게 기록과 도감은 기기에 따로 남아 다음 가게로 이어진다.
import { lifetimeProfit, settlement } from '../sim/bank';
import type { LearningState } from '../sim/learning';
import type { NeighborhoodId } from '../sim/neighborhoods';
import type { GameState } from '../sim/types';

export interface CareerShop {
  name: string;
  neighborhoodId: NeighborhoodId;
  days: number;
  profit: number;
  reason: 'bankrupt' | 'voluntary';
  /** 폐업 정산(통장 + 보증금 − 남은 대출) */
  total: number;
  endedAt: number;
}

export interface Career {
  shops: CareerShop[];
  dex: LearningState['dex'];
}

const CAREER_KEY = 'rt-career';

export function loadCareer(): Career {
  try {
    const raw = JSON.parse(localStorage.getItem(CAREER_KEY) ?? 'null') as Career | null;
    if (raw && Array.isArray(raw.shops) && raw.dex && typeof raw.dex === 'object') return raw;
  } catch { /* 깨진 기록은 새로 시작 */ }
  return { shops: [], dex: {} };
}

/** 문 닫은 가게를 경력에 더하고 도감을 합친다 */
export function recordClosedShop(s: GameState, nowMs: number): Career {
  const c = loadCareer();
  const next: Career = {
    shops: [...c.shops, {
      name: s.shopName, neighborhoodId: s.neighborhoodId, days: s.clock.day, profit: lifetimeProfit(s),
      reason: s.closed?.reason ?? 'voluntary', total: settlement(s).total, endedAt: nowMs,
    }],
    dex: { ...c.dex, ...s.learning.dex },
  };
  try { localStorage.setItem(CAREER_KEY, JSON.stringify(next)); } catch { /* 저장이 막혀도 새 가게는 연다 */ }
  return next;
}

/** 새 가게에 지난 도감을 이어 붙인다 */
export function withCareerDex(s: GameState, c: Career): GameState {
  return { ...s, learning: { ...s.learning, dex: { ...c.dex, ...s.learning.dex } } };
}
