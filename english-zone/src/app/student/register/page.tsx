import { AuthForm } from "@/components/auth-forms";
import { AuthShell } from "@/components/auth-shell";

export default function StudentRegisterPage() {
  return <AuthShell mode="student" title="Create your account" description="A few details to get your English Zone journey started."><AuthForm mode="student-register" /></AuthShell>;
}