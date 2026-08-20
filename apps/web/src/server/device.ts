// 设备身份：httpOnly cookie 携带匿名设备 ID（docs/07 鉴权约定）
import { cookies } from "next/headers";

const COOKIE = "xunxian_did";

export async function getOrCreateDeviceId(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(COOKIE)?.value;
  // DB devices.id 为 uuid 列，设备 ID 必须是合法 UUID
  if (existing && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(existing)) {
    return existing;
  }
  const id = crypto.randomUUID();
  jar.set(COOKIE, id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  return id;
}
