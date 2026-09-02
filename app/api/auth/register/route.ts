import { NextResponse } from "next/server";
import { boolSetting, databaseConfigured, get, getSetting, run } from "@/lib/db";
import { credentialsSchema } from "@/lib/validation";
import { hashPassword } from "@/lib/password";
import { clientIp, randomId, rateLimit } from "@/lib/security";
import { createSession, type User } from "@/lib/auth";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!databaseConfigured()) {
    return NextResponse.json({ error: "Vaultify persistent database is not configured on this server" }, { status: 503 });
  }

  const ip = clientIp(request);
  if (!(await boolSetting("public_registration", true))) {
    return NextResponse.json({ error: "Registration is disabled" }, { status: 403 });
  }
  if (!rateLimit(`register:${ip}`, 5)) {
    return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
  }

  try {
    const data = credentialsSchema.parse(await request.json());
    const id = randomId();
    const hash = await hashPassword(data.password);
    const quota = Number(await getSetting("default_quota_bytes", String(25 * 1073741824)));
    await run(
      "INSERT INTO users(id,username,email,password_hash,quota_bytes,created_at) VALUES(?,?,?,?,?,CURRENT_TIMESTAMP)",
      [id, data.username, data.email, hash, quota],
    );
    const user = await get<User>("SELECT * FROM users WHERE id=?", [id]);
    if (!user) throw new Error("Account creation failed");
    await audit("USER_CREATED", id, id, {}, ip);
    await createSession(user, ip);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json(
      { error: /UNIQUE|unique/i.test(message) ? "Username or email already in use" : "Invalid account details" },
      { status: 400 },
    );
  }
}
