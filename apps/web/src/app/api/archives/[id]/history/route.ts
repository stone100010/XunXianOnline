import { NextResponse } from "next/server";
import { getOrCreateDeviceId } from "@/server/device.js";
import { storeReady, store } from "@/server/store.js";
import { ServiceError } from "@/server/services/archiveService.js";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const deviceId = await getOrCreateDeviceId();
    await storeReady;
    const { id } = await params;
    const archive = await store.findArchive(id);
    if (!archive) throw new ServiceError(404, "存档不存在");
    if (archive.deviceId !== deviceId) throw new ServiceError(403, "无权访问该存档");
    const records = await store.listTurnRecords(id, 200);
    return NextResponse.json({
      records: records.map((r) => ({
        turnNo: r.turnNo, actionKind: r.actionKind,
        narrative: r.narrative, delta: r.engineDelta,
      })),
    });
  } catch (e) {
    if (e instanceof ServiceError) return NextResponse.json({ error: { code: e.status, message: e.message } }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: { code: 500, message: "服务器内部错误" } }, { status: 500 });
  }
}
