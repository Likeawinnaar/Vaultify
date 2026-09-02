import FileDashboard from "@/components/file-dashboard";
import { requireUser } from "@/lib/auth";
import { all,get,getSetting } from "@/lib/db";

export const dynamic="force-dynamic";
type FileRow={id:string;original_name:string;size_bytes:number;mime_type:string;created_at:string};

export default async function DashboardPage(){const user=await requireUser();const files=await all<FileRow>("SELECT id,original_name,size_bytes,mime_type,created_at FROM files WHERE owner_id=? ORDER BY created_at DESC",[user.id]);const usage=await get<{total:number}>("SELECT COALESCE(SUM(size_bytes),0) AS total FROM files WHERE owner_id=?",[user.id]);return <FileDashboard user={{username:user.username,email:user.email,role:user.role,quota:user.quota_bytes,uploadEnabled:!!user.upload_enabled,theme:user.theme}} initialFiles={files} initialUsed={Number(usage?.total||0)} maxUpload={Number(await getSetting("max_upload_bytes",String(5*1073741824)))} site={await getSetting("website_name","Vaultify")}/>;}
