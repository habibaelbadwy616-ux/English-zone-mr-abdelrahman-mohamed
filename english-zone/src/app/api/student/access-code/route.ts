import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { decryptStudentAccessCode } from "@/lib/access-code-crypto";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createServerSupabase();
  if (!supabase) return NextResponse.json({ error: "Student access is not configured." }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to the student account first." }, { status: 401 });

  const { data: profile } = await supabase.from("profiles")
    .select("role,access_status")
    .eq("user_id", user.id)
    .maybeSingle();
  if (profile?.role !== "student" || profile.access_status !== "account_active") {
    return NextResponse.json({ error: "An active student account is required." }, { status: 403 });
  }

  const admin = createAdminSupabase();
  if (!admin) return NextResponse.json({ error: "Student access-code lookup is not configured." }, { status: 503 });
  const { data: accessCode, error } = await admin.from("student_access_codes")
    .select("code_ciphertext,is_active,expires_at")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) {
    console.error("[student/access-code] Access code lookup failed", { code: error.code, message: error.message });
    return NextResponse.json({ error: "The access code could not be loaded." }, { status: 500 });
  }
  if (!accessCode?.is_active || (accessCode.expires_at && new Date(accessCode.expires_at) <= new Date())) {
    return NextResponse.json({ error: "There is no active access code for this account." }, { status: 404 });
  }
  if (!accessCode.code_ciphertext) {
    return NextResponse.json({ error: "This code was created before secure code display was enabled. Ask your teacher to issue a new one." }, { status: 404 });
  }

  try {
    return NextResponse.json({ accessCode: decryptStudentAccessCode(accessCode.code_ciphertext) }, {
      headers: { "Cache-Control": "no-store", Pragma: "no-cache" },
    });
  } catch (reason) {
    console.error("[student/access-code] Access code decryption failed", reason);
    return NextResponse.json({ error: "The access code could not be loaded." }, { status: 500 });
  }
}