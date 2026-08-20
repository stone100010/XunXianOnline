import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, isValidSession } from "@/server/services/adminService.js";
import { broadcast, listSubscriptions, pushConfigured } from "@/server/push.js";

const Schema = z.object({ title: z.string().min(1).max(40), body: z.string().min(1).max(120) });

export async function GET() {
  const jar = await cookies();
  if (!isValidSession(jar.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: { code: 401, message: "未登录" } }, { status: 401 });
  }
  const subs = await listSubscriptions();
  return NextResponse.json({ configured: pushConfigured(), count: subs.length });
}

export async function POST(req: Request) {
  const jar = await cookies();
  if (!isValidSession(jar.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: { code: 401, message: "未登录" } }, { status: 401 });
  }
  const { title, body } = Schema.parse(await req.json());
  const result = await broadcast({ title, body });
  return NextResponse.json(result);
}
