import { NextResponse } from "next/server";
import { destroySession, getCurrentUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
export async function POST(request:Request){const user=await getCurrentUser();await destroySession();if(user)audit("LOGOUT",user.id,user.id);return NextResponse.redirect(new URL("/login", request.url));}

