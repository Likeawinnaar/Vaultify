import { NextResponse } from "next/server";
import { createSession, getCurrentUser, revokeUserSessions, type User } from "@/lib/auth";
import { verifyCsrf } from "@/lib/csrf";
import { hashPassword, verifyPassword } from "@/lib/password";
import { get, run } from "@/lib/db";
import { audit } from "@/lib/audit";
import { z } from "zod";

const schema = z.object({ currentPassword: z.string(), newPassword: z.string().min(12).max(128) });

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await verifyCsrf(request))) return NextResponse.json({ error: "Invalid request" }, { status: 403 });

  try {
    const data = schema.parse(await request.json());
    const row = await get<{ password_hash: string }>("SELECT password_hash FROM users WHERE id=?", [user.id]);
    if (!row || !(await verifyPassword(data.currentPassword, row.password_hash))) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }

    await run("UPDATE users SET password_hash=? WHERE id=?", [await hashPassword(data.newPassword), user.id]);
    await revokeUserSessions(user.id);
    const fresh = await get<User>("SELECT * FROM users WHERE id=?", [user.id]);
    if (!fresh) throw new Error("Account no longer exists");
    await createSession(fresh);
    await audit("PASSWORD_CHANGED", user.id, user.id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid password update" }, { status: 400 });
  }
}
