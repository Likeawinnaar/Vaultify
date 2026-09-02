import AccountSettings from "@/components/account-settings";
import { requireUser } from "@/lib/auth";
import { get } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AccountPage(){
  const user=await requireUser();
  const usage=await get<{total:number}>("SELECT COALESCE(SUM(size_bytes),0) AS total FROM files WHERE owner_id=?",[user.id]);
  return <AccountSettings user={{username:user.username,email:user.email,role:user.role,quota:user.quota_bytes,createdAt:user.created_at}} used={Number(usage?.total||0)}/>;
}
