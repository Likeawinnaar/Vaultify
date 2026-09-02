import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { Readable, PassThrough } from "node:stream";
import { pipeline } from "node:stream/promises";

const configuredDataDir = process.env.VAULTIFY_DATA_DIR?.trim();
const dataRoot = process.env.VERCEL
  ? configuredDataDir?.startsWith("/tmp/")
    ? configuredDataDir
    : "/tmp/vaultify"
  : path.resolve(configuredDataDir || "./data");
const root = path.join(dataRoot, "files");

export async function ensureStorage(): Promise<void> {
  await fsp.mkdir(root, { recursive: true, mode: 0o700 });
}

export function storagePath(storageName: string): string {
  if (!/^[a-f0-9]{48}\.bin$/.test(storageName)) throw new Error("Invalid storage identifier");
  return path.join(root, storageName);
}

export async function encryptUpload(
  stream: ReadableStream<Uint8Array>,
  storageName: string,
  key: Buffer,
): Promise<{ iv: string; authTag: string; size: number }> {
  await ensureStorage();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const temp = storagePath(storageName) + ".tmp";
  let size = 0;
  const counting = new PassThrough();
  counting.on("data", (chunk) => {
    size += chunk.length;
  });

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

  return {
    iv: iv.toString("base64url"),
    authTag: cipher.getAuthTag().toString("base64url"),
    size,
  };
}

export async function removeStoredFile(storageName: string): Promise<void> {
  await fsp.rm(storagePath(storageName), { force: true });
}

export function decryptedStream(
  storageName: string,
  iv: string,
  authTag: string,
  key: Buffer,
): ReadableStream<Uint8Array> {
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(authTag, "base64url"));
  return Readable.toWeb(fs.createReadStream(storagePath(storageName)).pipe(decipher)) as ReadableStream<Uint8Array>;
}

export function masterKey(): Buffer {
  const raw = process.env.VAULTIFY_MASTER_KEY;
  if (!raw) throw new Error("Vaultify is not configured");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("Vaultify master key must decode to 32 bytes");
  return key;
}
