import { Check, Clock3, LockKeyhole } from "lucide-react";

const states = {
  account_active: { title: "Account active", description: "Your student account is ready. Sign in to continue learning.", icon: Check },
  payment_pending: { title: "Payment pending", description: "Your account is set up. Course access will be available when payment is confirmed.", icon: Clock3 },
  access_pending: { title: "Waiting for teacher approval", description: "Your teacher will review your account before you can enter the student dashboard.", icon: LockKeyhole },
} as const;

export function StudentAccessStatus({ status }: { status: keyof typeof states }) {
  const state = states[status];
  const Icon = state.icon;
  return <div className={`access-status access-status-${status}`} role="status"><span className="access-status-icon"><Icon size={17} /></span><div><strong>{state.title}</strong><p>{state.description}</p></div></div>;
}