import { NextResponse } from "next/server";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
const challengeDurationSeconds = 60;

function createAttemptToken(challengeId: string) {
  const payload = Buffer.from(JSON.stringify({ challengeId, issuedAt: Date.now() })).toString("base64url");
  const signature = createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY!).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function isAttemptTokenValid(token: string, challengeId: string) {
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) return false;

  const expected = createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY!).update(payload).digest();
  const received = Buffer.from(signature, "base64url");
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return false;

  try {
    const attempt = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    const elapsed = Date.now() - attempt.issuedAt;
    return attempt.challengeId === challengeId
      && Number.isSafeInteger(attempt.issuedAt)
      && elapsed >= 0
      && elapsed <= challengeDurationSeconds * 1000 + 5000;
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const admin = createAdminSupabase();
  if (!admin) return NextResponse.json({ error: "The challenge is not configured yet." }, { status: 503 });

  const { data: challengeSets, error: challengeError } = await admin
    .from("challenge_sets")
    .select("id,title")
    .eq("is_published", true);
  if (challengeError || !challengeSets?.length) {
    return NextResponse.json({ error: "A new challenge is being prepared. Please check back soon." }, { status: 503 });
  }

  const excludedIds = new Set(new URL(request.url).searchParams.get("exclude")?.split(",") ?? []);
  const available = challengeSets.filter((item) => !excludedIds.has(item.id));
  const candidates = available.length ? available : challengeSets;
  const offset = randomInt(candidates.length);
  const orderedCandidates = [...candidates.slice(offset), ...candidates.slice(0, offset)];
  const { data: questions, error } = await admin
    .from("challenge_questions")
    .select("id,challenge_id,prompt,choices,position")
    .in("challenge_id", orderedCandidates.map((item) => item.id))
    .eq("is_published", true)
    .order("position");
  if (error || !questions) {
    return NextResponse.json({ error: "A new challenge is being prepared. Please check back soon." }, { status: 503 });
  }

  const questionsByChallenge = new Map<string, typeof questions>();
  for (const question of questions) {
    const current = questionsByChallenge.get(question.challenge_id) ?? [];
    current.push(question);
    questionsByChallenge.set(question.challenge_id, current);
  }
  const selected = orderedCandidates.find((item) => questionsByChallenge.get(item.id)?.length === 5);
  if (!selected) {
    return NextResponse.json({ error: "A new challenge is being prepared. Please check back soon." }, { status: 503 });
  }

  return NextResponse.json({
    challengeId: selected.id,
    title: selected.title,
    durationSeconds: challengeDurationSeconds,
    attemptToken: createAttemptToken(selected.id),
    questions: (questionsByChallenge.get(selected.id) ?? []).map(({ id, prompt, choices }) => ({ id, prompt, choices })),
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const admin = createAdminSupabase();
  if (!admin) return NextResponse.json({ error: "The challenge is not configured yet." }, { status: 503 });

  let challengeId: string;
  let attemptToken: string;
  let answers: { questionId: string; choice: string }[];
  try {
    const body = await request.json();
    challengeId = body.challengeId;
    attemptToken = body.attemptToken;
    answers = body.answers;
    if (typeof challengeId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(challengeId)
      || typeof attemptToken !== "string" || attemptToken.length > 2048
        || !Array.isArray(answers) || answers.length !== 5
        || answers.some((answer) => typeof answer?.questionId !== "string" || typeof answer?.choice !== "string" || answer.choice.length > 300)) throw new Error("invalid answers");
    if (new Set(answers.map((answer) => answer.questionId)).size !== 5) throw new Error("duplicate answers");
  } catch {
    return NextResponse.json({ error: "We could not read those answers. Please try the challenge again." }, { status: 400 });
  }

  if (!isAttemptTokenValid(attemptToken, challengeId)) {
    return NextResponse.json({ error: "The challenge time limit has ended. Start a new challenge." }, { status: 410 });
  }

  const { data, error } = await admin.rpc("submit_public_challenge", {
    p_challenge_id: challengeId,
    p_answers: answers,
  });
  const result = Array.isArray(data) ? data[0] : data;
  if (error || !result) return NextResponse.json({ error: "We could not save your result. Please try again." }, { status: 500 });
  return NextResponse.json({ attemptId: result.attempt_id, score: result.score, total: result.total, discountPercent: result.discount_percent }, { headers: { "Cache-Control": "no-store" } });
}