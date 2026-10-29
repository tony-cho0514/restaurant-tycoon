import { NEIGHBORHOODS } from '../../sim/neighborhoods';
import type { MarginCtx } from '../../sim/levers';
import type { GameState } from '../../sim/types';

export interface PanelProps {
  state: GameState;
  update: (fn: (s: GameState) => GameState) => void;
}

export function marginCtx(s: GameState): MarginCtx {
  return { prices: s.prices, menuPrices: s.menuPrices, inflation: s.economy.inflation, levers: s.levers, n: NEIGHBORHOODS[s.neighborhoodId] };
}
