import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const dataDir = path.resolve(process.env.VAULTIFY_DATA_DIR || "./data");
fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
const db = new Database(path.join(dataDir, "vaultify.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec(fs.readFileSync(path.join(process.cwd(), "db/migrations/001_initial.sql"), "utf8"));

export default db;
export function getSetting(key: string, fallback = ""): string {
  return (db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value?: string } | undefined)?.value ?? fallback;
}
export function setSetting(key: string, value: string): void { db.prepare("INSERT INTO settings(key,value,updated_at) VALUES(?,?,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP").run(key, value); }
export function boolSetting(key: string, fallback = true): boolean { return getSetting(key, String(fallback)) === "true"; }

