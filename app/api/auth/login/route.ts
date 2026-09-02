import { NextResponse } from "next/server";
import db from "@/lib/db";
import { loginSchema } from "@/lib/validation";
import { verifyPassword } from "@/lib/password";
import { clientIp, rateLimit } from "@/lib/security";
import { createSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
export const runtime="nodejs";
export async function POST(request:Request){const ip=clientIp(request);if(!rateLimit(`login:${ip}`,10)) return NextResponse.json({error:"Too many login attempts. Try again later."},{status:429});try{const data=loginSchema.parse(await request.json());const user=db.prepare("SELECT * FROM users WHERE username=? COLLATE NOCASE OR email=? COLLATE NOCASE").get(data.identifier,data.identifier) as any;const valid=user&&user.status==="ACTIVE"&&await verifyPassword(data.password,user.password_hash);if(!valid){audit("FAILED_LOGIN",user?.id||null,user?.id||null,{},ip);return NextResponse.json({error:"Invalid credentials"},{status:401});}db.prepare("UPDATE users SET last_login_at=CURRENT_TIMESTAMP WHERE id=?").run(user.id);await createSession(user,ip);return NextResponse.json({ok:true});}catch{return NextResponse.json({error:"Invalid credentials"},{status:401});}}

