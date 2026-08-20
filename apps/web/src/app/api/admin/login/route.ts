import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifyPassword } from "@/server/services/adminService.js";

const Schema = z.object({ password: z.string().min(1) });

export async function POST(req: Request) {
  const { password } = Schema.parse(await req.json());
  const token = verifyPassword(password);
  if (!token) {
    return NextResponse.json({ error: { code: 401, message: "密码错误" } }, { status: 401 });
  }
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 12 });
  return NextResponse.json({ ok: true });
}
