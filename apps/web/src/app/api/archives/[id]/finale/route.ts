import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateDeviceId } from "@/server/device.js";
import { storeReady } from "@/server/store.js";
import { finale } from "@/server/services/finaleService.js";
import { ServiceError } from "@/server/services/archiveService.js";

const FinaleSchema = z.object({ title: z.string().min(2).max(8) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const deviceId = await getOrCreateDeviceId();
    await storeReady;
    const { id } = await params;
    const { title } = FinaleSchema.parse(await req.json());
    return NextResponse.json(await finale(id, deviceId, { title }));
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: { code: 400, message: "封号须为 2-8 字" } }, { status: 400 });
    if (e instanceof ServiceError) return NextResponse.json({ error: { code: e.status, message: e.message } }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: { code: 500, message: "服务器内部错误" } }, { status: 500 });
  }
}
