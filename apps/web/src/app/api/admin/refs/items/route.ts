import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, isValidSession } from "@/server/services/adminService.js";
import { deleteItem, listItems, seedBaseline, upsertItem } from "@/server/services/refItemsService.js";
import { ServiceError } from "@/server/services/archiveService.js";

const UpsertSchema = z.object({
  key: z.string().min(1).max(64),
  name: z.string().min(1).max(64),
  category: z.enum(["dan", "qi", "fu", "zhen", "caiyao", "gongfa", "qingbao"]),
  price: z.number().int().min(0),
  grade: z.number().int().min(0).max(10),
  desc: z.string().max(200).optional(),
  enabled: z.boolean().optional(),
});

async function guard() {
  const jar = await cookies();
  return isValidSession(jar.get(ADMIN_COOKIE)?.value);
}

function fail(e: unknown) {
  if (e instanceof z.ZodError) return NextResponse.json({ error: { code: 400, message: "参数校验失败" } }, { status: 400 });
  if (e instanceof ServiceError) return NextResponse.json({ error: { code: e.status, message: e.message } }, { status: e.status });
  console.error(e);
  return NextResponse.json({ error: { code: 500, message: "服务器内部错误" } }, { status: 500 });
}

export async function GET() {
  if (!(await guard())) return NextResponse.json({ error: { code: 401, message: "未登录" } }, { status: 401 });
  try {
    const seeded = await seedBaseline();
    return NextResponse.json({ items: await listItems(), seeded });
  } catch (e) { return fail(e); }
}

export async function POST(req: Request) {
  if (!(await guard())) return NextResponse.json({ error: { code: 401, message: "未登录" } }, { status: 401 });
  try {
    await upsertItem(UpsertSchema.parse(await req.json()));
    return NextResponse.json({ ok: true });
  } catch (e) { return fail(e); }
}

export async function DELETE(req: Request) {
  if (!(await guard())) return NextResponse.json({ error: { code: 401, message: "未登录" } }, { status: 401 });
  try {
    const { key } = z.object({ key: z.string().min(1) }).parse(await req.json());
    await deleteItem(key);
    return NextResponse.json({ ok: true });
  } catch (e) { return fail(e); }
}
