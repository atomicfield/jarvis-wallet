import { NextRequest, NextResponse } from "next/server";

import { requireEnv } from "@/lib/server/env";

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<Response> {
  let boc: string;
  try {
    const body = await request.json() as { boc?: string };
    boc = body.boc?.trim() ?? "";
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!boc) {
    return NextResponse.json({ error: "boc is required" }, { status: 400 });
  }

  try {
    const apiKey = requireEnv("TONAPI_KEY");
    const response = await fetch("https://tonapi.io/v2/blockchain/message", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ boc }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({})) as { error?: string };
      console.error("[TON broadcast] TonAPI error:", response.status, data);
      return NextResponse.json(
        { error: data.error ?? `Broadcast failed (${response.status})` },
        { status: response.status },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[TON broadcast] Failed:", error);
    return NextResponse.json({ error: "Broadcast failed" }, { status: 500 });
  }
}
