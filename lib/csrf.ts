import { cookies } from "next/headers";
import { randomId, safeEqual } from "./security";
export async function issueCsrf(): Promise<string> { const jar = await cookies(); const existing = jar.get("vaultify_csrf")?.value; if (existing) return existing; const value = randomId(24); jar.set("vaultify_csrf", value, { httpOnly: false, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" }); return value; }
export async function verifyCsrf(request: Request): Promise<boolean> { const cookie = (await cookies()).get("vaultify_csrf")?.value; const header = request.headers.get("x-csrf-token"); return !!cookie && !!header && safeEqual(cookie, header); }

