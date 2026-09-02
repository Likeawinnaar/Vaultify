export const dynamic = "force-dynamic";

export default function SystemSetupPage() {
  return (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="card w-full max-w-2xl p-8">
        <div className="eyebrow">Server configuration required</div>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Connect persistent storage to Vaultify.</h1>
        <p className="mt-4 text-sm leading-6 text-slate-600">This Vercel deployment does not have a persistent database connected. Vaultify deliberately refuses to store accounts in temporary serverless disk storage because registrations, passwords and sessions could disappear after a cold start.</p>
        <div className="mt-6 space-y-4 text-sm text-slate-700">
          <div className="rounded-xl border border-slate-200 p-4"><strong>1. Database</strong><p className="mt-1">Connect a Turso/libSQL database to the Vercel project and provide <code>TURSO_DATABASE_URL</code> and <code>TURSO_AUTH_TOKEN</code>.</p></div>
          <div className="rounded-xl border border-slate-200 p-4"><strong>2. Encrypted files</strong><p className="mt-1">Connect a Private Vercel Blob store. Vercel adds <code>BLOB_READ_WRITE_TOKEN</code> automatically.</p></div>
          <div className="rounded-xl border border-slate-200 p-4"><strong>3. Encryption</strong><p className="mt-1">Set a secure 32-byte base64 <code>VAULTIFY_MASTER_KEY</code>. Never expose or commit this value.</p></div>
        </div>
        <p className="mt-6 text-xs text-slate-500">After the environment variables are connected, redeploy Vaultify and the first-run setup will open automatically.</p>
      </div>
    </main>
  );
}
