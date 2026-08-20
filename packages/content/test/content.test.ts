import { describe, expect, it } from "vitest";
import { START_PACKS, startPackByKey } from "../src/packs.js";
import { STORYLINE_SEEDS, storylineByKey } from "../src/storylines.js";
import { DAO_RHYMES, RACES, DOMAINS, SPIRIT_ROOT_GRADES, AGE_BANDS } from "../src/character.js";

describe("开局包与主线绑定（二章一.6 / 六章四）", () => {
  it("开局包 10 个，key 唯一", () => {
    expect(START_PACKS).toHaveLength(10);
    expect(new Set(START_PACKS.map((p) => p.key)).size).toBe(10);
  });
  it("天命主线 10 条，每条 6 阶段，realmGate 单调递增", () => {
    expect(STORYLINE_SEEDS).toHaveLength(10);
    for (const s of STORYLINE_SEEDS) {
      expect(s.stages).toHaveLength(6);
      for (let i = 1; i < s.stages.length; i++) {
        expect(s.stages[i]!.realmGate[0]).toBeGreaterThan(s.stages[i - 1]!.realmGate[0]);
      }
    }
  });
  it("每个开局包绑定的主线存在且一一对应", () => {
    expect(new Set(START_PACKS.map((p) => p.destinyKey)).size).toBe(10);
    for (const p of START_PACKS) {
      const s = storylineByKey(p.destinyKey);
      expect(s.bindPackKey).toBe(p.key);
    }
  });
  it("初始修为合法（1 或 11）", () => {
    for (const p of START_PACKS) {
      expect([1, 11]).toContain(p.initialRealmLevel);
    }
  });
});

describe("建角基础数据（二章）", () => {
  it("种族 3 / 域 7 / 道韵 10 / 年龄段 4", () => {
    expect(RACES).toHaveLength(3);
    expect(DOMAINS).toHaveLength(7);
    expect(DAO_RHYMES).toHaveLength(10);
    expect(AGE_BANDS).toHaveLength(4);
  });
  it("灵根品级 6 档且含废灵根天劫减半备注", () => {
    expect(SPIRIT_ROOT_GRADES).toHaveLength(6);
    expect(SPIRIT_ROOT_GRADES.find((g) => g.grade === "fei")!.note).toContain("天劫威力减半");
  });
  it("startPackByKey 抛出未知错误", () => {
    expect(() => startPackByKey("nonexistent")).toThrow();
  });
});
