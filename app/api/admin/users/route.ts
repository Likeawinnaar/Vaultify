import { NextResponse } from "next/server";
import db, { getSetting } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { verifyCsrf } from "@/lib/csrf";
import { credentialsSchema } from "@/lib/validation";
import { hashPassword } from "@/lib/password";
import { audit } from "@/lib/audit";
import { clientIp, randomId } from "@/lib/security";
export const runtime="nodejs";
export async function POST(request:Request){const admin=await getCurrentUser();if(!admin||admin.role!=="ADMIN")return NextResponse.json({error:"Forbidden"},{status:403});if(!(await verifyCsrf(request)))return NextResponse.json({error:"Invalid request"},{status:403});try{const data=credentialsSchema.parse(await request.json());const id=randomId();db.prepare("INSERT INTO users(id,username,email,password_hash,quota_bytes,created_at) VALUES(?,?,?,?,?,CURRENT_TIMESTAMP)").run(id,data.username,data.email,await hashPassword(data.password),Number(getSetting("default_quota_bytes",String(25*1073741824))));audit("USER_CREATED",admin.id,id,{},clientIp(request));return NextResponse.json({ok:true,id});}catch(e){return NextResponse.json({error:e instanceof Error&&e.message.includes("UNIQUE")?"Username or email already in use":"Invalid user details"},{status:400});}}

