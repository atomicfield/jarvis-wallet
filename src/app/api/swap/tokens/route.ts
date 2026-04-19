import { NextResponse } from "next/server";

import { getSwapTokenCatalog } from "@/lib/defi/omniston-token-catalog";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  try {
    const catalog = await getSwapTokenCatalog();
    return NextResponse.json({ tokens: catalog.tokens });
  } catch (error) {
    console.error("[SwapTokens] Failed to list swap tokens:", error);
    return NextResponse.json(
      { error: "Could not load swap tokens right now." },
      { status: 500 },
    );
  }
}
