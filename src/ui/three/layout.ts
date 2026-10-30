// 3D 미니어처 가게의 배치(단위: 바닥 타일 1칸). x = 왼쪽→오른쪽, z = 뒷벽→앞, y = 위.
// 모형은 Kenney(CC0) 소재. 놓을 때는 모형의 바닥 중심을 (x, z)에, 바닥 높이를 y에 맞춘다.

export const ROOM = { width: 8, depth: 6, street: 2.6, wallHeight: 1.29 };

export interface Prop {
  model: string;
  x: number;
  z: number;
  /** 바닥 높이(기본 0) */
  y?: number;
  /** 도(degree) 단위 회전 */
  rotY?: number;
  scale?: number;
}

export function modelPath(name: string): string {
  return `models/${name}.glb`;
}

const F = (m: string) => `furniture/${m}`;
const FOOD = (m: string) => `food/${m}`;

const COUNTER_TOP = 0.42;
const CABINET_TOP = 0.45;

const backWall: Prop[] = Array.from({ length: ROOM.width }, (_, i) => ({
  model: F(i >= 4 && i <= 6 ? 'wallWindow' : 'wall'),
  x: i + 0.5,
  z: 0.03,
}));

const leftWall: Prop[] = Array.from({ length: ROOM.depth }, (_, j) => ({
  model: F('wall'),
  x: 0.03,
  z: j + 0.5,
  rotY: 90,
}));

const kitchen: Prop[] = [
  { model: F('kitchenCabinet'), x: 0.3, z: 0.3 },
  { model: F('kitchenStove'), x: 0.75, z: 0.3 },
  { model: F('kitchenCabinet'), x: 1.2, z: 0.3 },
  { model: F('kitchenSink'), x: 1.65, z: 0.3 },
  { model: F('kitchenCabinet'), x: 2.1, z: 0.3 },
  { model: F('kitchenFridgeLarge'), x: 2.8, z: 0.25 },
  { model: F('hoodLarge'), x: 0.75, z: 0.2, y: 0.78 },
  { model: F('kitchenCabinetUpper'), x: 0.3, z: 0.15, y: 0.78 },
  { model: F('kitchenCabinetUpper'), x: 1.2, z: 0.15, y: 0.78 },
  { model: F('kitchenCabinetUpper'), x: 2.1, z: 0.15, y: 0.78 },
  { model: FOOD('cheese'), x: 0.3, z: 0.3, y: CABINET_TOP, scale: 0.25 },
  { model: FOOD('tomato'), x: 1.15, z: 0.25, y: CABINET_TOP, scale: 0.28 },
  { model: FOOD('tomato'), x: 1.27, z: 0.36, y: CABINET_TOP, scale: 0.28 },
  { model: FOOD('bottle-oil'), x: 2.05, z: 0.3, y: CABINET_TOP, scale: 0.3 },
  { model: FOOD('mushroom'), x: 2.18, z: 0.36, y: CABINET_TOP, scale: 0.25 },
  { model: F('cardboardBoxClosed'), x: 0.3, z: 1.1 },
];

const counter: Prop[] = [
  ...[0.35, 0.78, 1.21, 1.64, 2.07, 2.5].map((x) => ({ model: F('kitchenBar'), x, z: 1.75, rotY: 180 })),
  { model: F('kitchenBarEnd'), x: 2.93, z: 1.75, rotY: 180 },
  { model: FOOD('pizza-box'), x: 0.45, z: 1.75, y: COUNTER_TOP, scale: 0.3 },
  { model: FOOD('pizza-box'), x: 0.45, z: 1.75, y: COUNTER_TOP + 0.03, scale: 0.3, rotY: 12 },
  { model: FOOD('pizza-box'), x: 0.45, z: 1.75, y: COUNTER_TOP + 0.06, scale: 0.3, rotY: -8 },
  { model: FOOD('cutting-board'), x: 1.25, z: 1.75, y: COUNTER_TOP, scale: 0.35 },
  { model: FOOD('pizza-cutter'), x: 1.45, z: 1.72, y: COUNTER_TOP, scale: 0.3 },
  { model: F('computerScreen'), x: 2.6, z: 1.72, y: COUNTER_TOP, scale: 0.7, rotY: 180 },
  { model: F('plantSmall1'), x: 2.93, z: 1.75, y: COUNTER_TOP },
];

const TABLES = [
  { x: 4.3, z: 2.4 },
  { x: 5.6, z: 2.4 },
  { x: 6.9, z: 2.4 },
  { x: 4.3, z: 4.3 },
  { x: 5.6, z: 4.3 },
  { x: 6.9, z: 4.3 },
];

/** 손님이 앉는 자리: 의자 위치와 바라보는 방향(도) */
export const SEATS: { x: number; z: number; rotY: number }[] = TABLES.flatMap((t) => [
  { x: t.x - 0.18, z: t.z - 0.43, rotY: 0 },
  { x: t.x + 0.18, z: t.z + 0.43, rotY: 180 },
]);

const dining: Prop[] = [{ model: F('rugRectangle'), x: 5.6, z: 3.35, scale: 3.2 }];

/** 식탁 하나 = 식탁 + 의자 2개 + 접시·컵. 업그레이드한 만큼 앞에서부터 보인다. */
export const TABLE_GROUPS: Prop[][] = TABLES.map((t, i) => [
  { model: F('tableCloth'), x: t.x, z: t.z },
  ...SEATS.slice(i * 2, i * 2 + 2).map((s) => ({ model: F('chairCushion'), x: s.x, z: s.z, rotY: s.rotY })),
  { model: FOOD('plate'), x: t.x - 0.18, z: t.z - 0.1, y: 0.33, scale: 0.25 },
  { model: FOOD('plate'), x: t.x + 0.18, z: t.z + 0.1, y: 0.33, scale: 0.25 },
  { model: FOOD(i % 2 ? 'soda-can' : 'glass'), x: t.x + 0.05, z: t.z - 0.05, y: 0.33, scale: 0.3 },
]);

const decor: Prop[] = [
  { model: F('pottedPlant'), x: 3.7, z: 0.35 },
  { model: F('pottedPlant'), x: 7.7, z: 0.35 },
  { model: F('pottedPlant'), x: 3.7, z: 5.7 },
  { model: F('coatRackStanding'), x: 7.75, z: 1.3 },
  { model: F('lampRoundFloor'), x: 7.75, z: 3.3 },
  { model: F('trashcan'), x: 3.45, z: 1.7 },
  { model: F('rugDoormat'), x: 7.5, z: 5.65 },
];

export const STATIC_PROPS: Prop[] = [...backWall, ...leftWall, ...kitchen, ...counter, ...dining, ...decor];

/** 손님 모형(걷기·앉기 동작이 들어 있다) */
export const CHARACTERS = [
  'characters/character-female-a',
  'characters/character-male-a',
  'characters/character-female-b',
  'characters/character-male-b',
  'characters/character-female-c',
  'characters/character-male-d',
];

/** 카운터 뒤의 사장님과 알바 */
export const STAFF = [
  { model: 'characters/character-male-c', x: 0.95, z: 1.2 },
  { model: 'characters/character-female-d', x: 1.95, z: 1.2 },
  { model: 'characters/character-male-b', x: 2.6, z: 1.2 },
];

/** 손님이 들어오는 길: 가게 밖(오른쪽 앞) → 입구 → 카운터 앞 */
export const ENTRY_PATH = [
  { x: 8.6, z: 6.4 },
  { x: 7.4, z: 5.3 },
];
export const COUNTER_FRONT = { xMin: 1.0, xMax: 2.6, z: 2.35 };

/** 배달차: 길에 서 있다가 뒤쪽(-z)으로 나간다 */
export const VAN = { x: 9.3, z: 3.2, rotY: 180, scale: 0.42, exitZ: -4, returnZ: 9 };

/** 갓 구운 피자가 나타나는 카운터 위 자리 */
export const PIZZA_SLOTS = [0.85, 1.05, 1.7, 1.9, 2.25].map((x) => ({ x, z: 1.75, y: COUNTER_TOP }));
