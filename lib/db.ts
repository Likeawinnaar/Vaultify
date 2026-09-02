import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

const configuredDataDir = process.env.VAULTIFY_DATA_DIR?.trim();
export const usingEphemeralVercelStorage = Boolean(process.env.VERCEL);

// Vercel's deployed application bundle lives under /var/task and is read-only at
// runtime. Only /tmp is writable. Keep the normal persistent ./data behavior for
// self-hosted installs, but never attempt to create /var/task/data on Vercel.
//
// IMPORTANT: /tmp is ephemeral on Vercel. This prevents a runtime 500 and is
// suitable for preview/testing only; production Vercel storage still requires a
// persistent database/storage adapter.
const dataDir = usingEphemeralVercelStorage
  ? configuredDataDir?.startsWith("/tmp/")
    ? configuredDataDir
    : "/tmp/vaultify"
  : path.resolve(configuredDataDir || "./data");

fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
const db = new DatabaseSync(path.join(dataDir, "vaultify.db"));
db.exec(
  usingEphemeralVercelStorage
    ? "PRAGMA journal_mode = DELETE; PRAGMA foreign_keys = ON;"
    : "PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;",
);
db.exec(fs.readFileSync(path.join(process.cwd(), "db/migrations/001_initial.sql"), "utf8"));
const userColumns = db.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
if (!userColumns.some((column) => column.name === "theme")) {
  db.exec("ALTER TABLE users ADD COLUMN theme TEXT NOT NULL DEFAULT 'light' CHECK (theme IN ('light','dark'))");
}

export default db;

export function getSetting(key: string, fallback = ""): string {
  return (db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value?: string } | undefined)?.value ?? fallback;
}

export function setSetting(key: string, value: string): void {
  db.prepare(
    "INSERT INTO settings(key,value,updated_at) VALUES(?,?,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP",
  ).run(key, value);
}

export function boolSetting(key: string, fallback = true): boolean {
  return getSetting(key, String(fallback)) === "true";
}
