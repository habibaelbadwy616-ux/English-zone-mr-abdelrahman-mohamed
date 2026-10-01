import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const admin = createAdminSupabase();
  if (!admin) return NextResponse.json({ error: "Student access-code login is not configured." }, { status: 503 });

  let code: string;
  try {
    const body = await request.json();
    code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  } catch {
    return NextResponse.json({ error: "Enter a valid student access code." }, { status: 400 });
  }
  if (code.length < 6 || code.length > 128) return NextResponse.json({ error: "That access code could not be verified." }, { status: 401 });

  const codeHash = createHash("sha256").update(code).digest("hex");
  const forwardedAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const clientAddress = request.headers.get("x-real-ip")?.trim() || forwardedAddress || "local-client";
  const clientHash = createHash("sha256").update(clientAddress).digest("hex");
  const { data: rows, error: lookupError } = await admin.rpc("verify_student_access_code", { p_code_hash: codeHash, p_client_hash: clientHash });
  const email = Array.isArray(rows) && typeof rows[0]?.student_email === "string" ? rows[0].student_email : null;
  if (lookupError || !email) return NextResponse.json({ error: "That access code could not be verified. Check it with your teacher." }, { status: 401 });

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const tokenHash = linkData?.properties?.hashed_token;
  if (linkError || !tokenHash) return NextResponse.json({ error: "We could not start your session. Please try again." }, { status: 500 });

  const { data: verified, error: verifyError } = await admin.auth.verifyOtp({ type: "magiclink", token_hash: tokenHash });
  if (verifyError || !verified.session) return NextResponse.json({ error: "We could not start your session. Please try again." }, { status: 500 });

  return NextResponse.json({ session: verified.session }, { headers: { "Cache-Control": "no-store", Pragma: "no-cache" } });
}