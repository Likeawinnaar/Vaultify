import { NextResponse } from "next/server";
import db, { getSetting } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { verifyCsrf } from "@/lib/csrf";
import { audit } from "@/lib/audit";
import { clientIp, randomId } from "@/lib/security";
import { encryptUpload, masterKey } from "@/lib/storage";
export const runtime="nodejs";

export async function GET(){
  const user=await getCurrentUser();
  if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const files=db.prepare("SELECT id,original_name,size_bytes,mime_type,created_at FROM files WHERE owner_id=? ORDER BY created_at DESC").all(user.id);
  return NextResponse.json({files});
}

export async function POST(request:Request){
  const user=await getCurrentUser();
  if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  if(!(await verifyCsrf(request)))return NextResponse.json({error:"Invalid request"},{status:403});
  if(!user.upload_enabled)return NextResponse.json({error:"Uploads are disabled for this account"},{status:403});
  const form=await request.formData();
  const incoming=form.get("file");
  if(!(incoming instanceof File))return NextResponse.json({error:"File is required"},{status:400});
  const max=Number(getSetting("max_upload_bytes",String(5*1073741824)));
  if(incoming.size>max)return NextResponse.json({error:"File exceeds the configured upload limit"},{status:413});
  const used=(db.prepare("SELECT COALESCE(SUM(size_bytes),0) AS total FROM files WHERE owner_id=?").get(user.id) as {total:number}).total;
  if(used+incoming.size>user.quota_bytes)return NextResponse.json({error:"This upload would exceed your storage quota"},{status:413});
  const originalName=incoming.name.replace(/[\u0000-\u001f\u007f]/g,"").split(/[\\/]/).pop()?.trim()||"untitled";
  const blocked=JSON.parse(getSetting("blocked_extensions","[]")) as string[];
  const allowed=JSON.parse(getSetting("allowed_extensions","[]")) as string[];
  const ext=originalName.includes(".")?originalName.split(".").pop()!.toLowerCase():"";
  if(blocked.includes(ext)||(allowed.length>0&&!allowed.includes(ext)))return NextResponse.json({error:"This file type is not allowed"},{status:415});
  const id=randomId(),storageName=`${randomId(24)}.bin`;
  try{
    const encrypted=await encryptUpload(incoming.stream(),storageName,masterKey());
    db.prepare("INSERT INTO files(id,owner_id,original_name,storage_name,size_bytes,mime_type,iv,auth_tag,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").run(id,user.id,originalName,storageName,encrypted.size,incoming.type||"application/octet-stream",encrypted.iv,encrypted.authTag);
    audit("FILE_UPLOADED",user.id,user.id,{fileId:id,size:encrypted.size,mimeType:incoming.type||"application/octet-stream"},clientIp(request));
    return NextResponse.json({file:{id,original_name:originalName,size_bytes:encrypted.size,mime_type:incoming.type||"application/octet-stream",created_at:new Date().toISOString()}});
  }catch{return NextResponse.json({error:"Unable to securely store file"},{status:500});}
}

