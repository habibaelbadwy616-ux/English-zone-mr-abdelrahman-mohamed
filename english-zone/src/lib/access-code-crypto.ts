import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function encryptionKey() {
  const secret = process.env.STUDENT_ACCESS_CODE_ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Student access-code encryption is not configured.");
  return createHash("sha256").update(`english-zone:student-access-code:v1:${secret}`).digest();
}

export function encryptStudentAccessCode(code: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(code, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptStudentAccessCode(value: string) {
  const [version, encodedIv, encodedTag, encodedValue] = value.split(".");
  if (version !== "v1" || !encodedIv || !encodedTag || !encodedValue) {
    throw new Error("Student access-code ciphertext is invalid.");
  }
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(encodedIv, "base64url"));
  decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encodedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}