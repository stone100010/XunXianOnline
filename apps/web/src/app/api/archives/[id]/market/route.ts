import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateDeviceId } from "@/server/device.js";
import { buy, getShelf, listInventory } from "@/server/services/marketService.js";
import { ServiceError } from "@/server/services/archiveService.js";

const TierSchema = z.enum(["zhengshi", "heishi", "miku"]);

function fail(e: unknown) {
  if (e instanceof ServiceError) return NextResponse.json({ error: { code: e.status, message: e.message } }, { status: e.status });
  console.error(e);
  return NextResponse.json({ error: { code: 500, message: "服务器内部错误" } }, { status: 500 });
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const deviceId = await getOrCreateDeviceId();
    const { id } = await params;
    const url = new URL(req.url);
    if (url.searchParams.get("what") === "inventory") {
      return NextResponse.json({ items: await listInventory(id, deviceId) });
    }
    const tier = TierSchema.parse(url.searchParams.get("tier") ?? "zhengshi");
    return NextResponse.json({ shelf: await getShelf(id, deviceId, tier) });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: { code: 400, message: "参数校验失败" } }, { status: 400 });
    return fail(e);
  }
}

const BuySchema = z.object({
  tier: TierSchema,
  itemKey: z.string().min(1),
  bargain: z.boolean().optional(),
  acceptOriginal: z.boolean().optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const deviceId = await getOrCreateDeviceId();
    const { id } = await params;
    const body = BuySchema.parse(await req.json());
    return NextResponse.json(await buy(id, deviceId, body));
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: { code: 400, message: "参数校验失败" } }, { status: 400 });
    return fail(e);
  }
}
