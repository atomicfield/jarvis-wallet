import { NextResponse } from "next/server";
import crypto from "crypto";
import { FieldValue } from "firebase-admin/firestore";

import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { requireEnv } from "@/lib/server/env";

function getTelegramBotToken() {
  return (
    process.env.TELEGRAM_MANAGER_BOT_TOKEN ??
    process.env.TELEGRAM_BOT_TOKEN ??
    requireEnv("TELEGRAM_MANAGER_BOT_TOKEN")
  );
}

function verifyTelegramWebAppData(initData: string) {
  const botToken = getTelegramBotToken();

  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get("hash");
  urlParams.delete("hash");

  const dataCheckArr: string[] = [];
  urlParams.forEach((value, key) => {
    dataCheckArr.push(`${key}=${value}`);
  });
  dataCheckArr.sort();
  const dataCheckString = dataCheckArr.join("\n");

  // HMAC-SHA256 ile doğrula
  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const calculatedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  if (!hash) {
    throw new Error("Missing Telegram hash.");
  }

  const hashBuffer = Buffer.from(hash, "hex");
  const calculatedBuffer = Buffer.from(calculatedHash, "hex");

  if (
    hashBuffer.length !== calculatedBuffer.length ||
    !crypto.timingSafeEqual(hashBuffer, calculatedBuffer)
  ) {
    throw new Error("Invalid Telegram init data.");
  }

  const userDataString = urlParams.get("user");
  if (!userDataString) {
    throw new Error("Telegram user payload is missing.");
  }

  return JSON.parse(userDataString) as TelegramWebAppUser;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as { initData?: string };
    const { initData } = body;

    if (!initData) {
      return NextResponse.json({ error: "initData not found." }, { status: 400 });
    }

    const telegramUser = verifyTelegramWebAppData(initData);
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
    console.error("[TelegramAuth] Failed to authenticate Telegram user", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to authenticate Telegram user.";
    return NextResponse.json({ error: errorMessage }, { status: 401 });
  }
}
