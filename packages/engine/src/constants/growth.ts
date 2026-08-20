import type { DaoBaseKey } from "@xunxian/shared";

// ── 道基经验曲线（设定·三章五）──
export interface DaoBaseCurveSegment {
  name: string;            // 阶段名称
  levelRange: readonly [number, number];
  expPerLevel: number;
}

export const DAO_BASE_CURVE: readonly DaoBaseCurveSegment[] = [
  { name: "初窥门径", levelRange: [1, 20],  expPerLevel: 80 },
  { name: "登堂入室", levelRange: [21, 40], expPerLevel: 200 },
  { name: "融会贯通", levelRange: [41, 60], expPerLevel: 400 },
  { name: "开宗立派", levelRange: [61, 80], expPerLevel: 700 },
  { name: "超凡入圣", levelRange: [81, 95], expPerLevel: 1200 },
  { name: "天人合一", levelRange: [96, 100], expPerLevel: 2000 },
] as const;

export function daoBaseExpPerLevel(level: number): number {
  const seg = DAO_BASE_CURVE.find((s) => level >= s.levelRange[0] && level <= s.levelRange[1]);
  if (!seg) throw new Error(`非法道基等级: ${level}`);
  return seg.expPerLevel;
}

export const DAO_BASE_NAMES: Record<DaoBaseKey, string> = {
  wuxin: "悟性",
  daoxin: "道心",
  genku: "根骨",
  qiyun: "气运",
  xuema: "血脉",
};

// ── 功法五品（设定·九章四）──
export const TECHNIQUE_GRADES = {
  fan:  { name: "凡品", levelCap: 30,  powerPerLevel: 0.8 },
  ling: { name: "灵品", levelCap: 50,  powerPerLevel: 1.0 },
  di:   { name: "地品", levelCap: 70,  powerPerLevel: 1.2 },
  tian: { name: "天品", levelCap: 90,  powerPerLevel: 1.5 },
  xian: { name: "仙品", levelCap: 100, powerPerLevel: 2.0 },
} as const;

// ── 洞府修炼加成（设定·九章三）──
export const ABODE_BONUS = [0, 0.05, 0.1, 0.15, 0.2, 0.3, 0.4, 0.5, 0.8] as const;

// ── 道韵-道基联动阈值（设定·三章七）──
export const DAO_RHYME_BOTTLENECK_FACTOR = 2; // 道韵 > 对应道基 × 2 → 瓶颈期（经验减半）
