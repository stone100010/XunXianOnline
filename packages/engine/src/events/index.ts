// 事件链状态机执行器（docs/04 §3.8 / docs/06 §1）
// 主线剧本与因缘际会/秘境共用此执行器：节点图 + 条件 + 判定 + 效果 + 时限
import type { Rng } from "../rng/index.js";

export interface ChainEffect {
  type: "exp" | "item" | "currency" | "relation" | "flag" | "unlock" | "move";
  target?: string;
  value?: number;
  ref?: string;
  qty?: number;
}

export interface ChainCondition {
  kind: "realm" | "item" | "relation" | "flag" | "turn";
  target?: string;
  op: ">=" | "<=" | "==";
  value: number | string;
}

export interface ChainOption {
  label: string;
  riskFlag?: boolean;
  judgment?: { kind: "combat" | "luck" | "insight" | "social" | "will"; successRate: number };
  effects: ChainEffect[];
  next: string | null;   // null = 链结束
}

export interface ChainNode {
  id: string;
  synopsis: string;                    // 剧情梗概（LLM 叙事素材）
  options: ChainOption[];
  expiryTurns?: number;                // 保鲜期（月）
}

export interface ChainDef {
  key: string;
  name: string;
  kind: "karma" | "explore" | "destiny";
  entry: { requires: ChainCondition[] };
  nodes: ChainNode[];
}

export interface ChainState {
  chainKey: string;
  currentNodeId: string;
  startedTurn: number;
  vars: Record<string, unknown>;
}

export interface StepResult {
  node: ChainNode;
  chosen?: ChainOption;
  judgmentPassed?: boolean;
  effects?: ChainEffect[];
  nextNodeId: string | null;
  expired: boolean;
}

/** 执行当步：选选项 → 判定 → 效果 → 迁移 */
export function stepChain(
  def: ChainDef, state: ChainState, optionIndex: number, ctx: { realmLevel: number; flags: Record<string, unknown> }, rng: Rng,
): StepResult {
  const node = def.nodes.find((n) => n.id === state.currentNodeId);
  if (!node) return { node: def.nodes[0]!, expired: true, nextNodeId: null };
  const option = node.options[optionIndex];
  if (!option) throw new Error(`选项 ${optionIndex} 不存在于节点 ${node.id}`);

  const judgmentPassed = option.judgment ? rng.chance(option.judgment.successRate) : true;
  const effects = judgmentPassed ? option.effects : [];
  return {
    node, chosen: option, judgmentPassed,
    effects,
    nextNodeId: judgmentPassed ? option.next : node.id, // 判定失败停留本节点（可重试或放弃）
    expired: false,
  };
}

/** 入口条件校验（v0：realm/flag） */
export function canEnter(def: ChainDef, ctx: { realmLevel: number; flags: Record<string, unknown>; turnNo: number }): boolean {
  return def.entry.requires.every((c) => {
    const actual = c.kind === "realm" ? ctx.realmLevel : c.kind === "flag" ? ctx.flags[c.target ?? ""] : ctx.turnNo;
    switch (c.op) {
      case ">=": return (actual as number) >= (c.value as number);
      case "<=": return (actual as number) <= (c.value as number);
      case "==": return actual === c.value;
    }
  });
}

// ── 内置秘境模板（首版随机机缘：坠魔谷 / 古修士洞府）──
export const SECRET_REALM_TEMPLATES: ChainDef[] = [
  {
    key: "zhui_mo_gu", name: "坠魔谷", kind: "explore",
    entry: { requires: [{ kind: "realm", op: ">=", value: 11 }] },
    nodes: [
      {
        id: "entry", synopsis: "谷口魔气缭绕，隐有厉啸之声传出。入口禁制古老而残破。",
        options: [
          { label: "强行破禁而入", riskFlag: true, judgment: { kind: "insight", successRate: 0.6 },
            effects: [{ type: "exp", target: "cultivation", value: 80 }, { type: "item", ref: "mo_crystal", qty: 2 }], next: "inner" },
          { label: "寻隐蔽小径潜入", judgment: { kind: "luck", successRate: 0.75 },
            effects: [{ type: "exp", target: "cultivation", value: 40 }], next: "inner" },
          { label: "在外围拾取遗漏", effects: [{ type: "item", ref: "ling_herb", qty: 3 }], next: null },
        ],
      },
      {
        id: "inner", synopsis: "谷内深处，一座魔修遗府半掩于黑雾之中，门前石碑刻着无名魔文。",
        options: [
          { label: "推门而入，直取传承", riskFlag: true, judgment: { kind: "combat", successRate: 0.5 },
            effects: [{ type: "exp", target: "cultivation", value: 200 }, { type: "unlock", ref: "mo_gong_fragment" }], next: null },
          { label: "谨慎搜刮外殿", judgment: { kind: "insight", successRate: 0.8 },
            effects: [{ type: "item", ref: "mo_crystal", qty: 3 }, { type: "currency", value: 300 }], next: null },
          { label: "见好就收，退出秘境", effects: [], next: null },
        ],
        expiryTurns: 3,
      },
    ],
  },
  {
    key: "gu_xiushi_dongfu", name: "古修士洞府", kind: "explore",
    entry: { requires: [{ kind: "realm", op: ">=", value: 1 }] },
    nodes: [
      {
        id: "entry", synopsis: "山壁裂缝间透出微光，一座尘封洞府的阵法已近油尽灯枯。",
        options: [
          { label: "以蛮力破阵", riskFlag: true, judgment: { kind: "combat", successRate: 0.55 },
            effects: [{ type: "exp", target: "cultivation", value: 60 }, { type: "item", ref: "old_ring", qty: 1 }], next: null },
          { label: "细研阵纹寻隙而入", judgment: { kind: "insight", successRate: 0.7 },
            effects: [{ type: "exp", target: "cultivation", value: 100 }, { type: "currency", value: 200 }], next: null },
          { label: "记下位置，日后再来", effects: [{ type: "flag", target: "noted_dongfu" }], next: null },
        ],
      },
    ],
  },
];
