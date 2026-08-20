import type { CompassKind } from "@xunxian/shared";
import type { Rng } from "../rng/index.js";

// ── 决策罗盘（设定·四章四）──
// 六类选项配额：命途 2-3 / 因缘 2-3 / 历练 2-3 / 经营 2-3 / 百艺 1-2 / 闭关 1-2，共 15。

export interface CompassOption {
  idx: number;                  // 1-15
  kind: CompassKind;
  label: string;                // 模板文案（LLM 润色后替换为 renderedLabel）
  payload: Record<string, unknown>; // 行动定义（actions 模块解析）
  riskFlag?: boolean;           // ⚠️风险标签（Lv.3 预警联动）
  destinyFlag?: boolean;        // 【天命】标签（引导系统联动）
  freshnessMonths: number;      // 保鲜期 1-4 月
}

export interface CompassContext {
  gameMonth: number;                          // 天命之召仅 1-3 月
  destinyOptions: RawOption[];                // 主线阶段决策选项（1-3 月注入）
  karmaOptions: RawOption[];                  // 因缘：未竟仙途/NPC 请求/事件链衍生
  exploreOptions: RawOption[];                // 历练：地舆图/秘境/简报
  socialOptions: RawOption[];                 // 经营：关系网维护
  artOptions: RawOption[];                    // 百艺：副业精进
  secludeOptions: RawOption[];                // 闭关：修炼/参悟
  suppressedGuidance?: boolean;               // 连续 3 回合未选天命/因缘 → 暂停 Lv.1 引导
}

export interface RawOption {
  label: string;
  payload?: Record<string, unknown>;
  riskFlag?: boolean;
  destinyFlag?: boolean;
}

const QUOTA: Array<{ kind: CompassKind; min: number; max: number }> = [
  { kind: "mingtu", min: 2, max: 3 },
  { kind: "yinyuan", min: 2, max: 3 },
  { kind: "lishi", min: 2, max: 3 },
  { kind: "daoyuan", min: 2, max: 3 },
  { kind: "baiyi", min: 1, max: 2 },
  { kind: "biguan", min: 1, max: 2 },
];

const FALLBACKS: Record<CompassKind, string> = {
  mingtu: "潜心推演天命主线脉络，思索下一步。",
  yinyuan: "留意身边流转的因缘际会。",
  lishi: "外出历练，探索周边山川灵地。",
  daoyuan: "与一位故人通问候安，维系道缘。",
  baiyi: "精进修仙百艺，打磨手艺赚取灵石。",
  biguan: "闭关修炼，温养真元。",
};

/** 采样每类配额，使总数恰为 15 */
function sampleQuotas(rng: Rng, destinyWindow: boolean, suppressed: boolean): number[] {
  // 尝试各档组合直到合计 15（固定搜索，保证确定性）
  for (let attempt = 0; attempt < 64; attempt++) {
    const counts = QUOTA.map((q, i) => {
      // 天命之召窗口外/引导暂停时，命途类选项降为非引导型（数量保底 2）
      const min = q.min;
      return min + rng.int(0, q.max - min + 1);
    });
    const total = counts.reduce((s, c) => s + c, 0);
    if (total === 15) return counts;
  }
  return [3, 3, 3, 3, 2, 1]; // 兜底组合
}

export function generateCompass(ctx: CompassContext, rng: Rng): CompassOption[] {
  const destinyWindow = ctx.gameMonth >= 1 && ctx.gameMonth <= 3;
  const quotas = sampleQuotas(rng, destinyWindow, ctx.suppressedGuidance ?? false);

  const pools: Record<CompassKind, RawOption[]> = {
    mingtu: destinyWindow && !ctx.suppressedGuidance ? ctx.destinyOptions : [],
    yinyuan: ctx.karmaOptions,
    lishi: ctx.exploreOptions,
    daoyuan: ctx.socialOptions,
    baiyi: ctx.artOptions,
    biguan: ctx.secludeOptions,
  };

  const out: CompassOption[] = [];
  let idx = 1;
  QUOTA.forEach((q, i) => {
    const pool = rng.shuffle(pools[q.kind] ?? []);
    for (let n = 0; n < quotas[i]!; n++) {
      const raw = pool[n] ?? { label: FALLBACKS[q.kind] };
      out.push({
        idx: idx++,
        kind: q.kind,
        label: raw.label,
        payload: raw.payload ?? { type: q.kind },
        riskFlag: raw.riskFlag,
        destinyFlag: raw.destinyFlag ?? (q.kind === "mingtu" && destinyWindow && !!(pool[n] && ctx.destinyOptions.includes(pool[n]!))),
        freshnessMonths: rng.int(1, 5),
      });
    }
  });
  return out;
}
