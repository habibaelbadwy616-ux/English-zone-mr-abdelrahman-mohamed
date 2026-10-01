import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const userId = process.argv[2]?.trim();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!userId || !/^[0-9a-f-]{36}$/i.test(userId)) {
  console.error("Usage: npm run create:access-code -- STUDENT_USER_UUID");
  process.exit(1);
}
if (!url || !serviceRoleKey) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local first.");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
const { data: profile, error: profileError } = await supabase.from("profiles").select("user_id,role").eq("user_id", userId).maybeSingle();
if (profileError || profile?.role !== "student") throw new Error("No student profile was found for that user ID.");

const accessCode = randomBytes(9).toString("hex").toUpperCase();
const codeHash = createHash("sha256").update(accessCode).digest("hex");
const encryptionSecret = process.env.STUDENT_ACCESS_CODE_ENCRYPTION_KEY || serviceRoleKey;
const encryptionKey = createHash("sha256").update(`english-zone:student-access-code:v1:${encryptionSecret}`).digest();
const iv = randomBytes(12);
const cipher = createCipheriv("aes-256-gcm", encryptionKey, iv);
const encrypted = Buffer.concat([cipher.update(accessCode, "utf8"), cipher.final()]);
const codeCiphertext = ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
const { error } = await supabase.from("student_access_codes").upsert({ user_id: userId, code_hash: codeHash, code_ciphertext: codeCiphertext, is_active: true, is_single_use: false, expires_at: null, redeemed_at: null }, { onConflict: "user_id" });
if (error) throw new Error(`Could not create an access code: ${error.message}`);

console.log("Student access code created. Share it privately; this value cannot be retrieved from the database:");
console.log(accessCode);