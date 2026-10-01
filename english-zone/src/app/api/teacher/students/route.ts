import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { encryptStudentAccessCode } from "@/lib/access-code-crypto";

export const runtime = "nodejs";

const stages = new Set(["3rd Preparatory", "1st Secondary", "2nd Secondary", "3rd Secondary"]);
const imageTypes: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

async function removeIncompleteStudent(admin: NonNullable<ReturnType<typeof createAdminSupabase>>, userId: string) {
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    console.error("[teacher/students] Could not remove incomplete Auth user", {
      userId,
      code: error.code,
      message: error.message,
    });
  }
}

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  if (!supabase) return NextResponse.json({ error: "Teacher access is not configured." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to the teacher account first." }, { status: 401 });
  const { data: authorized, error: authorizationError } = await supabase.rpc("is_authorized_teacher");
  if (authorizationError || authorized !== true) return NextResponse.json({ error: "Teacher access is required." }, { status: 403 });

  const admin = createAdminSupabase();
  if (!admin) return NextResponse.json({ error: "Student creation is not configured. Check SUPABASE_SERVICE_ROLE_KEY." }, { status: 503 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Check the student details and try again." }, { status: 400 });
  }
  const fullName = String(form.get("fullName") ?? "").trim();
  const phone = String(form.get("phone") ?? "").trim();
  const guardianPhone = String(form.get("guardianPhone") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const academicStage = String(form.get("academicStage") ?? "").trim();
  const educationalSystem = String(form.get("educationalSystem") ?? "").trim() || null;
  const courseId = String(form.get("courseId") ?? "").trim() || null;
  const avatarField = form.get("avatar");
  const avatar = avatarField instanceof File && avatarField.size > 0 ? avatarField : null;

  if (fullName.length < 2 || fullName.length > 120 || phone.length < 6 || guardianPhone.length < 6
      || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !stages.has(academicStage)
      || (academicStage !== "3rd Preparatory" && !["general", "baccalaureate"].includes(educationalSystem ?? ""))
      || (educationalSystem !== null && !["general", "baccalaureate"].includes(educationalSystem))) {
    return NextResponse.json({ error: "Complete the required student details." }, { status: 400 });
  }
  if (avatar && (!imageTypes[avatar.type] || avatar.size > 5 * 1024 * 1024)) {
    return NextResponse.json({ error: "Choose a JPG, PNG, or WebP photo under 5 MB." }, { status: 400 });
  }

  const temporaryPassword = randomBytes(32).toString("base64url");
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: { role: "student", full_name: fullName, phone, guardian_phone: guardianPhone, academic_stage: academicStage, educational_system: educationalSystem },
  });
  if (createError || !created.user) {
    const errorMessage = createError?.message.toLowerCase() ?? "";
    console.error("[teacher/students] Auth user creation failed", {
      code: createError?.code,
      status: createError?.status,
      message: createError?.message,
    });
    if (errorMessage.includes("invalid api key") || createError?.status === 401) {
      return NextResponse.json({ error: "Student creation is misconfigured. Check the Supabase service-role key." }, { status: 503 });
    }
    if (errorMessage.includes("already") || createError?.code === "user_already_exists") {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: "We could not create this student account." }, { status: 500 });
  }

  const userId = created.user.id;
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .upsert({
      user_id: userId,
      role: "student",
      full_name: fullName,
      phone,
      guardian_phone: guardianPhone,
      academic_stage: academicStage,
      educational_system: educationalSystem,
      teacher_id: user.id,
      access_status: "account_active",
    }, { onConflict: "user_id" })
    .select("student_code,access_status")
    .single();
  if (profileError || !profile) {
    console.error("[teacher/students] Profile upsert failed", {
      code: profileError?.code,
      message: profileError?.message,
      details: profileError?.details,
      hint: profileError?.hint,
    });
    await removeIncompleteStudent(admin, userId);
    return NextResponse.json({ error: "The student account could not be completed." }, { status: 500 });
  }

  const accessCode = randomBytes(12).toString("hex").toUpperCase();
  const codeHash = createHash("sha256").update(accessCode).digest("hex");
  const { error: codeError } = await admin.from("student_access_codes").insert({
    user_id: userId,
    code_hash: codeHash,
    code_ciphertext: encryptStudentAccessCode(accessCode),
    is_active: true,
    is_single_use: false,
  });
  if (codeError) {
    console.error("[teacher/students] Access-code insert failed", {
      code: codeError.code,
      message: codeError.message,
      details: codeError.details,
      hint: codeError.hint,
    });
    await removeIncompleteStudent(admin, userId);
    return NextResponse.json({ error: "We could not finish setting up student access." }, { status: 500 });
  }

  if (avatar) {
    const path = `${userId}/profile.${imageTypes[avatar.type]}`;
    const { error: uploadError } = await admin.storage.from("avatars").upload(path, await avatar.arrayBuffer(), { contentType: avatar.type, upsert: true });
    if (!uploadError) {
      const { data: image } = admin.storage.from("avatars").getPublicUrl(path);
      await admin.from("profiles").update({ profile_picture_url: image.publicUrl }).eq("user_id", userId);
    }
  }

  if (courseId) {
    const { data: course } = await admin.from("courses").select("id,is_free,is_published").eq("id", courseId).maybeSingle();
    if (!course?.is_published) {
      await removeIncompleteStudent(admin, userId);
      return NextResponse.json({ error: "The selected course is no longer available." }, { status: 400 });
    }
    const { error: enrollmentError } = await admin.from("course_enrollments").insert({
      student_id: userId,
      course_id: courseId,
      access_status: course.is_free ? "active" : "payment_pending",
      approved_by: course.is_free ? user.id : null,
    });
    if (enrollmentError) {
      console.error("[teacher/students] Initial enrollment insert failed", {
        code: enrollmentError.code,
        message: enrollmentError.message,
        details: enrollmentError.details,
        hint: enrollmentError.hint,
      });
      await removeIncompleteStudent(admin, userId);
      return NextResponse.json({ error: "The student was not created because the course could not be assigned." }, { status: 500 });
    }
  }

  return NextResponse.json({
    student: { id: userId, name: fullName, email, studentCode: profile.student_code, status: profile.access_status },
    accessCode,
  }, { headers: { "Cache-Control": "no-store", Pragma: "no-cache" } });
}