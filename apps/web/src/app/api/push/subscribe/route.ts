import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateDeviceId } from "@/server/device.js";
import { storeReady } from "@/server/store.js";
import { saveSubscription } from "@/server/push.js";

const Schema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

export async function POST(req: Request) {
  try {
    await getOrCreateDeviceId();
    await storeReady;
    const sub = Schema.parse(await req.json());
    await saveSubscription(sub);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: { code: 400, message: "订阅格式非法" } }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: { code: 500, message: "订阅失败" } }, { status: 500 });
  }
}
