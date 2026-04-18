import { NextResponse } from "next/server";

import { getStakingInfo } from "@/lib/defi/stake";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  try {
    const overview = await getStakingInfo();
    return NextResponse.json(overview);
  } catch (error) {
    console.error("[StakeOverview] Failed to load staking overview:", error);
    return NextResponse.json(
      { error: "Could not load staking data right now." },
      { status: 500 },
    );
  }
}
