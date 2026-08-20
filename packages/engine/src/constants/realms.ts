import type { Realm } from "@xunxian/shared";

// 境界表（设定·三章一）。levelRange 为 [min, max] 闭区间。
export interface RealmDef {
  key: Realm;
  name: string;
  levelRange: readonly [number, number];
  expPerLevel: number;      // 每级所需修为
  lifespanCap: number;      // 寿元上限（岁）；渡劫为 -1 表无量
  unlocks: string[];        // 解锁能力
}

export const REALMS: readonly RealmDef[] = [
  { key: "fanren",   name: "凡人境",     levelRange: [1, 10],   expPerLevel: 50,   lifespanCap: 100,  unlocks: ["基础战斗", "使用凡器"] },
  { key: "lianqi",   name: "炼气期",     levelRange: [11, 20],  expPerLevel: 150,  lifespanCap: 150,  unlocks: ["神识外放", "御器飞行(短距离)"] },
  { key: "zhuji",    name: "筑基期",     levelRange: [21, 40],  expPerLevel: 350,  lifespanCap: 250,  unlocks: ["真火炼丹", "真元护体", "收徒"] },
  { key: "jindan",   name: "金丹期",     levelRange: [41, 60],  expPerLevel: 650,  lifespanCap: 500,  unlocks: ["丹火炼器", "神识传音", "势力创建"] },
  { key: "yuanying", name: "元婴期",     levelRange: [61, 80],  expPerLevel: 1000, lifespanCap: 1000, unlocks: ["元婴离体", "夺舍", "分身术"] },
  { key: "huashen",  name: "化神期",     levelRange: [81, 95],  expPerLevel: 1800, lifespanCap: 3000, unlocks: ["法则领域", "虚空挪移"] },
  { key: "dujie",    name: "渡劫/大乘",  levelRange: [96, 100], expPerLevel: 3000, lifespanCap: -1,   unlocks: ["天劫感应", "飞升资格"] },
] as const;

export function realmOfLevel(level: number): RealmDef {
  const found = REALMS.find((r) => level >= r.levelRange[0] && level <= r.levelRange[1]);
  if (!found) throw new Error(`非法修为等级: ${level}`);
  return found;
}

/** 修为升级所需经验（境界内每级同额） */
export function expToNextLevel(level: number): number {
  return realmOfLevel(level).expPerLevel;
}

// ── 战力评级（设定·三章二）──
export const POWER_TIERS = [
  { name: "凡尘", min: 1, max: 40 },
  { name: "初窥", min: 15, max: 80 },
  { name: "登堂", min: 30, max: 150 },
  { name: "入室", min: 60, max: 250 },
  { name: "宗师", min: 100, max: 380 },
  { name: "尊者", min: 180, max: 500 },
  { name: "飞升", min: 300, max: 600 },
] as const;

/** 战力评级：取所有满足区间的最高档 */
export function powerTier(power: number): string {
  let tier: string = POWER_TIERS[0].name;
  for (const t of POWER_TIERS) if (power >= t.min && power <= t.max) tier = t.name;
  return tier;
}
