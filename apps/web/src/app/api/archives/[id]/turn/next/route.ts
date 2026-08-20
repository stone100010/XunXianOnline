import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateDeviceId } from "@/server/device.js";
import { storeReady } from "@/server/store.js";
import { nextMonth } from "@/server/services/turnService.js";
import { ServiceError } from "@/server/services/archiveService.js";

const NextSchema = z.object({ turnNo: z.number().int().min(0) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const deviceId = await getOrCreateDeviceId();
    await storeReady;
    const { id } = await params;
    const { turnNo } = NextSchema.parse(await req.json());
    return NextResponse.json(await nextMonth(id, deviceId, turnNo));
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: { code: 400, message: "参数校验失败" } }, { status: 400 });
    if (e instanceof ServiceError) return NextResponse.json({ error: { code: e.status, message: e.message } }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: { code: 500, message: "服务器内部错误" } }, { status: 500 });
  }
}
