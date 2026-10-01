import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";

export default function StudentSuspendedPage() {
  return (
    <AuthShell
      mode="student"
      title="Account temporarily paused"
      description="Your account access is paused. Contact your teacher for help restoring access."
    >
      <div className="registration-complete">
        <span className="registration-complete-icon"><LockKeyhole size={24} /></span>
        <span className="eyebrow"><span className="eyebrow-dash" /> ACCOUNT ACCESS</span>
        <h3>Contact your <em>teacher.</em></h3>
        <p className="approval-waiting-copy">You will be able to sign in again once your teacher restores your account.</p>
        <Link className="button" href="/student/login">Student login</Link>
      </div>
    </AuthShell>
  );
}