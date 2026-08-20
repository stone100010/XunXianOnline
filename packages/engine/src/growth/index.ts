import type { Cultivation, DaoBaseKey, DaoBases, DaoRhyme } from "@xunxian/shared";
import { daoBaseExpPerLevel, DAO_RHYME_BOTTLENECK_FACTOR } from "../constants/growth.js";
import { expToNextLevel, realmOfLevel, REALMS } from "../constants/realms.js";

export interface LevelUpResult {
  state: Cultivation;
  levelsGained: number;
  crossedBreakthrough: boolean; // 是否跨过境界边界（10→11、20→21…，需走突破流程）
}

/**
 * 累加修为经验并结算升级。
 * 规则（三章一）：境界内每级同额经验；跨境界边界（Lv.10→11 等）经验满溢但不自动升级，
 * 由 breakthrough 模块处理渡劫。
 */
export function addCultivationExp(state: Cultivation, exp: number): LevelUpResult {
  let { level, exp: cur } = state;
  const startLevel = level;
  cur += Math.max(0, Math.round(exp));
  while (level < 100) {
    const need = expToNextLevel(level);
    const isBoundary = REALMS.some((r) => r.levelRange[1] === level);
    if (isBoundary && cur >= need) break;           // 境界边界：修为满溢，等待渡劫
    if (cur < need) break;
    cur -= need;
    level += 1;
  }
  return {
    state: { ...state, level, exp: cur },
    levelsGained: level - startLevel,
    crossedBreakthrough: level > startLevel && REALMS.some((r) => r.levelRange[1] === level - 0),
  };
}

/** 某级是否为境界边界（突破点） */
export function isBoundaryLevel(level: number): boolean {
  return REALMS.some((r) => r.levelRange[1] === level);
}

/** 渡劫成功：跨入下一境界（寿元按新境界上限提升） */
export function ascendRealm(state: Cultivation): Cultivation {
  const cur = realmOfLevel(state.level);
  const idx = REALMS.indexOf(cur);
  const next = REALMS[idx + 1];
  if (!next) return { ...state, level: 100, exp: 0 }; // 已至大乘
  const cap = next.lifespanCap;
  return {
    level: next.levelRange[0],
    exp: 0,
    // 寿元上限翻倍/跃升的简化实现：按新境界上限与当前余量取大者
    lifespanYears: Math.max(state.lifespanYears, Math.floor(cap * 0.5)),
  };
}

/** 渡劫失败：修为倒退 N 级（不跌破当前境界下界，三章六由各突破点参数决定额外惩罚） */
export function failBreakthrough(state: Cultivation, lossLevels: number): Cultivation {
  const cur = realmOfLevel(state.level);
  const floor = cur.levelRange[0];
  const level = Math.max(floor, state.level - lossLevels);
  return { ...state, level, exp: level === floor ? 0 : state.exp };
}

// ── 道基经验 ──
export interface DaoBaseGain { key: DaoBaseKey; levelsGained: number; bottlenecked: boolean }

export function addDaoBaseExp(bases: DaoBases, key: DaoBaseKey, exp: number): { bases: DaoBases; gain: DaoBaseGain } {
  const stat = bases[key]!;
  let { level, exp: cur } = stat;
  const start = level;
  cur += Math.max(0, Math.round(exp));
  while (level < 100 && cur >= daoBaseExpPerLevel(level)) {
    cur -= daoBaseExpPerLevel(level);
    level += 1;
  }
  return {
    bases: { ...bases, [key]: { level, exp: cur } },
    gain: { key, levelsGained: level - start, bottlenecked: false },
  };
}

/** 道韵-道基联动阈值（三章七）：道韵 > 对应道基 × 2 → 瓶颈期，道韵经验减半 */
export function isDaoRhymeBottlenecked(rhyme: DaoRhyme, relatedBaseLevel: number): boolean {
  return rhyme.level > relatedBaseLevel * DAO_RHYME_BOTTLENECK_FACTOR;
}

/** 道韵经验累加（瓶颈期减半） */
export function addDaoRhymeExp(rhyme: DaoRhyme, exp: number, relatedBaseLevel: number): { rhyme: DaoRhyme; bottlenecked: boolean } {
  const bottlenecked = isDaoRhymeBottlenecked(rhyme, relatedBaseLevel);
  const gained = bottlenecked ? Math.floor(exp / 2) : Math.round(exp);
  return { rhyme: { ...rhyme, exp: rhyme.exp + Math.max(0, gained) }, bottlenecked };
}
