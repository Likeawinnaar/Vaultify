import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { verifyCsrf } from "@/lib/csrf";
import { renameSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { clientIp } from "@/lib/security";
import { decryptedStream, masterKey, removeStoredFile } from "@/lib/storage";

export const runtime="nodejs";
function idFrom(request:Request){return new URL(request.url).searchParams.get("id")||"";}

export async function GET(request:Request){const user=await getCurrentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});const id=idFrom(request);const file=db.prepare("SELECT * FROM files WHERE id=? AND owner_id=?").get(id,user.id) as any;if(!file)return NextResponse.json({error:"File not found"},{status:404});try{const body=decryptedStream(file.storage_name,file.iv,file.auth_tag,masterKey());const preview=new URL(request.url).searchParams.get("preview")==="1";return new Response(body,{headers:{"Content-Type":file.mime_type,"Content-Length":String(file.size_bytes),"Content-Disposition":`${preview?"inline":"attachment"}; filename*=UTF-8''${encodeURIComponent(file.original_name)}`,"X-Content-Type-Options":"nosniff","Cache-Control":"private, no-store"}});}catch{return NextResponse.json({error:"Unable to read file"},{status:500});}}

export async function PATCH(request:Request){const user=await getCurrentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});if(!(await verifyCsrf(request)))return NextResponse.json({error:"Invalid request"},{status:403});const id=idFrom(request);const file=db.prepare("SELECT id FROM files WHERE id=? AND owner_id=?").get(id,user.id);if(!file)return NextResponse.json({error:"File not found"},{status:404});try{const data=renameSchema.parse(await request.json());db.prepare("UPDATE files SET original_name=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND owner_id=?").run(data.name,id,user.id);audit("FILE_RENAMED",user.id,user.id,{fileId:id},clientIp(request));return NextResponse.json({file:{id,original_name:data.name}});}catch{return NextResponse.json({error:"Invalid filename"},{status:400});}}

export async function DELETE(request:Request){const user=await getCurrentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});if(!(await verifyCsrf(request)))return NextResponse.json({error:"Invalid request"},{status:403});const id=idFrom(request);const file=db.prepare("SELECT storage_name FROM files WHERE id=? AND owner_id=?").get(id,user.id) as {storage_name:string}|undefined;if(!file)return NextResponse.json({error:"File not found"},{status:404});db.prepare("DELETE FROM files WHERE id=? AND owner_id=?").run(id,user.id);await removeStoredFile(file.storage_name);audit("FILE_DELETED",user.id,user.id,{fileId:id},clientIp(request));return NextResponse.json({ok:true});}
