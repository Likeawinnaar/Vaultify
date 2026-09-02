import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { Readable, PassThrough } from "node:stream";
import { pipeline } from "node:stream/promises";
import { del, get as getBlob, put } from "@vercel/blob";

const isVercel = Boolean(process.env.VERCEL);
const configuredDataDir = process.env.VAULTIFY_DATA_DIR?.trim();
const dataRoot = path.resolve(configuredDataDir || "./data");
const root = path.join(dataRoot, "files");

function validateStorageName(storageName: string): void {
  if (!/^[a-f0-9]{48}\.bin$/.test(storageName)) throw new Error("Invalid storage identifier");
}

function blobPath(storageName: string): string {
  validateStorageName(storageName);
  return `vaultify/files/${storageName}`;
}

function ensureBlobConfigured(): void {
  if (!process.env.BLOB_READ_WRITE_TOKEN && !(process.env.VERCEL_OIDC_TOKEN && process.env.BLOB_STORE_ID)) {
    throw new Error("Vaultify private Blob storage is not configured on Vercel");
  }
}

export function blobStorageConfigured(): boolean {
  return !isVercel || Boolean(process.env.BLOB_READ_WRITE_TOKEN || (process.env.VERCEL_OIDC_TOKEN && process.env.BLOB_STORE_ID));
}

export async function ensureStorage(): Promise<void> {
  if (isVercel) {
    ensureBlobConfigured();
    return;
  }
  await fsp.mkdir(root, { recursive: true, mode: 0o700 });
}

export function storagePath(storageName: string): string {
  validateStorageName(storageName);
  return path.join(root, storageName);
}

export async function encryptUpload(
  stream: ReadableStream<Uint8Array>,
  storageName: string,
  key: Buffer,
): Promise<{ iv: string; authTag: string; size: number }> {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  let size = 0;
  const counting = new PassThrough();
  counting.on("data", (chunk: Buffer) => {
    size += chunk.length;
  });

  if (isVercel) {
    ensureBlobConfigured();
    const encrypted = Readable.fromWeb(stream as never).pipe(counting).pipe(cipher);
    await put(blobPath(storageName), encrypted, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: false,
      contentType: "application/octet-stream",
      cacheControlMaxAge: 60,
    });
  } else {
    await ensureStorage();
    const temp = storagePath(storageName) + ".tmp";
    try {
      await pipeline(
        Readable.fromWeb(stream as never),
        counting,
        cipher,
        fs.createWriteStream(temp, { mode: 0o600 }),
      );
      await fsp.rename(temp, storagePath(storageName));
    } catch (error) {
      await fsp.rm(temp, { force: true });
      throw error;
    }
  }

  return {
    iv: iv.toString("base64url"),
    authTag: cipher.getAuthTag().toString("base64url"),
    size,
  };
}

export async function removeStoredFile(storageName: string): Promise<void> {
  if (isVercel) {
    ensureBlobConfigured();
    await del(blobPath(storageName));
    return;
  }
  await fsp.rm(storagePath(storageName), { force: true });
}

export async function decryptedStream(
  storageName: string,
  iv: string,
  authTag: string,
  key: Buffer,
): Promise<ReadableStream<Uint8Array>> {
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(authTag, "base64url"));

  if (isVercel) {
    ensureBlobConfigured();
    const blob = await getBlob(blobPath(storageName), { access: "private" });
    if (!blob) throw new Error("Stored file not found");
    const nodeStream = Readable.fromWeb(blob.stream as never).pipe(decipher);
    return Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;
  }

  return Readable.toWeb(fs.createReadStream(storagePath(storageName)).pipe(decipher)) as ReadableStream<Uint8Array>;
}

export function masterKey(): Buffer {
  const raw = process.env.VAULTIFY_MASTER_KEY;
  if (!raw) throw new Error("VAULTIFY_MASTER_KEY is not configured");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("Vaultify master key must decode to exactly 32 bytes");
  return key;
}
