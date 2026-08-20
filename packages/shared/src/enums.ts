import { z } from "zod";

// ── 种族（设定·二章一.2）──
export const RaceSchema = z.enum(["human", "yao", "ling"]);
export type Race = z.infer<typeof RaceSchema>;

// ── 五系灵根 + 异灵根（设定·二章一.4）──
export const ElementSchema = z.enum([
  "metal", "wood", "water", "fire", "earth",
  "thunder", "ice", "wind", "dark", "light",
]);
export type Element = z.infer<typeof ElementSchema>;

export const SpiritRootGradeSchema = z.enum(["fan", "zhong", "shang", "ji", "yi", "fei"]);
export type SpiritRootGrade = z.infer<typeof SpiritRootGradeSchema>;

// ── 七大修真域（设定·二章一.5）──
export const DomainSchema = z.enum([
  "zhongzhou", "donghuang", "nanming", "xiji", "beiming", "lingnan", "haiwai",
]);
export type Domain = z.infer<typeof DomainSchema>;

// ── 性别 ──
export const GenderSchema = z.enum(["male", "female"]);
export type Gender = z.infer<typeof GenderSchema>;

// ── 境界（设定·三章一）──
export const RealmSchema = z.enum([
  "fanren",   // 凡人境 1-10
  "lianqi",   // 炼气期 11-20
  "zhuji",    // 筑基期 21-40
  "jindan",   // 金丹期 41-60
  "yuanying", // 元婴期 61-80
  "huashen",  // 化神期 81-95
  "dujie",    // 渡劫/大乘 96-100
]);
export type Realm = z.infer<typeof RealmSchema>;

// ── 五维道基（设定·三章五）──
export const DaoBaseKeySchema = z.enum(["wuxin", "daoxin", "genku", "qiyun", "xuema"]);
export type DaoBaseKey = z.infer<typeof DaoBaseKeySchema>;

// ── 货币五级（设定·九章一）──
export const CurrencyTierSchema = z.enum(["low", "mid", "high", "supreme", "crystal"]);
export type CurrencyTier = z.infer<typeof CurrencyTierSchema>;

// ── 战斗性质（设定·三章三.1）──
export const CombatNatureSchema = z.enum([
  "qiecuo",  // 切磋较技
  "chousha", // 生死仇杀
  "yaoshou", // 妖兽战斗
  "ziwei",   // 自卫反击
]);
export type CombatNature = z.infer<typeof CombatNatureSchema>;

// ── 命运骰子七档（设定·三章三.3）──
export const FateDiceFaceSchema = z.enum([
  "tianci",   // ⚡天赐良机 +25%
  "hongyun",  // 🌟鸿运当头 +15%
  "jiyuan",   // 🍀小有机缘 +8%
  "zhonggui", // ⚖️中规中矩 0%
  "bozhe",    // 🌫️小有波折 -8%
  "shiyun",   // 💨时运不济 -15%
  "tianyi",   // 💀天意弄人 -25%
]);
export type FateDiceFace = z.infer<typeof FateDiceFaceSchema>;

// ── 失败惩罚档位（设定·三章四）──
export const PunishTierSchema = z.enum([
  "lijie",   // 力竭被擒
  "zhongshang", // 重伤落败
  "nianya",  // 被碾压击杀
  "yingmie", // 元婴被灭
  "zibao",   // 自爆逃脱
]);
export type PunishTier = z.infer<typeof PunishTierSchema>;

// ── 功法五品（设定·九章四）──
export const TechniqueGradeSchema = z.enum(["fan", "ling", "di", "tian", "xian"]);
export type TechniqueGrade = z.infer<typeof TechniqueGradeSchema>;

// ── 决策罗盘六类（设定·四章四）──
export const CompassKindSchema = z.enum([
  "mingtu", // 命途推进
  "yinyuan", // 因缘际会
  "lishi",  // 历练探索
  "daoyuan", // 道缘经营
  "baiyi",  // 修仙百艺
  "biguan", // 闭关修持
]);
export type CompassKind = z.infer<typeof CompassKindSchema>;

// ── 事件三层（设定·十四章）──
export const EventLayerSchema = z.enum(["biaowen", "zhongbian", "diuliu"]);
export type EventLayer = z.infer<typeof EventLayerSchema>;
