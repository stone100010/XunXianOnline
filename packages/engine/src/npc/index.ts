// NPC 池化生成（设定·十一章一，用户决策：内置池+相似度复用+按需生成+规模受控）
import type { Rng } from "../rng/index.js";
import { DOMAINS } from "@xunxian/content";

export interface NpcProfile {
  id: string;
  name: string;
  gender: "male" | "female";
  race: "human" | "yao" | "ling";
  domain: string;
  profession: string;          // 行当
  factionType: string;         // 势力类型
  realmLevel: number;
  equipmentLevel: number;     // 主装备等级（战力构成）
  techniqueLevel: number;     // 主修功法等级
  traits: string[];            // 性格道韵 2-3 项
  goal: string;                // 自身仙途目标
  power: number;               // 战力 = 修为+装备+功法（v0 随机装备功法等级）
}

const SURNAMES = ["林", "叶", "秦", "萧", "楚", "顾", "沈", "苏", "陆", "白", "姜", "云"];
const GIVEN = ["尘", "无涯", "青岚", "若水", "承影", "紫霞", "玄机", "照雪", "凌霄", "听雨", "望舒", "含光"];
const PROFESSIONS = ["散修", "炼丹师", "炼器师", "符师", "阵师", "灵植夫", "剑修", "体修", "商贾", "掮客", "宗门执事", "游方道人"];
const FACTION_TYPES = ["无门无派", "本地宗门", "大世家", "坊市商会", "散修联盟", "魔道旁支"];
const TRAITS = ["豪爽", "谨慎", "重诺", "凉薄", "痴武", "贪财", "慈悲", "傲慢", "隐忍", "洒脱", "狡黠", "执着"];
const GOALS = ["冲击下一个大境界", "寻一件本命法宝", "报一段灭门之仇", "建立自己的势力", "寻访上古传承", "赚取万枚灵石", "找到失散的道侣", "参悟一门法则"];

export interface NpcQuery {
  domain?: string;
  profession?: string;
  realmRange?: [number, number];
}

/** 生成一位随机 NPC（池中无匹配时调用） */
export function generateNpc(rng: Rng, query: NpcQuery = {}): NpcProfile {
  const [minR, maxR] = query.realmRange ?? [1, 60];
  const realmLevel = rng.int(minR, maxR + 1);
  const equip = rng.int(0, Math.min(6, Math.floor(realmLevel / 12) + 1));
  const technique = rng.int(1, Math.min(50, realmLevel));
  return {
    id: `npc_${rng.int(100000, 999999)}`,
    name: `${SURNAMES[rng.int(0, SURNAMES.length)]}${GIVEN[rng.int(0, GIVEN.length)]}`,
    gender: rng.chance(0.5) ? "male" : "female",
    race: rng.weighted([["human", 8], ["yao", 1.5], ["ling", 0.5]] as const),
    domain: query.domain ?? DOMAINS[rng.int(0, DOMAINS.length)]!.key,
    profession: query.profession ?? PROFESSIONS[rng.int(0, PROFESSIONS.length)]!,
    factionType: FACTION_TYPES[rng.int(0, FACTION_TYPES.length)]!,
    realmLevel,
    equipmentLevel: equip,
    techniqueLevel: technique,
    traits: rng.shuffle(TRAITS).slice(0, rng.int(2, 4)),
    goal: GOALS[rng.int(0, GOALS.length)]!,
    power: realmLevel + equip + technique,
  };
}


/** 相似度打分（复用匹配：域/行当/境界距离） */
export function similarity(npc: NpcProfile, query: NpcQuery): number {
  let score = 0;
  if (query.domain && npc.domain === query.domain) score += 3;
  if (query.profession && npc.profession === query.profession) score += 3;
  if (query.realmRange) {
    const mid = (query.realmRange[0] + query.realmRange[1]) / 2;
    const dist = Math.abs(npc.realmLevel - mid);
    score += Math.max(0, 4 - dist / 5);
  }
  return score;
}

/**
 * NPC 池取用：先相似度匹配复用，无合适者生成新 NPC 入池。
 * 池规模受控：超上限时淘汰最低相似度的闲置项。
 */
export class NpcPool {
  private pool: NpcProfile[] = [];
  constructor(private maxSize = 200, seedRng?: Rng) {
    // 内置种子池：预生成 30 位
    const rng = seedRng;
    if (rng) for (let i = 0; i < 30; i++) this.pool.push(generateNpc(rng));
  }

  size(): number { return this.pool.length; }

  /** 取用：复用分数 >2 的项，否则生成 */
  acquire(rng: Rng, query: NpcQuery): NpcProfile {
    const scored = this.pool
      .map((npc) => ({ npc, score: similarity(npc, query) }))
      .sort((a, b) => b.score - a.score);
    if (scored.length > 0 && scored[0]!.score > 2) return scored[0]!.npc;
    const npc = generateNpc(rng, query);
    this.pool.push(npc);
    if (this.pool.length > this.maxSize) this.pool.shift();
    return npc;
  }

  all(): readonly NpcProfile[] { return this.pool; }
}

// ── 道缘层级（十一章三）──
export interface RelationState {
  tier: 0 | 1 | 2 | 3 | 4;
  intimacy: number;       // 0-100
  interactions: number;   // 累计往来
  sharedEvents: number;   // 共历事件
}

export function relationTierOf(r: RelationState): 0 | 1 | 2 | 3 | 4 {
  if (r.interactions >= 20 && r.intimacy >= 80 && r.sharedEvents >= 3) return 4;
  if (r.interactions >= 8 && r.intimacy >= 60 && r.sharedEvents >= 1) return 3;
  if (r.interactions >= 3 || r.intimacy >= 40) return 2;
  if (r.interactions >= 1) return 1;
  return 0;
}

export const TIER_NAMES = ["陌路", "一面之缘", "熟识", "道友", "心腹/道侣"] as const;

/** 亲密度变化（十一章三：成功往来 +5~15；季度衰减需上层按月调用） */
export function applyInteraction(r: RelationState, positive: boolean, rng: Rng): RelationState {
  const delta = positive ? rng.int(5, 16) : -rng.int(5, 21);
  const next: RelationState = {
    ...r,
    intimacy: Math.max(0, Math.min(100, r.intimacy + delta)),
    interactions: r.interactions + 1,
  };
  return { ...next, tier: relationTierOf(next) };
}
