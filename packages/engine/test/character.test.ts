import { describe, expect, it } from "vitest";
import { createCharacter, rollSpiritRoot } from "../src/character/index.js";
import { createRng } from "../src/rng/index.js";
import { PlayerStateSchema } from "@xunxian/shared";
import type { CreateCharacterInput } from "../src/character/index.js";

const input: CreateCharacterInput = {
  name: "林寻", gender: "male", race: "human", age: 18,
  domain: "zhongzhou", packKey: "daoti", daoRhymeKey: "mingcha",
  archiveId: "a-1",
};

describe("灵根随机（二章一.4）", () => {
  it("分布覆盖各品级且字段合法", () => {
    const rng = createRng(77);
    const grades = new Set<string>();
    for (let i = 0; i < 500; i++) {
      const sr = rollSpiritRoot(rng);
      expect(sr.elements.length).toBeGreaterThanOrEqual(1);
      expect(sr.speedModifier).toBeGreaterThanOrEqual(-0.5);
      grades.add(sr.grade);
    }
    expect(grades.size).toBeGreaterThanOrEqual(4);
  });
  it("废灵根五系俱全", () => {
    const rng = createRng(1);
    let fei = null;
    for (let i = 0; i < 1000 && !fei; i++) {
      const sr = rollSpiritRoot(rng);
      if (sr.grade === "fei") fei = sr;
    }
    expect(fei?.elements).toHaveLength(5);
  });
});

describe("建角编译（二章）", () => {
  it("天生道体包：凡人境 Lv.1、10 灵石、绑定圣体之路", () => {
    const { state, pack } = createCharacter(input, createRng(2));
    expect(state.realm).toBe("fanren");
    expect(state.cultivation.level).toBe(1);
    expect(state.currencies.low).toBe(10);
    expect(pack.destinyKey).toBe("shengti");
    expect(PlayerStateSchema.safeParse(state).success).toBe(true);
  });
  it("宗门杂役包：炼气初期 Lv.11、带法器", () => {
    const { state } = createCharacter({ ...input, packKey: "zayong" }, createRng(2));
    expect(state.cultivation.level).toBe(11);
    expect(state.realm).toBe("lianqi");
    expect(state.combat.mainEquipmentLevel).toBe(1);
  });
  it("种族/年龄修正生效", () => {
    const { state: human } = createCharacter(input, createRng(2));
    expect(human.daoBases.wuxin.level).toBe(2); // 人族悟性+5% → +1 级
    const { state: yao } = createCharacter({ ...input, race: "yao" }, createRng(2));
    expect(yao.daoBases.genku.level).toBe(3);   // 妖族根骨+10% → +2 级
    const { state: elder } = createCharacter({ ...input, age: 50 }, createRng(2));
    expect(elder.daoBases.daoxin.level).toBe(2); // 中老年道心加成
  });
  it("寿元 = 境界上限 - 骨龄", () => {
    const { state } = createCharacter(input, createRng(2));
    expect(state.cultivation.lifespanYears).toBe(100 - 18);
  });
});
