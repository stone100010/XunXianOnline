// 天命主线分阶段剧本 v1（docs/06 Schema 的首版落地）
// 每条主线 × 6 阶段：梗概 + 2-3 互斥决策选项 + 效果（引擎原语）+ 奖励说明
// 由 STORYLINE_SEEDS 的阶段骨架展开；节点图（多步状态机）在 v2 扩充
import { STORYLINE_SEEDS } from "./storylines.js";

export interface DestinyEffect {
  type: "exp" | "item" | "currency" | "flag" | "unlock";
  target?: string;
  value?: number;
  ref?: string;
}

export interface DestinyOption {
  label: string;
  riskFlag?: boolean;
  effects: DestinyEffect[];
  rewardNote: string;
}

export interface DestinyStageScript {
  index: number;           // 1-6
  name: string;
  synopsis: string;
  realmGate: readonly [number, number];
  options: DestinyOption[];
}

// 阶段模板：按阶段序号生成该阶段的互斥选项（主题由各主线 tone/奖励差异化）
const STAGE_TEMPLATES: Array<(ctx: { storylineName: string; stageName: string; reward: string }) => DestinyOption[]> = [
  // 阶段 1：觉醒/入门（稳健 vs 冒险）
  (c) => [
    { label: `循迹而修：以水磨工夫参悟【${c.stageName}】的机缘`, effects: [{ type: "exp", target: "cultivation", value: 60 }], rewardNote: "修为精进，根基更稳" },
    { label: `主动出击：循线索直探【${c.stageName}】核心`, riskFlag: true, effects: [{ type: "exp", target: "cultivation", value: 150 }, { type: "item", ref: "destiny_relic_1", value: 1 }], rewardNote: c.reward },
    { label: `广结善缘：借同道之力共谋【${c.stageName}】`, effects: [{ type: "flag", target: "destiny_allies" }], rewardNote: "结识天命同路人" },
  ],
  // 阶段 2：试炼/获取神通
  (c) => [
    { label: `直面试炼：于【${c.stageName}】中淬炼己身`, riskFlag: true, effects: [{ type: "exp", target: "cultivation", value: 200 }, { type: "unlock", ref: "destiny_skill_1" }], rewardNote: c.reward },
    { label: `稳中求进：先固修为再图【${c.stageName}】`, effects: [{ type: "exp", target: "cultivation", value: 120 }], rewardNote: "修为精进" },
  ],
  // 阶段 3：体质/传承觉醒
  (c) => [
    { label: `强行觉醒：以大毅力唤醒【${c.stageName}】`, riskFlag: true, effects: [{ type: "exp", target: "cultivation", value: 350 }, { type: "unlock", ref: "destiny_physique" }], rewardNote: c.reward },
    { label: `顺势而为：待机缘成熟再动`, effects: [{ type: "exp", target: "cultivation", value: 150 }, { type: "currency", value: 500 }], rewardNote: "厚积薄发，兼获资财" },
  ],
  // 阶段 4：分支抉择（双线）
  (c) => [
    { label: `刚线：以力证道，硬撼【${c.stageName}】`, riskFlag: true, effects: [{ type: "exp", target: "cultivation", value: 500 }, { type: "unlock", ref: "destiny_path_hard" }], rewardNote: `${c.reward}（刚之途）` },
    { label: `柔线：以智取胜，巧渡【${c.stageName}】`, effects: [{ type: "exp", target: "cultivation", value: 350 }, { type: "unlock", ref: "destiny_path_soft" }, { type: "currency", value: 1000 }], rewardNote: `${c.reward}（柔之途）` },
  ],
  // 阶段 5：清算/大义
  (c) => [
    { label: `了断因果：【${c.stageName}】中的一线牵绊，今日斩断`, riskFlag: true, effects: [{ type: "exp", target: "cultivation", value: 800 }, { type: "unlock", ref: "destiny_law_fragment" }], rewardNote: c.reward },
    { label: `留一线生机：【${c.stageName}】中的旧怨，且放下`, effects: [{ type: "exp", target: "cultivation", value: 400 }, { type: "flag", target: "destiny_mercy" }], rewardNote: "道心圆融" },
  ],
  // 阶段 6：终幕抉择（飞升或留守）
  (c) => [
    { label: `飞升离去：辞别此界，追寻【${c.storylineName}】的彼岸`, effects: [{ type: "flag", target: "destiny_finale_ascend" }], rewardNote: "渡劫飞升，终章开启" },
    { label: `留守人间：以此身镇护一方天地`, effects: [{ type: "flag", target: "destiny_finale_stay" }], rewardNote: "万古长存，终章开启" },
  ],
];

export const DESTINY_SCRIPTS: Record<string, DestinyStageScript[]> = Object.fromEntries(
  STORYLINE_SEEDS.map((s) => [
    s.key,
    s.stages.map((stage, i) => ({
      index: i + 1,
      name: stage.name,
      synopsis: `【天命·${s.name}】第${i + 1}阶「${stage.name}」（终章基调：${s.tone}）`,
      realmGate: stage.realmGate,
      options: STAGE_TEMPLATES[i]!({ storylineName: s.name, stageName: stage.name, reward: stage.reward }),
    })),
  ]),
);

export function stageScript(storylineKey: string, stageIndex: number): DestinyStageScript {
  const stages = DESTINY_SCRIPTS[storylineKey];
  if (!stages) throw new Error(`未知主线: ${storylineKey}`);
  const s = stages[stageIndex - 1];
  if (!s) throw new Error(`主线 ${storylineKey} 无阶段 ${stageIndex}`);
  return s;
}
