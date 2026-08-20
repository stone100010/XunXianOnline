import { NextResponse } from "next/server";
import { pushConfigured } from "@/server/push.js";

export async function GET() {
  return NextResponse.json({
    publicKey: process.env.VAPID_PUBLIC_KEY ?? null,
    configured: pushConfigured(),
  });
}
