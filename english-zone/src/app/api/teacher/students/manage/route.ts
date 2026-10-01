import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const actions = new Set(["reject", "suspend", "restore", "delete"]);

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  if (!supabase) return NextResponse.json({ error: "Teacher access is not configured." }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to the teacher account first." }, { status: 401 });
  const { data: authorized, error: authorizationError } = await supabase.rpc("is_authorized_teacher");
  if (authorizationError || authorized !== true) return NextResponse.json({ error: "Teacher access is required." }, { status: 403 });

  let body: { studentId?: unknown; action?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid student action." }, { status: 400 });
  }
  if (typeof body.studentId !== "string" || !uuidPattern.test(body.studentId)
      || typeof body.action !== "string" || !actions.has(body.action)) {
    return NextResponse.json({ error: "Invalid student action." }, { status: 400 });
  }

  const admin = createAdminSupabase();
  if (!admin) return NextResponse.json({ error: "Student management is not configured." }, { status: 503 });

  const { data: student, error: lookupError } = await admin
    .from("profiles")
    .select("user_id,access_status")
    .eq("user_id", body.studentId)
    .eq("teacher_id", user.id)
    .eq("role", "student")
    .maybeSingle();
  if (lookupError) {
    console.error("[teacher/students/manage] Student lookup failed", {
      code: lookupError.code,
      message: lookupError.message,
    });
    return NextResponse.json({ error: "The student could not be found." }, { status: 500 });
  }
  if (!student) return NextResponse.json({ error: "The student was not found for this teacher." }, { status: 404 });

  if (body.action === "reject") {
    if (student.access_status !== "access_pending") {
      return NextResponse.json({ error: "Only pending requests can be rejected." }, { status: 409 });
    }
    const { error: deleteError } = await admin.auth.admin.deleteUser(student.user_id);
    if (deleteError) {
      console.error("[teacher/students/manage] Rejected Auth user could not be deleted", {
        code: deleteError.code,
        message: deleteError.message,
      });
      return NextResponse.json({ error: "The student request could not be rejected." }, { status: 500 });
    }
    return NextResponse.json({ action: "rejected", studentId: student.user_id });
  }

  if (body.action === "delete") {
    const { error: deleteError } = await admin.auth.admin.deleteUser(student.user_id);
    if (deleteError) {
      console.error("[teacher/students/manage] Student Auth user could not be deleted", {
        code: deleteError.code,
        message: deleteError.message,
      });
      return NextResponse.json({ error: "The student could not be deleted." }, { status: 500 });
    }
    return NextResponse.json({ action: "deleted", studentId: student.user_id });
  }

  const banDuration = body.action === "suspend" ? "876000h" : "none";
  const { error: updateError } = await admin.auth.admin.updateUserById(student.user_id, {
    ban_duration: banDuration,
  });
  if (updateError) {
    console.error("[teacher/students/manage] Auth ban status update failed", {
      action: body.action,
      code: updateError.code,
      message: updateError.message,
    });
    return NextResponse.json({ error: "The student status could not be changed." }, { status: 500 });
  }

  return NextResponse.json({ action: body.action, studentId: student.user_id });
}