import { getSetting } from "@/lib/db";
import SetupForm from "@/components/setup-form";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export default function SetupPage() { if (getSetting("configured", "false") === "true") redirect("/login"); return <main className="min-h-screen grid place-items-center p-6"><div className="w-full max-w-lg"><div className="mb-8"><h1 className="text-xl font-extrabold tracking-tight">Vaultify</h1><p className="text-[10px] uppercase tracking-[.2em] text-slate-400">private storage</p></div><div className="card p-7"><div className="eyebrow">First-run setup</div><h2 className="mt-2 text-2xl font-extrabold tracking-tight">Set up your secure vault.</h2><p className="mt-2 text-sm text-slate-500">Create the protected Primary Administrator. This wizard is disabled permanently after setup.</p><SetupForm /></div><p className="mt-6 text-center text-xs text-slate-400">AES-256-GCM encrypted at rest</p></div></main>; }
