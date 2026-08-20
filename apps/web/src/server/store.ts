// 存储抽象：内存实现先行（开发期无 PG 也可全流程游玩），PG/Drizzle 实现按同接口接入
import type { PlayerState } from "@xunxian/shared";
import type { CompassOption } from "@xunxian/engine";

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
  getInventory(archiveId: string): Promise<InventoryItem[]>;
  addItem(archiveId: string, item: Omit<InventoryItem, "acquiredTurn">, turnNo: number): Promise<void>;
  spendCurrency(archiveId: string, amount: number): Promise<boolean>;
}

class MemoryStore implements GameStore {
  private archives = new Map<string, ArchiveMeta>();
  private states = new Map<string, PlayerState>();
  private compass = new Map<string, CompassOption[]>();
  private turns = new Map<string, TurnRecord>();
  private inventory = new Map<string, InventoryItem[]>();

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
}

// 开发期全局单例（防 HMR 丢档）；接 PG 时替换为 DrizzleStore
const g = globalThis as unknown as { __xunxianStore?: GameStore };
export const store: GameStore = (g.__xunxianStore ??= new MemoryStore());
