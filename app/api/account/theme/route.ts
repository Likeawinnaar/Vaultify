import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { verifyCsrf } from "@/lib/csrf";

export async function PATCH(request:Request){
  const user=await getCurrentUser();
  if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  if(!(await verifyCsrf(request)))return NextResponse.json({error:"Invalid request"},{status:403});
  const {theme}=await request.json().catch(()=>({}));
  if(theme!=="light"&&theme!=="dark")return NextResponse.json({error:"Invalid theme"},{status:400});
  db.prepare("UPDATE users SET theme=? WHERE id=?").run(theme,user.id);
  return NextResponse.json({ok:true,theme});
}
