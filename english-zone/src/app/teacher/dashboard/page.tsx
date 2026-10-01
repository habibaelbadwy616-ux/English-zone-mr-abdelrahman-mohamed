import { redirect } from "next/navigation";
import { TeacherDashboard } from "@/components/teacher-dashboard";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type TeacherStudentRow = {
  user_id: string;
  email: string;
  full_name: string;
  phone: string;
  guardian_phone: string;
  academic_stage: string;
  educational_system: string | null;
  profile_picture_url: string | null;
  access_status: string;
  student_code: string;
  created_at: string;
};

export default async function TeacherDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string }>;
}) {
  const supabase = await createServerSupabase();
  if (!supabase)
    return (
      <main className="dashboard-unavailable">
        Add the Supabase environment settings to open the teacher space.
      </main>
    );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/teacher/login");
  const { student: studentCode } = await searchParams;
  const { data: students } = await supabase.rpc("teacher_list_students");
  if (!students) redirect("/teacher/login?error=unauthorized");
  const studentRows = students as TeacherStudentRow[];
  const admin = createAdminSupabase();
  const { data: accessCodeRows, error: accessCodeError } = admin && studentRows.length
    ? await admin.from("student_access_codes").select("user_id,code_ciphertext").in("user_id", studentRows.map((student) => student.user_id))
    : { data: [], error: null };
  if (accessCodeError) {
    console.error("Unable to load student access-code status", {
      code: accessCodeError.code,
      message: accessCodeError.message,
    });
  }
  const accessCodesByStudent = new Map((accessCodeRows ?? []).map((item) => [item.user_id, Boolean(item.code_ciphertext)]));
  const studentsWithStatus = admin
    ? await Promise.all(studentRows.map(async (student) => {
        const { data: authUser } = await admin.auth.admin.getUserById(student.user_id);
        return {
          ...student,
          is_suspended: Boolean(authUser.user?.banned_until),
          has_access_code: Boolean(accessCodeError) || accessCodesByStudent.has(student.user_id),
          has_recoverable_access_code: !accessCodeError && accessCodesByStudent.get(student.user_id) === true,
        };
      }))
    : studentRows.map((student) => ({ ...student, is_suspended: false, has_access_code: false, has_recoverable_access_code: false }));

  const [
    { data: teacher },
    { data: courses },
    { data: payments },
    { data: enrollments },
    { data: exams, error: examsError },
    { data: attendance },
    { data: attempts },
    { data: progress },
    { data: challenges },
    { data: homeworkSubmissions },
    { data: lessons },
    { data: playlists },
    { data: settings },
    { data: questions },
    { data: challengeSets },
    { data: announcements },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("courses")
      .select(
        "id,name,academic_stage,educational_system,description,price,original_price,discount_percent,lesson_count,status,is_free,is_published,cover_image_url,student_limit",
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("payment_requests")
      .select(
        "id,student_id,course_id,amount,payment_method,proof_path,status,rejection_note,created_at,sender_phone,transferred_at",
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("course_enrollments")
      .select("student_id,course_id,access_status,updated_at"),
    supabase
      .from("exams")
      .select(
        "id,course_id,lesson_id,title,duration_minutes,passing_score,show_results,show_correct_answers,is_published,created_at,scheduled_at",
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("attendance_records")
      .select("id,student_id,course_id,attended_on,status")
      .order("attended_on", { ascending: false })
      .limit(100),
    supabase
      .from("exam_attempts")
      .select(
        "id,exam_id,student_id,score,correct_count,question_count,submitted_at",
      )
      .order("submitted_at", { ascending: false })
      .limit(50),
    supabase
      .from("lesson_progress")
      .select("student_id,lesson_id,completed_at")
      .order("completed_at", { ascending: false }),
    supabase
      .from("challenge_attempts")
      .select("id,claimed_by,score,correct_count,question_count,discount_percent,created_at,expires_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("homework_submissions")
      .select("id,student_id,lesson_id,storage_path,file_name,submitted_at")
      .order("submitted_at", { ascending: false }),
    supabase
      .from("lessons")
      .select(
        "id,course_id,playlist_id,title,description,video_url,materials,homework,position,is_published,created_at",
      )
      .order("position"),
    supabase
      .from("course_playlists")
      .select("id,course_id,title,position")
      .order("position"),
    supabase.from("platform_settings").select("setting_key,setting_value"),
    supabase
      .from("challenge_questions")
      .select("id,challenge_id,prompt,choices,correct_answer,position,is_published")
      .order("position"),
    supabase
      .from("challenge_sets")
      .select("id,title,position,is_published,created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("announcements")
      .select(
        "id,kind,title,body,is_published,published_at,audience_type,audience_value",
      )
      .order("created_at", { ascending: false }),
  ]);

  const homeworkPaths = (homeworkSubmissions ?? []).map((submission) => submission.storage_path);
  const { data: signedHomeworkFiles } = homeworkPaths.length
    ? await supabase.storage.from("homework-submissions").createSignedUrls(homeworkPaths, 60 * 60)
    : { data: [] };
  const signedHomeworkByPath = new Map((signedHomeworkFiles ?? []).flatMap((file) =>
    file.path && file.signedUrl ? [[file.path, file.signedUrl]] : [],
  ));
  const homeworkWithSignedUrls = (homeworkSubmissions ?? []).map((submission) => ({
    ...submission,
    signed_url: signedHomeworkByPath.get(submission.storage_path) ?? "",
  }));

  const { data: examQuestionRows, error: examQuestionError } = exams?.length
    ? await supabase
        .from("exam_questions")
        .select("exam_id")
        .in(
          "exam_id",
          exams.map((exam) => exam.id),
        )
    : { data: [], error: null };
  if (examQuestionError) {
    console.error("Unable to load teacher exam question counts", examQuestionError);
  }
  const examQuestionCounts = new Map<string, number>();
  for (const question of examQuestionRows ?? []) {
    examQuestionCounts.set(
      question.exam_id,
      (examQuestionCounts.get(question.exam_id) ?? 0) + 1,
    );
  }
  const teacherExams = (exams ?? []).map((exam) => ({
    ...exam,
    question_count: examQuestionCounts.get(exam.id) ?? 0,
  }));

  return (
    <TeacherDashboard
      initialStudentCode={studentCode}
      examLoadError={Boolean(examsError)}
      data={{
        teacherId: user.id,
        teacherName: teacher?.full_name ?? "Mr Abdelrahman Mohamed",
        students: studentsWithStatus,
        courses: courses ?? [],
        payments: payments ?? [],
        enrollments: enrollments ?? [],
        exams: teacherExams,
        attendance: attendance ?? [],
        attempts: attempts ?? [],
        progress: progress ?? [],
        challenges: challenges ?? [],
        homeworkSubmissions: homeworkWithSignedUrls,
        lessons: lessons ?? [],
        playlists: playlists ?? [],
        settings: settings ?? [],
        questions: questions ?? [],
        challengeSets: challengeSets ?? [],
        announcements: announcements ?? [],
      }}
    />
  );
}
