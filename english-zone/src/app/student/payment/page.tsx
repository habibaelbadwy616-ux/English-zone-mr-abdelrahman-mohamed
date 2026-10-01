import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CourseCheckoutForm } from "@/components/course-checkout-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function StudentPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ course?: string }>;
}) {
  const { course: courseId } = await searchParams;
  if (!courseId) notFound();

  const supabase = await createServerSupabase();
  if (!supabase) {
    return <main className="dashboard-unavailable">Payment services are not available right now.</main>;
  }
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const returnTo = `/student/payment?course=${encodeURIComponent(courseId)}`;
    redirect(`/student/login?next=${encodeURIComponent(returnTo)}`);
  }

  const [{ data: profile }, { data: course }] = await Promise.all([
    supabase.from("profiles").select("user_id,role,full_name,phone,access_status")
      .eq("user_id", user.id).maybeSingle(),
    supabase.from("courses").select("id,name,description,price,original_price,discount_percent,is_free")
      .eq("id", courseId).eq("is_published", true).maybeSingle(),
  ]);
  if (!course) notFound();
  if (profile?.role !== "student") redirect("/join");
  if (profile.access_status !== "account_active") redirect("/student/pending");

  const [{ data: enrollment }, { data: payment }, { data: setting }] = await Promise.all([
    supabase.from("course_enrollments").select("access_status")
      .eq("student_id", user.id).eq("course_id", course.id).maybeSingle(),
    supabase.from("payment_requests").select("status,rejection_note")
      .eq("student_id", user.id).eq("course_id", course.id)
      .order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("platform_settings").select("setting_value")
      .eq("setting_key", "instapay_number").maybeSingle(),
  ]);

  return (
    <>
      <SiteHeader />
      <main className="student-checkout-page">
        <div className="wrap">
          <Link className="checkout-back-link" href="/student/dashboard"><ArrowLeft size={15} /> Back to my dashboard</Link>
          <div className="checkout-page-heading">
            <span className="eyebrow"><span className="eyebrow-dash" /> ENGLISH ZONE · ENROLLMENT</span>
            <h1>Join your next course.</h1>
            <p>Submit your transfer details. Your teacher will review them before course access is enabled.</p>
          </div>
          <CourseCheckoutForm
            course={course}
            student={{ id: user.id, name: profile.full_name, email: user.email ?? "", phone: profile.phone ?? "" }}
            instapayNumber={setting?.setting_value?.trim() || "01014812293"}
            enrollmentStatus={enrollment?.access_status ?? null}
            paymentStatus={payment?.status ?? null}
            rejectionNote={payment?.rejection_note ?? ""}
          />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}