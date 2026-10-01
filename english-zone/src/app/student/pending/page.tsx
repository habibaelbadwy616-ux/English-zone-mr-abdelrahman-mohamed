import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { StudentApprovalWaiting } from "@/components/student-approval-waiting";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function StudentPendingPage() {
  const supabase = await createServerSupabase();
  if (!supabase) redirect("/student/login");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/student/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role,access_status")
    .eq("user_id", user.id)
    .maybeSingle();
  if (profile?.role !== "student") redirect("/student/login");
  if (profile.access_status === "account_active") redirect("/student/dashboard");

  return (
    <AuthShell
      mode="student"
      title="Your account is under review"
      description="Your teacher will review your request before you enter the student dashboard."
    >
      <StudentApprovalWaiting hasSession email={user.email} />
    </AuthShell>
  );
}