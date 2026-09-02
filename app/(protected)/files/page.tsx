import FileDashboard from "@/components/file-dashboard";
import { requireUser } from "@/lib/auth";
import db,{getSetting} from "@/lib/db";

export default async function FilesPage(){
  const user=await requireUser();
  const files=JSON.parse(JSON.stringify(db.prepare("SELECT id,original_name,size_bytes,mime_type,created_at FROM files WHERE owner_id=? ORDER BY created_at DESC").all(user.id)));
  const used=(db.prepare("SELECT COALESCE(SUM(size_bytes),0) AS total FROM files WHERE owner_id=?").get(user.id) as {total:number}).total;
  return <FileDashboard user={{username:user.username,email:user.email,role:user.role,quota:user.quota_bytes,uploadEnabled:!!user.upload_enabled,theme:user.theme}} initialFiles={files} initialUsed={used} maxUpload={Number(getSetting("max_upload_bytes",String(5*1073741824)))} site={getSetting("website_name","Vaultify")}/>;
}
