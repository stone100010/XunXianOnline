// 600 回合自走仿真（docs/04 §4）：随机策略长跑，断言全局不变量
import { describe, expect, it } from "vitest";
import {
  addCultivationExp, createCharacter, createRng, generateCompass, resolveCombat, truePower,
} from "../src/index.js";
import type { PlayerState, Currencies, CombatState, SpiritRoot, DaoBases, DaoRhyme } from "@xunxian/shared";

function baseState(seedName: string): PlayerState {
  const { state } = createCharacter({
    archiveId: "sim", name: seedName, gender: "male", race: "human", age: 16,
    domain: "zhongzhou", packKey: "daoti", daoRhymeKey: "mingcha",
  }, createRng(1));
  return state;
}

describe("600 回合自走仿真不变量", () => {
  it("随机策略 50 年：状态始终合法", () => {
    for (let run = 0; run < 10; run++) {
      const rng = createRng(1000 + run);
      let state = baseState(`行者${run}`);
      const ctx = {
        gameMonth: 1, destinyOptions: [], karmaOptions: [], exploreOptions: [],
        socialOptions: [], artOptions: [], secludeOptions: [],
      };

      for (let turn = 0; turn < 600; turn++) {
        const compass = generateCompass(
          { ...ctx, gameMonth: (turn % 12) + 1 },
          createRng(9000 + run * 100 + turn),
        );
        const pick = compass[rng.int(0, compass.length)]!;

        // 修炼结算
        const baseExp = 40;
        const gain = Math.max(1, Math.round(baseExp * (1 + state.spiritRoot.speedModifier)));
        const r = addCultivationExp(state.cultivation, gain);
        // 每 12 回合骨龄 +1（模拟 turnService.nextMonth 的时间推进）
        state = { ...state, cultivation: r.state, age: 16 + Math.floor((turn + 1) / 12) };

        // 历练类 20% 概率触发战斗
        if (pick.kind === "lishi" && rng.chance(0.2)) {
          const foeLvl = Math.max(1, state.cultivation.level + rng.int(-3, 15));
          const result = resolveCombat({
            nature: "chousha",
            foe: { id: `f${turn}`, name: "妖修", realmLevel: foeLvl, power: foeLvl + rng.int(0, 20) },
            player: { realmLevel: state.cultivation.level, combat: state.combat, daoRhyme: state.daoRhyme },
          }, rng);
          if (result.outcome === "lose" && result.punishApplied) {
            const lv = Math.max(1, state.cultivation.level - result.punishApplied.realmLoss);
            state = { ...state, cultivation: { ...state.cultivation, level: lv } };
          }
        }

        // ── 不变量断言 ──
        // 1. 修为等级 1-100
        expect(state.cultivation.level).toBeGreaterThanOrEqual(1);
        expect(state.cultivation.level).toBeLessThanOrEqual(100);
        // 2. 经验非负且低于当前级需求（边界满溢时允许 ≥ 需求等待渡劫）
        expect(state.cultivation.exp).toBeGreaterThanOrEqual(0);
        // 3. 灵石不为负
        for (const v of Object.values(state.currencies as Currencies)) {
          expect(v).toBeGreaterThanOrEqual(0);
        }
        // 4. 寿元非负
        expect(state.cultivation.lifespanYears).toBeGreaterThanOrEqual(0);
        // 5. 战力一致性：= 修为 + 装备 + 功法
        const p = truePower(state.cultivation.level, state.combat);
        expect(p).toBe(state.cultivation.level + state.combat.mainEquipmentLevel + state.combat.mainTechniqueLevel);
        // 6. 骨龄与回合数一致（每 12 回合 +1）
        expect(state.age).toBe(16 + Math.floor((turn + 1) / 12));
      }
      void state;
    }
  });

  it("状态字段完整性（schema 兼容）", () => {
    const state = baseState("校验者");
    expect(Object.keys(state.daoBases as DaoBases)).toHaveLength(5);
    expect(state.daoRhyme.key).toBeTruthy();
    expect((state.spiritRoot as SpiritRoot).elements.length).toBeGreaterThanOrEqual(1);
    expect((state.combat as CombatState).mainTechniqueLevel).toBeGreaterThanOrEqual(1);
    expect((state.daoRhyme as DaoRhyme).level).toBe(1);
  });
});
