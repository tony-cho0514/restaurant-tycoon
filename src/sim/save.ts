// 저장: 기기 안 저장소(Storage를 인자로 받음) + 직전 저장 백업 + 파일 내보내기·가져오기.
import type { GameState } from './types';

export const SAVE_KEY = 'restaurant-tycoon/save/v1';
export const BACKUP_KEY = 'restaurant-tycoon/save/v1/bak';

export interface StorageLike {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}

export class SaveImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SaveImportError';
  }
}

function isGameState(x: unknown): x is GameState {
  if (!x || typeof x !== 'object') return false;
  const s = x as Partial<GameState>;
  return s.version === 1 && typeof s.cash === 'number' && !!s.clock && typeof s.clock.day === 'number' && !!s.ledger && !!s.news;
}

function parseState(raw: string | null): GameState | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isGameState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveGame(s: GameState, st: StorageLike): { ok: true } | { ok: false; reason: 'quota' | 'unknown' } {
  try {
    const current = st.getItem(SAVE_KEY);
    // 멀쩡한 본 저장만 백업으로 옮긴다(깨진 걸로 좋은 백업을 덮지 않게).
    if (parseState(current)) st.setItem(BACKUP_KEY, current!);
    st.setItem(SAVE_KEY, JSON.stringify(s));
    return { ok: true };
  } catch (e) {
    const name = (e as { name?: string })?.name;
    return { ok: false, reason: name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED' ? 'quota' : 'unknown' };
  }
}

export function loadGame(st: StorageLike): GameState | null {
  return parseState(st.getItem(SAVE_KEY)) ?? parseState(st.getItem(BACKUP_KEY));
}

export function exportSave(s: GameState, nowMs: number): string {
  return JSON.stringify({ app: 'restaurant-tycoon', version: 1, exportedAt: nowMs, state: s });
}

export function importSave(text: string): GameState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new SaveImportError('이 게임의 저장 파일이 아니에요');
  }
  const file = parsed as { app?: unknown; version?: unknown; state?: unknown };
  if (!file || typeof file !== 'object' || file.app !== 'restaurant-tycoon') throw new SaveImportError('이 게임의 저장 파일이 아니에요');
  if (file.version !== 1) throw new SaveImportError('지원하지 않는 저장 버전이에요');
  if (!isGameState(file.state)) throw new SaveImportError('저장 파일이 손상됐어요');
  return file.state;
}
