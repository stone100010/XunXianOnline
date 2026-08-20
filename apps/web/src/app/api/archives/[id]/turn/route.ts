import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateDeviceId } from "@/server/device.js";
import { storeReady } from "@/server/store.js";
import { getTurnView } from "@/server/services/turnService.js";
import { ServiceError } from "@/server/services/archiveService.js";

function fail(e: unknown) {
  if (e instanceof ServiceError) return NextResponse.json({ error: { code: e.status, message: e.message } }, { status: e.status });
  console.error(e);
  return NextResponse.json({ error: { code: 500, message: "服务器内部错误" } }, { status: 500 });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const deviceId = await getOrCreateDeviceId();
    await storeReady;
    const { id } = await params;
    return NextResponse.json(await getTurnView(id, deviceId));
  } catch (e) {
    return fail(e);
  }
}
