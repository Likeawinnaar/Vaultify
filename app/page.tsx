import { redirect } from "next/navigation";
import { getSetting } from "@/lib/db";
export default function Home() { const configured = getSetting("configured", "false") === "true"; redirect(configured ? "/files" : "/setup"); }

