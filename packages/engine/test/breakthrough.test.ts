import { describe, expect, it } from "vitest";
import { BREAKTHROUGHS, attemptBreakthrough, breakthroughDef } from "../src/breakthrough/index.js";
import { createRng } from "../src/rng/index.js";
import type { Cultivation } from "@xunxian/shared";

const atBoundary: Cultivation = { level: 20, exp: 150, lifespanYears: 100 };

describe("六大突破点（三章六）", () => {
  it("六档齐全且点号正确", () => {
    expect(BREAKTHROUGHS).toHaveLength(6);
    expect(BREAKTHROUGHS.map((b) => b.point)).toEqual([
      "10->11", "20->21", "40->41", "60->61", "80->81", "95->96",
    ]);
  });
  it("非边界等级拒绝渡劫", () => {
    const r = attemptBreakthrough(
      { cultivation: { level: 15, exp: 0, lifespanYears: 100 } },
      createRng(1),
    );
    expect("error" in r).toBe(true);
  });
  it("渡劫成功跨入下一境界", () => {
    for (let seed = 1; seed < 200; seed++) {
      const r = attemptBreakthrough({ cultivation: atBoundary }, createRng(seed));
      if (!("error" in r) && r.success) {
        expect(r.cultivation.level).toBe(21);
        expect(r.narrative).toContain("渡过");
        return;
      }
    }
    throw new Error("200 个种子内应出现成功案例");
  });
  it("渡劫失败修为倒退（20->21 失败倒退 3 级至 17）", () => {
    for (let seed = 1; seed < 200; seed++) {
      const r = attemptBreakthrough({ cultivation: atBoundary }, createRng(seed));
      if (!("error" in r) && !r.success) {
        expect(r.cultivation.level).toBe(17);
        return;
      }
    }
    throw new Error("200 个种子内应出现失败案例");
  });
  it("天人感应提升成功率且钳制 95%", () => {
    const r = attemptBreakthrough(
      { cultivation: atBoundary, hasDaoRhymeTianren: true },
      createRng(42),
    );
    if (!("error" in r)) expect(r.successRate).toBeCloseTo(0.9);
    const r2 = attemptBreakthrough(
      { cultivation: atBoundary, hasDaoRhymeTianren: true, isWasteRoot: true },
      createRng(42),
    );
    if (!("error" in r2)) expect(r2.successRate).toBeCloseTo(0.95); // 0.7+0.2+0.1 钳制
  });
  it("breakthroughDef 查询", () => {
    expect(breakthroughDef(10)!.name).toBe("引气入体");
    expect(breakthroughDef(15)).toBeUndefined();
  });
});
