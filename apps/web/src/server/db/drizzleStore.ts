// DrizzleStore：GameStore 的 PostgreSQL 实现（schema 见 ./schema.ts）
import { and, asc, eq, sql } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import type { PlayerState } from "@xunxian/shared";
import type { CompassOption, NpcProfile } from "@xunxian/engine";
import { archives, compassOptions, devices, playerStates, turnRecords } from "./schema.js";
import type { ArchiveMeta, DestinyProgress, GameStore, InventoryItem, StoredKarmaEvent, StoredRelation, TurnRecord } from "../store.js";

// inventory 简表（v0 与内存实现等价；后续迁移至专门表）
const INVENTORY_DDL = `
CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  archive_id uuid NOT NULL,
  item_key varchar(64) NOT NULL,
  name varchar(64) NOT NULL,
  category varchar(16) NOT NULL,
  qty integer NOT NULL DEFAULT 1,
  acquired_turn integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS inventory_archive_idx ON inventory_items (archive_id);
`;

export class DrizzleStore implements GameStore {
  private db: NodePgDatabase;
  private pool: pg.Pool;

  constructor(databaseUrl: string) {
    this.pool = new pg.Pool({ connectionString: databaseUrl, max: 5 });
    this.db = drizzle(this.pool);
  }

  /** 建库表（幂等）：开发期替代迁移；正式上线走 drizzle-kit migrate。advisory lock 防并发建表竞态 */
  async init(): Promise<void> {
    await this.db.execute(sql`SELECT pg_advisory_lock(92021001)`);
    try {
    await this.db.execute(sql`CREATE TABLE IF NOT EXISTS devices (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at timestamptz NOT NULL DEFAULT now(),
      last_seen_at timestamptz NOT NULL DEFAULT now())`);
    await this.db.execute(sql`CREATE TABLE IF NOT EXISTS archives (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      device_id uuid NOT NULL REFERENCES devices(id),
      slot integer NOT NULL,
      dao_fruit_code varchar(9) NOT NULL,
      status varchar(24) NOT NULL DEFAULT 'active',
      seed bigint NOT NULL,
      settings_version integer NOT NULL DEFAULT 1,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now())`);
    await this.db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS archives_code_idx ON archives (dao_fruit_code)`);
    await this.db.execute(sql`CREATE TABLE IF NOT EXISTS player_states (
      archive_id uuid PRIMARY KEY REFERENCES archives(id),
      turn_no integer NOT NULL DEFAULT 0,
      data jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now())`);
    await this.db.execute(sql`CREATE TABLE IF NOT EXISTS compass_options (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      archive_id uuid NOT NULL REFERENCES archives(id),
      turn_no integer NOT NULL,
      idx integer NOT NULL,
      kind varchar(16) NOT NULL,
      label text NOT NULL,
      payload jsonb NOT NULL,
      risk_flag boolean NOT NULL DEFAULT false,
      destiny_flag boolean NOT NULL DEFAULT false,
      freshness_expire_turn integer NOT NULL,
      is_selected boolean NOT NULL DEFAULT false)`);
    await this.db.execute(sql`CREATE INDEX IF NOT EXISTS compass_archive_turn_idx ON compass_options (archive_id, turn_no)`);
    await this.db.execute(sql`CREATE TABLE IF NOT EXISTS turn_records (
      archive_id uuid NOT NULL REFERENCES archives(id),
      turn_no integer NOT NULL,
      seed bigint NOT NULL,
      action_kind varchar(32) NOT NULL,
      action_input jsonb NOT NULL,
      engine_delta jsonb NOT NULL,
      narrative text NOT NULL,
      model_meta jsonb,
      created_at timestamptz NOT NULL DEFAULT now())`);
    await this.db.execute(sql`CREATE INDEX IF NOT EXISTS turn_records_pk ON turn_records (archive_id, turn_no)`);
    await this.db.execute(sql`CREATE TABLE IF NOT EXISTS archives_extra (
      archive_id uuid PRIMARY KEY,
      inventory jsonb NOT NULL DEFAULT '[]')`);
    await this.db.execute(sql`CREATE TABLE IF NOT EXISTS world_snapshots (
      archive_id uuid PRIMARY KEY,
      npcs jsonb NOT NULL DEFAULT '[]',
      relations jsonb NOT NULL DEFAULT '[]',
      destiny jsonb,
      karma jsonb NOT NULL DEFAULT '[]')`);
    await this.db.execute(sql`ALTER TABLE world_snapshots ADD COLUMN IF NOT EXISTS destiny jsonb`);
    await this.db.execute(sql`ALTER TABLE world_snapshots ADD COLUMN IF NOT EXISTS karma jsonb`);
    await this.db.execute(INVENTORY_DDL);
    } finally {
      await this.db.execute(sql`SELECT pg_advisory_unlock(92021001)`);
    }
  }

  async createArchive(meta: ArchiveMeta, state: PlayerState): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.insert(devices).values({ id: meta.deviceId }).onConflictDoNothing();
      await tx.insert(archives).values({
        id: meta.id, deviceId: meta.deviceId, slot: meta.slot,
        daoFruitCode: meta.daoFruitCode, status: meta.status, seed: meta.seed,
      });
      await tx.insert(playerStates).values({ archiveId: meta.id, turnNo: 0, data: state });
    });
  }

  private toMeta(row: typeof archives.$inferSelect): ArchiveMeta {
    return {
      id: row.id, deviceId: row.deviceId, slot: row.slot,
      daoFruitCode: row.daoFruitCode, status: row.status,
      seed: Number(row.seed), createdAt: row.createdAt.getTime(),
    };
  }

  async listArchives(deviceId: string): Promise<ArchiveMeta[]> {
    const rows = await this.db.select().from(archives).where(eq(archives.deviceId, deviceId)).orderBy(asc(archives.slot));
    return rows.map((r) => this.toMeta(r));
  }

  async findArchiveByCode(code: string): Promise<ArchiveMeta | null> {
    const rows = await this.db.select().from(archives).where(eq(archives.daoFruitCode, code.replace("-", ""))).limit(1);
    return rows[0] ? this.toMeta(rows[0]) : null;
  }

  async findArchive(id: string): Promise<ArchiveMeta | null> {
    const rows = await this.db.select().from(archives).where(eq(archives.id, id)).limit(1);
    return rows[0] ? this.toMeta(rows[0]) : null;
  }

  async rebindArchive(id: string, deviceId: string, slot: number): Promise<void> {
    await this.db.insert(devices).values({ id: deviceId }).onConflictDoNothing();
    await this.db.update(archives).set({ deviceId, slot, updatedAt: new Date() }).where(eq(archives.id, id));
  }

  async getPlayerState(archiveId: string): Promise<PlayerState | null> {
    const rows = await this.db.select().from(playerStates).where(eq(playerStates.archiveId, archiveId)).limit(1);
    return (rows[0]?.data as PlayerState) ?? null;
  }

  async savePlayerState(archiveId: string, state: PlayerState): Promise<void> {
    await this.db.update(playerStates)
      .set({ turnNo: state.turnNo, data: state, updatedAt: new Date() })
      .where(eq(playerStates.archiveId, archiveId));
  }

  async getCompass(archiveId: string, turnNo: number): Promise<CompassOption[] | null> {
    const rows = await this.db.select().from(compassOptions)
      .where(and(eq(compassOptions.archiveId, archiveId), eq(compassOptions.turnNo, turnNo)))
      .orderBy(asc(compassOptions.idx));
    if (rows.length === 0) return null;
    return rows.map((r) => ({
      idx: r.idx, kind: r.kind as CompassOption["kind"], label: r.label,
      payload: r.payload as Record<string, unknown>,
      riskFlag: r.riskFlag, destinyFlag: r.destinyFlag,
      freshnessMonths: 0, freshnessExpireTurn: r.freshnessExpireTurn,
    }));
  }

  async saveCompass(archiveId: string, turnNo: number, options: CompassOption[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.delete(compassOptions)
        .where(and(eq(compassOptions.archiveId, archiveId), eq(compassOptions.turnNo, turnNo)));
      if (options.length > 0) {
        await tx.insert(compassOptions).values(options.map((o) => ({
          archiveId, turnNo, idx: o.idx, kind: o.kind, label: o.label, payload: o.payload,
          riskFlag: o.riskFlag ?? false, destinyFlag: o.destinyFlag ?? false,
          freshnessExpireTurn: turnNo + o.freshnessMonths,
        })));
      }
    });
  }

  async getTurnRecord(archiveId: string, turnNo: number): Promise<TurnRecord | null> {
    const rows = await this.db.select().from(turnRecords)
      .where(and(eq(turnRecords.archiveId, archiveId), eq(turnRecords.turnNo, turnNo))).limit(1);
    const r = rows[0];
    if (!r) return null;
    return {
      archiveId: r.archiveId, turnNo: r.turnNo, seed: Number(r.seed),
      actionKind: r.actionKind, actionInput: r.actionInput,
      engineDelta: r.engineDelta, narrative: r.narrative, modelMeta: r.modelMeta,
    };
  }

  async appendTurnRecord(record: TurnRecord): Promise<void> {
    await this.db.insert(turnRecords).values({
      archiveId: record.archiveId, turnNo: record.turnNo, seed: record.seed,
      actionKind: record.actionKind, actionInput: record.actionInput as object,
      engineDelta: record.engineDelta as object, narrative: record.narrative,
      modelMeta: record.modelMeta as object | null,
    });
  }

  async listTurnRecords(archiveId: string, limit = 100): Promise<TurnRecord[]> {
    const rows = await this.pool.query<{
      archive_id: string; turn_no: number; seed: string; action_kind: string;
      action_input: unknown; engine_delta: unknown; narrative: string; model_meta: unknown;
    }>(
      "SELECT archive_id, turn_no, seed, action_kind, action_input, engine_delta, narrative, model_meta FROM turn_records WHERE archive_id = $1 ORDER BY turn_no DESC LIMIT $2",
      [archiveId, limit]);
    return rows.rows.map((r) => ({
      archiveId: r.archive_id, turnNo: r.turn_no, seed: Number(r.seed),
      actionKind: r.action_kind, actionInput: r.action_input,
      engineDelta: r.engine_delta, narrative: r.narrative, modelMeta: r.model_meta,
    }));
  }

  async getInventory(archiveId: string): Promise<InventoryItem[]> {
    const res = await this.pool.query<{ item_key: string; name: string; category: string; qty: number }>(
      "SELECT item_key, name, category, qty FROM inventory_items WHERE archive_id = $1 ORDER BY acquired_turn DESC", [archiveId]);
    return res.rows.map((r) => ({ key: r.item_key, name: r.name, category: r.category, qty: r.qty, acquiredTurn: 0 }));
  }

  async addItem(archiveId: string, item: Omit<InventoryItem, "acquiredTurn">, turnNo: number): Promise<void> {
    const updated = await this.pool.query(
      "UPDATE inventory_items SET qty = qty + $3 WHERE archive_id = $1 AND item_key = $2",
      [archiveId, item.key, item.qty]);
    if (updated.rowCount === 0) {
      await this.pool.query(
        `INSERT INTO inventory_items (archive_id, item_key, name, category, qty, acquired_turn)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [archiveId, item.key, item.name, item.category, item.qty, turnNo]);
    }
  }

  async spendCurrency(archiveId: string, amount: number): Promise<boolean> {
    const state = await this.getPlayerState(archiveId);
    const balance = state?.currencies.low ?? 0;
    if (!state || balance < amount) return false;
    state.currencies = { ...state.currencies, low: balance - amount };
    await this.savePlayerState(archiveId, state);
    return true;
  }

  private async snapshot<T>(archiveId: string, column: "npcs" | "relations" | "destiny" | "karma"): Promise<T[]> {
    const res = await this.pool.query(
      `SELECT ${column} FROM world_snapshots WHERE archive_id = $1`, [archiveId]);
    const row = res.rows[0] as Record<string, unknown> | undefined;
    return ((row?.[column] as T[]) ?? []);
  }

  private async upsertSnapshot(archiveId: string, column: "npcs" | "relations" | "destiny" | "karma", value: unknown): Promise<void> {
    await this.pool.query(
      `INSERT INTO world_snapshots (archive_id, ${column}) VALUES ($1, $2)
       ON CONFLICT (archive_id) DO UPDATE SET ${column} = $2`,
      [archiveId, JSON.stringify(value)]);
  }

  async getNpcs(archiveId: string): Promise<NpcProfile[]> {
    return this.snapshot<NpcProfile>(archiveId, "npcs");
  }

  async saveNpcs(archiveId: string, npcs: NpcProfile[]): Promise<void> {
    await this.upsertSnapshot(archiveId, "npcs", npcs);
  }

  async getRelations(archiveId: string): Promise<StoredRelation[]> {
    return this.snapshot<StoredRelation>(archiveId, "relations");
  }

  async saveRelations(archiveId: string, relations: StoredRelation[]): Promise<void> {
    await this.upsertSnapshot(archiveId, "relations", relations);
  }

  async getDestiny(archiveId: string): Promise<DestinyProgress | null> {
    const res = await this.pool.query<{ destiny: unknown }>(
      "SELECT destiny FROM world_snapshots WHERE archive_id = $1", [archiveId]);
    return (res.rows[0]?.destiny as DestinyProgress) ?? null;
  }

  async saveDestiny(archiveId: string, destiny: DestinyProgress): Promise<void> {
    await this.upsertSnapshot(archiveId, "destiny", destiny);
  }

  async updateArchiveStatus(archiveId: string, status: string): Promise<void> {
    await this.db.update(archives).set({ status, updatedAt: new Date() }).where(eq(archives.id, archiveId));
  }

  async getKarmaEvents(archiveId: string): Promise<StoredKarmaEvent[]> {
    return this.snapshot<StoredKarmaEvent>(archiveId, "karma");
  }

  async saveKarmaEvents(archiveId: string, events: StoredKarmaEvent[]): Promise<void> {
    await this.upsertSnapshot(archiveId, "karma", events);
  }
}
