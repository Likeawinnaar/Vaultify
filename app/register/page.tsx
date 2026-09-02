import AuthForm from "@/components/auth-form";
import { boolSetting, databaseConfigured, getSetting } from "@/lib/db";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  if (!databaseConfigured()) redirect("/system");
  if (!(await boolSetting("public_registration", true))) redirect("/login");
  const site = await getSetting("website_name", "Vaultify");
  return <main className="min-h-screen grid place-items-center p-6"><div className="w-full max-w-md"><div className="card p-7"><div className="eyebrow">Create your vault</div><h1 className="mt-2 text-2xl font-extrabold tracking-tight">Join {site}.</h1><p className="mt-2 text-sm text-slate-500">Your personal storage, on your server.</p><AuthForm mode="register" /></div></div></main>;
}
