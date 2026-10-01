import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { decryptStudentAccessCode, encryptStudentAccessCode } from "@/lib/access-code-crypto";

export const runtime = "nodejs";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const supabase = await createServerSupabase();
  if (!supabase) return NextResponse.json({ error: "Teacher access is not configured." }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to the teacher account first." }, { status: 401 });
  const { data: authorized, error: authorizationError } = await supabase.rpc("is_authorized_teacher");
  if (authorizationError || authorized !== true) return NextResponse.json({ error: "Teacher access is required." }, { status: 403 });

  const studentId = new URL(request.url).searchParams.get("studentId");
  if (!studentId || !uuidPattern.test(studentId)) {
    return NextResponse.json({ error: "The student account could not be identified." }, { status: 400 });
  }

  const admin = createAdminSupabase();
  if (!admin) return NextResponse.json({ error: "Student access-code lookup is not configured." }, { status: 503 });
  const { data: profile } = await admin.from("profiles")
    .select("user_id")
    .eq("user_id", studentId)
    .eq("teacher_id", user.id)
    .eq("role", "student")
    .maybeSingle();
  if (!profile) return NextResponse.json({ error: "The student was not found for this teacher." }, { status: 404 });

  const { data: accessCode, error } = await admin.from("student_access_codes")
    .select("code_ciphertext,is_active,expires_at")
    .eq("user_id", studentId)
    .maybeSingle();
  if (error) {
    console.error("[teacher/students/access-code] Access code lookup failed", { code: error.code, message: error.message });
    return NextResponse.json({ error: "The access code could not be loaded." }, { status: 500 });
  }
  if (!accessCode?.is_active || (accessCode.expires_at && new Date(accessCode.expires_at) <= new Date())) {
    return NextResponse.json({ error: "There is no active access code for this student." }, { status: 404 });
  }
  if (!accessCode.code_ciphertext) {
    return NextResponse.json({ error: "This older code cannot be recovered. Issue a new code for this student." }, { status: 404 });
  }

  try {
    return NextResponse.json({ accessCode: decryptStudentAccessCode(accessCode.code_ciphertext) }, {
      headers: { "Cache-Control": "no-store", Pragma: "no-cache" },
    });
  } catch (reason) {
    console.error("[teacher/students/access-code] Access code decryption failed", reason);
    return NextResponse.json({ error: "The access code could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  if (!supabase) return NextResponse.json({ error: "Teacher access is not configured." }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to the teacher account first." }, { status: 401 });
  const { data: authorized, error: authorizationError } = await supabase.rpc("is_authorized_teacher");
  if (authorizationError || authorized !== true) return NextResponse.json({ error: "Teacher access is required." }, { status: 403 });

  let studentId: unknown;
  try {
    studentId = (await request.json()).studentId;
  } catch {
    return NextResponse.json({ error: "The student account could not be identified." }, { status: 400 });
  }
  if (typeof studentId !== "string" || !uuidPattern.test(studentId)) {
    return NextResponse.json({ error: "The student account could not be identified." }, { status: 400 });
  }

  const admin = createAdminSupabase();
  if (!admin) return NextResponse.json({ error: "Student access-code issuance is not configured." }, { status: 503 });

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("user_id,access_status")
    .eq("user_id", studentId)
    .eq("teacher_id", user.id)
    .eq("role", "student")
    .maybeSingle();
  if (profileError || !profile) {
    return NextResponse.json({ error: "The student was not found for this teacher." }, { status: 404 });
  }
  if (profile.access_status !== "account_active") {
    return NextResponse.json({ error: "Approve the student account before issuing an access code." }, { status: 409 });
  }

  const { data: existingCode, error: lookupError } = await admin
    .from("student_access_codes")
    .select("user_id")
    .eq("user_id", studentId)
    .maybeSingle();
  if (lookupError) {
    return NextResponse.json({ error: "The student's access-code record could not be checked." }, { status: 500 });
  }
  if (existingCode) {
    return NextResponse.json({ error: "This student already has an access code. It was not changed." }, { status: 409 });
  }

  const accessCode = randomBytes(12).toString("hex").toUpperCase();
  const codeHash = createHash("sha256").update(accessCode).digest("hex");
  const { error: insertError } = await admin.from("student_access_codes").insert({
    user_id: studentId,
    code_hash: codeHash,
    code_ciphertext: encryptStudentAccessCode(accessCode),
    is_active: true,
    is_single_use: false,
  });
  if (insertError) {
    console.error("[teacher/students/access-code] Access code could not be issued", {
      code: insertError.code,
      message: insertError.message,
    });
    return NextResponse.json({ error: "The access code could not be issued." }, { status: 500 });
  }

  return NextResponse.json({ studentId, accessCode }, { headers: { "Cache-Control": "no-store", Pragma: "no-cache" } });
}