import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const email = process.argv[2]?.trim().toLowerCase();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("Usage: npm run provision:teacher -- teacher@example.com");
  process.exit(1);
}
if (!url || !serviceRoleKey) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local first.");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
const { error: inviteError } = await supabase.from("teacher_invites").upsert({ email, is_active: true }, { onConflict: "email" });
if (inviteError) throw new Error(`Could not authorize the teacher email: ${inviteError.message}`);

const temporaryPassword = randomBytes(24).toString("base64url");
const { data, error } = await supabase.auth.admin.createUser({
  email,
  password: temporaryPassword,
  email_confirm: true,
  user_metadata: { role: "teacher", full_name: "Mr Abdelrahman Mohamed" },
});
if (error || !data.user) throw new Error(`Could not create the teacher account: ${error?.message ?? "No user returned"}`);

const teacherCode = randomBytes(8).toString("hex").toUpperCase();
const codeHash = createHash("sha256").update(teacherCode).digest("hex");
const { error: codeError } = await supabase.from("teacher_codes").insert({ teacher_id: data.user.id, code_hash: codeHash });
if (codeError) throw new Error(`Teacher account exists, but the student registration code could not be stored: ${codeError.message}`);

console.log("Teacher account created. Share these credentials with the teacher through a secure channel, then change the temporary password:");
console.log(`Email: ${email}`);
console.log(`Temporary password: ${temporaryPassword}`);
console.log(`Student registration teacher code: ${teacherCode}`);