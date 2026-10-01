import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const admin = createAdminSupabase();
  if (!admin) return NextResponse.json({ error: "Account setup could not be completed." }, { status: 503 });

  let userId: string;
  let signupToken: string;
  try {
    const body = await request.json();
    userId = typeof body.userId === "string" ? body.userId : "";
    signupToken = typeof body.signupToken === "string" ? body.signupToken : "";
  } catch {
    return NextResponse.json({ error: "Account setup could not be completed." }, { status: 400 });
  }

  if (!/^[0-9a-f-]{36}$/i.test(userId) || !/^[0-9a-f]{64}$/i.test(signupToken)) return NextResponse.json({ error: "Account setup could not be completed." }, { status: 400 });
  const tokenHash = createHash("sha256").update(signupToken).digest("hex");
  const { data, error } = await admin.rpc("clear_student_signup_token", { p_user_id: userId, p_signup_token_hash: tokenHash });
  if (error || data !== true) return NextResponse.json({ error: "Account setup could not be completed." }, { status: 403 });
  return NextResponse.json({ cleared: true }, { headers: { "Cache-Control": "no-store" } });
}