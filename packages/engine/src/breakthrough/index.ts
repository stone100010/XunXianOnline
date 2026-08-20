import type { Cultivation } from "@xunxian/shared";
import type { Rng } from "../rng/index.js";
import { ascendRealm, failBreakthrough, isBoundaryLevel } from "../growth/index.js";

// ── 六大突破点（设定·三章六）──
export interface BreakthroughDef {
  point: `${number}->${number}`;       // 如 "10->11"
  name: string;
  condition: string;                   // 触发条件描述
  tribulation: string;                 // 渡劫内容
  successReward: string;
  failPenalty: { realmLoss: number; extra?: string };
  /** 天人感应道韵对渡劫判定的加成（顿悟突破类判定 +20% 的体现） */
  baseSuccessRate: number;
}

export const BREAKTHROUGHS: readonly BreakthroughDef[] = [
  {
    point: "10->11", name: "引气入体",
    condition: "需在灵地修炼 1 月（无天劫）",
    tribulation: "引气入体",
    successReward: "神识初开",
    failPenalty: { realmLoss: 0, extra: "灵根损伤（暂时）" },
    baseSuccessRate: 0.9,
  },
  {
    point: "20->21", name: "筑基天劫",
    condition: "修为满溢 + 筑基丹",
    tribulation: "小天劫（三道天雷或心魔劫）",
    successReward: "寿元翻倍、御器飞行",
    failPenalty: { realmLoss: 3 },
    baseSuccessRate: 0.7,
  },
  {
    point: "40->41", name: "结丹之劫",
    condition: "修为满溢 + 结丹契机",
    tribulation: "四九小天劫",
    successReward: "寿元五百、炼制本命法宝",
    failPenalty: { realmLoss: 5, extra: "可能丹碎" },
    baseSuccessRate: 0.6,
  },
  {
    point: "60->61", name: "丹破婴生",
    condition: "修为满溢（丹破婴生）",
    tribulation: "六九大天劫 + 域外天魔",
    successReward: "寿元千年、可夺舍",
    failPenalty: { realmLoss: 0, extra: "元婴溃散、跌回筑基" },
    baseSuccessRate: 0.5,
  },
  {
    point: "80->81", name: "法则初悟",
    condition: "修为满溢 + 法则初悟",
    tribulation: "九九重劫 + 法则拷问",
    successReward: "寿元三千、法则领域",
    failPenalty: { realmLoss: 0, extra: "肉身毁灭、元婴重伤" },
    baseSuccessRate: 0.4,
  },
  {
    point: "95->96", name: "飞升之劫",
    condition: "修为满溢 + 法则大成",
    tribulation: "飞升之劫（天道亲自降劫）",
    successReward: "随时可飞升",
    failPenalty: { realmLoss: 0, extra: "魂飞魄散（触发轮回）" },
    baseSuccessRate: 0.35,
  },
] as const;

export function breakthroughDef(fromLevel: number): BreakthroughDef | undefined {
  return BREAKTHROUGHS.find((b) => b.point.startsWith(`${fromLevel}->`));
}

export interface BreakthroughInput {
  cultivation: Cultivation;
  hasDaoRhymeTianren?: boolean;   // 天人感应：顿悟突破判定 +20%（三章三.3 联动）
  isDestinyProtected?: boolean;   // 天命战斗保护精神沿用：失败惩罚减半
  /** 废灵根：天劫威力减半（二章一.4）→ 成功率补偿 */
  isWasteRoot?: boolean;
}

export interface BreakthroughResult {
  def: BreakthroughDef;
  successRate: number;
  success: boolean;
  cultivation: Cultivation;       // 结算后的修为状态
  narrative: string;              // 引擎级结果描述（供 LLM 润色底稿）
}

/** 发起渡劫：条件校验 → 判定 → 成败结算 */
export function attemptBreakthrough(input: BreakthroughInput, rng: Rng): BreakthroughResult | { error: string } {
  const { cultivation } = input;
  if (!isBoundaryLevel(cultivation.level)) {
    return { error: `Lv.${cultivation.level} 非境界边界，无劫可渡` };
  }
  const def = breakthroughDef(cultivation.level);
  if (!def) return { error: "未知突破点" };

  let rate = def.baseSuccessRate;
  if (input.hasDaoRhymeTianren) rate += 0.2;
  if (input.isWasteRoot) rate += 0.1; // 天劫威力减半的成功率体现
  rate = Math.min(0.95, Math.max(0.05, rate));

  const success = rng.chance(rate);
  if (success) {
    const next = ascendRealm(cultivation);
    return {
      def, successRate: rate, success: true, cultivation: next,
      narrative: `${def.tribulation}渡过，${def.successReward}。`,
    };
  }
  const loss = input.isDestinyProtected
    ? Math.ceil(def.failPenalty.realmLoss / 2)
    : def.failPenalty.realmLoss;
  const next = failBreakthrough(cultivation, loss);
  return {
    def, successRate: rate, success: false, cultivation: next,
    narrative: `${def.tribulation}未能渡过：${def.failPenalty.extra ?? `修为倒退 ${loss} 级`}。`,
  };
}
