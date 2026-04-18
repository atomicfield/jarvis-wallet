import { NextResponse } from "next/server";
import crypto from "crypto";
import { FieldValue } from "firebase-admin/firestore";

import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { requireEnv } from "@/lib/server/env";
import { decryptSecret } from "@/lib/security/sealedSecrets";

function getManagerBotToken(): string {
  return (
    process.env.TELEGRAM_MANAGER_BOT_TOKEN ??
    process.env.TELEGRAM_BOT_TOKEN ??
    requireEnv("TELEGRAM_MANAGER_BOT_TOKEN")
  );
}

function computeInitDataHash(initData: string, botToken: string): string {
  const urlParams = new URLSearchParams(initData);
  urlParams.delete("hash");

  const dataCheckArr: string[] = [];
  urlParams.forEach((value, key) => {
    dataCheckArr.push(`${key}=${value}`);
  });
  dataCheckArr.sort();
  const dataCheckString = dataCheckArr.join("\n");

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  return crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");
}

function constantTimeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "hex");
  const bBuf = Buffer.from(b, "hex");
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

/**
 * Verify Telegram Mini App initData by trying up to two bot tokens:
 *   1. The manager bot token (apps launched directly from the manager bot)
 *   2. If a managedBotId is provided and manager token fails, the managed
 *      bot's decrypted token from Firestore (apps launched from a user's
 *      personal managed bot)
 *
 * This dual-token approach is necessary because Telegram signs initData
 * with whichever bot opened the Mini App.
 */
async function verifyTelegramWebAppData(
  initData: string,
  managedBotId?: string | null,
): Promise<TelegramWebAppUser> {
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get("hash");

  if (!hash) {
    throw new Error("Missing Telegram hash.");
  }

  // Try manager bot token first
  const managerToken = getManagerBotToken();
  const managerHash = computeInitDataHash(initData, managerToken);

  if (constantTimeEqual(hash, managerHash)) {
    return extractUserFromParams(urlParams);
  }

  // If managedBotId supplied, try that bot's token
  if (managedBotId) {
    try {
      const db = getAdminDb();
      const botDoc = await db
        .collection("managedBots")
        .doc(managedBotId)
        .get();
      const encryptedToken = botDoc.get("managedBotTokenEncrypted") as
        | string
        | undefined;

      if (encryptedToken) {
        const managedToken = decryptSecret(encryptedToken);
        const managedHash = computeInitDataHash(initData, managedToken);

        if (constantTimeEqual(hash, managedHash)) {
          return extractUserFromParams(urlParams);
        }
      }
    } catch (err) {
      console.warn(
        "[TelegramAuth] Managed bot token fallback failed:",
        err,
      );
    }
  }

  throw new Error("Invalid Telegram init data.");
}

function extractUserFromParams(
  urlParams: URLSearchParams,
): TelegramWebAppUser {
  const userDataString = urlParams.get("user");
  if (!userDataString) {
    throw new Error("Telegram user payload is missing.");
  }
  return JSON.parse(userDataString) as TelegramWebAppUser;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as {
      initData?: string;
      managedBotId?: string | null;
    };
    const { initData, managedBotId } = body;

    if (!initData) {
      return NextResponse.json(
        { error: "initData not found." },
        { status: 400 },
      );
    }

    const telegramUser = await verifyTelegramWebAppData(
      initData,
      managedBotId,
    );
    const telegramId = telegramUser.id.toString();

    const db = getAdminDb();
    const userRef = db.collection("users").doc(telegramId);
    const userDoc = await userRef.get();
    const userPayload = {
      telegramId,
      firstName: telegramUser.first_name,
      lastName: telegramUser.last_name ?? null,
      username: telegramUser.username ?? null,
      languageCode: telegramUser.language_code ?? "en",
      photoUrl: telegramUser.photo_url ?? null,
      isPremium: telegramUser.is_premium ?? false,
    };

    if (!userDoc.exists) {
      await userRef.set({
        ...userPayload,
        createdAt: FieldValue.serverTimestamp(),
        lastLogin: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      await userRef.update({
        ...userPayload,
        lastLogin: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    const customToken = await getAdminAuth().createCustomToken(telegramId, {
      provider: "telegram",
    });

    return NextResponse.json({ customToken, user: telegramUser });
  } catch (error) {
    console.error(
      "[TelegramAuth] Failed to authenticate Telegram user",
      error,
    );
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to authenticate Telegram user.";
    return NextResponse.json({ error: errorMessage }, { status: 401 });
  }
}
