import { requireUser } from "@/lib/auth";
import db, { getSetting } from "@/lib/db";
import FileDashboard from "@/components/file-dashboard";
export default async function FilesPage(){const user=await requireUser();const files=db.prepare("SELECT id,original_name,size_bytes,mime_type,created_at FROM files WHERE owner_id=? ORDER BY created_at DESC").all(user.id);const used=(db.prepare("SELECT COALESCE(SUM(size_bytes),0) AS total FROM files WHERE owner_id=?").get(user.id) as {total:number}).total;return <FileDashboard user={{username:user.username,email:user.email,role:user.role,quota:user.quota_bytes,uploadEnabled:!!user.upload_enabled}} initialFiles={files as any[]} initialUsed={used} site={getSetting("website_name","Vaultify")}/>}

