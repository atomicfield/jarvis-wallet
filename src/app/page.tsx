export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 font-sans dark:bg-black">
      <main className="w-full max-w-3xl rounded-2xl bg-white p-10 shadow-sm dark:bg-zinc-950">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Jarvis Wallet
        </h1>
        <p className="mt-4 text-zinc-600 dark:text-zinc-300">
          Next.js app scaffolded for Telegram managed bots, voice-first DeFi flows,
          and Firebase-backed persistence.
        </p>
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
          Start by adding Firebase credentials in <code>.env.local</code> using{" "}
          <code>.env.example</code> as reference.
        </p>
      </main>
    </div>
  );
}
