import { describe, expect, it } from "vitest";
import { generateCompass } from "../src/compass/index.js";
import type { CompassContext } from "../src/compass/index.js";
import { createRng } from "../src/rng/index.js";

function makeCtx(over: Partial<CompassContext> = {}): CompassContext {
  return {
    gameMonth: 5,
    destinyOptions: [
      { label: "【天命·圣体初劫】修炼《清心镇魔诀》压制圣体。", destinyFlag: true },
      { label: "【天命·圣体初劫】⚠️寻找血煞之地引劫淬体。", destinyFlag: true, riskFlag: true },
    ],
    karmaOptions: [{ label: "【因缘】研究那块发烫的黑玉。" }],
    exploreOptions: [{ label: "探索后山禁地。" }],
    socialOptions: [{ label: "拜访坊市老陈。" }],
    artOptions: [{ label: "精进炼丹术。" }],
    secludeOptions: [{ label: "闭关苦修一月。" }],
    ...over,
  };
}

describe("决策罗盘（四章四）", () => {
  it("固定生成 15 个选项，编号 1-15 连续", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const opts = generateCompass(makeCtx(), createRng(seed));
      expect(opts).toHaveLength(15);
      expect(opts.map((o) => o.idx)).toEqual(Array.from({ length: 15 }, (_, i) => i + 1));
    }
  });
  it("六类配额：命途/因缘/历练/经营 2-3，百艺/闭关 1-2", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const opts = generateCompass(makeCtx(), createRng(seed));
      const byKind = new Map<string, number>();
      for (const o of opts) byKind.set(o.kind, (byKind.get(o.kind) ?? 0) + 1);
      for (const k of ["mingtu", "yinyuan", "lishi", "daoyuan"]) {
        const n = byKind.get(k)!;
        expect(n).toBeGreaterThanOrEqual(2);
        expect(n).toBeLessThanOrEqual(3);
      }
      for (const k of ["baiyi", "biguan"]) {
        const n = byKind.get(k)!;
        expect(n).toBeGreaterThanOrEqual(1);
        expect(n).toBeLessThanOrEqual(2);
      }
    }
  });
  it("天命之召（1-3 月）注入主线选项并带 destinyFlag", () => {
    const opts = generateCompass(makeCtx({ gameMonth: 2 }), createRng(3));
    const destiny = opts.filter((o) => o.destinyFlag);
    expect(destiny.length).toBeGreaterThanOrEqual(1);
    expect(destiny.some((o) => o.riskFlag)).toBe(true); // ⚠️风险选项保留
  });
  it("非天命窗口（4-12 月）主线选项不注入 destinyFlag", () => {
    const opts = generateCompass(makeCtx({ gameMonth: 7 }), createRng(3));
    expect(opts.every((o) => !o.destinyFlag)).toBe(true);
  });
  it("引导暂停时（连续 3 回合未选天命/因缘）不注入主线选项", () => {
    const opts = generateCompass(makeCtx({ gameMonth: 2, suppressedGuidance: true }), createRng(3));
    expect(opts.every((o) => !o.destinyFlag)).toBe(true);
  });
  it("选项池不足时使用兜底文案，保鲜期 1-4 月", () => {
    const opts = generateCompass(makeCtx({ exploreOptions: [] }), createRng(9));
    expect(opts.some((o) => o.kind === "lishi" && o.label.includes("历练"))).toBe(true);
    for (const o of opts) {
      expect(o.freshnessMonths).toBeGreaterThanOrEqual(1);
      expect(o.freshnessMonths).toBeLessThanOrEqual(4);
    }
  });
  it("同 ctx 同 seed 确定性输出", () => {
    expect(generateCompass(makeCtx(), createRng(5))).toEqual(generateCompass(makeCtx(), createRng(5)));
  });
});
