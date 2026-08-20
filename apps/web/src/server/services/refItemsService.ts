// RefItemsService：数值表 ref_items 的 CRUD（docs/09 数值管理首版）
// PG 表 + 引擎基线种子导入；坊市货架优先读取本表（热更数值不改代码）
import { BASE_ITEMS } from "@xunxian/engine";
import type { MarketItem } from "@xunxian/engine";
import { holder } from "../store.js";
import { ServiceError } from "./archiveService.js";

const DDL = `CREATE TABLE IF NOT EXISTS ref_items (
  key varchar(64) PRIMARY KEY,
  name varchar(64) NOT NULL,
  category varchar(16) NOT NULL,
  price integer NOT NULL,
  grade integer NOT NULL,
  description text NOT NULL DEFAULT '',
  enabled boolean NOT NULL DEFAULT true,
  version integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now())`;

async function pool(): Promise<import("pg").Pool | null> {
  const impl = holder.impl as unknown as { pool?: import("pg").Pool };
  if (impl.pool) await impl.pool.query(DDL);
  return impl.pool ?? null;
}

/** 初始化：首次导入引擎基线（幂等，仅补缺） */
export async function seedBaseline(): Promise<number> {
  const p = await pool();
  if (!p) return 0;
  let n = 0;
  for (const it of BASE_ITEMS) {
    const r = await p.query("SELECT 1 FROM ref_items WHERE key = $1", [it.key]);
    if (r.rowCount === 0) {
      await p.query(
        `INSERT INTO ref_items (key, name, category, price, grade, description) VALUES ($1,$2,$3,$4,$5,$6)`,
        [it.key, it.name, it.category, it.price, it.grade, it.desc]);
      n++;
    }
  }
  return n;
}

export async function listItems(): Promise<(MarketItem & { enabled: boolean })[]> {
  const p = await pool();
  if (!p) return BASE_ITEMS.map((it) => ({ ...it, enabled: true }));
  await seedBaseline();
  const res = await p.query("SELECT key, name, category, price, grade, description, enabled FROM ref_items ORDER BY key");
  return res.rows.map((r) => ({
    key: r.key, name: r.name, category: r.category, price: r.price,
    grade: r.grade, desc: r.description, enabled: r.enabled,
  }));
}

/** 供坊市使用：启用中的物品（DB 优先，空表回退基线） */
export async function activeItems(): Promise<MarketItem[]> {
  const all = await listItems();
  const active = all.filter((i) => i.enabled);
  return active.length > 0 ? active : BASE_ITEMS;
}

export async function upsertItem(input: {
  key: string; name: string; category: string; price: number; grade: number; desc?: string; enabled?: boolean;
}): Promise<void> {
  const p = await pool();
  if (!p) throw new ServiceError(503, "数值管理需 PostgreSQL（当前内存存储）");
  if (input.price < 0 || input.grade < 0 || input.grade > 10) {
    throw new ServiceError(422, "数值非法（价格≥0，品级 0-10）");
  }
  await p.query(
    `INSERT INTO ref_items (key, name, category, price, grade, description, enabled, version, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7,true),1,now())
     ON CONFLICT (key) DO UPDATE SET
       name=$2, category=$3, price=$4, grade=$5, description=$6, enabled=COALESCE($7, ref_items.enabled),
       version=ref_items.version+1, updated_at=now()`,
    [input.key, input.name, input.category, input.price, input.grade, input.desc ?? "", input.enabled]);
}

export async function deleteItem(key: string): Promise<void> {
  const p = await pool();
  if (!p) throw new ServiceError(503, "数值管理需 PostgreSQL（当前内存存储）");
  await p.query("DELETE FROM ref_items WHERE key = $1", [key]);
}
