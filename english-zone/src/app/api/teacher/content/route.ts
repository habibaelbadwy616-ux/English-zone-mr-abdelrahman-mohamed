import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const contentTypes = new Set([
  "course",
  "lesson",
  "playlist",
  "exam",
  "announcement",
  "challenge-set",
]);

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Teacher access is not configured." }, { status: 503 });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to the teacher account first." }, { status: 401 });
  }
  const { data: authorized, error: authorizationError } = await supabase.rpc("is_authorized_teacher");
  if (authorizationError || authorized !== true) {
    return NextResponse.json({ error: "Teacher access is required." }, { status: 403 });
  }

  let body: { type?: unknown; id?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid content deletion request." }, { status: 400 });
  }
  if (typeof body.type !== "string" || !contentTypes.has(body.type)
      || typeof body.id !== "string" || !uuidPattern.test(body.id)) {
    return NextResponse.json({ error: "Invalid content deletion request." }, { status: 400 });
  }

  if (body.type === "course") {
    const { data: payment, error: paymentError } = await supabase
      .from("payment_requests")
      .select("id")
      .eq("course_id", body.id)
      .limit(1)
      .maybeSingle();
    if (paymentError) {
      return NextResponse.json({ error: "Course payment history could not be checked." }, { status: 500 });
    }
    if (payment) {
      return NextResponse.json({
        error: "This course has payment records. Unpublish it to keep the financial history intact.",
      }, { status: 409 });
    }
  }

  let deleteError: { message: string } | null = null;
  switch (body.type) {
    case "course": {
      const result = await supabase.from("courses").delete().eq("id", body.id);
      deleteError = result.error;
      break;
    }
    case "lesson": {
      const result = await supabase.from("lessons").delete().eq("id", body.id);
      deleteError = result.error;
      break;
    }
    case "playlist": {
      const result = await supabase.from("course_playlists").delete().eq("id", body.id);
      deleteError = result.error;
      break;
    }
    case "exam": {
      const result = await supabase.from("exams").delete().eq("id", body.id);
      deleteError = result.error;
      break;
    }
    case "announcement": {
      const result = await supabase.from("announcements").delete().eq("id", body.id);
      deleteError = result.error;
      break;
    }
    case "challenge-set": {
      const result = await supabase.from("challenge_sets").delete().eq("id", body.id);
      deleteError = result.error;
      break;
    }
  }

  if (deleteError) {
    console.error("[teacher/content] Content could not be deleted", {
      type: body.type,
      code: "code" in deleteError ? deleteError.code : undefined,
      message: deleteError.message,
    });
    return NextResponse.json({ error: "The content could not be deleted." }, { status: 500 });
  }
  return NextResponse.json({ type: body.type, id: body.id });
}