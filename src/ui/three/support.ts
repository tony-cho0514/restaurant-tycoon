// three.js를 불러오지 않고 3D를 쓸 수 있는지만 본다(3D 코드는 필요할 때만 따로 받는다).
let cached: boolean | null = null;

export function canUse3D(): boolean {
  if (cached !== null) return cached;
  if (typeof window === 'undefined' || /jsdom/i.test(navigator.userAgent)) return (cached = false);
  try {
    const c = document.createElement('canvas');
    cached = !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    cached = false;
  }
  return cached;
}
