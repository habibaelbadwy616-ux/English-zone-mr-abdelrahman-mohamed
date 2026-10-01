import { redirect } from "next/navigation";
import { StudentDashboard } from "@/components/student-dashboard";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { decryptStudentAccessCode } from "@/lib/access-code-crypto";

export const dynamic = "force-dynamic";

export default async function StudentDashboardPage() {
  const supabase = await createServerSupabase();
  if (!supabase)
    return (
      <main className="dashboard-unavailable">
        Add the Supabase environment settings to open your dashboard.
      </main>
    );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/student/login");
  const admin = createAdminSupabase();
  const { data: authAccount } = admin
    ? await admin.auth.admin.getUserById(user.id)
    : { data: { user: null } };
  if (authAccount.user?.banned_until) redirect("/student/suspended");
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "user_id,full_name,phone,guardian_phone,academic_stage,educational_system,profile_picture_url,access_status,student_code,created_at",
    )
    .eq("user_id", user.id)
    .single();
  if (!profile) redirect("/student/login?error=profile");
  if (profile.access_status !== "account_active") redirect("/student/pending");

  let studentAccessCode: string | null = null;
  if (admin) {
    const { data: codeRecord } = await admin.from("student_access_codes")
      .select("code_ciphertext,is_active,expires_at")
      .eq("user_id", user.id)
      .maybeSingle();
    if (codeRecord?.is_active && codeRecord.code_ciphertext
        && (!codeRecord.expires_at || new Date(codeRecord.expires_at) > new Date())) {
      try {
        studentAccessCode = decryptStudentAccessCode(codeRecord.code_ciphertext);
      } catch (error) {
        console.error("Student access code could not be decrypted", error);
      }
    }
  }

  const [
    { data: courses },
    { data: enrollments },
    { data: payments },
    { data: announcements },
    { data: attendance },
    { data: homeworkSubmissions },
    { data: setting },
  ] = await Promise.all([
    supabase
      .from("courses")
      .select(
        "id,name,academic_stage,educational_system,description,price,original_price,discount_percent,lesson_count,status,is_free,cover_image_url,is_published",
      )
      .eq("is_published", true)
      .order("featured_order"),
    supabase
      .from("course_enrollments")
        .select("id,course_id,access_status,updated_at")
      .eq("student_id", user.id),
    supabase
      .from("payment_requests")
      .select(
        "id,course_id,amount,payment_method,status,created_at,rejection_note,proof_path,sender_phone,transferred_at",
      )
      .eq("student_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("announcements")
      .select("id,kind,title,body,published_at,audience_type,audience_value")
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .limit(8),
    supabase
      .from("attendance_records")
      .select("id,course_id,attended_on,status")
      .eq("student_id", user.id)
      .order("attended_on", { ascending: false })
      .limit(40),
    supabase
      .from("homework_submissions")
      .select("id,lesson_id,file_name,submitted_at")
      .eq("student_id", user.id)
      .order("submitted_at", { ascending: false }),
    supabase
      .from("platform_settings")
      .select("setting_value")
      .eq("setting_key", "instapay_number")
      .maybeSingle(),
  ]);

  const courseIds = (enrollments ?? [])
    .filter((item) => item.access_status === "active")
    .map((item) => item.course_id);
  const [
    { data: lessons },
    { data: exams },
    { data: progress },
    { data: teacher },
    { data: playlists },
  ] = await Promise.all([
    courseIds.length
      ? supabase
          .from("lessons")
          .select(
            "id,course_id,playlist_id,title,description,video_url,materials,homework,position",
          )
          .in("course_id", courseIds)
          .eq("is_published", true)
          .order("position")
      : Promise.resolve({ data: [] }),
    courseIds.length
      ? supabase
          .from("exams")
          .select(
            "id,course_id,title,duration_minutes,passing_score,show_results,show_correct_answers,scheduled_at,exam_questions(count)",
          )
          .in("course_id", courseIds)
          .eq("is_published", true)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    courseIds.length
      ? supabase
          .from("lesson_progress")
          .select("id:lesson_id,lesson_id,completed_at")
          .eq("student_id", user.id)
      : Promise.resolve({ data: [] }),
    supabase
      .from("profiles")
      .select("full_name")
      .eq("role", "teacher")
      .maybeSingle(),
    courseIds.length
      ? supabase
          .from("course_playlists")
          .select("id,course_id,title,position")
          .in("course_id", courseIds)
          .order("position")
      : Promise.resolve({ data: [] }),
  ]);

  const lessonRows = lessons ?? [];
  const materialPaths = [...new Set(lessonRows.flatMap((lesson) =>
    (lesson.materials ?? []).flatMap((material: { path?: string }) => material.path ? [material.path] : []),
  ))];
  const { data: signedMaterials } = materialPaths.length
    ? await supabase.storage.from("course-materials").createSignedUrls(materialPaths, 60 * 60)
    : { data: [] };
  const signedMaterialUrls = new Map<string, string>((signedMaterials ?? []).flatMap((material: { path: string | null; signedUrl: string | null }) =>
    material.path && material.signedUrl ? [[material.path, material.signedUrl]] : [],
  ));
  const lessonsWithSignedMaterials = lessonRows.map((lesson) => ({
    ...lesson,
    materials: (lesson.materials ?? []).map((material: { name?: string; path?: string; url?: string }) => ({
      name: material.name ?? "Lesson material",
      url: material.url ?? (material.path ? signedMaterialUrls.get(material.path) ?? "" : ""),
    })).filter((material: { name: string; url: string }) => material.url),
  }));

  return (
    <StudentDashboard
      data={{
        userId: user.id,
        accessCode: studentAccessCode,
        profile: { ...profile, id: user.id, email: user.email ?? "" },
        teacherName: teacher?.full_name ?? "Mr Abdelrahman Mohamed",
        courses: courses ?? [],
        enrollments: enrollments ?? [],
        payments: payments ?? [],
        announcements: announcements ?? [],
        attendance: attendance ?? [],
        homeworkSubmissions: homeworkSubmissions ?? [],
        lessons: lessonsWithSignedMaterials,
        playlists: playlists ?? [],
        exams: exams ?? [],
        progress: progress ?? [],
        instapayNumber: setting?.setting_value ?? "01014812293",
      }}
    />
  );
}
