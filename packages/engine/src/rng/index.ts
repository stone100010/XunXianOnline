// 种子随机（mulberry32）：同 seed 同序列，回合可确定性重放（docs/04 §2）
// 禁止在 engine 内使用 Math.random（ESLint 规则强制）

export type Rng = {
  /** [0, 1) 均匀随机 */
  next(): number;
  /** [min, max) 整数 */
  int(min: number, max: number): number;
  /** 概率 p 的事件是否发生 */
  chance(p: number): boolean;
  /** 依权重选择（返回命中项） */
  weighted<T>(items: readonly [T, number][]): T;
  /** 洗牌（返回新数组） */
  shuffle<T>(arr: readonly T[]): T[];
};

/** FNV-1a 32 位哈希：由 (saveId, turnNo) 派生回合种子 */
export function hashSeed(...parts: (string | number)[]): number {
  let h = 0x811c9dc5;
  for (const part of parts) {
    const s = String(part);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    h ^= 0xff;
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number) => min + Math.floor(next() * (max - min));
  return {
    next,
    int,
    chance: (p: number) => next() < p,
    weighted: (items) => {
      const total = items.reduce((s, [, w]) => s + w, 0);
      let r = next() * total;
      for (const [item, w] of items) {
        r -= w;
        if (r < 0) return item;
      }
      return items[items.length - 1]![0];
    },
    shuffle: (arr) => {
      const out = [...arr];
      for (let i = out.length - 1; i > 0; i--) {
        const j = int(0, i + 1);
        [out[i], out[j]] = [out[j]!, out[i]!];
      }
      return out;
    },
  };
}
