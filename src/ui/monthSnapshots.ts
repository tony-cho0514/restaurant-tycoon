// 달마다 첫날 상태를 기기에 따로 남긴다(「지난달 다시 돌려 보기」용). 가장 최근 두 달만.
import type { GameState } from '../sim/types';
import { DAYS_PER_MONTH } from '../sim/time';

const KEY = 'rt-month-start';
const KEEP = 2;

function readAll(): Record<string, GameState> {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Record<string, GameState> | null;
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}

export function saveMonthStart(snap: GameState) {
  const all = readAll();
  const m = String(Math.floor(snap.clock.day / DAYS_PER_MONTH));
  if (all[m]?.createdAt === snap.createdAt) return;
  all[m] = snap;
  const keep = Object.keys(all).filter((k) => all[k].createdAt === snap.createdAt).sort((a, b) => Number(b) - Number(a)).slice(0, KEEP);
  try {
    localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(keep.map((k) => [k, all[k]]))));
  } catch { /* 저장 공간이 모자라면 다시 돌려 보기만 못 한다 */ }
}

/** 이 가게의 그 달 첫날 상태(없으면 null) */
export function loadMonthStart(createdAt: number, monthIndex: number): GameState | null {
  const s = readAll()[String(monthIndex)];
  return s && s.createdAt === createdAt ? s : null;
}
