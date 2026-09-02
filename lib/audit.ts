import { run } from "./db";
import { randomId } from "./security";

export async function audit(
  action: string,
  actorId: string | null,
  targetUserId: string | null,
  metadata: Record<string, unknown> = {},
  ipAddress: string | null = null,
): Promise<void> {
  await run(
    "INSERT INTO audit_logs(id,actor_id,target_user_id,action,metadata_json,ip_address,created_at) VALUES(?,?,?,?,?,?,CURRENT_TIMESTAMP)",
    [randomId(), actorId, targetUserId, action, JSON.stringify(metadata), ipAddress],
  );
}
