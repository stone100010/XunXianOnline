import { z } from "zod";
import {
  CurrencyTierSchema, DaoBaseKeySchema, ElementSchema, GenderSchema,
  RaceSchema, RealmSchema, SpiritRootGradeSchema,
} from "./enums.js";

// ── 修为（境界等级 1-100 + 经验）──
export const CultivationSchema = z.object({
  level: z.number().int().min(1).max(100),
  exp: z.number().int().min(0),
  lifespanYears: z.number().int().min(0), // 当前寿元余量（年）
});
export type Cultivation = z.infer<typeof CultivationSchema>;

// ── 道基单项 ──
export const DaoBaseStatSchema = z.object({
  level: z.number().int().min(1).max(100),
  exp: z.number().int().min(0),
});
export type DaoBaseStat = z.infer<typeof DaoBaseStatSchema>;

export const DaoBasesSchema = z.object({
  wuxin: DaoBaseStatSchema,
  daoxin: DaoBaseStatSchema,
  genku: DaoBaseStatSchema,
  qiyun: DaoBaseStatSchema,
  xuema: DaoBaseStatSchema,
});
export type DaoBases = z.infer<typeof DaoBasesSchema>;

// ── 先天道韵 ──
export const DaoRhymeSchema = z.object({
  key: z.string(),          // 如 mingcha（明察秋毫）
  level: z.number().int().min(1).max(100),
  exp: z.number().int().min(0),
});
export type DaoRhyme = z.infer<typeof DaoRhymeSchema>;

// ── 灵根 ──
export const SpiritRootSchema = z.object({
  elements: z.array(ElementSchema).min(1),
  grade: SpiritRootGradeSchema,
  purity: z.number().min(0).max(1),          // 纯度 0-1
  speedModifier: z.number(),                 // 修炼速度修正（如 -0.2 / +0.5）
});
export type SpiritRoot = z.infer<typeof SpiritRootSchema>;

// ── 战力 ──
export const CombatStateSchema = z.object({
  mainEquipmentLevel: z.number().int().min(0).max(10),
  mainTechniqueLevel: z.number().int().min(0).max(100),
  concealment: z.number().min(0).max(1),     // 敛息比例 0=全外显
  momentum: z.number().int().min(0),         // 扮猪吃虎蓄力槽
});
export type CombatState = z.infer<typeof CombatStateSchema>;

// ── 钱包 ──
export const CurrenciesSchema = z.record(CurrencyTierSchema, z.number().int().min(0));
export type Currencies = z.infer<typeof CurrenciesSchema>;

// ── 玩家核心状态（player_states 热点行的镜像类型）──
export const PlayerStateSchema = z.object({
  archiveId: z.string(),
  turnNo: z.number().int().min(0),           // 总月数（乐观锁版本号）
  gameYear: z.number().int().min(1),
  gameMonth: z.number().int().min(1).max(12),
  name: z.string().min(1).max(12),
  gender: GenderSchema,
  race: RaceSchema,
  age: z.number().int().min(16).max(999),
  realm: RealmSchema,
  cultivation: CultivationSchema,
  daoBases: DaoBasesSchema,
  daoRhyme: DaoRhymeSchema,
  spiritRoot: SpiritRootSchema,
  combat: CombatStateSchema,
  currencies: CurrenciesSchema,
  arts: z.object({
    main: z.string(),            // 主修技艺（炼丹/炼器/制符/阵法/灵植/驯兽）
    level: z.number().int().min(1).max(100),
    exp: z.number().int().min(0),
    subs: z.array(z.string()).max(2), // 辅修（50% 经验收入）
  }),
  location: z.object({
    domain: z.string(),
    region: z.string().nullable(),
    place: z.string().nullable(),
  }),
});
export type PlayerState = z.infer<typeof PlayerStateSchema>;
