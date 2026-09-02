import { NextResponse } from "next/server";
import { issueCsrf } from "@/lib/csrf";
export async function GET(){return NextResponse.json({token:await issueCsrf()});}

