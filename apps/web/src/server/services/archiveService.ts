// ArchiveService：建角入库 + 道果码恢复（docs/07 API 契约）
import { createCharacter, createRng, generateNpc, hashSeed } from "@xunxian/engine";
import type { CreateCharacterInput } from "@xunxian/engine";
import { store, type ArchiveMeta } from "../store.js";
import { generateDaoFruitCode, isValidDaoFruitCode } from "../daoFruitCode.js";

const MAX_SLOTS = 3;

export type CreateArchiveInput = Omit<CreateCharacterInput, "archiveId">;

export async function createArchive(deviceId: string, slot: number, input: CreateArchiveInput): Promise<ArchiveMeta> {
  const existing = await store.listArchives(deviceId);
  if (existing.some((a) => a.slot === slot)) {
    throw new ServiceError(409, `存档槽 ${slot} 已被占用`);
  }
  if (existing.length >= MAX_SLOTS) {
    throw new ServiceError(409, `存档槽已达上限 ${MAX_SLOTS}`);
  }
  const seed = hashSeed(deviceId, slot, input.name, Date.now());
  const rng = createRng(seed);
  const archiveId = crypto.randomUUID();
  const { state, pack } = createCharacter({ ...input, archiveId }, rng);

  // 碰撞防护：重掷道果码直到唯一
  let code = generateDaoFruitCode(rng.next);
  while (await store.findArchiveByCode(code)) code = generateDaoFruitCode(rng.next);

  const meta: ArchiveMeta = {
    id: archiveId, deviceId, slot, daoFruitCode: code, status: "active",
    seed, createdAt: Date.now(),
  };
  await store.createArchive(meta, state);

  // 初始可结识之人（设定·二章三）：10-15 位随机 NPC，好感 5-40
  const count = 10 + rng.int(0, 6);
  const npcs = Array.from({ length: count }, () => generateNpc(rng, { domain: input.domain }));
  const relations = npcs.map((n) => ({
    npcId: n.id, tier: 0 as const, intimacy: rng.int(5, 41), interactions: 0, sharedEvents: 0,
  }));
  await store.saveNpcs(archiveId, npcs);
  await store.saveRelations(archiveId, relations);
  // 天命主线初始化：绑定开局包对应主线，第 1 阶段待天命之召
  await store.saveDestiny(archiveId, {
    storylineKey: pack.destinyKey, stage: 1, phase: "awaiting",
    waitingYears: 0, choices: [], rewards: [],
  });
  return meta;
}

export async function restoreArchive(deviceId: string, code: string, targetSlot: number): Promise<ArchiveMeta> {
  if (!isValidDaoFruitCode(code)) throw new ServiceError(400, "道果码校验失败，请检查输入");
  const archive = await store.findArchiveByCode(code);
  if (!archive) throw new ServiceError(404, "未找到该道果码对应的仙途");
  const mine = await store.listArchives(deviceId);
  const slot = targetSlot || mine.length + 1;
  if (mine.some((a) => a.slot === slot && a.id !== archive.id)) {
    throw new ServiceError(409, `存档槽 ${slot} 已被占用`);
  }
  await store.rebindArchive(archive.id, deviceId, slot);
  return { ...archive, deviceId, slot };
}

export class ServiceError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
