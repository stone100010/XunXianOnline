import { describe, expect, it } from "vitest";
import {
  addCultivationExp, addDaoBaseExp, addDaoRhymeExp, ascendRealm,
  failBreakthrough, isBoundaryLevel,
} from "../src/growth/index.js";
import { DAO_BASE_CURVE, daoBaseExpPerLevel } from "../src/constants/growth.js";
import { expToNextLevel, realmOfLevel } from "../src/constants/realms.js";
import type { Cultivation, DaoBases } from "@xunxian/shared";

describe("境界表（三章一）", () => {
  it("等级→境界映射", () => {
    expect(realmOfLevel(1).key).toBe("fanren");
    expect(realmOfLevel(11).key).toBe("lianqi");
    expect(realmOfLevel(96).key).toBe("dujie");
    expect(() => realmOfLevel(101)).toThrow();
  });
  it("每级修为需求", () => {
    expect(expToNextLevel(5)).toBe(50);
    expect(expToNextLevel(15)).toBe(150);
    expect(expToNextLevel(95)).toBe(1800);
    expect(expToNextLevel(100)).toBe(3000);
  });
});

describe("修为升级（三章一）", () => {
  it("境界内正常升级", () => {
    const c: Cultivation = { level: 1, exp: 0, lifespanYears: 80 };
    const r = addCultivationExp(c, 120); // 50 + 50 升 2 级余 20
    expect(r.state.level).toBe(3);
    expect(r.state.exp).toBe(20);
    expect(r.levelsGained).toBe(2);
  });
  it("境界边界满溢不自动升级（等待渡劫）", () => {
    const c: Cultivation = { level: 10, exp: 40, lifespanYears: 80 };
    const r = addCultivationExp(c, 100); // 满 140 ≥ 50，但 Lv.10 是边界
    expect(r.state.level).toBe(10);
    expect(r.state.exp).toBeGreaterThanOrEqual(50);
  });
  it("isBoundaryLevel 标出六大突破点", () => {
    for (const lv of [10, 20, 40, 60, 80, 95]) expect(isBoundaryLevel(lv)).toBe(true);
    for (const lv of [9, 21, 55]) expect(isBoundaryLevel(lv)).toBe(false);
  });
});

describe("渡劫成败（三章六）", () => {
  it("成功跨入下一境界", () => {
    const c: Cultivation = { level: 20, exp: 150, lifespanYears: 100 };
    const next = ascendRealm(c);
    expect(next.level).toBe(21);
  });
  it("失败倒退不跌破境界下界", () => {
    const c: Cultivation = { level: 21, exp: 0, lifespanYears: 100 };
    const r = failBreakthrough(c, 5);
    expect(r.level).toBe(21); // 筑基下界
  });
});

describe("道基经验曲线（三章五）", () => {
  it("分段每级经验", () => {
    expect(daoBaseExpPerLevel(1)).toBe(80);
    expect(daoBaseExpPerLevel(21)).toBe(200);
    expect(daoBaseExpPerLevel(96)).toBe(2000);
    expect(DAO_BASE_CURVE).toHaveLength(6);
  });
  it("道基经验累加升级", () => {
    const bases: DaoBases = {
      wuxin: { level: 1, exp: 0 }, daoxin: { level: 1, exp: 0 },
      genku: { level: 1, exp: 0 }, qiyun: { level: 1, exp: 0 }, xuema: { level: 1, exp: 0 },
    };
    const { bases: out, gain } = addDaoBaseExp(bases, "genku", 80);
    expect(out.genku.level).toBe(2);
    expect(gain.levelsGained).toBe(1);
  });
});

describe("道韵-道基联动（三章七）", () => {
  it("道韵 > 对应道基×2 触发瓶颈期，经验减半", () => {
    const rhyme = { key: "mingcha", level: 30, exp: 0 };
    const { rhyme: r, bottlenecked } = addDaoRhymeExp(rhyme, 100, 10); // 30 > 20
    expect(bottlenecked).toBe(true);
    expect(r.exp).toBe(50);
  });
  it("未触发瓶颈期全额经验", () => {
    const { rhyme: r, bottlenecked } = addDaoRhymeExp({ key: "mingcha", level: 10, exp: 0 }, 100, 10);
    expect(bottlenecked).toBe(false);
    expect(r.exp).toBe(100);
  });
});
