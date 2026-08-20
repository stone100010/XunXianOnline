// AdminService：管理后台 v0（docs/09）——会话 + 运营统计
import crypto from "node:crypto";
import { holder } from "../store.js";
import { ServiceError } from "./archiveService.js";

const COOKIE = "xunxian_admin";

function adminPassword(): string {
  return process.env.ADMIN_PASSWORD ?? "xunxian-admin";
}

function sessionToken(): string {
  const secret = process.env.ADMIN_SESSION_SECRET ?? "dev-admin-secret";
  return crypto.createHmac("sha256", secret).update(`admin:${adminPassword()}`).digest("hex").slice(0, 32);
}

export function verifyPassword(password: string): string | null {
  if (password !== adminPassword()) return null;
  return sessionToken();
}

export function isValidSession(token: string | undefined): boolean {
  return token === sessionToken();
}

export const ADMIN_COOKIE = COOKIE;

// ── 运营统计（DrizzleStore/PG 直查；内存存储时返回占位）──
export interface AdminStats {
  storage: "postgres" | "memory";
  totals: { archives: number; activeArchives: number; endedArchives: number; turns: number; devices: number };
  llm: { calls: number; degraded: number; byProvider: { provider: string; calls: number }[] };
  recent: { turnNo: number; actionKind: string; degraded: boolean; narrativeHead: string }[];
}

export async function collectStats(): Promise<AdminStats> {
  const impl = holder.impl as unknown as { pool?: import("pg").Pool };
  if (!impl.pool) {
    return {
      storage: "memory",
      totals: { archives: 0, activeArchives: 0, endedArchives: 0, turns: 0, devices: 0 },
      llm: { calls: 0, degraded: 0, byProvider: [] },
      recent: [],
    };
  }
  const pool = impl.pool;
  const q = async <T>(sql: string): Promise<T[]> => (await pool.query(sql)).rows as T[];

  const totalsRow = (await q<{ archives: string; active: string; ended: string; turns: string; devices: string }>(`
    SELECT
      (SELECT count(*) FROM archives) AS archives,
      (SELECT count(*) FROM archives WHERE status = 'active') AS active,
      (SELECT count(*) FROM archives WHERE status <> 'active') AS ended,
      (SELECT count(*) FROM turn_records) AS turns,
      (SELECT count(*) FROM devices) AS devices`))[0];
  const llmRows = await q<{ provider: string; calls: string; degraded: string }>(`
    SELECT COALESCE(model_meta->>'provider','unknown') AS provider,
           count(*) AS calls,
           count(*) FILTER (WHERE (model_meta->>'degraded')::boolean OR model_meta->>'provider' = 'template') AS degraded
    FROM turn_records GROUP BY 1 ORDER BY 2 DESC`);
  const recent = await q<{ turn_no: number; action_kind: string; degraded: boolean; narrative: string }>(`
    SELECT turn_no, action_kind,
           COALESCE((model_meta->>'degraded')::boolean, false) OR model_meta->>'provider' = 'template' AS degraded,
           left(narrative, 60) AS narrative
    FROM turn_records ORDER BY created_at DESC LIMIT 10`);

  return {
    storage: "postgres",
    totals: {
      archives: Number(totalsRow?.archives ?? 0), activeArchives: Number(totalsRow?.active ?? 0),
      endedArchives: Number(totalsRow?.ended ?? 0), turns: Number(totalsRow?.turns ?? 0), devices: Number(totalsRow?.devices ?? 0),
    },
    llm: {
      calls: llmRows.reduce((s, r) => s + Number(r.calls), 0),
      degraded: llmRows.reduce((s, r) => s + Number(r.degraded), 0),
      byProvider: llmRows.map((r) => ({ provider: r.provider, calls: Number(r.calls) })),
    },
    recent: recent.map((r) => ({
      turnNo: r.turn_no, actionKind: r.action_kind, degraded: r.degraded, narrativeHead: r.narrative,
    })),
  };
}
