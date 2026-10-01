import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function DELETE(request: Request) {
  const supabase = await createServerSupabase();
  if (!supabase) return NextResponse.json({ error: "Teacher access is not configured." }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to the teacher account first." }, { status: 401 });

  const { data: authorized, error: authorizationError } = await supabase.rpc("is_authorized_teacher");
  if (authorizationError || authorized !== true) {
    return NextResponse.json({ error: "Teacher access is required." }, { status: 403 });
  }

  let attemptId: unknown;
  try {
    ({ attemptId } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid challenge result." }, { status: 400 });
  }
  if (typeof attemptId !== "string" || !uuidPattern.test(attemptId)) {
    return NextResponse.json({ error: "Invalid challenge result." }, { status: 400 });
  }

  const admin = createAdminSupabase();
  if (!admin) return NextResponse.json({ error: "Challenge result management is not configured." }, { status: 503 });

  const { data: deleted, error: deleteError } = await admin
    .from("challenge_attempts")
    .delete()
    .eq("id", attemptId)
    .select("id")
    .maybeSingle();
  if (deleteError) {
    console.error("[teacher/challenges/results] Result could not be deleted", {
      code: deleteError.code,
      message: deleteError.message,
    });
    return NextResponse.json({ error: "The challenge result could not be deleted." }, { status: 500 });
  }
  if (!deleted) return NextResponse.json({ error: "The challenge result was not found." }, { status: 404 });

  return NextResponse.json({ deletedId: deleted.id });
}