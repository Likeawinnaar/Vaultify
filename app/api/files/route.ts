import { NextResponse } from "next/server";
import { all, get, getSetting, run } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { verifyCsrf } from "@/lib/csrf";
import { audit } from "@/lib/audit";
import { clientIp, randomId } from "@/lib/security";
import { blobStorageConfigured, encryptUpload, masterKey, removeStoredFile } from "@/lib/storage";

export const runtime = "nodejs";

const fmt = (n: number) => n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : n < 1073741824 ? `${(n / 1048576).toFixed(1)} MB` : `${(n / 1073741824).toFixed(2)} GB`;
type FileListRow = { id: string; original_name: string; size_bytes: number; mime_type: string; created_at: string };

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const files = await all<FileListRow>("SELECT id,original_name,size_bytes,mime_type,created_at FROM files WHERE owner_id=? ORDER BY created_at DESC", [user.id]);
  return NextResponse.json({ files });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await verifyCsrf(request))) return NextResponse.json({ error: "Invalid request" }, { status: 403 });
  if (!user.upload_enabled) return NextResponse.json({ error: "Uploads are disabled for this account" }, { status: 403 });
  if (!blobStorageConfigured()) return NextResponse.json({ error: "Persistent file storage is not configured" }, { status: 503 });

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "The upload could not be read. Try a smaller file." }, { status: 400 });
  const incoming = form.get("file");
  if (!(incoming instanceof File)) return NextResponse.json({ error: "File is required" }, { status: 400 });

  const max = Number(await getSetting("max_upload_bytes", String(5 * 1073741824)));
  if (incoming.size > max) return NextResponse.json({ error: `This file is ${fmt(incoming.size)}. The maximum file size is ${fmt(max)}.` }, { status: 413 });

  const usage = await get<{ total: number }>("SELECT COALESCE(SUM(size_bytes),0) AS total FROM files WHERE owner_id=?", [user.id]);
  const used = Number(usage?.total || 0);
  if (used + incoming.size > user.quota_bytes) {
    return NextResponse.json({ error: `Not enough storage. This file is ${fmt(incoming.size)}, but only ${fmt(Math.max(0, user.quota_bytes - used))} remains.` }, { status: 413 });
  }

  const originalName = incoming.name.replace(/[\u0000-\u001f\u007f]/g, "").split(/[\\/]/).pop()?.trim() || "untitled";
  const blocked = JSON.parse(await getSetting("blocked_extensions", "[]")) as string[];
  const allowed = JSON.parse(await getSetting("allowed_extensions", "[]")) as string[];
  const ext = originalName.includes(".") ? originalName.split(".").pop()!.toLowerCase() : "";
  if (blocked.includes(ext) || (allowed.length > 0 && !allowed.includes(ext))) {
    return NextResponse.json({ error: "This file type is not allowed" }, { status: 415 });
  }

  const id = randomId();
  const storageName = `${randomId(24)}.bin`;
  let stored = false;
  try {
    const encrypted = await encryptUpload(incoming.stream(), storageName, masterKey());
    stored = true;
    await run(
      "INSERT INTO files(id,owner_id,original_name,storage_name,size_bytes,mime_type,iv,auth_tag,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)",
      [id, user.id, originalName, storageName, encrypted.size, incoming.type || "application/octet-stream", encrypted.iv, encrypted.authTag],
    );
    await audit("FILE_UPLOADED", user.id, user.id, { fileId: id, size: encrypted.size, mimeType: incoming.type || "application/octet-stream" }, clientIp(request));
    return NextResponse.json({ file: { id, original_name: originalName, size_bytes: encrypted.size, mime_type: incoming.type || "application/octet-stream", created_at: new Date().toISOString() } });
  } catch (error) {
    if (stored) await removeStoredFile(storageName).catch(() => undefined);
    console.error("[files/upload]", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Unable to securely store file" }, { status: 500 });
  }
}
