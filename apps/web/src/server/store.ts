// 存储选择：配置 DATABASE_URL → PostgreSQL（DrizzleStore），否则内存实现（开发兜底）
import type { PlayerState } from "@xunxian/shared";
import type { CompassOption, NpcProfile, RelationState } from "@xunxian/engine";

export interface StoredRelation extends RelationState {
  npcId: string;
}

export interface ArchiveMeta {
  id: string;
  deviceId: string;
  slot: number;
  daoFruitCode: string;
  status: string;
  seed: number;
  createdAt: number;
}

export interface TurnRecord {
  archiveId: string;
  turnNo: number;
  seed: number;
  actionKind: string;
  actionInput: unknown;
  engineDelta: unknown;
  narrative: string;
  modelMeta: unknown;
}

export interface InventoryItem {
  key: string;
  name: string;
  category: string;
  qty: number;
  acquiredTurn: number;
}

export interface GameStore {
  createArchive(meta: ArchiveMeta, state: PlayerState): Promise<void>;
  listArchives(deviceId: string): Promise<ArchiveMeta[]>;
  findArchiveByCode(code: string): Promise<ArchiveMeta | null>;
  findArchive(id: string): Promise<ArchiveMeta | null>;
  rebindArchive(id: string, deviceId: string, slot: number): Promise<void>;
  getPlayerState(archiveId: string): Promise<PlayerState | null>;
  savePlayerState(archiveId: string, state: PlayerState): Promise<void>;
  getCompass(archiveId: string, turnNo: number): Promise<CompassOption[] | null>;
  saveCompass(archiveId: string, turnNo: number, options: CompassOption[]): Promise<void>;
  getTurnRecord(archiveId: string, turnNo: number): Promise<TurnRecord | null>;
  appendTurnRecord(record: TurnRecord): Promise<void>;
  listTurnRecords(archiveId: string, limit?: number): Promise<TurnRecord[]>;
  getInventory(archiveId: string): Promise<InventoryItem[]>;
  addItem(archiveId: string, item: Omit<InventoryItem, "acquiredTurn">, turnNo: number): Promise<void>;
  spendCurrency(archiveId: string, amount: number): Promise<boolean>;
  getNpcs(archiveId: string): Promise<NpcProfile[]>;
  saveNpcs(archiveId: string, npcs: NpcProfile[]): Promise<void>;
  getRelations(archiveId: string): Promise<StoredRelation[]>;
  saveRelations(archiveId: string, relations: StoredRelation[]): Promise<void>;
  getDestiny(archiveId: string): Promise<DestinyProgress | null>;
  saveDestiny(archiveId: string, destiny: DestinyProgress): Promise<void>;
}

export interface DestinyProgress {
  storylineKey: string;
  stage: number;                  // 1-6
  phase: "awaiting" | "progressing" | "completed" | "finale";
  waitingYears: number;           // 已等待年数
  choices: { stage: number; optionLabel: string; turnNo: number }[];
  rewards: string[];
}

class MemoryStore implements GameStore {
  private archives = new Map<string, ArchiveMeta>();
  private states = new Map<string, PlayerState>();
  private compass = new Map<string, CompassOption[]>();
  private turns = new Map<string, TurnRecord>();
  private inventory = new Map<string, InventoryItem[]>();
  private npcs = new Map<string, NpcProfile[]>();
  private relations = new Map<string, StoredRelation[]>();
  private destiny = new Map<string, DestinyProgress>();

  async createArchive(meta: ArchiveMeta, state: PlayerState) {
    this.archives.set(meta.id, meta);
    this.states.set(meta.id, state);
  }
  async listArchives(deviceId: string) {
    return [...this.archives.values()].filter((a) => a.deviceId === deviceId).sort((a, b) => a.slot - b.slot);
  }
  async findArchiveByCode(code: string) {
    return [...this.archives.values()].find((a) => a.daoFruitCode === code.replace("-", "")) ?? null;
  }
  async findArchive(id: string) {
    return this.archives.get(id) ?? null;
  }
  async rebindArchive(id: string, deviceId: string, slot: number) {
    const a = this.archives.get(id);
    if (a) this.archives.set(id, { ...a, deviceId, slot });
  }
  async getPlayerState(archiveId: string) {
    return this.states.get(archiveId) ?? null;
  }
  async savePlayerState(archiveId: string, state: PlayerState) {
    this.states.set(archiveId, state);
  }
  async getCompass(archiveId: string, turnNo: number) {
    return this.compass.get(`${archiveId}:${turnNo}`) ?? null;
  }
  async saveCompass(archiveId: string, turnNo: number, options: CompassOption[]) {
    this.compass.set(`${archiveId}:${turnNo}`, options);
  }
  async getTurnRecord(archiveId: string, turnNo: number) {
    return this.turns.get(`${archiveId}:${turnNo}`) ?? null;
  }
  async appendTurnRecord(record: TurnRecord) {
    this.turns.set(`${record.archiveId}:${record.turnNo}`, record);
  }
  async listTurnRecords(archiveId: string, limit = 100) {
    return [...this.turns.values()]
      .filter((t) => t.archiveId === archiveId)
      .sort((a, b) => b.turnNo - a.turnNo)
      .slice(0, limit);
  }
  async getInventory(archiveId: string) {
    return this.inventory.get(archiveId) ?? [];
  }
  async addItem(archiveId: string, item: Omit<InventoryItem, "acquiredTurn">, turnNo: number) {
    const list = this.inventory.get(archiveId) ?? [];
    const existing = list.find((i) => i.key === item.key);
    if (existing) existing.qty += item.qty;
    else list.push({ ...item, acquiredTurn: turnNo });
    this.inventory.set(archiveId, list);
  }
  async spendCurrency(archiveId: string, amount: number) {
    const state = this.states.get(archiveId);
    const balance = state?.currencies.low ?? 0;
    if (!state || balance < amount) return false;
    state.currencies = { ...state.currencies, low: balance - amount };
    this.states.set(archiveId, state);
    return true;
  }
  async getNpcs(archiveId: string) {
    return this.npcs.get(archiveId) ?? [];
  }
  async saveNpcs(archiveId: string, npcs: NpcProfile[]) {
    this.npcs.set(archiveId, npcs);
  }
  async getRelations(archiveId: string) {
    return this.relations.get(archiveId) ?? [];
  }
  async saveRelations(archiveId: string, relations: StoredRelation[]) {
    this.relations.set(archiveId, relations);
  }
  async getDestiny(archiveId: string) {
    return this.destiny.get(archiveId) ?? null;
  }
  async saveDestiny(archiveId: string, destiny: DestinyProgress) {
    this.destiny.set(archiveId, destiny);
  }
}

// 存储选择：配置 DATABASE_URL → DrizzleStore（PostgreSQL），否则内存实现。
// holder.impl 同步装配（pg.Pool 惰性连接），建表经 storeReady 异步完成，API 路由入口 await 它。
const g = globalThis as unknown as { __xunxianHolder?: { impl: GameStore; ready: Promise<void> } };

export const holder = (g.__xunxianHolder ??= (() => {
  const url = process.env.DATABASE_URL;
  const boot: { impl: GameStore; ready: Promise<void> } = {
    impl: new MemoryStore(),
    ready: Promise.resolve(),
  };
  if (!url) {
    console.warn("[store] 未配置 DATABASE_URL，使用内存存储（重启丢档）");
    return boot;
  }
  let readyResolve: () => void = () => {};
  boot.ready = new Promise<void>((r) => (readyResolve = r));
  void (async () => {
    try {
      const { DrizzleStore } = await import("./db/drizzleStore.js");
      const s = new DrizzleStore(url);
      await s.init();
      boot.impl = s;
      console.log("[store] PostgreSQL 已连接");
    } catch (e) {
      console.error("[store] PostgreSQL 连接失败，回退内存存储：", e);
    } finally {
      readyResolve();
    }
  })();
  return boot;
})());

/** API 路由入口 await，确保存储实现与建表就绪 */
export const storeReady: Promise<void> = holder.ready;

export const store: GameStore = new Proxy({} as GameStore, {
  get(_t, prop) {
    const v = Reflect.get(holder.impl as object, prop);
    return typeof v === "function" ? (v as (...a: unknown[]) => unknown).bind(holder.impl) : v;
  },
});
