// Web Push（docs/10 二期项）：VAPID 配置 + 订阅存储（PG）+ 广播发送
import webpush from "web-push";
import { holder } from "./store.js";

export interface PushSubscriptionRow {
  endpoint: string;
  p256dh: string;
  auth: string;
  createdAt: number;
}

let configured = false;

export function pushConfigured(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

function ensureConfig(): boolean {
  if (configured) return true;
  if (!pushConfigured()) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:dev@xunxian.local",
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  configured = true;
  return true;
}

async function table(): Promise<{ pool?: import("pg").Pool }> {
  const impl = holder.impl as unknown as { pool?: import("pg").Pool };
  if (impl.pool) {
    await impl.pool.query(`CREATE TABLE IF NOT EXISTS push_subscriptions (
      endpoint TEXT PRIMARY KEY,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now())`);
  }
  return impl;
}

export async function saveSubscription(sub: { endpoint: string; keys: { p256dh: string; auth: string } }): Promise<void> {
  const { pool } = await table();
  if (pool) {
    await pool.query(
      `INSERT INTO push_subscriptions (endpoint, p256dh, auth) VALUES ($1,$2,$3)
       ON CONFLICT (endpoint) DO UPDATE SET p256dh = $2, auth = $3`,
      [sub.endpoint, sub.keys.p256dh, sub.keys.auth]);
  }
}

export async function listSubscriptions(): Promise<PushSubscriptionRow[]> {
  const { pool } = await table();
  if (!pool) return [];
  const res = await pool.query("SELECT endpoint, p256dh, auth, created_at FROM push_subscriptions");
  return res.rows.map((r) => ({ endpoint: r.endpoint, p256dh: r.p256dh, auth: r.auth, createdAt: new Date(r.created_at).getTime() }));
}

/** 广播通知；返回 {sent, failed}（失败订阅自动清理） */
export async function broadcast(payload: { title: string; body: string; tag?: string }): Promise<{ sent: number; failed: number; configured: boolean }> {
  if (!ensureConfig()) return { sent: 0, failed: 0, configured: false };
  const subs = await listSubscriptions();
  let sent = 0, failed = 0;
  const { pool } = await table();
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload),
      );
      sent++;
    } catch {
      failed++;
      if (pool) await pool.query("DELETE FROM push_subscriptions WHERE endpoint = $1", [s.endpoint]);
    }
  }
  return { sent, failed, configured: true };
}

/** 供管理后台提示：生成 VAPID 密钥对 */
export function generateVapidKeys(): { publicKey: string; privateKey: string } {
  return webpush.generateVAPIDKeys();
}

