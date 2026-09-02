import { NextResponse } from "next/server";
import { all, get, run } from "@/lib/db";
import { getCurrentUser, revokeUserSessions } from "@/lib/auth";
import { verifyCsrf } from "@/lib/csrf";
import { hashPassword } from "@/lib/password";
import { audit } from "@/lib/audit";
import { clientIp } from "@/lib/security";
import { removeStoredFile } from "@/lib/storage";
import { z } from "zod";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
type Target = { id: string; is_primary: number; role: "USER" | "ADMIN"; status: "ACTIVE" | "SUSPENDED" };

const updateSchema = z.object({
  username: z.string().trim().min(3).max(32).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  email: z.string().trim().email().max(254).optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
  uploadEnabled: z.boolean().optional(),
  quotaBytes: z.number().int().positive().optional(),
  newPassword: z.string().min(12).max(128).optional(),
});

export async function PATCH(request: Request, { params }: Context) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!(await verifyCsrf(request))) return NextResponse.json({ error: "Invalid request" }, { status: 403 });
  const { id } = await params;
  const target = await get<Target>("SELECT id,is_primary,role,status FROM users WHERE id=?", [id]);
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  try {
    const data = updateSchema.parse(await request.json());
    if (target.is_primary && (data.role === "USER" || data.status === "SUSPENDED")) {
      return NextResponse.json({ error: "The Primary Administrator is protected" }, { status: 409 });
    }
    if (target.is_primary && data.newPassword && admin.id !== target.id) {
      return NextResponse.json({ error: "Only the Primary Administrator can change their own password" }, { status: 409 });
    }

    if (data.newPassword) {
      await run("UPDATE users SET password_hash=? WHERE id=?", [await hashPassword(data.newPassword), id]);
      await revokeUserSessions(id);
      await audit("PASSWORD_RESET", admin.id, id, {}, clientIp(request));
    }

    const fields: string[] = [];
    const values: Array<string | number | null> = [];
    const map: Record<string, string | number | undefined> = {
      username: data.username,
      email: data.email,
      role: data.role,
      status: data.status,
      upload_enabled: data.uploadEnabled === undefined ? undefined : Number(data.uploadEnabled),
      quota_bytes: data.quotaBytes,
    };
    for (const [key, value] of Object.entries(map)) {
      if (value !== undefined) {
        fields.push(`${key}=?`);
        values.push(value);
      }
    }
    if (fields.length) {
      await run(`UPDATE users SET ${fields.join(",")} WHERE id=?`, [...values, id]);
      await audit(data.role ? "ROLE_CHANGED" : data.quotaBytes ? "STORAGE_QUOTA_CHANGED" : data.status ? "USER_STATUS_CHANGED" : "USER_UPDATED", admin.id, id, { fields: fields.map((field) => field.split("=")[0]) }, clientIp(request));
      if (data.status === "SUSPENDED" || data.role !== undefined) await revokeUserSessions(id);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json({ error: /UNIQUE|unique/i.test(message) ? "Username or email already in use" : "Invalid user update" }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: Context) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!(await verifyCsrf(request))) return NextResponse.json({ error: "Invalid request" }, { status: 403 });
  const { id } = await params;
  const target = await get<Target>("SELECT id,is_primary,role,status FROM users WHERE id=?", [id]);
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (target.is_primary) return NextResponse.json({ error: "The Primary Administrator is protected" }, { status: 409 });
  if (admin.id === id) return NextResponse.json({ error: "You cannot delete your own administrator account" }, { status: 409 });

  try {
    const storedFiles = await all<{ storage_name: string }>("SELECT storage_name FROM files WHERE owner_id=?", [id]);
    for (const file of storedFiles) await removeStoredFile(file.storage_name);
    await audit("USER_DELETED", admin.id, id, {}, clientIp(request));
    await run("DELETE FROM users WHERE id=?", [id]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/user/delete]", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Unable to delete user" }, { status: 500 });
  }
}
