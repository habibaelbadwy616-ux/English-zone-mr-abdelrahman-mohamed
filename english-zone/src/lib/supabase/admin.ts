import "server-only";
import { createClient } from "@supabase/supabase-js";

function isServiceRoleKey(key: string) {
  if (key.startsWith("sb_secret_")) return true;

  const parts = key.split(".");
  if (parts.length !== 3) return false;

  try {
    const claims = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    return claims.role === "service_role";
  } catch {
    return false;
  }
}

export function createAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey || !isServiceRoleKey(serviceRoleKey)) return null;
  return createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}