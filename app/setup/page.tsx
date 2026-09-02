import { getCurrentUser } from "@/lib/auth";
import { databaseConfigured, getSetting } from "@/lib/db";
import { blobStorageConfigured } from "@/lib/storage";
import SetupForm from "@/components/setup-form";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  if (!databaseConfigured()) redirect("/system");
  const configured = (await getSetting("configured", "false")) === "true";
  if (configured) {
    const current = await getCurrentUser();
    redirect(current ? "/dashboard" : "/login");
  }
  const blobReady = blobStorageConfigured();

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="w-full max-w-lg">
        <div className="mb-8"><h1 className="text-xl font-extrabold tracking-tight">Vaultify</h1><p className="text-[10px] uppercase tracking-[.2em] text-slate-400">private storage</p></div>
        <div className="card p-7">
          {!blobReady && process.env.VERCEL && <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>File storage not connected yet.</strong> Accounts can be configured, but uploads remain disabled until a Private Vercel Blob store is connected.</div>}
          <div className="eyebrow">First-run setup</div>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight">Set up your secure vault.</h2>
          <p className="mt-2 text-sm text-slate-500">Create the protected Primary Administrator. After setup succeeds, this route is permanently blocked server-side.</p>
          <SetupForm />
        </div>
        <p className="mt-6 text-center text-xs text-slate-400">AES-256-GCM encrypted at rest</p>
      </div>
    </main>
  );
}
