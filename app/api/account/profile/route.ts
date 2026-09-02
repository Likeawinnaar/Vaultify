import { NextResponse } from "next/server";
import { z } from "zod";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { verifyCsrf } from "@/lib/csrf";
import { audit } from "@/lib/audit";
const schema=z.object({email:z.string().email().max(254).optional(),username:z.string().min(3).max(32).regex(/^[a-zA-Z0-9_-]+$/).optional()});
export async function PATCH(request:Request){const user=await getCurrentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});if(!(await verifyCsrf(request)))return NextResponse.json({error:"Invalid request"},{status:403});try{const data=schema.parse(await request.json());if(!data.email&&!data.username)return NextResponse.json({error:"No changes supplied"},{status:400});db.prepare("UPDATE users SET username=COALESCE(?,username),email=COALESCE(?,email) WHERE id=?").run(data.username||null,data.email||null,user.id);audit("ACCOUNT_UPDATED",user.id,user.id,{fields:Object.keys(data)});return NextResponse.json({ok:true});}catch(e){return NextResponse.json({error:e instanceof Error&&e.message.includes("UNIQUE")?"Username or email already in use":"Invalid account details"},{status:400});}}

