import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

type ChallengeQuestionInput = {
  prompt: string;
  choices: string[];
  correctAnswer: string;
};

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

  let title: string;
  let questions: ChallengeQuestionInput[];
  try {
    const body = await request.json();
    title = typeof body.title === "string" ? body.title.trim() : "";
    questions = body.questions;
    if (!title || title.length > 100 || !Array.isArray(questions) || questions.length !== 5
        || questions.some((question) => typeof question?.prompt !== "string"
          || !question.prompt.trim() || question.prompt.length > 500
          || !Array.isArray(question.choices) || question.choices.length < 2
          || question.choices.length > 4
          || question.choices.some((choice: unknown) => typeof choice !== "string" || !choice.trim() || choice.length > 200)
          || typeof question.correctAnswer !== "string"
          || !question.choices.includes(question.correctAnswer.trim()))) {
      throw new Error("invalid challenge");
    }
    questions = questions.map((question) => ({
      prompt: question.prompt.trim(),
      choices: question.choices.map((choice) => choice.trim()),
      correctAnswer: question.correctAnswer.trim(),
    }));
  } catch {
    return NextResponse.json({ error: "Add a title and exactly five complete questions with valid answers." }, { status: 400 });
  }

  const { data: challenge, error: insertError } = await supabase
    .from("challenge_sets")
    .insert({ title, is_published: true })
    .select("id")
    .single();
  if (insertError || !challenge) {
    console.error("[teacher/challenges] Challenge could not be created", {
      code: insertError?.code,
      message: insertError?.message,
    });
    return NextResponse.json({ error: "The challenge could not be saved." }, { status: 500 });
  }

  const { error: questionError } = await supabase.from("challenge_questions").insert(
    questions.map((question, index) => ({
      challenge_id: challenge.id,
      prompt: question.prompt,
      choices: question.choices,
      correct_answer: question.correctAnswer,
      position: index + 1,
      is_published: true,
    })),
  );
  if (questionError) {
    await supabase.from("challenge_sets").delete().eq("id", challenge.id);
    const errorDetails = {
      code: questionError.code,
      message: questionError.message,
      details: questionError.details,
      hint: questionError.hint,
    };
    console.error("[teacher/challenges] Challenge questions could not be saved", JSON.stringify(errorDetails));
    return NextResponse.json({
      error: "The five questions could not be saved.",
      ...(process.env.NODE_ENV === "development" ? { details: questionError.message } : {}),
    }, { status: 500 });
  }

  return NextResponse.json({ id: challenge.id, title, questionCount: 5 }, { status: 201 });
}