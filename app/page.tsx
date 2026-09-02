import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { databaseConfigured, getSetting } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (!databaseConfigured()) redirect("/system");
  const configured = (await getSetting("configured", "false")) === "true";
  if (!configured) redirect("/setup");
  const user = await getCurrentUser();
  redirect(user ? "/dashboard" : "/login");
}
