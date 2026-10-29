// 시드 난수(mulberry32). state 하나만 저장하면 같은 수열을 이어서 낼 수 있다.
export class Rng {
  state: number;

  constructor(state: number) {
    this.state = state >>> 0;
  }

  float(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  int(min: number, max: number): number {
    return min + Math.floor(this.float() * (max - min + 1));
  }

  chance(p: number): boolean {
    return this.float() < p;
  }

  normal(mean: number, sd: number): number {
    const u = 1 - this.float();
    const v = this.float();
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  poisson(lambda: number): number {
    if (lambda <= 0) return 0;
    if (lambda >= 30) return Math.max(0, Math.round(this.normal(lambda, Math.sqrt(lambda))));
    const limit = Math.exp(-lambda);
    let k = 0;
    let p = this.float();
    while (p > limit) {
      k++;
      p *= this.float();
    }
    return k;
  }

  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.float() * items.length)];
  }

  weighted<T>(items: readonly { item: T; weight: number }[]): T {
    const total = items.reduce((s, x) => s + x.weight, 0);
    let roll = this.float() * total;
    for (const x of items) {
      roll -= x.weight;
      if (roll < 0) return x.item;
    }
    return items[items.length - 1].item;
  }
}
