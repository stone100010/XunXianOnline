// Drizzle schema（docs/03 数据模型设计）—— 首版核心表
import {
  bigint, boolean, index, integer, jsonb, pgTable, text, timestamp,
  uniqueIndex, uuid, varchar,
} from "drizzle-orm/pg-core";

// ── 设备（匿名身份）──
export const devices = pgTable("devices", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── 存档（一个仙途）──
export const archives = pgTable(
  "archives",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    deviceId: uuid("device_id").notNull().references(() => devices.id),
    slot: integer("slot").notNull(),
    daoFruitCode: varchar("dao_fruit_code", { length: 9 }).notNull(),
    status: varchar("status", { length: 24 }).notNull().default("active"), // active/ended_*
    seed: bigint("seed", { mode: "number" }).notNull(),
    settingsVersion: integer("settings_version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("archives_code_idx").on(t.daoFruitCode)],
);

// ── 玩家核心状态（热点行，乐观锁 turnNo）──
export const playerStates = pgTable("player_states", {
  archiveId: uuid("archive_id").primaryKey().references(() => archives.id),
  turnNo: integer("turn_no").notNull().default(0),
  data: jsonb("data").notNull(), // PlayerState（shared schema 校验）
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── 决策罗盘（每回合 15 选项）──
export const compassOptions = pgTable(
  "compass_options",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    archiveId: uuid("archive_id").notNull().references(() => archives.id),
    turnNo: integer("turn_no").notNull(),
    idx: integer("idx").notNull(),
    kind: varchar("kind", { length: 16 }).notNull(),
    label: text("label").notNull(),
    payload: jsonb("payload").notNull(),
    riskFlag: boolean("risk_flag").notNull().default(false),
    destinyFlag: boolean("destiny_flag").notNull().default(false),
    freshnessExpireTurn: integer("freshness_expire_turn").notNull(),
    isSelected: boolean("is_selected").notNull().default(false),
  },
  (t) => [index("compass_archive_turn_idx").on(t.archiveId, t.turnNo)],
);

// ── 回合历史（只追加，防 SL 核心）──
export const turnRecords = pgTable(
  "turn_records",
  {
    archiveId: uuid("archive_id").notNull().references(() => archives.id),
    turnNo: integer("turn_no").notNull(),
    seed: bigint("seed", { mode: "number" }).notNull(),
    actionKind: varchar("action_kind", { length: 32 }).notNull(),
    actionInput: jsonb("action_input").notNull(),
    engineDelta: jsonb("engine_delta").notNull(),
    narrative: text("narrative").notNull(),
    modelMeta: jsonb("model_meta"), // {provider, model, tokens, degraded}
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("turn_records_pk").on(t.archiveId, t.turnNo)],
);
