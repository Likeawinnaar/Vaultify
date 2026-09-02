import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { databaseConfigured, get, run } from "./db";
import { hashToken, randomId } from "./security";
import { audit } from "./audit";

export type User={id:string;username:string;email:string;role:"USER"|"ADMIN";is_primary:number;status:"ACTIVE"|"SUSPENDED";upload_enabled:number;quota_bytes:number;theme:"light"|"dark";created_at:string;last_login_at:string|null};
const sessionDays=()=>Math.max(1,Number(process.env.VAULTIFY_SESSION_DAYS||30));

export async function createSession(user:User,ip?:string):Promise<void>{const raw=randomId(32),expires=new Date(Date.now()+sessionDays()*86_400_000).toISOString();await run("INSERT INTO sessions(id,user_id,token_hash,expires_at,created_at) VALUES(?,?,?,?,CURRENT_TIMESTAMP)",[randomId(),user.id,hashToken(raw),expires]);const jar=await cookies();jar.set("vaultify_session",raw,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",path:"/",expires:new Date(expires)});await audit("LOGIN",user.id,user.id,{},ip||null);}
export async function destroySession():Promise<void>{const jar=await cookies(),raw=jar.get("vaultify_session")?.value;if(raw&&databaseConfigured())await run("DELETE FROM sessions WHERE token_hash=?",[hashToken(raw)]);jar.delete("vaultify_session");}
export async function getCurrentUser():Promise<User|null>{if(!databaseConfigured())return null;const raw=(await cookies()).get("vaultify_session")?.value;if(!raw)return null;const row=await get<User>("SELECT u.* FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token_hash=? AND julianday(s.expires_at)>julianday('now')",[hashToken(raw)]);if(!row||row.status!=="ACTIVE")return null;return row;}
export async function requireUser():Promise<User>{const user=await getCurrentUser();if(!user)redirect("/login");return user;}
export async function requireAdmin():Promise<User>{const user=await requireUser();if(user.role!=="ADMIN")redirect("/dashboard");return user;}
export async function revokeUserSessions(userId:string):Promise<void>{await run("DELETE FROM sessions WHERE user_id=?",[userId]);}
