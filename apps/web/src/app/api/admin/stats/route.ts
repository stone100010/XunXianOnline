import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, collectStats, isValidSession } from "@/server/services/adminService.js";

export async function GET() {
  const jar = await cookies();
  if (!isValidSession(jar.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: { code: 401, message: "未登录" } }, { status: 401 });
  }
  try {
    return NextResponse.json(await collectStats());
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: { code: 500, message: "统计查询失败" } }, { status: 500 });
  }
}
