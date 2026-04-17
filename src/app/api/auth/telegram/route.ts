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
      // .env içindeki \n karakterlerini gerçek satır sonlarına çeviriyoruz
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

// Telegram'dan gelen initData'yı doğrulayan fonksiyon
function verifyTelegramWebAppData(initData: string): any {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) throw new Error("Bot token ayarlanmamış.");

  // URL-encoded veriyi parçala
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get("hash");
  urlParams.delete("hash");

  // Veriyi alfabetik olarak sırala
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
      return NextResponse.json({ error: "initData eksik" }, { status: 400 });
    }

    // 1. Telegram verisini doğrula
    const telegramUser = verifyTelegramWebAppData(initData);
    const telegramId = telegramUser.id.toString(); // Firebase uid string olmalıdır

    // 2. İsteğe bağlı: Firebase tarafında bu kullanıcı için ek kayıt işlemleri yapabilirsiniz 
    // (Örn: Firestore'a kullanıcının adını/soyadını kaydetmek)

    // 3. Firebase Custom Token oluştur
    const customToken = await admin.auth().createCustomToken(telegramId, {
      // Buraya JWT'ye eklemek istediğiniz özel yetkileri/bilgileri yazabilirsiniz
      provider: "telegram",
    });

    // 4. Token'ı istemciye geri gönder
    return NextResponse.json({ customToken, user: telegramUser });

  } catch (error) {
    console.error("Auth Hatası:", error);
    return NextResponse.json({ error: error?.message ||"Bilinmeyen bir hata oluştu." }, { status: 401 });
  }
}