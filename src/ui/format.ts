export function won(n: number): string {
  return `${Math.round(n).toLocaleString('ko-KR')}원`;
}

export function manwon(n: number): string {
  return `${Math.round(n / 10000).toLocaleString('ko-KR')}만 원`;
}

export function pct(x: number, digits = 1): string {
  return `${(x * 100).toFixed(digits)}%`;
}

/** 퍼센트포인트 변화: −3.6%p / +1.3%p (음수 기호는 U+2212) */
export function pp(x: number): string {
  const v = Math.abs(x).toFixed(1);
  if (Number(v) === 0) return '0.0%p';
  return `${x < 0 ? '−' : '+'}${v}%p`;
}

export function stars(r: number): string {
  return `★ ${r.toFixed(1)}`;
}
