import { NextResponse } from "next/server";
import { get, run } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { verifyCsrf } from "@/lib/csrf";
import { renameSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { clientIp } from "@/lib/security";
import { decryptedStream, masterKey, removeStoredFile } from "@/lib/storage";

export const runtime = "nodejs";

type FileRow = { id: string; owner_id: string; original_name: string; storage_name: string; size_bytes: number; mime_type: string; iv: string; auth_tag: string };
function idFrom(request: Request) { return new URL(request.url).searchParams.get("id") || ""; }

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = idFrom(request);
  const file = await get<FileRow>("SELECT * FROM files WHERE id=? AND owner_id=?", [id, user.id]);
  if (!file) return NextResponse.json({ error: "File not found" }, { status: 404 });
  try {
    const body = await decryptedStream(file.storage_name, file.iv, file.auth_tag, masterKey());
    const preview = new URL(request.url).searchParams.get("preview") === "1";
    return new Response(body, { headers: {
      "Content-Type": file.mime_type,
      "Content-Length": String(file.size_bytes),
      "Content-Disposition": `${preview ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(file.original_name)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    }});
  } catch (error) {
    console.error("[file/read]", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Unable to read file" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await verifyCsrf(request))) return NextResponse.json({ error: "Invalid request" }, { status: 403 });
  const id = idFrom(request);
  const file = await get<{ id: string }>("SELECT id FROM files WHERE id=? AND owner_id=?", [id, user.id]);
  if (!file) return NextResponse.json({ error: "File not found" }, { status: 404 });
  try {
    const data = renameSchema.parse(await request.json());
    await run("UPDATE files SET original_name=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND owner_id=?", [data.name, id, user.id]);
    await audit("FILE_RENAMED", user.id, user.id, { fileId: id }, clientIp(request));
    return NextResponse.json({ file: { id, original_name: data.name } });
  } catch {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await verifyCsrf(request))) return NextResponse.json({ error: "Invalid request" }, { status: 403 });
  const id = idFrom(request);
  const file = await get<{ storage_name: string }>("SELECT storage_name FROM files WHERE id=? AND owner_id=?", [id, user.id]);
  if (!file) return NextResponse.json({ error: "File not found" }, { status: 404 });
  try {
    await removeStoredFile(file.storage_name);
    await run("DELETE FROM files WHERE id=? AND owner_id=?", [id, user.id]);
    await audit("FILE_DELETED", user.id, user.id, { fileId: id }, clientIp(request));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[file/delete]", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Unable to delete file" }, { status: 500 });
  }
}
