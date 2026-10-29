import { createNewGame } from '../../src/sim/newGame';
import { advanceTick } from '../../src/sim/tick';
import type { GameState } from '../../src/sim/types';

export function g(): GameState {
  return createNewGame({ seed: 123, neighborhoodId: 'campus', shopName: '테스트 피자', nowMs: 0 });
}

/** 개점 처리가 끝난 1일 12시 상태. 다음 몇 틱 동안은 뉴스 멈춤이 없다. */
export function midDay(): GameState {
  let s = g();
  for (let i = 0; i < 12; i++) s = advanceTick(s).state;
  return { ...s, charge: { ticks: 77, lastAccruedAt: 0 } };
}
