import { redirect } from "next/navigation";
import { databaseConfigured, getSetting } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (!databaseConfigured()) redirect("/system");
  const configured = (await getSetting("configured", "false")) === "true";
  redirect(configured ? "/files" : "/setup");
}
