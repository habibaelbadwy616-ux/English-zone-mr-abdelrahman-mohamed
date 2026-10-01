"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Clock3, Copy, LoaderCircle, WalletCards } from "lucide-react";
import { createBrowserSupabase } from "@/lib/supabase/client";

type CheckoutCourse = {
  id: string;
  name: string;
  description: string;
  price: number | null;
  original_price: number | null;
  discount_percent: number;
  is_free: boolean;
};

export function CourseCheckoutForm({
  course,
  student,
  instapayNumber,
  enrollmentStatus,
  paymentStatus,
  rejectionNote,
}: {
  course: CheckoutCourse;
  student: { id: string; name: string; email: string; phone: string };
  instapayNumber: string;
  enrollmentStatus: string | null;
  paymentStatus: string | null;
  rejectionNote: string;
}) {
  const router = useRouter();
  const [senderPhone, setSenderPhone] = useState(student.phone);
  const [transferDate, setTransferDate] = useState(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  });
  const [proof, setProof] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);

  async function startFreeCourse() {
    const supabase = createBrowserSupabase();
    if (!supabase) {
      setError("Course access is not available right now.");
      return;
    }
    setBusy(true);
    setError("");
    const { error: enrollError } = await supabase.rpc("student_enroll_free_course", {
      p_course_id: course.id,
    });
    if (enrollError) setError(enrollError.message || "This course could not be opened.");
    else router.replace("/student/dashboard");
    setBusy(false);
  }

  async function submitPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!instapayNumber.trim()) {
      setError("The payment account is not configured. Please contact your teacher.");
      return;
    }
    if (!proof || senderPhone.trim().length < 6 || !transferDate) {
      setError("Enter the transfer phone and date, then attach your receipt.");
      return;
    }
    if (proof.size > 5 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(proof.type)) {
      setError("Choose a PDF or image smaller than 5 MB.");
      return;
    }
    const supabase = createBrowserSupabase();
    if (!supabase) {
      setError("Payment services are not available right now.");
      return;
    }

    setBusy(true);
    const extension = proof.type === "application/pdf" ? "pdf" : proof.type.split("/")[1];
    const path = `${student.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("payment-proofs")
      .upload(path, proof, { upsert: false, contentType: proof.type });
    if (uploadError) {
      setError("We could not upload that receipt. Please try again.");
      setBusy(false);
      return;
    }

    const { error: paymentError } = await supabase.rpc("submit_course_payment", {
      p_course_id: course.id,
      p_proof_path: path,
      p_sender_phone: senderPhone.trim(),
      p_transfer_date: transferDate,
    });
    if (paymentError) {
      await supabase.storage.from("payment-proofs").remove([path]);
      setError(paymentError.message || "We could not submit your payment.");
    } else {
      setSubmitted(true);
      setProof(null);
      router.refresh();
    }
    setBusy(false);
  }

  async function copyInstaPay() {
    await navigator.clipboard.writeText(instapayNumber);
    setCopied(true);
  }

  if (enrollmentStatus === "active") {
    return (
      <div className="checkout-state checkout-state-success">
        <CheckCircle2 size={25} />
        <h2>Course access is active</h2>
        <p>You already have access to {course.name}.</p>
        <Link className="button" href="/student/dashboard">Go to my courses <ArrowRight size={15} /></Link>
      </div>
    );
  }

  if (submitted || paymentStatus === "pending") {
    return (
      <div className="checkout-state">
        <Clock3 size={25} />
        <h2>Payment under review</h2>
        <p>Your course will open as soon as your teacher approves the transfer.</p>
        <Link className="button button-outline" href="/student/dashboard">Back to my dashboard <ArrowRight size={15} /></Link>
      </div>
    );
  }

  if (course.is_free) {
    return (
      <div className="checkout-state checkout-state-success">
        <CheckCircle2 size={25} />
        <h2>Ready to start?</h2>
        <p>This course is free. Add it to your active courses now.</p>
        {error && <p className="form-message form-message-error" role="alert">{error}</p>}
        <button className="button" type="button" disabled={busy} onClick={() => void startFreeCourse()}>
          {busy ? <LoaderCircle className="spin" size={15} /> : <ArrowRight size={15} />} Start course
        </button>
      </div>
    );
  }

  return (
    <div className="checkout-grid">
      <section className="checkout-student-info">
        <span className="eyebrow"><span className="eyebrow-dash" /> STUDENT DETAILS</span>
        <h2>{student.name}</h2>
        <p>{student.email}</p>
        <p>{student.phone}</p>
        <small>Payment and access will be linked to this student account.</small>
      </section>
      <form className="payment-panel checkout-payment-form" onSubmit={submitPayment}>
        <span className="eyebrow"><span className="eyebrow-dash" /> COURSE PAYMENT</span>
        <h2>{course.name}</h2>
        <p className="checkout-course-description">{course.description || "Course access begins after your transfer is approved."}</p>
        <div className="checkout-price-row">
          <span>Course total</span>
          {course.original_price && course.original_price > (course.price ?? 0) && <del>{Number(course.original_price).toLocaleString("en-EG")} EGP</del>}
          <strong>{Number(course.price ?? 0).toLocaleString("en-EG")} EGP</strong>
          {course.discount_percent > 0 && <small>{course.discount_percent}% off</small>}
        </div>
        <div className="instapay-box">
          <span>PAYMENT METHOD</span>
          <strong>InstaPay</strong>
          <small>Send the exact course total to</small>
          <div>
            <b>{instapayNumber || "Contact your teacher for the payment number."}</b>
            {instapayNumber && <button className="icon-button" type="button" aria-label="Copy InstaPay number" title="Copy InstaPay number" onClick={() => void copyInstaPay()}><Copy size={15} /></button>}
          </div>
          {copied && <small role="status">Number copied</small>}
        </div>
        {paymentStatus === "rejected" && rejectionNote && <p className="rejection-note">Previous payment: {rejectionNote}</p>}
        <label className="form-field">
          <span>Transfer sender phone</span>
          <input type="tel" inputMode="tel" value={senderPhone} onChange={(event) => setSenderPhone(event.target.value)} minLength={6} maxLength={30} required />
        </label>
        <label className="form-field">
          <span>Transfer date</span>
          <input type="date" value={transferDate} max={new Date().toISOString().slice(0, 10)} onChange={(event) => setTransferDate(event.target.value)} required />
        </label>
        <label className="form-field">
          <span>Payment receipt</span>
          <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => setProof(event.target.files?.[0] ?? null)} required />
          <small>Upload a clear screenshot or PDF, up to 5 MB.</small>
        </label>
        {error && <p className="form-message form-message-error" role="alert">{error}</p>}
        <button className="button" type="submit" disabled={busy}>
          {busy ? <><LoaderCircle className="spin" size={15} /> Sending for review…</> : <>Submit payment for approval <ArrowRight size={15} /></>}
        </button>
        <small className="checkout-approval-note"><WalletCards size={14} /> Lessons and exams unlock after teacher approval.</small>
      </form>
    </div>
  );
}