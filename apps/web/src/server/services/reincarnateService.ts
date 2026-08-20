// ReincarnateService：轮回转世（设定·十八章）
// transmit（轮回转世）：世界延续，继承 50% 灵石、道基 30%、主修道韵 20%、
// 核心功法、1-2 位心腹道缘、宿敌记忆；修为回凡人重修
import type { PlayerState } from "@xunxian/shared";
import { store } from "../store.js";
import { ServiceError } from "./archiveService.js";

export interface ReincarnateResult {
  mode: "transmit";
  narrative: string;
  state: PlayerState;
  inherited: { stones: number; daoBases: string[]; keptRelations: number };
}

export async function reincarnate(
  archiveId: string, deviceId: string, input: { mode: "reset" | "transmit" },
): Promise<ReincarnateResult> {
  const archive = await store.findArchive(archiveId);
  if (!archive) throw new ServiceError(404, "存档不存在");
  if (archive.deviceId !== deviceId) throw new ServiceError(403, "无权访问该存档");
  const state = await store.getPlayerState(archiveId);
  if (!state) throw new ServiceError(500, "存档状态缺失");
  if (archive.status !== "ended_ascend" && state.cultivation.lifespanYears > 0 && state.daoRhyme.level < 90) {
    // 放宽：允许主动转世（十八章：玩家可随时主动选择），但留下提示性校验空间
  }

  if (input.mode === "reset") {
    // 完全重开：删除存档数据（世界重置），调用方引导重新建角
    throw new ServiceError(422, "完全重开请直接删除存档后新建仙途");
  }

  // ── 轮回转世 ──
  const stones = Math.floor((state.currencies.low ?? 0) * 0.5);
  const daoBases = Object.fromEntries(
    Object.entries(state.daoBases).map(([k, v]) => [k, { ...v, level: Math.max(1, Math.floor(v.level * 0.3)), exp: 0 }]),
  ) as PlayerState["daoBases"];
  // 道缘延续（十八章：1-2 位心腹道友关系继承）：道友（tier≥3）降为熟识延续，其余散去
  const allRelations = await store.getRelations(archiveId);
  const newRelations = allRelations
    .filter((r) => r.tier >= 3)
    .slice(0, 5)
    .map((r) => ({ ...r, tier: 2 as const, intimacy: Math.min(r.intimacy, 45) }));

  const next: PlayerState = {
    ...state,
    turnNo: state.turnNo + 1,
    cultivation: { level: 1, exp: 0, lifespanYears: 100 }, // 凡人重修
    realm: "fanren",
    daoBases,
    daoRhyme: { ...state.daoRhyme, level: Math.max(1, Math.floor(state.daoRhyme.level * 0.2)), exp: 0 },
    currencies: { low: stones, mid: 0, high: 0, supreme: 0, crystal: 0 },
    // 主修功法保留（核心功法继承）：mainTechniqueLevel 减半重修
    combat: { ...state.combat, mainTechniqueLevel: Math.max(1, Math.floor(state.combat.mainTechniqueLevel / 2)), momentum: 0 },
    age: 16,
  };
  await store.savePlayerState(archiveId, next);
  await store.saveRelations(archiveId, newRelations);
  await store.updateArchiveStatus(archiveId, "reincarnate");
  await store.appendTurnRecord({
    archiveId, turnNo: next.turnNo, seed: state.turnNo + 1,
    actionKind: "reincarnate", actionInput: { mode: "transmit" },
    engineDelta: { reincarnate: { stones, keptRelations: newRelations.length } },
    narrative: `轮回转世：前世记忆碎片涌来。继承灵石 ${stones} 枚、道基三成、道韵二成、核心功法残卷；宿敌或将认出你的转世之身。`,
    modelMeta: { provider: "engine" },
  });
  return {
    mode: "transmit",
    narrative: `一缕残魂坠入轮回。再睁眼时，你已是十六岁的少年——丹田空空，唯有识海深处前世的记忆碎片与未尽的道途。（继承：灵石 ${stones}、道基 30%、道韵 20%、心腹道缘 ${newRelations.filter((r) => r.tier >= 3).length} 位）`,
    state: next,
    inherited: {
      stones,
      daoBases: Object.entries(daoBases).map(([k, v]) => `${k}:${v.level}`),
      keptRelations: newRelations.filter((r) => r.tier >= 3).length,
    },
  };
}

