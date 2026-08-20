import { describe, expect, it } from "vitest";
import { createRng, hashSeed } from "../src/rng/index.js";

describe("种子随机", () => {
  it("同 seed 产生相同序列", () => {
    const a = createRng(12345);
    const b = createRng(12345);
    const seqA = Array.from({ length: 100 }, () => a.next());
    const seqB = Array.from({ length: 100 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it("不同 seed 产生不同序列", () => {
    const a = createRng(1);
    const b = createRng(2);
    expect(Array.from({ length: 10 }, () => a.next())).not.toEqual(
      Array.from({ length: 10 }, () => b.next()),
    );
  });

  it("next() 落在 [0,1)", () => {
    const rng = createRng(hashSeed("save-1", 42));
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("int() 输出在 [min,max) 且覆盖均匀", () => {
    const rng = createRng(7);
    const counts = new Map<number, number>();
    for (let i = 0; i < 10000; i++) {
      const v = rng.int(1, 4);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThan(4);
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    for (const n of [1, 2, 3]) expect(counts.get(n)!).toBeGreaterThan(2500);
  });

  it("weighted() 按权重分布（卡方式校验）", () => {
    const rng = createRng(99);
    const n = 60000;
    const counts = { a: 0, b: 0, c: 0 };
    for (let i = 0; i < n; i++) {
      counts[rng.weighted([["a", 1], ["b", 2], ["c", 7]] as const)]++;
    }
    // 期望 a:6000 b:12000 c:42000，容差 5%
    expect(counts.a / n).toBeCloseTo(0.1, 1);
    expect(counts.b / n).toBeCloseTo(0.2, 1);
    expect(counts.c / n).toBeCloseTo(0.7, 1);
  });

  it("hashSeed 对不同输入产生不同种子", () => {
    expect(hashSeed("save1", 1)).not.toBe(hashSeed("save1", 2));
    expect(hashSeed("save1", 1)).not.toBe(hashSeed("save2", 1));
  });
});
