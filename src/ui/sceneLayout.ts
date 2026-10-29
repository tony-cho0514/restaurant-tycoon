// 가게 장면 소재와 자리(장면 크기 대비 %). 소재는 Higgsfield 생성물만 쓴다(Task 15에서 채움).
export interface SceneAssets {
  background: string;
  customers: string[];
  rider: string;
  pizza: string;
}

export const SCENE_ASSETS: SceneAssets = { background: '', customers: [], rider: '', pizza: '' };

export const SCENE_LAYOUT = {
  door: { x: 86, y: 70 },
  counter: { x: 34, y: 66 },
  oven: { x: 20, y: 40 },
  kitchen: { x: 46, y: 80 },
  exit: { x: 112, y: 84 },
};
