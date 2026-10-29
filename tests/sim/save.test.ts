import { saveGame, loadGame, exportSave, importSave, SAVE_KEY, BACKUP_KEY } from '../../src/sim/save';
import { advanceTick, playTick } from '../../src/sim/tick';
import { accrueCharge } from '../../src/sim/charge';
import { g } from './gameHelpers';

const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, m }; };

test('저장 후 불러오면 같다', () => { const st = mem(); const s = g(); saveGame(s, st); expect(loadGame(st)).toEqual(s); });

test('본 저장이 깨지면 백업에서', () => { const st = mem(); const a = g(); saveGame(a, st); saveGame(advanceTick(a).state, st); st.m.set(SAVE_KEY, '{깨짐'); expect(loadGame(st)).toEqual(a); });

test('둘 다 깨지면 null', () => { const st = mem(); st.m.set(SAVE_KEY, 'x'); st.m.set(BACKUP_KEY, 'y'); expect(loadGame(st)).toBeNull(); });

test('용량 초과는 던지지 않고 알려 준다', () => {
  const st = { getItem: () => null, setItem: () => { throw Object.assign(new Error('full'), { name: 'QuotaExceededError' }); } };
  expect(saveGame(g(), st)).toEqual({ ok: false, reason: 'quota' });
});

test('엉뚱한 파일은 한국어로 거절', () => {
  expect(() => importSave('{"hello":1}')).toThrow('이 게임의 저장 파일이 아니에요');
  expect(() => importSave('not json')).toThrow('이 게임의 저장 파일이 아니에요');
  expect(() => importSave(JSON.stringify({ app: 'restaurant-tycoon', version: 9, state: {} }))).toThrow('지원하지 않는 저장 버전이에요');
});

test('내보내기 → 가져오기 왕복', () => { const s = g(); expect(importSave(exportSave(s, 0))).toEqual(s); });

test('재생 중 닫았다 다시 열어도 충전이 두 번 쌓이지 않는다', () => {
  const st = mem(); const r = playTick(g(), 1000)!; saveGame(r.state, st);
  const back = loadGame(st)!; expect(accrueCharge(back.charge, 1000).ticks).toBeCloseTo(r.state.charge.ticks);
});
