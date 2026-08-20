import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateDeviceId } from "@/server/device.js";
import { submitAction } from "@/server/services/turnService.js";
import { ServiceError } from "@/server/services/archiveService.js";

const ActionSchema = z.object({
  turnNo: z.number().int().min(0),
  optionIdx: z.number().int().min(1).max(15).optional(),
  freeform: z.string().min(2).max(200).optional(),
}).refine((v) => v.optionIdx !== undefined || v.freeform !== undefined, { message: "需提供 optionIdx 或 freeform" });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const deviceId = await getOrCreateDeviceId();
    const { id } = await params;
    const body = ActionSchema.parse(await req.json());
    return NextResponse.json(await submitAction(id, deviceId, body.turnNo, body));
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: { code: 400, message: "参数校验失败" } }, { status: 400 });
    if (e instanceof ServiceError) return NextResponse.json({ error: { code: e.status, message: e.message } }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: { code: 500, message: "服务器内部错误" } }, { status: 500 });
  }
}
