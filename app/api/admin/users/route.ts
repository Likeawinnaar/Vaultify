import { NextResponse } from "next/server";
import { getSetting, run } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { verifyCsrf } from "@/lib/csrf";
import { hashPassword } from "@/lib/password";
import { audit } from "@/lib/audit";
import { clientIp, randomId } from "@/lib/security";
import { z } from "zod";

export const runtime = "nodejs";

const createUserSchema=z.object({
  username:z.string().trim().min(3).max(32).regex(/^[a-zA-Z0-9_-]+$/),
  email:z.string().trim().email().max(254),
  password:z.string().min(12).max(128),
  role:z.enum(["USER","ADMIN"]).default("USER"),
  quotaBytes:z.number().int().positive().optional(),
  uploadEnabled:z.boolean().default(true),
});

export async function POST(request: Request) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!(await verifyCsrf(request))) return NextResponse.json({ error: "Invalid request" }, { status: 403 });
  try {
    const data = createUserSchema.parse(await request.json());
    const id = randomId();
    const quota = data.quotaBytes ?? Number(await getSetting("default_quota_bytes", String(25 * 1073741824)));
    await run("INSERT INTO users(id,username,email,password_hash,role,upload_enabled,quota_bytes,created_at) VALUES(?,?,?,?,?,?,?,CURRENT_TIMESTAMP)", [id, data.username, data.email, await hashPassword(data.password), data.role, Number(data.uploadEnabled), quota]);
    await audit(data.role==="ADMIN"?"ADMIN_CREATED":"USER_CREATED", admin.id, id, {quotaBytes:quota}, clientIp(request));
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json({ error: /UNIQUE|unique/i.test(message) ? "Username or email already in use" : "Invalid user details" }, { status: 400 });
  }
}
