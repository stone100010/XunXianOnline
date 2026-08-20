// 意图解析层（docs/05 §5）：玩家自由输入 → 结构化意图
// v0 规则版：关键词/正则匹配 + 置信度；LLM 版在服务层包装（先规则后 LLM 澄清）
import type { Rng } from "../rng/index.js";

export type IntentAction =
  | "cultivate" | "explore" | "trade" | "bargain" | "social"
  | "craft" | "seclude" | "travel" | "attack" | "freeform";

export interface Intent {
  action: IntentAction;
  params: Record<string, unknown>;
  confidence: number;        // ≥0.7 直接结算；0.4-0.7 澄清；<0.4 建议
  clarifyCandidates?: IntentAction[];
  restatedAction: string;    // 规范化后的行动描述
}

const RULES: { action: IntentAction; patterns: RegExp[]; restate: string }[] = [
  { action: "seclude", patterns: [/闭关|静修|苦修|闭关苦修/], restate: "闭关修持一月" },
  { action: "cultivate", patterns: [/修炼|吐纳|运功|打坐|修炼功法/], restate: "潜心修炼" },
  { action: "explore", patterns: [/探索|探秘|寻宝|秘境|遗迹|洞府|历练|寻药|采药/], restate: "外出历练探索" },
  { action: "trade", patterns: [/买|购买|卖|出售|交易|逛坊市|购物/], restate: "前往坊市交易" },
  { action: "bargain", patterns: [/砍价|议价|讨价还价|以物易物/], restate: "在坊市议价" },
  { action: "social", patterns: [/拜访|探望|叙旧|拜见|论道|请教师|找.*聊聊/], restate: "维系道缘" },
  { action: "craft", patterns: [/(炼|制|锻|画)(丹|器|符|阵|剑)|炼丹|炼器|制符|布阵|炼制/], restate: "精进百艺炼制" },
  { action: "travel", patterns: [/前往|赶路|动身|去.*域|出发/], restate: "长途跋涉赶路" },
  { action: "attack", patterns: [/截杀|寻仇|杀|挑战|决斗|出手|报复/], restate: "主动出击" },
];

export function parseIntent(text: string, _rng: Rng): Intent {
  const input = text.trim();
  if (!input) return { action: "freeform", params: {}, confidence: 0, restatedAction: "" };

  const hits: { rule: (typeof RULES)[number]; count: number }[] = [];
  for (const rule of RULES) {
    const count = rule.patterns.filter((p) => p.test(input)).length;
    if (count > 0) hits.push({ rule, count });
  }
  if (hits.length === 0) {
    return { action: "freeform", params: { raw: input }, confidence: 0.3, restatedAction: input };
  }
  hits.sort((a, b) => b.count - a.count);
  const best = hits[0]!;
  const confidence = Math.min(0.95, 0.6 + best.count * 0.2);
  const clarifyCandidates = hits.slice(0, 3).map((h) => h.rule.action);
  return {
    action: best.rule.action,
    params: { raw: input },
    confidence,
    clarifyCandidates,
    restatedAction: best.rule.restate,
  };
}
