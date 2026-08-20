import { NextResponse } from "next/server";
import { REALMS } from "@xunxian/engine";
import { START_PACKS, STORYLINE_SEEDS } from "@xunxian/content";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "xunxian-online",
    realms: REALMS.length,
    startPacks: START_PACKS.length,
    storylines: STORYLINE_SEEDS.length,
  });
}
