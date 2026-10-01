import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const admin = createAdminSupabase();
  if (!admin) return NextResponse.json({ error: "Account creation is not configured yet." }, { status: 503 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Check the registration details and try again." }, { status: 400 });
  }

  const fields = ["teacherCode", "fullName", "phone", "guardianPhone", "academicStage"] as const;
  const academicStage = typeof body.academicStage === "string" ? body.academicStage.trim() : "";
  const educationalSystem = typeof body.educationalSystem === "string" ? body.educationalSystem.trim() || null : null;
  const challengeAttemptId = typeof body.challengeAttemptId === "string" ? body.challengeAttemptId.trim() || null : null;

  if (fields.some((field) => typeof body[field] !== "string" || !(body[field] as string).trim())
      || (academicStage !== "3rd Preparatory" && !educationalSystem)
      || (educationalSystem !== null && !["general", "baccalaureate"].includes(educationalSystem))
      || (challengeAttemptId !== null && !uuidPattern.test(challengeAttemptId))) {
    return NextResponse.json({ error: "Complete the required registration details." }, { status: 400 });
  }

  const teacherCodeHash = createHash("sha256").update((body.teacherCode as string).trim().toUpperCase()).digest("hex");
  const signupToken = randomBytes(32).toString("hex");
  const signupTokenHash = createHash("sha256").update(signupToken).digest("hex");
  const { error } = await admin.rpc("prepare_student_signup", {
    p_teacher_code_hash: teacherCodeHash,
    p_signup_token_hash: signupTokenHash,
    p_full_name: (body.fullName as string).trim(),
    p_phone: (body.phone as string).trim(),
    p_guardian_phone: (body.guardianPhone as string).trim(),
    p_academic_stage: academicStage,
    p_educational_system: educationalSystem,
    p_challenge_attempt_id: challengeAttemptId,
  });

  if (error) return NextResponse.json({ error: error.message.includes("Teacher code") ? "The teacher code could not be verified. Check the code with your teacher." : "We could not validate these registration details." }, { status: 400 });
  return NextResponse.json({ signupToken }, { headers: { "Cache-Control": "no-store", Pragma: "no-cache" } });
}