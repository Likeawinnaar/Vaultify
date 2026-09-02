import { NextResponse } from "next/server";
import { databaseConfigured, get, run } from "@/lib/db";
import { loginSchema } from "@/lib/validation";
import { verifyPassword } from "@/lib/password";
import { clientIp, rateLimit } from "@/lib/security";
import { createSession, type User } from "@/lib/auth";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!databaseConfigured()) {
    return NextResponse.json({ error: "Vaultify persistent database is not configured on this server" }, { status: 503 });
  }

  const ip = clientIp(request);
  if (!rateLimit(`login:${ip}`, 10)) {
    return NextResponse.json({ error: "Too many login attempts. Try again later." }, { status: 429 });
  }

  try {
    const data = loginSchema.parse(await request.json());
    const user = await get<User & { password_hash: string }>(
      "SELECT * FROM users WHERE username=? COLLATE NOCASE OR email=? COLLATE NOCASE LIMIT 1",
      [data.identifier, data.identifier],
    );
    const valid = Boolean(user && user.status === "ACTIVE" && (await verifyPassword(data.password, user.password_hash)));
    if (!valid) {
      await audit("FAILED_LOGIN", user?.id || null, user?.id || null, {}, ip);
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    await run("UPDATE users SET last_login_at=CURRENT_TIMESTAMP WHERE id=?", [user!.id]);
    await createSession(user!, ip);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[auth/login]", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
}
