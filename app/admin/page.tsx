import AdminConsole from "@/components/admin-console-fixed";
import { requireAdmin } from "@/lib/auth";
import { all, get, getSetting } from "@/lib/db";

export const dynamic = "force-dynamic";

type AdminUserRow = {
  id: string;
  username: string;
  email: string;
  role: string;
  is_primary: number;
  status: string;
  upload_enabled: number;
  quota_bytes: number;
  created_at: string;
  last_login_at: string | null;
  used_bytes: number;
  file_count: number;
};
type StatsRow = { users: number; active: number; suspended: number; admins: number; files: number; bytes: number };
type LogRow = { action: string; created_at: string; ip_address: string | null };

export default async function AdminPage() {
  const admin = await requireAdmin();
  const users = await all<AdminUserRow>("SELECT id,username,email,role,is_primary,status,upload_enabled,quota_bytes,created_at,last_login_at,(SELECT COALESCE(SUM(size_bytes),0) FROM files WHERE owner_id=users.id) AS used_bytes,(SELECT COUNT(*) FROM files WHERE owner_id=users.id) AS file_count FROM users ORDER BY created_at DESC");
  const stats = await get<StatsRow>("SELECT COUNT(*) AS users, SUM(CASE WHEN status='ACTIVE' THEN 1 ELSE 0 END) AS active, SUM(CASE WHEN status='SUSPENDED' THEN 1 ELSE 0 END) AS suspended, SUM(CASE WHEN role='ADMIN' THEN 1 ELSE 0 END) AS admins, (SELECT COUNT(*) FROM files) AS files, (SELECT COALESCE(SUM(size_bytes),0) FROM files) AS bytes FROM users");
  const logs = await all<LogRow>("SELECT action,created_at,ip_address FROM audit_logs ORDER BY created_at DESC LIMIT 20");

  return <AdminConsole
    admin={admin.username}
    theme={admin.theme}
    stats={stats ?? { users: 0, active: 0, suspended: 0, admins: 0, files: 0, bytes: 0 }}
    users={users}
    logs={logs}
    settings={{
      websiteName: await getSetting("website_name", "Vaultify"),
      logoUrl: await getSetting("logo_url", ""),
      defaultQuotaBytes: Number(await getSetting("default_quota_bytes", String(25 * 1073741824))),
      maxUploadBytes: Number(await getSetting("max_upload_bytes", String(5 * 1073741824))),
      publicRegistration: (await getSetting("public_registration", "true")) === "true",
    }}
  />;
}
