import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { verifyCsrf } from "@/lib/csrf";
import { settingsSchema } from "@/lib/validation";
import { setSetting } from "@/lib/db";
import { audit } from "@/lib/audit";
import { clientIp } from "@/lib/security";
export const runtime="nodejs";
export async function PATCH(request:Request){const user=await getCurrentUser();if(!user||user.role!=="ADMIN")return NextResponse.json({error:"Forbidden"},{status:403});if(!(await verifyCsrf(request)))return NextResponse.json({error:"Invalid request"},{status:403});try{const data=settingsSchema.parse(await request.json());setSetting("website_name",data.websiteName);setSetting("default_quota_bytes",String(data.defaultQuotaBytes));setSetting("max_upload_bytes",String(data.maxUploadBytes));setSetting("public_registration",String(data.publicRegistration));audit("APPLICATION_SETTINGS_CHANGED",user.id,null,{websiteName:data.websiteName},clientIp(request));return NextResponse.json({ok:true});}catch{return NextResponse.json({error:"Invalid settings"},{status:400});}}

