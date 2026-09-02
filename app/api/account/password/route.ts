import { NextResponse } from "next/server";
import { getCurrentUser, revokeUserSessions, createSession } from "@/lib/auth";
import { verifyCsrf } from "@/lib/csrf";
import { hashPassword, verifyPassword } from "@/lib/password";
import db from "@/lib/db";
import { audit } from "@/lib/audit";
import { z } from "zod";
const schema=z.object({currentPassword:z.string(),newPassword:z.string().min(12).max(128)});
export async function PATCH(request:Request){const user=await getCurrentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});if(!(await verifyCsrf(request)))return NextResponse.json({error:"Invalid request"},{status:403});try{const data=schema.parse(await request.json());const row=db.prepare("SELECT password_hash FROM users WHERE id=?").get(user.id) as {password_hash:string};if(!(await verifyPassword(data.currentPassword,row.password_hash)))return NextResponse.json({error:"Current password is incorrect"},{status:400});db.prepare("UPDATE users SET password_hash=? WHERE id=?").run(await hashPassword(data.newPassword),user.id);revokeUserSessions(user.id);const fresh=db.prepare("SELECT * FROM users WHERE id=?").get(user.id) as never;await createSession(fresh);audit("PASSWORD_CHANGED",user.id,user.id);return NextResponse.json({ok:true});}catch{return NextResponse.json({error:"Invalid password update"},{status:400});}}

