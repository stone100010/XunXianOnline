import { describe, expect, it } from "vitest";
import { createRng } from "../src/rng/index.js";
import {
  FATE_DICE, baseChance, clampChance, diceProbabilities, dropRates,
  hiddenFeedbackOf, momentumCap, punishTierFor, resolveCombat, truePower, displayedPower,
} from "../src/combat/index.js";
import type { CombatInput } from "../src/combat/index.js";
import type { CombatState } from "@xunxian/shared";

const combat: CombatState = {
  mainEquipmentLevel: 3, mainTechniqueLevel: 10, concealment: 0, momentum: 0,
};

function makeInput(over: Partial<CombatInput["player"]> = {}): CombatInput {
  return {
    nature: "chousha",
    foe: { id: "npc-1", name: "外门管事赵恒", realmLevel: 30, power: 55 },
    player: { realmLevel: 15, combat, ...over },
  };
}

describe("战力计算（三章二）", () => {
  it("真实战力 = 修为 + 主装备 + 主修功法", () => {
    expect(truePower(15, combat)).toBe(28);
  });
  it("外显战力按敛息比例折减", () => {
    expect(displayedPower(15, { ...combat, concealment: 0.5 })).toBe(15 + Math.round(13 * 0.5));
  });
  it("蓄力上限 = 真实战力 × 2", () => {
    expect(momentumCap(15, combat)).toBe(56);
  });
});

describe("胜率公式（三章三.3）", () => {
  it("基础胜率 = 20% + (玩家-敌方)×1%", () => {
    expect(baseChance(48, 55)).toBeCloseTo(0.13);
  });
  it("钳制在 5%~95%", () => {
    expect(clampChance(-1)).toBe(0.05);
    expect(clampChance(1.5)).toBe(0.95);
  });
});

describe("命运骰子概率（三章三.3）", () => {
  it("基础概率总和为 1", () => {
    const total = FATE_DICE.reduce((s, d) => s + d.baseProb, 0);
    expect(total).toBeCloseTo(1);
  });
  it("天人感应/未卜先知/气运修正生效", () => {
    const p = diceProbabilities({ hasTianrenGanying: true, hasWeibuXianzhi: true, qiyunLevel: 80 });
    expect(p.tianci).toBeCloseTo(0.08 + 0.02 + 0.01 + 0.01);
    expect(p.tianyi).toBeCloseTo(0.08 - 0.02 - 0.02);
    expect(p.shiyun).toBeCloseTo(0.12 - 0.02);
    // 总概率仍归一
    expect(Object.values(p).reduce((s, v) => s + v, 0)).toBeCloseTo(1);
  });
  it("实际掷骰分布近似基础概率（10 万样本）", () => {
    const rng = createRng(2024);
    const n = 100000;
    const counts = new Map<string, number>();
    const probs = diceProbabilities({});
    for (let i = 0; i < n; i++) {
      const face = rng.weighted(FATE_DICE.map((d) => [d.face, d.baseProb]));
      counts.set(face, (counts.get(face) ?? 0) + 1);
    }
    for (const d of FATE_DICE) {
      const ratio = (counts.get(d.face) ?? 0) / n;
      expect(ratio).toBeGreaterThan(d.baseProb - 0.01);
      expect(ratio).toBeLessThan(d.baseProb + 0.01);
    }
    void probs;
  });
});

describe("隐性反馈七档（三章三.4）", () => {
  it("各区间映射正确", () => {
    expect(hiddenFeedbackOf(0.05)).toBe("hopeless");
    expect(hiddenFeedbackOf(0.30)).toBe("grim");
    expect(hiddenFeedbackOf(0.50)).toBe("struggle");
    expect(hiddenFeedbackOf(0.65)).toBe("even");
    expect(hiddenFeedbackOf(0.80)).toBe("favorable");
    expect(hiddenFeedbackOf(0.95)).toBe("confident");
  });
});

describe("失败惩罚表（三章四）", () => {
  it("按战力差距触发档位", () => {
    expect(punishTierFor(0.1).tier).toBe("lijie");
    expect(punishTierFor(0.3).tier).toBe("zhongshang");
    expect(punishTierFor(0.7).tier).toBe("nianya");
  });
  it("天命战斗：碾压级死亡庇护降档 + 惩罚减半", () => {
    const rng = createRng(5);
    const input = makeInput();
    input.foe = { ...input.foe, power: 100 }; // gap > 50% → 碾压级
    input.mitigation = { isDestinyBattle: true };
    let result = resolveCombat(input, rng);
    // 反复掷直到出败局
    for (let i = 0; i < 200 && result.outcome === "win"; i++) result = resolveCombat(input, rng);
    expect(result.outcome).toBe("lose");
    expect(result.punishTier).toBe("zhongshang"); // 碾压→重伤（死亡庇护）
    expect(result.punishApplied!.realmLoss).toBeLessThanOrEqual(2); // 重伤 2-4 减半 ≤2
    expect(result.isDestinyBattle).toBe(true);
  });
  it("替死法宝完全抵消惩罚", () => {
    const rng = createRng(6);
    const input = makeInput();
    input.mitigation = { hasDeathSubstitute: true };
    let result = resolveCombat(input, rng);
    for (let i = 0; i < 200 && result.outcome === "win"; i++) result = resolveCombat(input, rng);
    expect(result.punishApplied).toEqual({
      realmLoss: 0, techniqueForget: 0, equipmentLost: false, currencyLossPct: 0,
    });
  });
});

describe("同修为战斗（三章三.2）", () => {
  it("修为差≤5 的生死仇杀：战力高者直接胜", () => {
    const rng = createRng(1);
    const input = makeInput();
    input.foe = { id: "f", name: "同辈", realmLevel: 18, power: 20 }; // 玩家战力 28 > 20
    for (let i = 0; i < 50; i++) {
      expect(resolveCombat(input, rng).outcome).toBe("win");
    }
    input.foe = { ...input.foe, power: 30 };
    for (let i = 0; i < 50; i++) {
      expect(resolveCombat(input, rng).outcome).toBe("lose");
    }
  });
});

describe("越级战斗（三章三.3）", () => {
  it("最终胜率钳制在 5%~95%，结果确定性可回放", () => {
    const input = makeInput(); // 48 vs 55，基础胜率 13%
    const a = resolveCombat(input, createRng(1000));
    const b = resolveCombat(input, createRng(1000));
    expect(a).toEqual(b);
    expect(a.finalChance).toBeGreaterThanOrEqual(0.05);
    expect(a.finalChance).toBeLessThanOrEqual(0.95);
  });
  it("战斗性质为切磋时不走同修为直胜规则", () => {
    const rng = createRng(3);
    const input = makeInput();
    input.nature = "qiecuo";
    input.foe = { id: "f", name: "同辈", realmLevel: 15, power: 20 };
    // 切磋走胜率公式：28 vs 20 → 基础 28%，100 次内应出现两种结果
    const outcomes = new Set();
    for (let i = 0; i < 100; i++) outcomes.add(resolveCombat(input, rng).outcome);
    expect(outcomes.size).toBe(2);
  });
});

describe("掉落概率（十一章二）", () => {
  it("偷袭提升装备掉率至 80%", () => {
    expect(dropRates({ ambush: true }).equipment).toBe(0.8);
  });
  it("敌方自爆降低掉率", () => {
    const r = dropRates({ foeSelfDestruct: true });
    expect(r.equipment).toBeCloseTo(0.18);
  });
  it("胜利必掉储物袋", () => {
    const rng = createRng(11);
    const input = makeInput();
    input.foe = { ...input.foe, power: 10 }; // 必胜倾向
    let result = resolveCombat(input, rng);
    for (let i = 0; i < 100 && result.outcome === "lose"; i++) result = resolveCombat(input, rng);
    expect(result.drops.some((d) => d.kind === "storage")).toBe(true);
  });
});
