import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { verifyCsrf } from "@/lib/csrf";
import { settingsSchema } from "@/lib/validation";
import { writeBatch } from "@/lib/db";
import { audit } from "@/lib/audit";
import { clientIp } from "@/lib/security";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!(await verifyCsrf(request))) return NextResponse.json({ error: "Invalid request" }, { status: 403 });
  try {
    const data = settingsSchema.parse(await request.json());
    const values: Array<[string, string]> = [
      ["website_name", data.websiteName],
      ["logo_url", data.logoUrl],
      ["default_quota_bytes", String(data.defaultQuotaBytes)],
      ["max_upload_bytes", String(data.maxUploadBytes)],
      ["public_registration", String(data.publicRegistration)],
      ["allowed_extensions", JSON.stringify([...new Set(data.allowedExtensions)])],
      ["blocked_extensions", JSON.stringify([...new Set(data.blockedExtensions)])],
    ];
    await writeBatch(values.map(([key, value]) => ({
      sql: "INSERT INTO settings(key,value,updated_at) VALUES(?,?,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP",
      args: [key, value],
    })));
    await audit("APPLICATION_SETTINGS_CHANGED", user.id, null, { websiteName: data.websiteName, registration: data.publicRegistration, allowedExtensions: data.allowedExtensions, blockedExtensions: data.blockedExtensions }, clientIp(request));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid settings" }, { status: 400 });
  }
}
