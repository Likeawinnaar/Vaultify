import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";

const attempts = new Map<string, { count: number; reset: number }>();
export function randomId(bytes = 24): string { return randomBytes(bytes).toString("hex"); }
export function hashToken(token: string): string { return createHash("sha256").update(token).digest("hex"); }
export function safeEqual(a: string, b: string): boolean { const aa = Buffer.from(a); const bb = Buffer.from(b); return aa.length === bb.length && timingSafeEqual(aa, bb); }
export function clientIp(request?: Request): string { return request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request?.headers.get("x-real-ip") || "unknown"; }
export function rateLimit(key: string, limit = Number(process.env.VAULTIFY_RATE_LIMIT_PER_MINUTE || 60)): boolean { const now = Date.now(); const current = attempts.get(key); if (!current || current.reset < now) { attempts.set(key, { count: 1, reset: now + 60_000 }); return true; } if (current.count >= limit) return false; current.count += 1; return true; }
export async function csrfToken(): Promise<string> { const h = await headers(); return h.get("x-csrf-token") || ""; }

