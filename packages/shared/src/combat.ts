import { z } from "zod";
import { CombatNatureSchema, FateDiceFaceSchema, PunishTierSchema } from "./enums.js";

// ── 战斗对手（NPC 或妖兽的战力抽象）──
export const CombatFoeSchema = z.object({
  id: z.string(),
  name: z.string(),
  realmLevel: z.number().int().min(1).max(100),
  power: z.number().int().min(0),        // 真实战力
});
export type CombatFoe = z.infer<typeof CombatFoeSchema>;

// ── 命运骰子结果 ──
export const FateDiceRollSchema = z.object({
  face: FateDiceFaceSchema,
  modifier: z.number(),                  // 百分比修正（如 +25 → +0.25）
});
export type FateDiceRoll = z.infer<typeof FateDiceRollSchema>;

// ── 隐性反馈档位（不显示数值，7 档氛围文案索引）──
export const HiddenFeedbackTierSchema = z.enum([
  "hopeless", "grim", "struggle", "even", "favorable", "confident", "overwhelming",
]);
export type HiddenFeedbackTier = z.infer<typeof HiddenFeedbackTierSchema>;

// ── 掉落物 ──
export const DropSchema = z.object({
  kind: z.enum(["equipment", "technique", "storage", "special"]),
  refKey: z.string(),
  qty: z.number().int().min(1),
});
export type Drop = z.infer<typeof DropSchema>;

// ── 战斗结算（combat 模块输出，A 级演出与结算面板数据源）──
export const CombatResultSchema = z.object({
  nature: CombatNatureSchema,
  foe: CombatFoeSchema,
  playerPower: z.number().int(),
  foePower: z.number().int(),
  realmGap: z.number().int(),            // 敌方修为等级 - 玩家修为等级
  baseChance: z.number().min(0).max(1),
  dice: FateDiceRollSchema,
  finalChance: z.number().min(0.05).max(0.95),
  hiddenFeedback: HiddenFeedbackTierSchema,
  outcome: z.enum(["win", "lose"]),
  punishTier: PunishTierSchema.nullable(),     // 胜方为 null
  punishApplied: z.object({                    // 实际执行的惩罚（含减免后）
    realmLoss: z.number().int(),
    techniqueForget: z.number().int(),
    equipmentLost: z.boolean(),
    currencyLossPct: z.number().min(0).max(1),
  }).nullable(),
  drops: z.array(DropSchema),                  // 胜利收益
  isDestinyBattle: z.boolean(),                // 天命战斗保护
});
export type CombatResult = z.infer<typeof CombatResultSchema>;
