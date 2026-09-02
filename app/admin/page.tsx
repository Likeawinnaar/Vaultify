import AdminConsole from "@/components/admin-console-fixed";
import { requireAdmin } from "@/lib/auth";
import db,{getSetting} from "@/lib/db";
export const dynamic = "force-dynamic";

export default async function AdminPage(){
  const admin=await requireAdmin();
  const users=JSON.parse(JSON.stringify(db.prepare("SELECT id,username,email,role,is_primary,status,upload_enabled,quota_bytes,created_at,last_login_at,(SELECT COALESCE(SUM(size_bytes),0) FROM files WHERE owner_id=users.id) AS used_bytes,(SELECT COUNT(*) FROM files WHERE owner_id=users.id) AS file_count FROM users ORDER BY created_at DESC").all()));
  const stats=JSON.parse(JSON.stringify(db.prepare("SELECT COUNT(*) AS users, SUM(CASE WHEN status='ACTIVE' THEN 1 ELSE 0 END) AS active, SUM(CASE WHEN status='SUSPENDED' THEN 1 ELSE 0 END) AS suspended, SUM(CASE WHEN role='ADMIN' THEN 1 ELSE 0 END) AS admins, (SELECT COUNT(*) FROM files) AS files, (SELECT COALESCE(SUM(size_bytes),0) FROM files) AS bytes FROM users").get()));
  const logs=JSON.parse(JSON.stringify(db.prepare("SELECT action,created_at,ip_address FROM audit_logs ORDER BY created_at DESC LIMIT 8").all()));
  return <AdminConsole admin={admin.username} theme={admin.theme} stats={stats} users={users} logs={logs} settings={{websiteName:getSetting("website_name","Vaultify"),logoUrl:getSetting("logo_url",""),defaultQuotaBytes:Number(getSetting("default_quota_bytes",String(25*1073741824))),maxUploadBytes:Number(getSetting("max_upload_bytes",String(5*1073741824))),publicRegistration:getSetting("public_registration","true")==="true"}}/>;
}
