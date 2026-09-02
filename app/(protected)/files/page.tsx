import FileDashboard from "@/components/file-dashboard";
import { requireUser } from "@/lib/auth";
import { all, get, getSetting } from "@/lib/db";

export const dynamic = "force-dynamic";

type FileRow = { id: string; original_name: string; size_bytes: number; mime_type: string; created_at: string };
type UsageRow = { total: number };

export default async function FilesPage() {
  const user = await requireUser();
  const files = await all<FileRow>(
    "SELECT id,original_name,size_bytes,mime_type,created_at FROM files WHERE owner_id=? ORDER BY created_at DESC",
    [user.id],
  );
  const usage = await get<UsageRow>("SELECT COALESCE(SUM(size_bytes),0) AS total FROM files WHERE owner_id=?", [user.id]);
  const maxUpload = Number(await getSetting("max_upload_bytes", String(5 * 1073741824)));
  const site = await getSetting("website_name", "Vaultify");

  return <FileDashboard
    user={{ username: user.username, email: user.email, role: user.role, quota: user.quota_bytes, uploadEnabled: !!user.upload_enabled, theme: user.theme }}
    initialFiles={files}
    initialUsed={Number(usage?.total || 0)}
    maxUpload={maxUpload}
    site={site}
  />;
}
