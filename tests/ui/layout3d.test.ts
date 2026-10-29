import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { CHARACTERS, ROOM, SEATS, STATIC_PROPS, modelPath } from '../../src/ui/three/layout';

test('배치에 쓴 모형 파일이 전부 있다', () => {
  const names = new Set([...STATIC_PROPS.map((p) => p.model), ...CHARACTERS, 'car/delivery', 'food/pizza', 'food/pizza-box']);
  for (const m of names) expect(existsSync(resolve('public', modelPath(m))), m).toBe(true);
});

test('소품은 모두 방(또는 바깥 길) 안에 있다', () => {
  for (const p of STATIC_PROPS) {
    expect(p.x).toBeGreaterThanOrEqual(-0.1); expect(p.x).toBeLessThanOrEqual(ROOM.width + ROOM.street + 0.1);
    expect(p.z).toBeGreaterThanOrEqual(-0.1); expect(p.z).toBeLessThanOrEqual(ROOM.depth + 0.1);
  }
});

test('손님이 앉을 자리가 테이블마다 있다', () => {
  expect(SEATS.length).toBeGreaterThanOrEqual(6);
  expect(CHARACTERS.length).toBeGreaterThanOrEqual(6);
});
