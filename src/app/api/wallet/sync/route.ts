import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

/**
 * Persists a wallet address against the authenticated user's Firestore doc.
 * Called once when the client generates or loads a wallet, so the Telegram
 * bot webhook can look up the address for tool calls.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("firebaseAuthToken")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 },
      );
    }

    const decodedToken = await getAdminAuth().verifyIdToken(token);
    const uid = decodedToken.uid;

    const body = (await request.json()) as { walletAddress?: string };
    const { walletAddress } = body;

    if (!walletAddress || typeof walletAddress !== "string") {
      return NextResponse.json(
        { error: "walletAddress is required" },
        { status: 400 },
      );
    }

    const db = getAdminDb();
    await db.collection("users").doc(uid).set(
      { walletAddress },
      { merge: true },
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[WalletSync] Failed to persist wallet address:", error);
    return NextResponse.json(
      { error: "Failed to persist wallet address" },
      { status: 500 },
    );
  }
}
