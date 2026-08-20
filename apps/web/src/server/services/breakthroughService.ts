// BreakthroughService：境界边界渡劫（设定·三章六）
import { attemptBreakthrough, createRng, hashSeed, realmOfLevel } from "@xunxian/engine";
import type { PlayerState } from "@xunxian/shared";
import { store } from "../store.js";
import { ServiceError } from "./archiveService.js";

async function requireOwned(archiveId: string, deviceId: string): Promise<PlayerState> {
  const archive = await store.findArchive(archiveId);
  if (!archive) throw new ServiceError(404, "存档不存在");
  if (archive.deviceId !== deviceId) throw new ServiceError(403, "无权访问该存档");
  const state = await store.getPlayerState(archiveId);
  if (!state) throw new ServiceError(500, "存档状态缺失");
  return state;
}

export async function attempt(archiveId: string, deviceId: string): Promise<{
  success: boolean;
  rate: number;
  narrative: string;
  state: PlayerState;
  realmName: string;
}> {
  const state = await requireOwned(archiveId, deviceId);
  const existing = await store.getTurnRecord(archiveId, state.turnNo);
  if (existing) throw new ServiceError(409, "本月已行动，渡劫须在行动前发起");

  const rng = createRng(hashSeed(archiveId, "breakthrough", state.turnNo, state.cultivation.level));
  const result = attemptBreakthrough({
    cultivation: state.cultivation,
    hasDaoRhymeTianren: state.daoRhyme.key === "tiangren",
    isWasteRoot: state.spiritRoot.grade === "fei",
  }, rng);
  if ("error" in result) throw new ServiceError(422, result.error);

  const updated: PlayerState = { ...state, cultivation: result.cultivation, realm: realmOfLevel(result.cultivation.level).key };
  await store.savePlayerState(archiveId, updated);
  await store.appendTurnRecord({
    archiveId, turnNo: state.turnNo, seed: hashSeed(archiveId, "bt", state.turnNo),
    actionKind: "breakthrough",
    actionInput: { point: result.def.point },
    engineDelta: { breakthrough: { success: result.success, rate: result.successRate } },
    narrative: result.narrative,
    modelMeta: { provider: "engine" },
  });
  return {
    success: result.success,
    rate: result.successRate,
    narrative: result.narrative,
    state: updated,
    realmName: realmOfLevel(updated.cultivation.level).name,
  };
}
