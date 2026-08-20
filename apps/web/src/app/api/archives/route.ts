import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateDeviceId } from "@/server/device.js";
import { store } from "@/server/store.js";
import { createArchive, restoreArchive, ServiceError } from "@/server/services/archiveService.js";

const CreateSchema = z.object({
  slot: z.number().int().min(1).max(9),
  name: z.string().min(1).max(12),
  gender: z.enum(["male", "female"]),
  race: z.enum(["human", "yao", "ling"]),
  age: z.number().int().min(16).max(99),
  domain: z.enum(["zhongzhou", "donghuang", "nanming", "xiji", "beiming", "lingnan", "haiwai"]),
  packKey: z.string().min(1),
  daoRhymeKey: z.string().min(1),
});

const RestoreSchema = z.object({ code: z.string().min(1), slot: z.number().int().min(1).max(9).optional() });

function fail(e: unknown) {
  if (e instanceof ServiceError) return NextResponse.json({ error: { code: e.status, message: e.message } }, { status: e.status });
  console.error(e);
  return NextResponse.json({ error: { code: 500, message: "服务器内部错误" } }, { status: 500 });
}

export async function GET() {
  const deviceId = await getOrCreateDeviceId();
  const archives = await store.listArchives(deviceId);
  const states = await Promise.all(
    archives.map(async (a) => ({ ...a, state: await store.getPlayerState(a.id) })),
  );
  return NextResponse.json({ archives: states });
}

export async function POST(req: Request) {
  try {
    const deviceId = await getOrCreateDeviceId();
    const { slot, ...character } = CreateSchema.parse(await req.json());
    const meta = await createArchive(deviceId, slot, character);
    return NextResponse.json({ archive: meta });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: { code: 400, message: "参数校验失败", details: e.issues } }, { status: 400 });
    }
    return fail(e);
  }
}

export async function PUT(req: Request) {
  try {
    const deviceId = await getOrCreateDeviceId();
    const { code, slot } = RestoreSchema.parse(await req.json());
    const meta = await restoreArchive(deviceId, code, slot ?? 0);
    return NextResponse.json({ archive: meta });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: { code: 400, message: "参数校验失败" } }, { status: 400 });
    }
    return fail(e);
  }
}
