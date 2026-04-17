// src/app/api/auth/telegram/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import admin from "firebase-admin";

// Firebase Admin SDK'nın yalnızca bir kez başlatıldığından emin olun (Next.js HMR sorunlarını önlemek için)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

function verifyTelegramWebAppData(initData: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) throw new Error("Bot token ayarlanmamış.");

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
  const calculatedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  if (calculatedHash !== hash) {
    throw new Error("Geçersiz Telegram verisi. Doğrulama başarısız.");
  }

  // Veriyi JSON objesine çevir (Örn: user={id:123, first_name:"John"})
  const userDataString = urlParams.get("user");
  if (!userDataString) throw new Error("Kullanıcı verisi bulunamadı.");
  
  return JSON.parse(userDataString);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { initData } = body;

    if (!initData) {
      return NextResponse.json({ error: "initData not found." }, { status: 400 });
    }

    // 1. Telegram verisini doğrula
    const telegramUser = verifyTelegramWebAppData(initData);
    const telegramId = telegramUser.id.toString();

    const db = admin.firestore();
    const userRef = db.collection("users").doc(telegramId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      await userRef.set({
        telegramId: telegramId,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name || null,
        username: telegramUser.username || null,
        languageCode: telegramUser.language_code || "tr",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastLogin: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      await userRef.update({
        lastLogin: admin.firestore.FieldValue.serverTimestamp(),
        ısername: telegramUser.username || null,
        firstName: telegramUser.first_name, 
        username: telegramUser.username || null,
      });
    }
    const customToken = await admin.auth().createCustomToken(telegramId, {
      provider: "telegram",
    });

    return NextResponse.json({ customToken, user: telegramUser });

  } catch (error) {
    console.error("Auth Hatası:", error);
    const errorMessage = error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu.";
    return NextResponse.json({ error: errorMessage }, { status: 401 });
  }
}