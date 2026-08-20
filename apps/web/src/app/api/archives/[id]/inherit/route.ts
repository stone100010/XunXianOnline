import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateDeviceId } from "@/server/device.js";
import { storeReady } from "@/server/store.js";
import { inherit } from "@/server/services/inheritService.js";
import { ServiceError } from "@/server/services/archiveService.js";

const Schema = z.object({ heirName: z.string().min(1).max(12) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const deviceId = await getOrCreateDeviceId();
    await storeReady;
    const { id } = await params;
    const { heirName } = Schema.parse(await req.json());
    return NextResponse.json(await inherit(id, deviceId, { heirName }));
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: { code: 400, message: "继承者姓名须为 1-12 字" } }, { status: 400 });
    if (e instanceof ServiceError) return NextResponse.json({ error: { code: e.status, message: e.message } }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: { code: 500, message: "服务器内部错误" } }, { status: 500 });
  }
}
