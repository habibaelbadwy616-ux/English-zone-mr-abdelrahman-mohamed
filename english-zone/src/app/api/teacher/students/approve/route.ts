import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { encryptStudentAccessCode } from "@/lib/access-code-crypto";

export const runtime = "nodejs";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
  if (!admin) return NextResponse.json({ error: "Student approval is not configured." }, { status: 503 });

  const { data: student, error: approvalError } = await admin
    .from("profiles")
    .update({ access_status: "account_active", updated_at: new Date().toISOString() })
    .eq("user_id", studentId)
    .eq("teacher_id", user.id)
    .eq("role", "student")
    .eq("access_status", "access_pending")
    .select("user_id")
    .maybeSingle();

  if (approvalError) {
    console.error("[teacher/students/approve] Profile update failed", {
      code: approvalError.code,
      message: approvalError.message,
      details: approvalError.details,
      hint: approvalError.hint,
    });
    return NextResponse.json({ error: "The student account could not be approved." }, { status: 500 });
  }

  if (!student) {
    return NextResponse.json({ error: "The student is not awaiting approval by this teacher." }, { status: 404 });
  }

  const { data: existingCode, error: codeLookupError } = await admin
    .from("student_access_codes")
    .select("user_id")
    .eq("user_id", student.user_id)
    .maybeSingle();
  if (codeLookupError) {
    await admin.from("profiles").update({ access_status: "access_pending" }).eq("user_id", student.user_id).eq("teacher_id", user.id);
    console.error("[teacher/students/approve] Access-code lookup failed", {
      code: codeLookupError.code,
      message: codeLookupError.message,
    });
    return NextResponse.json({ error: "The student was approved, but their access code could not be checked." }, { status: 500 });
  }

  let accessCode: string | null = null;
  if (!existingCode) {
    accessCode = randomBytes(12).toString("hex").toUpperCase();
    const codeHash = createHash("sha256").update(accessCode).digest("hex");
    const { error: codeInsertError } = await admin.from("student_access_codes").insert({
      user_id: student.user_id,
      code_hash: codeHash,
      code_ciphertext: encryptStudentAccessCode(accessCode),
      is_active: true,
      is_single_use: false,
    });
    if (codeInsertError) {
      const { data: concurrentCode } = await admin
        .from("student_access_codes")
        .select("user_id")
        .eq("user_id", student.user_id)
        .maybeSingle();
      if (concurrentCode) {
        accessCode = null;
      } else {
        await admin.from("profiles").update({ access_status: "access_pending" }).eq("user_id", student.user_id).eq("teacher_id", user.id);
        console.error("[teacher/students/approve] Access-code creation failed", {
          code: codeInsertError.code,
          message: codeInsertError.message,
        });
        return NextResponse.json({ error: "The student could not be approved because their access code could not be created." }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ approved: true, studentId: student.user_id, accessCode });
}