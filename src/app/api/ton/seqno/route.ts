import { NextRequest, NextResponse } from "next/server";

import { requireEnv } from "@/lib/server/env";

export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<Response> {
  const address = request.nextUrl.searchParams.get("address")?.trim();
  if (!address) {
    return NextResponse.json({ error: "address is required" }, { status: 400 });
  }

  try {
    const apiKey = requireEnv("TONAPI_KEY");
    const response = await fetch(
      `https://tonapi.io/v2/blockchain/accounts/${encodeURIComponent(address)}/methods/seqno`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
    );

    if (!response.ok) {
      // Uninitialized wallet has no seqno method — seqno is 0
      if (response.status === 404) return NextResponse.json({ seqno: 0 });
      throw new Error(`TonAPI seqno failed: ${response.status}`);
    }

    const data = await response.json() as { decoded?: { state?: number } };
    const seqno = data.decoded?.state ?? 0;
    return NextResponse.json({ seqno });
  } catch (error) {
    console.error("[TON seqno] Failed:", error);
    return NextResponse.json({ error: "Failed to fetch seqno" }, { status: 500 });
  }
}
