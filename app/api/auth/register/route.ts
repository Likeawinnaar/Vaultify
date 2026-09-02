import { NextResponse } from "next/server";
import db, { boolSetting, getSetting } from "@/lib/db";
import { credentialsSchema } from "@/lib/validation";
import { hashPassword } from "@/lib/password";
import { clientIp, randomId, rateLimit } from "@/lib/security";
import { createSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
export const runtime="nodejs";
export async function POST(request:Request){const ip=clientIp(request);if(!boolSetting("public_registration",true)) return NextResponse.json({error:"Registration is disabled"},{status:403});if(!rateLimit(`register:${ip}`,5)) return NextResponse.json({error:"Too many attempts"},{status:429});try{const data=credentialsSchema.parse(await request.json());const id=randomId();const hash=await hashPassword(data.password);const quota=Number(getSetting("default_quota_bytes",String(25*1073741824)));db.prepare("INSERT INTO users(id,username,email,password_hash,quota_bytes,created_at) VALUES(?,?,?,?,?,CURRENT_TIMESTAMP)").run(id,data.username,data.email,hash,quota);const user=db.prepare("SELECT * FROM users WHERE id=?").get(id) as never;audit("USER_CREATED",id,id,{},ip);await createSession(user,ip);return NextResponse.json({ok:true});}catch(e){return NextResponse.json({error:e instanceof Error&&e.message.includes("UNIQUE")?"Username or email already in use":"Invalid account details"},{status:400});}}

