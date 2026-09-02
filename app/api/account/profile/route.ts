import { NextResponse } from "next/server";
import { z } from "zod";
import { run } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { verifyCsrf } from "@/lib/csrf";
import { audit } from "@/lib/audit";

const schema = z.object({
  email: z.string().trim().email().max(254).optional(),
  username: z.string().trim().min(3).max(32).regex(/^[a-zA-Z0-9_-]+$/).optional(),
});

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await verifyCsrf(request))) return NextResponse.json({ error: "Invalid request" }, { status: 403 });

  try {
    const data = schema.parse(await request.json());
    if (!data.email && !data.username) return NextResponse.json({ error: "No changes supplied" }, { status: 400 });
    await run("UPDATE users SET username=COALESCE(?,username),email=COALESCE(?,email) WHERE id=?", [
      data.username || null,
      data.email || null,
      user.id,
    ]);
    await audit("ACCOUNT_UPDATED", user.id, user.id, { fields: Object.keys(data) });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json(
      { error: /UNIQUE|unique/i.test(message) ? "Username or email already in use" : "Invalid account details" },
      { status: 400 },
    );
  }
}
