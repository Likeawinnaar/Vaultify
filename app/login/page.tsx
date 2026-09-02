import AuthForm from "@/components/auth-form";
import SiteLogo from "@/components/site-logo";
import { databaseConfigured, getSetting } from "@/lib/db";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (!databaseConfigured()) redirect("/system");
  const site = await getSetting("website_name", "Vaultify");
  const logo = await getSetting("logo_url", "");
  return <main className="min-h-screen grid place-items-center p-6"><div className="w-full max-w-md"><div className="mb-8 flex items-center gap-3"><SiteLogo src={logo} site={site} className="h-10 w-10"/><div><h1 className="text-xl font-extrabold tracking-tight">{site}</h1><p className="text-[10px] uppercase tracking-[.2em] text-slate-400">private storage</p></div></div><div className="card p-7"><div className="eyebrow">Welcome back</div><h2 className="mt-2 text-2xl font-extrabold tracking-tight">Sign in to your vault.</h2><AuthForm mode="login" /></div><p className="mt-6 text-center text-xs text-slate-400">Your files are private and encrypted at rest.</p></div></main>;
}
