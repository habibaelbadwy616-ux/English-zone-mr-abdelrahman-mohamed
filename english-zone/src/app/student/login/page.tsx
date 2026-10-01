import { AuthForm } from "@/components/auth-forms";
import { AuthShell } from "@/components/auth-shell";

export default function StudentLoginPage() {
  return <AuthShell mode="student" title="Student login" description="Sign in to continue your learning journey."><AuthForm mode="student-login" /></AuthShell>;
}