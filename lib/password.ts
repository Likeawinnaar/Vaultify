import { hash, verify } from "@node-rs/argon2";
export async function hashPassword(password: string): Promise<string> { return hash(password, { memoryCost: 19_456, timeCost: 2, parallelism: 1 }); }
export async function verifyPassword(password: string, encoded: string): Promise<boolean> { try { return await verify(encoded, password); } catch { return false; } }

