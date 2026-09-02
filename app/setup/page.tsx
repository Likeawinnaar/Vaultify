import { databaseConfigured, getSetting } from "@/lib/db";
import { blobStorageConfigured } from "@/lib/storage";
import SetupForm from "@/components/setup-form";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  if (!databaseConfigured()) redirect("/system");
  const configured = (await getSetting("configured", "false")) === "true";
  const blobReady = blobStorageConfigured();

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="w-full max-w-lg">
        <div className="mb-8"><h1 className="text-xl font-extrabold tracking-tight">Vaultify</h1><p className="text-[10px] uppercase tracking-[.2em] text-slate-400">private storage</p></div>
        <div className="card p-7">
          {!blobReady && process.env.VERCEL && <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>File storage not connected yet.</strong> Accounts can be configured, but uploads stay disabled until a private Vercel Blob store is connected to this project.</div>}
          {configured ? <><div className="eyebrow">Setup complete</div><h2 className="mt-2 text-2xl font-extrabold tracking-tight">Vaultify is already configured.</h2><p className="mt-2 text-sm text-slate-500">The first-run setup wizard is permanently disabled because a Primary Administrator already exists.</p><a href="/login" className="button green mt-6 inline-block">Go to sign in</a></> : <><div className="eyebrow">First-run setup</div><h2 className="mt-2 text-2xl font-extrabold tracking-tight">Set up your secure vault.</h2><p className="mt-2 text-sm text-slate-500">Create the protected Primary Administrator. This wizard is disabled permanently after setup.</p><SetupForm /></>}
        </div>
        <p className="mt-6 text-center text-xs text-slate-400">AES-256-GCM encrypted at rest</p>
      </div>
    </main>
  );
}
