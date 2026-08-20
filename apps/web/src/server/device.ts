// 设备身份：httpOnly cookie 携带匿名设备 ID（docs/07 鉴权约定）
import { cookies } from "next/headers";

const COOKIE = "xunxian_did";

export async function getOrCreateDeviceId(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(COOKIE)?.value;
  if (existing?.startsWith("dev_")) return existing;
  const id = `dev_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
  jar.set(COOKIE, id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  return id;
}
