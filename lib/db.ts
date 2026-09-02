import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

const dataDir = path.resolve(process.env.VAULTIFY_DATA_DIR || "./data");
fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
const db = new DatabaseSync(path.join(dataDir, "vaultify.db"));
db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
db.exec(fs.readFileSync(path.join(process.cwd(), "db/migrations/001_initial.sql"), "utf8"));
const userColumns = db.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
if (!userColumns.some((column) => column.name === "theme")) db.exec("ALTER TABLE users ADD COLUMN theme TEXT NOT NULL DEFAULT 'light' CHECK (theme IN ('light','dark'))");

export default db;
export function getSetting(key: string, fallback = ""): string {
  return (db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value?: string } | undefined)?.value ?? fallback;
}
export function setSetting(key: string, value: string): void { db.prepare("INSERT INTO settings(key,value,updated_at) VALUES(?,?,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP").run(key, value); }
export function boolSetting(key: string, fallback = true): boolean { return getSetting(key, String(fallback)) === "true"; }
