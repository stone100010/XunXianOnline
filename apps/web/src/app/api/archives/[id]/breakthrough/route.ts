import { NextResponse } from "next/server";
import { getOrCreateDeviceId } from "@/server/device.js";
import { storeReady } from "@/server/store.js";
import { attempt } from "@/server/services/breakthroughService.js";
import { ServiceError } from "@/server/services/archiveService.js";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const deviceId = await getOrCreateDeviceId();
    await storeReady;
    const { id } = await params;
    return NextResponse.json(await attempt(id, deviceId));
  } catch (e) {
    if (e instanceof ServiceError) return NextResponse.json({ error: { code: e.status, message: e.message } }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: { code: 500, message: "服务器内部错误" } }, { status: 500 });
  }
}
