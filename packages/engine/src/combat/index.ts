import type {
  CombatFoe, CombatNature, CombatResult, CombatState, DaoRhyme, Drop,
  FateDiceFace, FateDiceRoll, HiddenFeedbackTier, PunishTier,
} from "@xunxian/shared";
import type { Rng } from "../rng/index.js";

// ── 命运骰子七档（设定·三章三.3）──
export interface DiceFaceDef {
  face: FateDiceFace;
  label: string;
  baseProb: number;   // 基础概率
  modifier: number;   // 胜率修正（小数）
}

export const FATE_DICE: readonly DiceFaceDef[] = [
  { face: "tianci",   label: "⚡天赐良机", baseProb: 0.08, modifier: +0.25 },
  { face: "hongyun",  label: "🌟鸿运当头", baseProb: 0.12, modifier: +0.15 },
  { face: "jiyuan",   label: "🍀小有机缘", baseProb: 0.20, modifier: +0.08 },
  { face: "zhonggui", label: "⚖️中规中矩", baseProb: 0.20, modifier: 0 },
  { face: "bozhe",    label: "🌫️小有波折", baseProb: 0.20, modifier: -0.08 },
  { face: "shiyun",   label: "💨时运不济", baseProb: 0.12, modifier: -0.15 },
  { face: "tianyi",   label: "💀天意弄人", baseProb: 0.08, modifier: -0.25 },
] as const;

export function diceFaceDef(face: FateDiceFace): DiceFaceDef {
  return FATE_DICE.find((d) => d.face === face)!;
}

/** 道韵/气运/连续越级修正后的骰子概率（三章三.3 影响因素） */
export function diceProbabilities(mods: {
  hasTianrenGanying?: boolean;   // 天人感应：天赐+2%、鸿运+2%、天意-2%
  hasWeibuXianzhi?: boolean;     // 未卜先知：天意-2%、时运-2%
  qiyunLevel?: number;           // 气运≥60 天赐+1%；≥80 再+1%
  consecutiveOverlevel?: number; // 连续越级：负面微增（每次 0.5%，上限 3%）
}): Record<FateDiceFace, number> {
  const p = Object.fromEntries(FATE_DICE.map((d) => [d.face, d.baseProb])) as Record<FateDiceFace, number>;
  if (mods.hasTianrenGanying) { p.tianci += 0.02; p.hongyun += 0.02; p.tianyi -= 0.02; }
  if (mods.hasWeibuXianzhi) { p.tianyi -= 0.02; p.shiyun -= 0.02; }
  if (mods.qiyunLevel !== undefined) {
    if (mods.qiyunLevel >= 60) p.tianci += 0.01;
    if (mods.qiyunLevel >= 80) p.tianci += 0.01;
  }
  if (mods.consecutiveOverlevel) {
    const neg = Math.min(0.03, mods.consecutiveOverlevel * 0.005);
    p.bozhe += neg * 0.4; p.shiyun += neg * 0.3; p.tianyi += neg * 0.3;
  }
  return p;
}

export function rollFateDice(rng: Rng, probs: Record<FateDiceFace, number>): FateDiceRoll {
  const weights = FATE_DICE.map((d) => {
    const w = probs[d.face];
    return [d.face, Math.max(0, w ?? 0)] as [FateDiceFace, number];
  });
  const face = rng.weighted(weights);
  return { face, modifier: diceFaceDef(face).modifier };
}

// ── 隐性反馈七档（设定·三章三.4，不泄露数值）──
export function hiddenFeedbackOf(chance: number): HiddenFeedbackTier {
  if (chance < 0.21) return "hopeless";
  if (chance < 0.36) return "grim";
  if (chance < 0.51) return "struggle";
  if (chance < 0.66) return "even";
  if (chance < 0.81) return "favorable";
  if (chance <= 0.95) return "confident";
  return "overwhelming";
}

export const HIDDEN_FEEDBACK_TEXT: Record<HiddenFeedbackTier, string> = {
  hopeless: "对方的气息碾压而来，你连呼吸都变得困难……若非天降奇迹，此战恐怕……",
  grim: "对方气息浩瀚如海，巨大灵压几乎让你难以呼吸。这一战，凶多吉少。",
  struggle: "对手修为远胜于你，但你握紧法宝，心中升起不屈战意。或许，并非全无机会。",
  even: "境界有差，但法宝犀利、功法霸道，赢面似乎不小。",
  favorable: "对方灵力虚浮根基不稳。你眼中寒光一闪，此战十拿九稳。",
  confident: "几乎感觉不到压力。对手所有破绽在你眼中一览无余。",
  overwhelming: "如俯瞰蝼蚁。此战于你，不过是随手拂尘。",
};

// ── 胜率公式与钳制（三章三.3：5%~95%）──
export const MIN_CHANCE = 0.05;
export const MAX_CHANCE = 0.95;

export function clampChance(c: number): number {
  return Math.min(MAX_CHANCE, Math.max(MIN_CHANCE, c));
}

/** 越级战斗基础胜率：20% + (玩家战力 - 敌方战力) × 1% */
export function baseChance(playerPower: number, foePower: number): number {
  return 0.2 + (playerPower - foePower) * 0.01;
}

// ── 失败惩罚表（设定·三章四，按战力差距百分比触发档位）──
export interface PunishDef {
  tier: PunishTier;
  name: string;
  realmLoss: readonly [number, number];
  equipmentLost: boolean;
  techniqueForget: readonly [number, number];
  currencyLossPct: number;
  gapRange: readonly [number, number]; // gapPct = (敌方战力-玩家战力)/敌方战力
}

export const PUNISH_TABLE: readonly PunishDef[] = [
  { tier: "lijie",      name: "力竭被擒",   realmLoss: [1, 2], equipmentLost: true,  techniqueForget: [0, 0], currencyLossPct: 0.5, gapRange: [0, 0.2] },
  { tier: "zhongshang", name: "重伤落败",   realmLoss: [2, 4], equipmentLost: false, techniqueForget: [1, 3], currencyLossPct: 0.3, gapRange: [0.2, 0.5] },
  { tier: "nianya",     name: "被碾压击杀", realmLoss: [5, 8], equipmentLost: true,  techniqueForget: [3, 8], currencyLossPct: 1.0, gapRange: [0.5, Infinity] },
] as const;

export function punishTierFor(gapPct: number): PunishDef {
  const found = PUNISH_TABLE.find((p) => gapPct >= p.gapRange[0] && gapPct < p.gapRange[1]);
  return found ?? PUNISH_TABLE[PUNISH_TABLE.length - 1]!;
}

// ── 惩罚减免因素（三章四）──
export interface PunishMitigation {
  hasPanshiZhizhi?: boolean;    // 磐石之志：功法遗忘层数减半
  isDestinyBattle?: boolean;    // 天命战斗：惩罚减半 + 死亡庇护
  hasDeathSubstitute?: boolean; // 替死法宝/符箓：完全抵消一次
  hasBacking?: boolean;         // 背景靠山：修为倒退额外 -1 级
}

// ── 掉落概率（设定·十一章二）──
export const DROP_RATES = { equipment: 0.6, technique: 0.4, storage: 1.0, special: 0.1 } as const;

export function dropRates(mods: { ambush?: boolean; hasTianrenGanying?: boolean; foeSelfDestruct?: boolean }): Record<string, number> {
  const r: Record<string, number> = { ...DROP_RATES };
  if (mods.ambush) r.equipment = 0.8;
  if (mods.hasTianrenGanying) { r.equipment = (r.equipment ?? 0) + 0.05; r.technique = (r.technique ?? 0) + 0.05; r.special = (r.special ?? 0) + 0.05; }
  if (mods.foeSelfDestruct) { r.equipment = (r.equipment ?? 0) * 0.3; r.technique = (r.technique ?? 0) * 0.3; r.special = (r.special ?? 0) * 0.3; }
  return r;
}

// ── 战力计算（三章二）──
export function truePower(realmLevel: number, combat: CombatState): number {
  return realmLevel + combat.mainEquipmentLevel + combat.mainTechniqueLevel;
}

export function displayedPower(realmLevel: number, combat: CombatState): number {
  const gear = combat.mainEquipmentLevel + combat.mainTechniqueLevel;
  return realmLevel + Math.round(gear * (1 - combat.concealment));
}

/** 扮猪吃虎蓄力槽上限：真实战力 × 2（三章二） */
export function momentumCap(realmLevel: number, combat: CombatState): number {
  return truePower(realmLevel, combat) * 2;
}

// ── 主战斗结算 ──
export interface CombatInput {
  nature: CombatNature;
  foe: CombatFoe;
  player: {
    realmLevel: number;
    combat: CombatState;
    daoRhyme?: DaoRhyme;
    qiyunLevel?: number;
    consecutiveOverlevel?: number;
    momentumRelease?: boolean;   // 释放蓄力：敌方判定临时 -10%~-30%（即我方胜率提升）
    momentumBonus?: number;      // 0.1 ~ 0.3
  };
  mitigation?: PunishMitigation;
  ambush?: boolean;
}

export function resolveCombat(input: CombatInput, rng: Rng): CombatResult {
  const { foe, player, nature } = input;
  const playerPower = truePower(player.realmLevel, player.combat);
  const realmGap = foe.realmLevel - player.realmLevel;
  const isSameRealmKill = realmGap <= 5 && realmGap >= -5 && nature === "chousha";

  let outcome: "win" | "lose";
  let base: number;
  let dice: FateDiceRoll;
  let final: number;

  if (isSameRealmKill) {
    // 同修为生死仇杀：战力高者直接胜（三章三.2）；战力相同进策略博弈（v0 以均势掷骰，后续接入道韵/经验/环境分）
    base = clampChance(baseChance(playerPower, foe.power));
    dice = { face: "zhonggui", modifier: 0 };
    final = base;
    outcome = playerPower !== foe.power
      ? (playerPower > foe.power ? "win" : "lose")
      : (rng.chance(0.5) ? "win" : "lose");
  } else {
    base = clampChance(baseChance(playerPower, foe.power));
    dice = rollFateDice(rng, diceProbabilities({
      hasTianrenGanying: player.daoRhyme?.key === "tiangren",
      qiyunLevel: player.qiyunLevel,
      consecutiveOverlevel: player.consecutiveOverlevel,
    }));
    final = base + dice.modifier;
    if (player.momentumRelease) final += player.momentumBonus ?? 0;
    final = clampChance(final);
    outcome = rng.chance(final) ? "win" : "lose";
  }

  const common = {
    nature, foe, playerPower, foePower: foe.power, realmGap,
    baseChance: base, dice, finalChance: final,
    hiddenFeedback: hiddenFeedbackOf(final),
    isDestinyBattle: input.mitigation?.isDestinyBattle ?? false,
  };

  if (outcome === "win") {
    return { ...common, outcome, punishTier: null, punishApplied: null, drops: rollDrops(input, rng) };
  }

  // ── 失败惩罚（三章四）──
  if (input.mitigation?.hasDeathSubstitute) {
    return {
      ...common, outcome,
      punishTier: punishTierFor(gapPct(foe.power, playerPower)).tier,
      punishApplied: { realmLoss: 0, techniqueForget: 0, equipmentLost: false, currencyLossPct: 0 },
      drops: [],
    };
  }

  let def = punishTierFor(gapPct(foe.power, playerPower));
  // 天命保护：惩罚减半（向上取整）；碾压级触发死亡庇护降为重伤（再减半）
  if (input.mitigation?.isDestinyBattle && def.tier === "nianya") {
    def = PUNISH_TABLE[1]!;
  }
  let realmLoss = rng.int(def.realmLoss[0], def.realmLoss[1] + 1);
  let forget = rng.int(def.techniqueForget[0], def.techniqueForget[1] + 1);
  let currencyLossPct = def.currencyLossPct;

  if (input.mitigation?.isDestinyBattle) {
    realmLoss = Math.ceil(realmLoss / 2);
    forget = Math.ceil(forget / 2);
    currencyLossPct = Math.ceil(currencyLossPct * 50) / 100;
  }
  if (input.mitigation?.hasPanshiZhizhi) forget = Math.ceil(forget / 2);
  if (input.mitigation?.hasBacking) realmLoss = Math.max(0, realmLoss - 1);

  return {
    ...common, outcome,
    punishTier: def.tier,
    punishApplied: {
      realmLoss, techniqueForget: forget,
      equipmentLost: def.equipmentLost, currencyLossPct,
    },
    drops: [],
  };
}

function gapPct(foePower: number, playerPower: number): number {
  return foePower > 0 ? (foePower - playerPower) / foePower : 0;
}

function rollDrops(input: CombatInput, rng: Rng): Drop[] {
  const rates = dropRates({
    ambush: input.ambush,
    hasTianrenGanying: input.player.daoRhyme?.key === "tiangren",
  });
  const drops: Drop[] = [{ kind: "storage", refKey: "loot_stones", qty: 1 }];
  if (rng.chance(rates.equipment ?? 0)) drops.push({ kind: "equipment", refKey: `${input.foe.id}_equip`, qty: 1 });
  if (rng.chance(rates.technique ?? 0)) drops.push({ kind: "technique", refKey: `${input.foe.id}_technique`, qty: 1 });
  if (rng.chance(rates.special ?? 0)) drops.push({ kind: "special", refKey: `${input.foe.id}_special`, qty: 1 });
  return drops;
}
