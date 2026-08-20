import { NextResponse } from "next/server";
import { getOrCreateDeviceId } from "@/server/device.js";
import { storeReady, store } from "@/server/store.js";
import { ServiceError } from "@/server/services/archiveService.js";

const TIER_NAMES = ["陌路", "一面之缘", "熟识", "道友", "心腹/道侣"];

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const deviceId = await getOrCreateDeviceId();
    await storeReady;
    const { id } = await params;
    const archive = await store.findArchive(id);
    if (!archive) throw new ServiceError(404, "存档不存在");
    if (archive.deviceId !== deviceId) throw new ServiceError(403, "无权访问该存档");

    const [npcs, relations] = await Promise.all([store.getNpcs(id), store.getRelations(id)]);
    const rows = relations
      .map((r) => {
        const npc = npcs.find((n) => n.id === r.npcId);
        return npc ? {
          npcId: npc.id, name: npc.name, profession: npc.profession,
          realmLevel: npc.realmLevel, traits: npc.traits, goal: npc.goal,
          intimacy: r.intimacy, interactions: r.interactions,
          tier: r.tier, tierName: TIER_NAMES[r.tier],
        } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => b.intimacy - a.intimacy);
    return NextResponse.json({ relations: rows });
  } catch (e) {
    if (e instanceof ServiceError) return NextResponse.json({ error: { code: e.status, message: e.message } }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: { code: 500, message: "服务器内部错误" } }, { status: 500 });
  }
}
