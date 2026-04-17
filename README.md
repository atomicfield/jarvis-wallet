# Jarvis Wallet

Voice-first TON DeFi wallet for Telegram managed bots, built with Next.js and deployed on Vercel.

## Stack (current)

- Next.js 16 (App Router, TypeScript, Tailwind CSS)
- Firebase Firestore (`firebase`, `firebase-admin`) for app data
- Planned integrations: Telegram managed bots, STON.fi, Tonstakers, AI agent APIs

## Firebase setup

1. Create a Firebase project.
2. Enable Firestore.
3. Create a Web App and copy client credentials.
4. Create a Service Account and copy Admin SDK credentials.
5. Copy `.env.example` to `.env.local` and fill all values.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Firebase helpers in this repo

- Client SDK: `src/lib/firebase/client.ts`
- Admin SDK (server-only): `src/lib/firebase/admin.ts`
