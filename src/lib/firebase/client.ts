import { getApp, getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const clientConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function requireClientEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required Firebase client env var: ${name}`);
  }

  return value;
}

requireClientEnv("NEXT_PUBLIC_FIREBASE_API_KEY", clientConfig.apiKey);
requireClientEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", clientConfig.authDomain);
requireClientEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", clientConfig.projectId);
requireClientEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", clientConfig.storageBucket);
requireClientEnv(
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  clientConfig.messagingSenderId,
);
requireClientEnv("NEXT_PUBLIC_FIREBASE_APP_ID", clientConfig.appId);

const app = getApps().length ? getApp() : initializeApp(clientConfig);

export const db = getFirestore(app);
