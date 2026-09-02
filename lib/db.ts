import { createClient, type Client, type InValue } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";

export type SqlArgs = InValue[];
export type SqlStatement = { sql: string; args?: SqlArgs };

export const isVercel = Boolean(process.env.VERCEL);

export function databaseConfigured(): boolean {
  return !isVercel || Boolean(process.env.TURSO_DATABASE_URL?.trim());
}

let clientPromise: Promise<Client> | null = null;

function migrationSql(): string {
  return fs.readFileSync(path.join(process.cwd(), "db/migrations/001_initial.sql"), "utf8");
}

async function createVaultifyClient(): Promise<Client> {
  let client: Client;

  if (isVercel) {
    const url = process.env.TURSO_DATABASE_URL?.trim();
    if (!url) {
      throw new Error("Vaultify database is not configured for Vercel. Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN.");
    }
    client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN?.trim() || undefined });
  } else {
    const dataDir = path.resolve(process.env.VAULTIFY_DATA_DIR?.trim() || "./data");
    fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
    client = createClient({ url: `file:${path.join(dataDir, "vaultify.db")}` });
  }

  await client.executeMultiple(migrationSql());
  return client;
}

export async function getClient(): Promise<Client> {
  clientPromise ??= createVaultifyClient();
  return clientPromise;
}

function normalizeRow<T>(columns: string[], row: readonly InValue[]): T {
  const value: Record<string, InValue> = {};
  columns.forEach((column, index) => {
    value[column] = row[index] ?? null;
  });
  return value as T;
}

export async function all<T = Record<string, InValue>>(sql: string, args: SqlArgs = []): Promise<T[]> {
  const client = await getClient();
  const result = await client.execute({ sql, args });
  return result.rows.map((row) => normalizeRow<T>(result.columns, row));
}

export async function get<T = Record<string, InValue>>(sql: string, args: SqlArgs = []): Promise<T | undefined> {
  return (await all<T>(sql, args))[0];
}

export async function run(sql: string, args: SqlArgs = []): Promise<void> {
  const client = await getClient();
  await client.execute({ sql, args });
}

export async function writeBatch(statements: SqlStatement[]): Promise<void> {
  const client = await getClient();
  await client.batch(
    statements.map((statement) => ({ sql: statement.sql, args: statement.args ?? [] })),
    "write",
  );
}

export async function getSetting(key: string, fallback = ""): Promise<string> {
  const row = await get<{ value: string }>("SELECT value FROM settings WHERE key = ?", [key]);
  return row?.value ?? fallback;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await run(
    "INSERT INTO settings(key,value,updated_at) VALUES(?,?,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP",
    [key, value],
  );
}

export async function boolSetting(key: string, fallback = true): Promise<boolean> {
  return (await getSetting(key, String(fallback))) === "true";
}

const db = { all, get, run, writeBatch };
export default db;
