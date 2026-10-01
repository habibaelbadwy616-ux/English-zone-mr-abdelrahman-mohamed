"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock3 } from "lucide-react";
import { StudentAccessStatus } from "@/components/student-access-status";
import { createBrowserSupabase } from "@/lib/supabase/client";

export function StudentApprovalWaiting({
  hasSession,
  email,
  note,
}: {
  hasSession: boolean;
  email?: string;
  note?: string;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!hasSession) return;

    const client = createBrowserSupabase();
    if (!client) return;
    let active = true;

    async function checkApproval(client: NonNullable<ReturnType<typeof createBrowserSupabase>>) {
      const { data: { user } } = await client.auth.getUser();
      if (!active || !user) return;

      const { data: profile } = await client
        .from("profiles")
        .select("access_status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (active && profile?.access_status === "account_active") {
        router.replace("/student/dashboard");
      }
    }

    void checkApproval(client);
    const interval = window.setInterval(() => void checkApproval(client), 5000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [hasSession, router]);

  return (
    <div className="registration-complete approval-waiting">
      <span className="registration-complete-icon"><Clock3 size={24} /></span>
      <span className="eyebrow"><span className="eyebrow-dash" /> APPLICATION RECEIVED</span>
      <h3>Waiting for <em>approval.</em></h3>
      <p className="approval-waiting-copy">
        Your teacher will review your account. This page will take you to your dashboard as soon as it is approved.
      </p>
      {email && <p className="approval-waiting-email">Account: <strong>{email}</strong></p>}
      <StudentAccessStatus status="access_pending" />
      {note && <p className="form-footnote">{note}</p>}
      {!hasSession && (
        <p className="form-footnote">
          If you need to confirm your email, do that first. Then sign in to check your approval status.
        </p>
      )}
      <Link className="button" href="/student/login">Student login</Link>
    </div>
  );
}