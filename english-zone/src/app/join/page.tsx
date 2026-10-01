import Link from "next/link";
import { ArrowRight, GraduationCap, ShieldCheck, UserRoundPlus } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";

const options = [
  {
    title: "Teacher login",
    description: "Access the teacher dashboard to manage students, lessons, courses, and approvals.",
    action: "Teacher login",
    href: "/teacher/login",
    icon: ShieldCheck,
    note: "TEACHER ACCESS",
  },
  {
    title: "Student login",
    description: "Already have a student account? Continue your lessons, exams, and progress here.",
    action: "Student login",
    href: "/student/login",
    icon: GraduationCap,
    note: "RETURNING STUDENTS",
  },
  {
    title: "Create account",
    description: "New here? Create your student account and begin your English journey.",
    action: "Create student account",
    href: "/student/register",
    icon: UserRoundPlus,
    note: "NEW STUDENTS",
  },
];

export default function JoinPage() {
  return <AuthShell mode="join" title="Join English Zone" description="Choose the path that brings you closer to your next step.">
    <div className="join-options">
      {options.map((option, index) => (
        <article key={option.href} className={`join-option join-option-${index}`}>
          <span className="join-option-icon"><option.icon size={20} strokeWidth={1.6} /></span>
          <span className="join-option-note">{option.note}</span>
          <h3>{option.title}</h3>
          <p>{option.description}</p>
          <Link href={option.href}>{option.action} <ArrowRight size={15} /></Link>
        </article>
      ))}
    </div>
    <p className="join-footer-note">One thoughtful step can take you somewhere new.</p>
  </AuthShell>;
}