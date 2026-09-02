import AuthForm from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth";
import { boolSetting, databaseConfigured, getSetting } from "@/lib/db";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  if (!databaseConfigured()) redirect("/system");
  if ((await getSetting("configured", "false")) !== "true") redirect("/setup");
  const current = await getCurrentUser();
  if (current) redirect("/dashboard");
  if (!(await boolSetting("public_registration", true))) redirect("/login");
  const site = await getSetting("website_name", "Vaultify");
  return <main className="min-h-screen grid place-items-center p-6"><div className="w-full max-w-md"><div className="card p-7"><div className="eyebrow">Create your vault</div><h1 className="mt-2 text-2xl font-extrabold tracking-tight">Join {site}.</h1><p className="mt-2 text-sm text-slate-500">Your personal encrypted storage.</p><AuthForm mode="register" /></div><p className="mt-5 text-center text-sm text-slate-500">Already have an account? <a className="font-semibold text-vault underline" href="/login">Sign in</a></p></div></main>;
}
