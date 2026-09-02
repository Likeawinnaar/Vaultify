import { NextResponse } from "next/server";
import { databaseConfigured, get, getSetting, writeBatch } from "@/lib/db";
import { setupSchema } from "@/lib/validation";
import { hashPassword } from "@/lib/password";
import { audit } from "@/lib/audit";
import { clientIp, randomId, rateLimit } from "@/lib/security";
import { createSession, type User } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!databaseConfigured()) {
    return NextResponse.json({ error: "Configure a persistent Vaultify database before running setup" }, { status: 503 });
  }
  if ((await getSetting("configured", "false")) === "true") {
    return NextResponse.json({ error: "Vaultify is already configured" }, { status: 409 });
  }
  if (!rateLimit(`setup:${clientIp(request)}`, 5)) {
    return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
  }

  try {
    const raw = await request.json();
    const data = setupSchema.parse({
      ...raw,
      defaultQuotaBytes: Number(raw.defaultQuotaBytes),
      maxUploadBytes: Number(raw.maxUploadBytes),
    });
    const existing = await get<{ id: string }>("SELECT id FROM users LIMIT 1");
    if (existing) return NextResponse.json({ error: "Vaultify is already configured" }, { status: 409 });

    const id = randomId();
    const passwordHash = await hashPassword(data.password);
    await writeBatch([
      {
        sql: "INSERT INTO users(id,username,email,password_hash,role,is_primary,quota_bytes,created_at) VALUES(?,?,?,?,?,?,?,CURRENT_TIMESTAMP)",
        args: [id, data.username, data.email, passwordHash, "ADMIN", 1, data.defaultQuotaBytes],
      },
      { sql: "INSERT INTO settings(key,value,updated_at) VALUES('configured','true',CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value='true',updated_at=CURRENT_TIMESTAMP" },
      { sql: "INSERT INTO settings(key,value,updated_at) VALUES('website_name',?,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP", args: [data.websiteName] },
      { sql: "INSERT INTO settings(key,value,updated_at) VALUES('default_quota_bytes',?,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP", args: [String(data.defaultQuotaBytes)] },
      { sql: "INSERT INTO settings(key,value,updated_at) VALUES('max_upload_bytes',?,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP", args: [String(data.maxUploadBytes)] },
      { sql: "INSERT INTO settings(key,value,updated_at) VALUES('public_registration',?,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP", args: [String(data.publicRegistration)] },
    ]);

    const user = await get<User>("SELECT * FROM users WHERE id=?", [id]);
    if (!user) throw new Error("Primary Administrator creation failed");
    await audit("SETUP_COMPLETED", id, id, { websiteName: data.websiteName }, clientIp(request));
    await createSession(user, clientIp(request));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/setup]", error instanceof Error ? error.message : "unknown error");
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json(
      { error: /UNIQUE|unique/i.test(message) ? "Username or email already in use" : "Invalid setup details" },
      { status: 400 },
    );
  }
}
