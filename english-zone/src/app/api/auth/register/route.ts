import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const stages = new Set(["3rd Preparatory", "1st Secondary", "2nd Secondary", "3rd Secondary"]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const admin = createAdminSupabase();
  if (!url || !anonKey || !admin) {
    return NextResponse.json({ error: "Student registration is not configured." }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Check the registration details and try again." }, { status: 400 });
  }

  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const guardianPhone = typeof body.guardianPhone === "string" ? body.guardianPhone.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const academicStage = typeof body.academicStage === "string" ? body.academicStage.trim() : "";
  const educationalSystem = typeof body.educationalSystem === "string" ? body.educationalSystem.trim() || null : null;
  const challengeAttemptId = typeof body.challengeAttemptId === "string" ? body.challengeAttemptId.trim() || null : null;

  if (fullName.length < 2 || fullName.length > 120 || phone.length < 6 || guardianPhone.length < 6
      || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8 || !stages.has(academicStage)
      || (academicStage !== "3rd Preparatory" && !["general", "baccalaureate"].includes(educationalSystem ?? ""))
      || (educationalSystem !== null && !["general", "baccalaureate"].includes(educationalSystem))
      || (challengeAttemptId !== null && !uuidPattern.test(challengeAttemptId))) {
    return NextResponse.json({ error: "Complete the required registration details." }, { status: 400 });
  }

  const { data: teacher, error: teacherError } = await admin
    .from("teacher_access")
    .select("teacher_id")
    .eq("is_active", true)
    .single();
  if (teacherError || !teacher) {
    console.error("[auth/register] Active teacher lookup failed", {
      code: teacherError?.code,
      message: teacherError?.message,
    });
    return NextResponse.json({ error: "Student registration is not available right now." }, { status: 503 });
  }

  const auth = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: created, error: signupError } = await auth.auth.signUp({
    email,
    password,
    options: {
      data: {
        role: "student",
        full_name: fullName,
        phone,
        guardian_phone: guardianPhone,
        academic_stage: academicStage,
        educational_system: educationalSystem,
        challenge_attempt_id: challengeAttemptId,
      },
    },
  });
  if (signupError || !created.user) {
    return NextResponse.json({ error: signupError?.message ?? "We could not create your account." }, { status: 400 });
  }
  if (created.user.identities?.length === 0) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  const userId = created.user.id;
  const { error: profileError } = await admin.from("profiles").upsert({
    user_id: userId,
    role: "student",
    full_name: fullName,
    phone,
    guardian_phone: guardianPhone,
    academic_stage: academicStage,
    educational_system: educationalSystem,
    teacher_id: teacher.teacher_id,
    access_status: "access_pending",
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });

  if (profileError) {
    console.error("[auth/register] Pending profile upsert failed", {
      code: profileError.code,
      message: profileError.message,
      details: profileError.details,
      hint: profileError.hint,
    });
    const { error: cleanupError } = await admin.auth.admin.deleteUser(userId);
    if (cleanupError) {
      console.error("[auth/register] Could not remove incomplete Auth user", {
        userId,
        code: cleanupError.code,
        message: cleanupError.message,
      });
    }
    return NextResponse.json({ error: "Your account could not be submitted for approval." }, { status: 500 });
  }

  if (challengeAttemptId) {
    const { data: challengeAttempt, error: attemptLookupError } = await admin
      .from("challenge_attempts")
      .select("id,claimed_by,expires_at")
      .eq("id", challengeAttemptId)
      .maybeSingle();

    if (attemptLookupError) {
      console.error("[auth/register] Challenge result lookup failed", {
        code: attemptLookupError.code,
        message: attemptLookupError.message,
      });
      await admin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: "Your challenge result could not be linked to this account." }, { status: 500 });
    }

    if (!challengeAttempt || new Date(challengeAttempt.expires_at) <= new Date()
      || (challengeAttempt.claimed_by && challengeAttempt.claimed_by !== userId)) {
      await admin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: "This challenge result is no longer available to save." }, { status: 409 });
    }

    if (challengeAttempt.claimed_by !== userId) {
      const { data: linkedAttempt, error: linkError } = await admin
        .from("challenge_attempts")
        .update({ claimed_by: userId })
        .eq("id", challengeAttemptId)
        .is("claimed_by", null)
        .gt("expires_at", new Date().toISOString())
        .select("id")
        .maybeSingle();

      if (linkError || !linkedAttempt) {
        console.error("[auth/register] Challenge result could not be linked", {
          code: linkError?.code,
          message: linkError?.message,
        });
        await admin.auth.admin.deleteUser(userId);
        return NextResponse.json({ error: "Your challenge result could not be linked to this account." }, { status: 409 });
      }
    }
  }

  return NextResponse.json({ userId, session: created.session }, {
    headers: { "Cache-Control": "no-store", Pragma: "no-cache" },
  });
}