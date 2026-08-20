import { describe, expect, it } from "vitest";
import { PlayerStateSchema } from "../src/state.js";
import { CombatResultSchema } from "../src/combat.js";

const validState = {
  archiveId: "a-1",
  turnNo: 0,
  gameYear: 1,
  gameMonth: 1,
  name: "林寻",
  gender: "male",
  race: "human",
  age: 18,
  realm: "fanren",
  cultivation: { level: 1, exp: 0, lifespanYears: 100 },
  daoBases: {
    wuxin: { level: 1, exp: 0 }, daoxin: { level: 1, exp: 0 },
    genku: { level: 1, exp: 0 }, qiyun: { level: 1, exp: 0 },
    xuema: { level: 1, exp: 0 },
  },
  daoRhyme: { key: "mingcha", level: 1, exp: 0 },
  spiritRoot: { elements: ["fire"], grade: "zhong", purity: 0.4, speedModifier: 0 },
  combat: { mainEquipmentLevel: 0, mainTechniqueLevel: 1, concealment: 0, momentum: 0 },
  currencies: { low: 10, mid: 0, high: 0, supreme: 0, crystal: 0 },
  arts: { main: "炼丹", level: 1, exp: 0, subs: [] },
  location: { domain: "zhongzhou", region: null, place: null },
};

describe("PlayerStateSchema", () => {
  it("合法状态通过校验", () => {
    expect(PlayerStateSchema.safeParse(validState).success).toBe(true);
  });
  it("修为等级越界被拒绝", () => {
    const bad = { ...validState, cultivation: { ...validState.cultivation, level: 101 } };
    expect(PlayerStateSchema.safeParse(bad).success).toBe(false);
  });
  it("道基缺失一维被拒绝", () => {
    const { xuema: _drop, ...badBases } = validState.daoBases;
    const bad = { ...validState, daoBases: badBases };
    expect(PlayerStateSchema.safeParse(bad).success).toBe(false);
  });
});

describe("CombatResultSchema", () => {
  it("胜率钳制约束（<5% 拒绝）", () => {
    const r = {
      nature: "chousha",
      foe: { id: "f", name: "x", realmLevel: 30, power: 55 },
      playerPower: 48, foePower: 55, realmGap: 15,
      baseChance: 0.13,
      dice: { face: "zhonggui", modifier: 0 },
      finalChance: 0.03, // 非法：低于 5%
      hiddenFeedback: "hopeless",
      outcome: "lose",
      punishTier: "zhongshang",
      punishApplied: { realmLoss: 2, techniqueForget: 2, equipmentLost: false, currencyLossPct: 0.3 },
      drops: [], isDestinyBattle: false,
    };
    expect(CombatResultSchema.safeParse(r).success).toBe(false);
  });
  it("合法战斗结果通过校验", () => {
    const r = {
      nature: "chousha",
      foe: { id: "f", name: "x", realmLevel: 30, power: 55 },
      playerPower: 48, foePower: 55, realmGap: 15,
      baseChance: 0.13,
      dice: { face: "zhonggui", modifier: 0 },
      finalChance: 0.13,
      hiddenFeedback: "grim",
      outcome: "lose",
      punishTier: "zhongshang",
      punishApplied: { realmLoss: 2, techniqueForget: 2, equipmentLost: false, currencyLossPct: 0.3 },
      drops: [], isDestinyBattle: false,
    };
    expect(CombatResultSchema.safeParse(r).success).toBe(true);
  });
});
