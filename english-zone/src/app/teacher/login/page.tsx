import { AuthForm } from "@/components/auth-forms";
import { AuthShell } from "@/components/auth-shell";

export default function TeacherLoginPage() {
  return <AuthShell mode="teacher" title="Teacher login" description="Sign in to your secure English Zone teacher space."><AuthForm mode="teacher-login" /></AuthShell>;
}