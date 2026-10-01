"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Award,
  Ban,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  ClipboardCheck,
  Copy,
  Download,
  FilePlus2,
  GraduationCap,
  House,
  LoaderCircle,
  LogOut,
  Megaphone,
  Plus,
  Play,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
  UserCheck,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { createBrowserSupabase } from "@/lib/supabase/client";

type Student = {
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
  is_suspended: boolean;
  has_access_code: boolean;
  has_recoverable_access_code: boolean;
};
type Course = {
  id: string;
  name: string;
  academic_stage: string;
  educational_system: string | null;
  description: string;
  price: number | null;
  original_price: number | null;
  discount_percent: number;
  lesson_count: number;
  status: string;
  is_free: boolean;
  is_published: boolean;
  cover_image_url: string | null;
  student_limit: number | null;
};
type Enrollment = {
  student_id: string;
  course_id: string;
  access_status: string;
  updated_at: string;
};
type Payment = {
  id: string;
  student_id: string;
  course_id: string;
  amount: number;
  payment_method: string;
  proof_path: string;
  status: string;
  rejection_note: string;
  created_at: string;
  sender_phone: string;
  transferred_at: string;
};
type Lesson = {
  id: string;
  course_id: string;
  playlist_id: string | null;
  title: string;
  description: string;
  video_url: string | null;
  materials: { name: string; url: string }[];
  homework: string;
  position: number;
  is_published: boolean;
  created_at: string;
};
type Exam = {
  id: string;
  course_id: string;
  lesson_id: string | null;
  title: string;
  duration_minutes: number;
  passing_score: number;
  show_results: boolean;
  show_correct_answers: boolean;
  is_published: boolean;
  created_at: string;
  scheduled_at: string | null;
  question_count: number;
};
type Playlist = {
  id: string;
  course_id: string;
  title: string;
  position: number;
};
type Attempt = {
  id: string;
  exam_id: string;
  student_id: string;
  score: number;
  correct_count: number;
  question_count: number;
  submitted_at: string;
};
type LessonProgress = { student_id: string; lesson_id: string; completed_at: string };
type ChallengeAttempt = {
  id: string;
  claimed_by: string | null;
  score: number;
  correct_count: number;
  question_count: number;
  discount_percent: number;
  created_at: string;
  expires_at: string;
};
type HomeworkSubmission = {
  id: string;
  student_id: string;
  lesson_id: string;
  storage_path: string;
  file_name: string;
  submitted_at: string;
  signed_url: string;
};
type Attendance = {
  id: string;
  student_id: string;
  course_id: string | null;
  attended_on: string;
  status: string;
};
type ChallengeQuestion = {
  id: string;
  challenge_id: string;
  prompt: string;
  choices: string[];
  correct_answer: string;
  position: number;
  is_published: boolean;
};
type ChallengeSet = {
  id: string;
  title: string;
  position: number;
  is_published: boolean;
  created_at: string;
};
type Announcement = {
  id: string;
  kind: string;
  title: string;
  body: string;
  is_published: boolean;
  published_at: string;
  audience_type: string;
  audience_value: string | null;
};
type Setting = { setting_key: string; setting_value: string };
type TeacherData = {
  teacherId: string;
  teacherName: string;
  students: Student[];
  courses: Course[];
  payments: Payment[];
  enrollments: Enrollment[];
  exams: Exam[];
  attendance: Attendance[];
  attempts: Attempt[];
  progress: LessonProgress[];
  challenges: ChallengeAttempt[];
  homeworkSubmissions: HomeworkSubmission[];
  lessons: Lesson[];
  playlists: Playlist[];
  settings: Setting[];
  questions: ChallengeQuestion[];
  challengeSets: ChallengeSet[];
  announcements: Announcement[];
};
type DraftQuestion = {
  prompt: string;
  questionType: "multiple_choice" | "true_false" | "fill_blank";
  choices: string[];
  answer: string;
};
type DeletableContent = "course" | "lesson" | "playlist" | "exam" | "announcement" | "challenge-question" | "challenge-set";

const navigation = [
  { id: "overview", label: "Overview", icon: House },
  { id: "students", label: "Students", icon: Users },
  { id: "requests", label: "Requests", icon: UserCheck },
  { id: "courses", label: "Courses", icon: BookOpen },
  { id: "lessons", label: "Lessons", icon: Play },
  { id: "homework", label: "Homework", icon: FilePlus2 },
  { id: "exams", label: "Exams", icon: ClipboardCheck },
  { id: "results", label: "Exam results", icon: Award },
  { id: "challenge-results", label: "Challenge results", icon: Sparkles },
  { id: "attendance", label: "Attendance", icon: CalendarDays },
  { id: "payments", label: "Payments", icon: WalletCards },
  { id: "challenges", label: "Challenges", icon: Sparkles },
  { id: "announcements", label: "Announcements", icon: Megaphone },
  { id: "settings", label: "Settings", icon: Settings },
];

const stages = [
  "3rd Preparatory",
  "1st Secondary",
  "2nd Secondary",
  "3rd Secondary",
];

function currency(amount: number | null) {
  return amount === null
    ? "Free"
    : `${Number(amount).toLocaleString("en-EG")} EGP`;
}
function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function TeacherDashboard({ data, initialStudentCode, examLoadError }: { data: TeacherData; initialStudentCode?: string; examLoadError?: boolean }) {
  const router = useRouter();
  const initialStudent = data.students.find((item) => item.student_code === initialStudentCode) ?? null;
  const [section, setSection] = useState(initialStudent ? "students" : "overview");
  const [modal, setModal] = useState<
    | "student"
    | "course"
    | "lesson"
    | "exam"
    | "announcement"
    | "attendance"
    | "student-view"
    | null
  >(initialStudent ? "student-view" : null);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(initialStudent);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [revealedAccessCodes, setRevealedAccessCodes] = useState<Record<string, string>>({});
  const [createdStudent, setCreatedStudent] = useState<{
    id: string;
    name: string;
    email: string;
    studentCode: string;
    status: string;
    accessCode: string;
    purpose?: "created" | "approved" | "issued";
  } | null>(null);
  const [receipt, setReceipt] = useState<{ id: string; url: string } | null>(
    null,
  );
  const [assignCourse, setAssignCourse] = useState("");
  const [newStage, setNewStage] = useState("");
  const [newCourseStage, setNewCourseStage] = useState("");
  const [coursePrices, setCoursePrices] = useState({ original: "", final: "" });
  const [courseIsFree, setCourseIsFree] = useState(false);
  const [examQuestions, setExamQuestions] = useState<DraftQuestion[]>([
    { prompt: "", questionType: "multiple_choice", choices: ["", "", "", ""], answer: "" },
  ]);
  const [instapayNumber, setInstapayNumber] = useState(
    data.settings.find((item) => item.setting_key === "instapay_number")
      ?.setting_value ?? "01014812293",
  );
  const [teacherName, setTeacherName] = useState(data.teacherName);

  const pendingPayments = data.payments.filter(
    (payment) => payment.status === "pending",
  );
  const pendingStudentRequests = data.students.filter(
    (student) => student.access_status === "access_pending",
  );
  const activeStudents = new Set(
    data.enrollments
      .filter((item) => item.access_status === "active")
      .map((item) => item.student_id),
  ).size;
  const pendingStudents = data.students.filter(
    (student) =>
      !data.enrollments.some(
        (item) => item.student_id === student.user_id && item.access_status === "active",
      ),
  ).length;
  const normalizedSearch = search.trim().toLowerCase();
  const students = data.students.filter((student) => {
    const matchesSearch =
      !normalizedSearch ||
      [
        student.full_name,
        student.email,
        student.phone,
        student.student_code,
      ].some((value) => value.toLowerCase().includes(normalizedSearch));
    const matchesStage =
      stageFilter === "all" || student.academic_stage === stageFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active"
        ? data.enrollments.some(
            (item) =>
              item.student_id === student.user_id &&
              item.access_status === "active",
          )
        : !data.enrollments.some(
            (item) =>
              item.student_id === student.user_id &&
              item.access_status === "active",
          ));
                const matchesCourse = courseFilter === "all" || data.enrollments.some((item) => item.student_id === student.user_id && item.course_id === courseFilter);
                return matchesSearch && matchesStage && matchesStatus && matchesCourse;
  });
  const visibleCourses = data.courses.filter(
    (course) =>
      !normalizedSearch ||
      `${course.name} ${course.academic_stage}`
        .toLowerCase()
        .includes(normalizedSearch),
  );
  const visibleExams = data.exams.filter(
    (exam) =>
      !normalizedSearch ||
      `${exam.title} ${data.courses.find((course) => course.id === exam.course_id)?.name ?? ""}`
        .toLowerCase()
        .includes(normalizedSearch),
  );
  const course = data.courses.find((item) => item.id === selectedCourse);
  const sectionTitle =
    navigation.find((item) => item.id === section)?.label ?? "Overview";

  function clearMessages() {
    setNotice("");
    setError("");
  }
  function showError(message: string) {
    setError(message);
    setNotice("");
  }
  function showNotice(message: string) {
    setNotice(message);
    setError("");
  }

  async function signOut() {
    await createBrowserSupabase()?.auth.signOut();
    router.replace("/join");
  }

  async function createStudent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearMessages();
    setBusy("student");
    const formData = new FormData(event.currentTarget);
    formData.set("academicStage", newStage);
    formData.set(
      "educationalSystem",
      newStage === "3rd Preparatory"
        ? ""
        : String(formData.get("educationalSystem") ?? ""),
    );
    const response = await fetch("/api/teacher/students", {
      method: "POST",
      body: formData,
    });
    const result = await response.json();
    if (!response.ok)
      showError(result.error ?? "We could not create this student.");
    else {
      setCreatedStudent({ ...result.student, accessCode: result.accessCode, purpose: "created" });
      setSelectedStudent(null);
      setSection("students");
      router.refresh();
    }
    setBusy("");
  }

  async function createCourse(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearMessages();
    setBusy("course");
    const supabase = createBrowserSupabase();
    if (!supabase) {
      showError("Course services are not available right now.");
      setBusy("");
      return;
    }
    const form = new FormData(event.currentTarget);
    const originalPrice = Number(form.get("originalPrice") ?? 0);
    const finalPrice = Number(form.get("finalPrice") ?? 0);
    const isFree = form.get("isFree") === "on";
    if (!isFree && (originalPrice <= 0 || finalPrice <= 0 || finalPrice > originalPrice)) {
      showError("Enter a final price above zero and no higher than the original price.");
      setBusy("");
      return;
    }
    const cover = form.get("cover") as File | null;
    let coverImageUrl: string | null = null;
    if (cover?.size) {
      const ext = cover.type.split("/")[1];
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("course-covers")
        .upload(path, cover, { contentType: cover.type, upsert: false });
      if (uploadError) {
        showError("The course cover could not be uploaded.");
        setBusy("");
        return;
      }
      coverImageUrl = supabase.storage.from("course-covers").getPublicUrl(path)
        .data.publicUrl;
    }
    const discount =
      originalPrice > 0
        ? Math.max(
            0,
            Math.round(((originalPrice - finalPrice) * 100) / originalPrice),
          )
        : 0;
    const { error: insertError } = await supabase.from("courses").insert({
      name: String(form.get("name") ?? "").trim(),
      academic_stage: newCourseStage,
      educational_system:
        newCourseStage === "3rd Preparatory"
          ? null
          : String(form.get("educationalSystem") ?? "") || null,
      description: String(form.get("description") ?? "").trim(),
      cover_image_url: coverImageUrl,
      original_price: isFree ? null : originalPrice,
      price: isFree ? null : finalPrice,
      discount_percent: isFree ? 0 : discount,
      is_free: isFree,
      student_limit: Number(form.get("studentLimit")) || null,
      is_published: form.get("isPublished") === "on",
      status: "available",
      featured_order: 100,
    });
    if (insertError)
      showError(insertError.message || "The course could not be saved.");
    else {
      setModal(null);
      setCoursePrices({ original: "", final: "" });
      setCourseIsFree(false);
      showNotice(`Course created${discount ? ` with ${discount}% off` : ""}.`);
      router.refresh();
    }
    setBusy("");
  }

  async function createLesson(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearMessages();
    setBusy("lesson");
    const supabase = createBrowserSupabase();
    if (!supabase) {
      setBusy("");
      return;
    }
    const form = new FormData(event.currentTarget);
    const selected = String(form.get("courseId") ?? selectedCourse);
    const existing = data.lessons.filter((item) => item.course_id === selected);
    const material = form.get("material");
    if (material instanceof File && material.size > 20 * 1024 * 1024) {
      showError("Choose a lesson file smaller than 20 MB.");
      setBusy("");
      return;
    }
    if (material instanceof File && material.size > 0 && !["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(material.type)) {
      showError("Lesson files must be a PDF or an image.");
      setBusy("");
      return;
    }
    const { data: lesson, error: insertError } = await supabase.from("lessons").insert({
      course_id: selected,
      playlist_id: String(form.get("playlistId") ?? "") || null,
      title: String(form.get("title") ?? "").trim(),
      description: String(form.get("description") ?? "").trim(),
      video_url: String(form.get("videoUrl") ?? "").trim() || null,
      homework: String(form.get("homework") ?? "").trim(),
      position: existing.length + 1,
      is_published: form.get("isPublished") === "on",
    }).select("id").single();
    if (insertError || !lesson) showError("The lesson could not be saved.");
    else {
      if (material instanceof File && material.size > 0) {
        const path = `${selected}/${lesson.id}/${crypto.randomUUID()}.${material.type.split("/")[1]}`;
        const { error: uploadError } = await supabase.storage.from("course-materials").upload(path, material, { contentType: material.type, upsert: false });
        if (uploadError) {
          await supabase.from("lessons").delete().eq("id", lesson.id);
          showError("The lesson file could not be uploaded, so the lesson was not saved.");
          setBusy("");
          return;
        }
        const { error: materialError } = await supabase.from("lessons").update({ materials: [{ name: material.name, path }] }).eq("id", lesson.id);
        if (materialError) {
          await supabase.storage.from("course-materials").remove([path]);
          await supabase.from("lessons").delete().eq("id", lesson.id);
          showError("The lesson file could not be attached, so the lesson was not saved.");
          setBusy("");
          return;
        }
      }
      setModal(null);
      setSelectedCourse(selected);
      setSection("lessons");
      showNotice("Lesson added to the course.");
      router.refresh();
    }
    setBusy("");
  }

  async function moveLesson(lesson: Lesson, direction: -1 | 1) {
    const ordered = data.lessons
      .filter((item) => item.course_id === lesson.course_id)
      .sort((a, b) => a.position - b.position);
    const index = ordered.findIndex((item) => item.id === lesson.id);
    const neighbor = ordered[index + direction];
    if (!neighbor) return;
    const supabase = createBrowserSupabase();
    const { error: moveError } = await supabase!
      .from("lessons")
      .update({ position: neighbor.position })
      .eq("id", lesson.id);
    if (!moveError)
      await supabase!
        .from("lessons")
        .update({ position: lesson.position })
        .eq("id", neighbor.id);
    if (moveError) showError("The lesson order could not be changed.");
    else router.refresh();
  }

  async function deleteLesson(lessonId: string) {
    await deleteContent("lesson", lessonId, "this lesson");
  }

  async function deleteContent(type: DeletableContent, id: string, label: string) {
    if (!window.confirm(`Permanently delete ${label}? This action cannot be undone.`)) return;
    clearMessages();
    setBusy(`delete-${id}`);
    try {
      const response = await fetch("/api/teacher/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id }),
      });
      const result = await response.json();
      if (!response.ok) showError(result.error ?? "The content could not be deleted.");
      else {
        showNotice("Content deleted.");
        if (type === "course") setSelectedCourse("");
        router.refresh();
      }
    } catch {
      showError("The content could not be deleted.");
    } finally {
      setBusy("");
    }
  }

  async function deleteChallengeResult(attemptId: string, studentName: string) {
    if (!window.confirm(`Permanently delete the challenge result for ${studentName}? This action cannot be undone.`)) return;
    clearMessages();
    setBusy(`delete-result-${attemptId}`);
    try {
      const response = await fetch("/api/teacher/challenges/results", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId }),
      });
      const result = await response.json();
      if (!response.ok) showError(result.error ?? "The challenge result could not be deleted.");
      else {
        showNotice("Challenge result deleted.");
        router.refresh();
      }
    } catch {
      showError("The challenge result could not be deleted.");
    } finally {
      setBusy("");
    }
  }

  async function createExam(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearMessages();
    const invalidMultipleChoice = examQuestions.some((question) => {
      if (question.questionType !== "multiple_choice" || !question.prompt.trim()) return false;
      const choices = question.choices.map((choice) => choice.trim()).filter(Boolean);
      return choices.length < 2 || !choices.includes(question.answer.trim());
    });
    if (invalidMultipleChoice) {
      showError("Each multiple-choice question needs at least two choices and a correct answer that matches one of them.");
      return;
    }
    const hasQuestions = examQuestions.some(
      (question) => question.prompt.trim() && question.answer.trim(),
    );
    setBusy("exam");
    const form = new FormData(event.currentTarget);
    const supabase = createBrowserSupabase();
    if (!supabase) return;
    const { data: exam, error: examError } = await supabase
      .from("exams")
      .insert({
        course_id: String(form.get("courseId") ?? ""),
        lesson_id: String(form.get("lessonId") ?? "") || null,
        title: String(form.get("title") ?? "").trim(),
        duration_minutes: Number(form.get("duration")) || 30,
        passing_score: Number(form.get("passingScore")) || 60,
        scheduled_at: String(form.get("scheduledAt") ?? "") ? new Date(String(form.get("scheduledAt"))).toISOString() : null,
        show_results: form.get("showResults") === "on",
        show_correct_answers: form.get("showAnswers") === "on",
        is_published: form.get("isPublished") === "on" && hasQuestions,
      })
      .select("id")
      .single();
    if (examError || !exam) {
      showError("The exam could not be created.");
      setBusy("");
      return;
    }
    const questions = examQuestions
      .filter((question) => question.prompt.trim() && question.answer.trim())
      .map((question, index) => ({
        exam_id: exam.id,
        question_type: question.questionType,
        prompt: question.prompt.trim(),
        choices:
          question.questionType === "multiple_choice"
            ? question.choices
                .map((choice) => choice.trim())
                .filter(Boolean)
            : question.questionType === "true_false"
              ? ["True", "False"]
              : [],
        correct_answer: question.answer.trim(),
        position: index + 1,
      }));
    if (questions.length) {
      const { error: questionError } = await supabase
        .from("exam_questions")
        .insert(questions);
      if (questionError) {
        await supabase.from("exams").delete().eq("id", exam.id);
        showError("The exam questions could not be saved.");
        setBusy("");
        return;
      }
    }
    setModal(null);
    setExamQuestions([
      {
        prompt: "",
        questionType: "multiple_choice",
        choices: ["", "", "", ""],
        answer: "",
      },
    ]);
    setSearch("");
    setSection("exams");
    showNotice(
      questions.length
        ? "Exam created and ready for your students."
        : "Exam created as a draft. Add questions before publishing it to students.",
    );
    router.refresh();
    setBusy("");
  }

  async function reviewPayment(
    payment: Payment,
    status: "approved" | "rejected",
  ) {
    if (
      status === "rejected" &&
      !window.confirm(
        "Reject this payment request? The course will remain locked.",
      )
    )
      return;
    clearMessages();
    setBusy(payment.id);
    const { error: reviewError } = await createBrowserSupabase()!.rpc(
      "teacher_review_course_payment",
      {
        p_payment_id: payment.id,
        p_status: status,
        p_note:
          status === "rejected"
            ? "Please contact your teacher or resubmit your payment."
            : "",
      },
    );
    if (reviewError)
      showError(reviewError.message || "The payment could not be reviewed.");
    else {
      showNotice(
        status === "approved"
          ? "Payment approved. Course access is active."
          : "Payment rejected. Course access remains locked.",
      );
      router.refresh();
    }
    setBusy("");
  }

  async function viewReceipt(payment: Payment) {
    const { data: signed, error: signingError } = await createBrowserSupabase()!
      .storage.from("payment-proofs")
      .createSignedUrl(payment.proof_path, 60 * 5);
    if (signingError || !signed)
      showError("The payment receipt could not be opened.");
    else setReceipt({ id: payment.id, url: signed.signedUrl });
  }

  async function approveStudent(studentId: string) {
    clearMessages();
    setBusy(`approve-${studentId}`);
    try {
      const response = await fetch("/api/teacher/students/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId }),
      });
      const result = await response.json();
      if (!response.ok) showError(result.error ?? "The student account could not be approved.");
      else {
        showNotice(result.accessCode ? "Student account approved. Share the reusable access code with them." : "Student account approved.");
        if (result.accessCode) {
          const student = data.students.find((item) => item.user_id === studentId);
          if (student) {
            setCreatedStudent({
              id: student.user_id,
              name: student.full_name,
              email: student.email,
              studentCode: student.student_code,
              status: "account_active",
              accessCode: result.accessCode,
              purpose: "approved",
            });
            setModal("student");
          }
        }
        router.refresh();
      }
    } catch {
      showError("The student account could not be approved.");
    } finally {
      setBusy("");
    }
  }

  async function issueStudentAccessCode(student: Student) {
    clearMessages();
    setBusy(`issue-code-${student.user_id}`);
    try {
      const response = await fetch("/api/teacher/students/access-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: student.user_id }),
      });
      const result = await response.json();
      if (!response.ok) showError(result.error ?? "The access code could not be issued.");
      else {
        setCreatedStudent({
          id: student.user_id,
          name: student.full_name,
          email: student.email,
          studentCode: student.student_code,
          status: student.access_status,
          accessCode: result.accessCode,
          purpose: "issued",
        });
        setModal("student");
        showNotice("Reusable access code issued. Share it with the student now.");
        router.refresh();
      }
    } catch {
      showError("The access code could not be issued.");
    } finally {
      setBusy("");
    }
  }

  async function revealStudentAccessCode(studentId: string) {
    const existing = revealedAccessCodes[studentId];
    if (existing) return;
    clearMessages();
    setBusy(`show-code-${studentId}`);
    try {
      const response = await fetch(`/api/teacher/students/access-code?studentId=${encodeURIComponent(studentId)}`, {
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok) showError(result.error ?? "The access code could not be loaded.");
      else setRevealedAccessCodes((current) => ({ ...current, [studentId]: result.accessCode }));
    } catch {
      showError("The access code could not be loaded.");
    } finally {
      setBusy("");
    }
  }

  async function manageStudent(studentId: string, action: "reject" | "suspend" | "restore" | "delete") {
    const confirmations = {
      reject: "Reject and remove this student's request?",
      suspend: "Suspend this student's sign-in access?",
      restore: "Restore this student's sign-in access?",
      delete: "Permanently delete this student and their account?",
    };
    if (!window.confirm(confirmations[action])) return;

    clearMessages();
    setBusy(`${action}-${studentId}`);
    try {
      const response = await fetch("/api/teacher/students/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, action }),
      });
      const result = await response.json();
      if (!response.ok) showError(result.error ?? "The student action could not be completed.");
      else {
        showNotice(action === "restore" ? "Student access restored." : `Student ${action}d.`);
        router.refresh();
      }
    } catch {
      showError("The student action could not be completed.");
    } finally {
      setBusy("");
    }
  }

  async function assignStudentCourse(
    studentId: string,
    courseId: string,
    grant = false,
  ) {
    clearMessages();
    setBusy(`assign-${studentId}`);
    if (
      grant &&
      !window.confirm(
        "Grant this student immediate course access without payment?",
      )
    ) {
      setBusy("");
      return;
    }
    const supabase = createBrowserSupabase();
    const { error: assignError } = await supabase!.rpc(
      grant ? "teacher_grant_course_access" : "teacher_assign_course",
      grant
        ? { p_student_id: studentId, p_course_id: courseId }
        : { p_student_id: studentId, p_course_id: courseId },
    );
    if (assignError) showError("The course could not be assigned.");
    else {
      showNotice(
        grant
          ? "Course access granted."
          : "Course assigned. Paid courses stay locked until payment is approved.",
      );
      router.refresh();
    }
    setBusy("");
  }

  async function markAttendance(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedStudent) return;
    const form = new FormData(event.currentTarget);
    const { error: markError } = await createBrowserSupabase()!
      .from("attendance_records")
      .upsert(
        {
          student_id: selectedStudent.user_id,
          course_id: String(form.get("courseId")),
          attended_on: String(form.get("date")),
          status: String(form.get("status")),
          marked_by: data.teacherId,
        },
        { onConflict: "student_id,course_id,attended_on" },
      );
    if (markError) showError("Attendance could not be saved.");
    else {
      setModal(null);
      showNotice("Attendance updated.");
      router.refresh();
    }
  }

  async function createAnnouncement(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearMessages();
    const form = new FormData(event.currentTarget);
    const audienceType = String(form.get("audienceType"));
    const { error: saveError } = await createBrowserSupabase()!
      .from("announcements")
      .insert({
        kind: "announcement",
        title: String(form.get("title") ?? "").trim(),
        body: String(form.get("body") ?? "").trim(),
        audience_type: audienceType,
        audience_value:
          audienceType === "all"
            ? null
            : String(form.get("audienceValue") ?? ""),
        is_published: form.get("isPublished") === "on",
        published_at:
          String(form.get("publishDate") ?? "") || new Date().toISOString(),
      });
    if (saveError) showError("The announcement could not be published.");
    else {
      setModal(null);
      setSection("announcements");
      showNotice("Announcement saved.");
      router.refresh();
    }
  }

  async function saveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearMessages();
    const supabase = createBrowserSupabase();
    const { error: profileError } = await supabase!
      .from("profiles")
      .update({
        full_name: teacherName.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", data.teacherId);
    const { error: settingError } = await supabase!
      .from("platform_settings")
      .upsert({
        setting_key: "instapay_number",
        setting_value: instapayNumber.trim(),
        updated_by: data.teacherId,
        updated_at: new Date().toISOString(),
      });
    if (profileError || settingError) showError("Settings could not be saved.");
    else {
      showNotice("Settings saved.");
      router.refresh();
    }
  }

  async function addChallenge(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearMessages();
    setBusy("challenge-set");

    try {
      const form = new FormData(event.currentTarget);
      const questions = Array.from({ length: 5 }, (_, index) => ({
        prompt: String(form.get(`prompt-${index + 1}`) ?? "").trim(),
        choices: Array.from({ length: 4 }, (_, choiceIndex) =>
          String(form.get(`choice-${index + 1}-${choiceIndex + 1}`) ?? "").trim(),
        ),
        correctAnswer: String(form.get(`answer-${index + 1}`) ?? "").trim(),
      }));
      if (questions.some((question) => !question.choices.includes(question.correctAnswer))) {
        showError("Choose a correct answer from the four choices in every question.");
        return;
      }
      const response = await fetch("/api/teacher/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: String(form.get("title") ?? "").trim(), questions }),
      });
      const result = await response.json();
      if (!response.ok) showError(result.details ? `${result.error} ${result.details}` : result.error ?? "The challenge could not be saved.");
      else {
        showNotice("Five-question challenge published on the homepage.");
        router.refresh();
        (event.currentTarget as HTMLFormElement).reset();
      }
    } finally {
      setBusy("");
    }
  }

  return (
    <main className="learning-app teacher-app">
      <aside className="learning-sidebar teacher-sidebar">
        <Link className="brand learning-brand" href="/">
          <span className="brand-mark">EZ</span>
          <span className="brand-name">
            ENGLISH <b>ZONE</b>
            <small>TEACHER SPACE</small>
          </span>
        </Link>
        <div className="learning-side-label">CLASSROOM CONTROL</div>
        <nav aria-label="Teacher navigation">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={
                section === id
                  ? "learning-nav-item active"
                  : "learning-nav-item"
              }
              onClick={() => {
                setSection(id);
                clearMessages();
              }}
            >
              <Icon size={17} strokeWidth={1.7} />
              <span>{label}</span>
              {id === "payments" && pendingPayments.length > 0 && (
                <small className="nav-count">{pendingPayments.length}</small>
              )}
              {id === "requests" && pendingStudentRequests.length > 0 && (
                <small className="nav-count">{pendingStudentRequests.length}</small>
              )}
            </button>
          ))}
        </nav>
        <div className="learning-sidebar-bottom">
          <div className="teacher-mini">
            <span className="teacher-mini-mark">AM</span>
            <span>
              <strong>{data.teacherName}</strong>
              <small>English Zone teacher</small>
            </span>
          </div>
          <button className="learning-signout" type="button" onClick={signOut}>
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      <section className="learning-main teacher-main">
        <header className="learning-topbar teacher-topbar">
          <div>
            <span className="eyebrow">
              <span className="eyebrow-dash" /> ENGLISH ZONE · TEACHER SPACE
            </span>
            <h1>{sectionTitle}</h1>
          </div>
          <div className="teacher-top-actions">
            <label className="teacher-search">
              <Search size={16} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search students, courses, exams"
              />
            </label>
            <button
              className="icon-button teacher-notification"
              type="button"
              title={`${pendingPayments.length} pending payments`}
              aria-label={`${pendingPayments.length} pending payments`}
              onClick={() => setSection("payments")}
            >
              <Bell size={17} />
              {pendingPayments.length > 0 && <i />}
            </button>
            <button className="icon-button teacher-signout" type="button" onClick={signOut} title="Sign out" aria-label="Sign out">
              <LogOut size={16} />
            </button>
            <button
              className="button button-small"
              type="button"
              onClick={() => {
                setCreatedStudent(null);
                setModal("student");
              }}
            >
              <Plus size={15} /> Add Student
            </button>
          </div>
        </header>
        <div className="learning-content teacher-content">
          {(notice || error) && (
            <div
              className={error ? "learning-notice error" : "learning-notice"}
              role={error ? "alert" : "status"}
            >
              {error || notice}
              <button
                type="button"
                aria-label="Dismiss message"
                onClick={clearMessages}
              >
                <X size={15} />
              </button>
            </div>
          )}

          {section === "overview" && (
            <>
              <div className="teacher-welcome">
                <div>
                  <span className="eyebrow">
                    <span className="eyebrow-dash" /> YOUR CLASSROOM, AT A
                    GLANCE
                  </span>
                  <h2>
                    Good to see you, <em>Mr Abdelrahman Mohamed.</em>
                  </h2>
                  <p>Keep the learning moving with a few simple actions.</p>
                </div>
                <div className="teacher-welcome-mark">
                  <GraduationCap size={32} strokeWidth={1.3} />
                </div>
              </div>
              <div className="teacher-stat-grid">
                {[
                  {
                    label: "Total students",
                    value: data.students.length,
                    icon: Users,
                  },
                  {
                    label: "Active students",
                    value: activeStudents,
                    icon: CheckCircle2,
                  },
                  {
                    label: "Pending students",
                    value: pendingStudents,
                    icon: UserRound,
                  },
                  {
                    label: "Active courses",
                    value: data.courses.filter((item) => item.is_published)
                      .length,
                    icon: BookOpen,
                  },
                  {
                    label: "Pending payments",
                    value: pendingPayments.length,
                    icon: WalletCards,
                  },
                  {
                    label: "Upcoming exams",
                    value: data.exams.filter((item) => item.is_published && item.scheduled_at && new Date(item.scheduled_at) > new Date()).length,
                    icon: ClipboardCheck,
                  },
                ].map(({ label, value, icon: Icon }) => (
                  <article key={label}>
                    <span className="learning-stat-icon">
                      <Icon size={17} />
                    </span>
                    <strong>{value}</strong>
                    <span>{label}</span>
                  </article>
                ))}
              </div>
              <div className="teacher-quick-actions">
                <button
                  type="button"
                  onClick={() => {
                    setCreatedStudent(null);
                    setModal("student");
                  }}
                >
                  <Plus size={16} /> Add Student
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewCourseStage("");
                    setCourseIsFree(false);
                    setCoursePrices({ original: "", final: "" });
                    setModal("course");
                  }}
                >
                  <Plus size={16} /> Add Course
                </button>
                <button type="button" onClick={() => setModal("lesson")}>
                  <FilePlus2 size={16} /> Add Lesson
                </button>
                <button type="button" onClick={() => setModal("exam")}>
                  <ClipboardCheck size={16} /> Create Exam
                </button>
                <button type="button" onClick={() => setSection("payments")}>
                  <WalletCards size={16} /> Review Payments{" "}
                  {pendingPayments.length > 0 && (
                    <b>{pendingPayments.length}</b>
                  )}
                </button>
              </div>
              <div className="learning-two-column teacher-overview-lists">
                <section className="learning-section">
                  <div className="learning-section-heading">
                    <div>
                      <span className="eyebrow">
                        <span className="eyebrow-dash" /> NEWEST FIRST
                      </span>
                      <h2>Recent registrations</h2>
                    </div>
                    <button
                      className="quiet-link"
                      type="button"
                      onClick={() => setSection("students")}
                    >
                      All students <ArrowRight size={14} />
                    </button>
                  </div>
                  {data.students.length ? (
                    <div className="compact-list">
                      {data.students.slice(0, 5).map((student) => (
                        <StudentMini
                          key={student.user_id}
                          student={student}
                          onOpen={() => {
                            setSelectedStudent(student);
                            setModal("student-view");
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <EmptyTeacher
                      title="No students yet"
                      text="Your student list will appear here after the first account is created."
                    />
                  )}
                </section>
                <section className="learning-section">
                  <div className="learning-section-heading">
                    <div>
                      <span className="eyebrow">
                        <span className="eyebrow-dash" /> NEEDS YOUR REVIEW
                      </span>
                      <h2>Payment requests</h2>
                    </div>
                    <button
                      className="quiet-link"
                      type="button"
                      onClick={() => setSection("payments")}
                    >
                      Review all <ArrowRight size={14} />
                    </button>
                  </div>
                  {pendingPayments.length ? (
                    <div className="compact-list">
                      {pendingPayments.slice(0, 5).map((payment) => (
                        <PaymentMini
                          key={payment.id}
                          payment={payment}
                          student={data.students.find(
                            (item) => item.user_id === payment.student_id,
                          )}
                          course={data.courses.find(
                            (item) => item.id === payment.course_id,
                          )}
                          onReview={() => setSection("payments")}
                        />
                      ))}
                    </div>
                  ) : (
                    <EmptyTeacher
                      title="All caught up"
                      text="New payment requests will appear here."
                    />
                  )}
                </section>
              </div>
              <section className="learning-section recent-exams">
                <div className="learning-section-heading">
                  <div>
                    <span className="eyebrow">
                      <span className="eyebrow-dash" /> RECENT ACTIVITY
                    </span>
                    <h2>Exam activity</h2>
                  </div>
                  <button
                    className="quiet-link"
                    type="button"
                    onClick={() => setSection("results")}
                  >
                    See results <ArrowRight size={14} />
                  </button>
                </div>
                {data.attempts.length ? (
                  <div className="data-list">
                    {data.attempts.slice(0, 5).map((attempt) => (
                      <article className="data-row" key={attempt.id}>
                        <span className="learning-stat-icon">
                          <Award size={17} />
                        </span>
                        <div className="data-row-main">
                          <strong>
                            {data.students.find(
                              (item) => item.user_id === attempt.student_id,
                            )?.full_name ?? "Student"}
                          </strong>
                          <small>
                            {data.exams.find(
                              (item) => item.id === attempt.exam_id,
                            )?.title ?? "Exam"}{" "}
                            · {formatDate(attempt.submitted_at)}
                          </small>
                        </div>
                        <strong className="result-score">
                          {attempt.score}%
                        </strong>
                      </article>
                    ))}
                  </div>
                ) : (
                  <EmptyTeacher
                    title="No exam activity yet"
                    text="Completed student exams will appear here."
                  />
                )}
              </section>
            </>
          )}

          {section === "students" && (
            <section className="learning-section">
              <div className="learning-section-heading">
                <div>
                  <span className="eyebrow">
                    <span className="eyebrow-dash" /> YOUR CLASS LIST
                  </span>
                  <h2>
                    Students <small>{students.length}</small>
                  </h2>
                </div>
                <button
                  className="button button-small"
                  type="button"
                  onClick={() => {
                    setCreatedStudent(null);
                    setModal("student");
                  }}
                >
                  <Plus size={15} /> Add Student
                </button>
              </div>
              <div className="filter-row">
                <label className="dashboard-filter">
                  Stage
                  <select
                    value={stageFilter}
                    onChange={(event) => setStageFilter(event.target.value)}
                  >
                    <option value="all">All stages</option>
                    {stages.map((stage) => (
                      <option key={stage}>{stage}</option>
                    ))}
                  </select>
                </label>
                <label className="dashboard-filter">
                  Access
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                  >
                    <option value="all">All statuses</option>
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                  </select>
                </label>
                <label className="dashboard-filter">
                  Course
                  <select
                    value={courseFilter}
                    onChange={(event) => setCourseFilter(event.target.value)}
                  >
                    <option value="all">All courses</option>
                    {data.courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.name}
                      </option>
                    ))}
                  </select>
                </label>
                <span className="filter-result-count">
                  {students.length} students
                </span>
              </div>
              {students.length ? (
                <div className="teacher-student-list">
                  {students.map((student) => (
                    <StudentCard
                      key={student.user_id}
                      student={student}
                      courses={data.courses}
                      enrollments={data.enrollments}
                      onApprove={() => void approveStudent(student.user_id)}
                      onIssueCode={() => void issueStudentAccessCode(student)}
                      onRevealAccessCode={() => void revealStudentAccessCode(student.user_id)}
                      revealedAccessCode={revealedAccessCodes[student.user_id]}
                      onManage={(action) => void manageStudent(student.user_id, action)}
                      onAssign={assignStudentCourse}
                      onOpen={() => {
                        setSelectedStudent(student);
                        setModal("student-view");
                      }}
                      onAttendance={() => {
                        setSelectedStudent(student);
                        setModal("attendance");
                      }}
                      busy={busy}
                    />
                  ))}
                </div>
              ) : (
                <EmptyTeacher
                  title="No students match these filters"
                  text="Try another search or stage."
                />
              )}
            </section>
          )}

          {section === "requests" && (
            <section className="learning-section">
              <div className="learning-section-heading">
                <div>
                  <span className="eyebrow"><span className="eyebrow-dash" /> ACCOUNT REVIEW</span>
                  <h2>Student requests <small>{pendingStudentRequests.length}</small></h2>
                </div>
              </div>
              {pendingStudentRequests.length ? (
                <div className="student-request-list">
                  {pendingStudentRequests.map((student) => {
                    const studentChallenges = data.challenges.filter((attempt) => attempt.claimed_by === student.user_id);
                    return <article className="teacher-student-card" key={student.user_id}>
                      <div className="teacher-student-primary">
                        <span className="learning-avatar learning-avatar-initial">{student.full_name.slice(0, 1)}</span>
                        <div>
                          <strong>{student.full_name}</strong>
                          <span>{student.academic_stage}{student.educational_system ? ` · ${student.educational_system}` : ""}</span>
                          <small>{student.email}</small>
                        </div>
                        <span className="status-pill pending">Awaiting review</span>
                      </div>
                      <div className="teacher-student-details">
                        <span>Student phone: {student.phone}</span>
                        <span>Parent phone: {student.guardian_phone}</span>
                        <span>Submitted {formatDate(student.created_at)}</span>
                        {studentChallenges.map((attempt) => <span key={attempt.id}>Challenge: {attempt.correct_count}/{attempt.question_count} correct · {attempt.score}% · {attempt.discount_percent}% discount</span>)}
                      </div>
                      <div className="teacher-student-actions">
                        <button className="button button-small" type="button" disabled={busy === `approve-${student.user_id}`} onClick={() => void approveStudent(student.user_id)}>
                          {busy === `approve-${student.user_id}` ? <LoaderCircle className="spin" size={14} /> : <Check size={14} />} Approve
                        </button>
                        <button className="quiet-link request-reject" type="button" disabled={busy === `reject-${student.user_id}`} onClick={() => void manageStudent(student.user_id, "reject")}>
                          {busy === `reject-${student.user_id}` ? <LoaderCircle className="spin" size={14} /> : <X size={14} />} Reject request
                        </button>
                      </div>
                    </article>;
                  })}
                </div>
              ) : (
                <EmptyTeacher title="No requests waiting" text="New student applications will appear here for review." />
              )}
            </section>
          )}

          {section === "courses" && (
            <section className="learning-section">
              <div className="learning-section-heading">
                <div>
                  <span className="eyebrow">
                    <span className="eyebrow-dash" /> ORGANIZE YOUR CLASSROOM
                  </span>
                  <h2>{course ? course.name : "Courses"}</h2>
                </div>
                <div className="heading-actions">
                  <button
                    className="button button-outline button-small"
                    type="button"
                    onClick={() => setSelectedCourse("")}
                  >
                    All courses
                  </button>
                  <button
                    className="button button-small"
                    type="button"
                    onClick={() => {
                      setNewCourseStage("");
                      setCourseIsFree(false);
                      setCoursePrices({ original: "", final: "" });
                      setModal("course");
                    }}
                  >
                    <Plus size={15} /> Add Course
                  </button>
                </div>
              </div>
              {course ? (
                <CourseManagement
                  course={course}
                  data={data}
                  onAddLesson={() => setModal("lesson")}
                  onDeleteLesson={deleteLesson}
                  onDelete={(id) => void deleteContent("course", id, `course “${course.name}”`)}
                  onDeleteExam={(exam) => void deleteContent("exam", exam.id, `exam “${exam.title}”`)}
                  onDeletePlaylist={(playlist) => void deleteContent("playlist", playlist.id, `playlist “${playlist.title}”`)}
                  onEditPublish={async () => {
                    const { error: updateError } =
                      await createBrowserSupabase()!
                        .from("courses")
                        .update({ is_published: !course.is_published })
                        .eq("id", course.id);
                    if (updateError)
                      showError("Course status could not be changed.");
                    else {
                      showNotice(
                        course.is_published
                          ? "Course unpublished."
                          : "Course published.",
                      );
                      router.refresh();
                    }
                  }}
                />
              ) : (
                <div className="teacher-course-grid">
                  {visibleCourses.map((item) => (
                    <article className="teacher-course-card" key={item.id}>
                      <div
                        className="teacher-course-cover"
                        style={
                          item.cover_image_url
                            ? {
                                backgroundImage: `linear-gradient(180deg, transparent, rgb(37 42 53 / 25%)), url("${item.cover_image_url}")`,
                              }
                            : undefined
                        }
                      >
                        <span>
                          {item.academic_stage}
                          {item.educational_system
                            ? ` · ${item.educational_system}`
                            : ""}
                        </span>
                        {!item.cover_image_url && <BookOpen size={26} />}
                      </div>
                      <div className="teacher-course-card-copy">
                        <span
                          className={`status-pill ${item.is_published ? "active" : "pending"}`}
                        >
                          {item.is_published ? "Published" : "Draft"}
                        </span>
                        <h3>{item.name}</h3>
                        <p>{item.description || "No description added."}</p>
                        <div className="teacher-course-price">
                          <span>
                            {item.is_free ? "Free" : currency(item.price)}
                          </span>
                          {item.discount_percent > 0 && (
                            <small>
                              {item.discount_percent}% OFF · was{" "}
                              {currency(item.original_price)}
                            </small>
                          )}
                        </div>
                        <div className="teacher-course-foot">
                          <span>
                            {
                              data.lessons.filter(
                                (lesson) => lesson.course_id === item.id,
                              ).length
                            }{" "}
                            lessons
                          </span>
                          <button
                            className="quiet-link"
                            type="button"
                            onClick={() => setSelectedCourse(item.id)}
                          >
                            Manage course <ArrowRight size={14} />
                          </button>
                          <button
                            className="icon-button delete-icon"
                            type="button"
                            aria-label={`Delete course ${item.name}`}
                            title="Delete course"
                            disabled={busy === `delete-${item.id}`}
                            onClick={() => void deleteContent("course", item.id, `course “${item.name}”`)}
                          >
                            {busy === `delete-${item.id}` ? <LoaderCircle className="spin" size={15} /> : <Trash2 size={15} />}
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {section === "lessons" && (
            <section className="learning-section">
              <div className="learning-section-heading">
                <div>
                  <span className="eyebrow">
                    <span className="eyebrow-dash" /> YOUR COURSE CONTENT
                  </span>
                  <h2>Lessons</h2>
                </div>
                <button
                  className="button button-small"
                  type="button"
                  onClick={() => setModal("lesson")}
                >
                  <Plus size={15} /> Add Lesson
                </button>
              </div>
              <div className="filter-row">
                <label className="dashboard-filter">
                  Course
                  <select
                    value={selectedCourse}
                    onChange={(event) => setSelectedCourse(event.target.value)}
                  >
                    <option value="">All courses</option>
                    {data.courses.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <LessonList
                lessons={data.lessons.filter(
                  (item) =>
                    !selectedCourse || item.course_id === selectedCourse,
                )}
                courses={data.courses}
                onMove={moveLesson}
                onDelete={deleteLesson}
                onPublish={async (lesson) => {
                  const { error: updateError } = await createBrowserSupabase()!
                    .from("lessons")
                    .update({ is_published: !lesson.is_published })
                    .eq("id", lesson.id);
                  if (updateError)
                    showError("Lesson status could not be changed.");
                  else router.refresh();
                }}
              />
            </section>
          )}

          {section === "exams" && (
            <section className="learning-section">
              <div className="learning-section-heading">
                <div>
                  <span className="eyebrow">
                    <span className="eyebrow-dash" /> EXAM BUILDER
                  </span>
                  <h2>Exams</h2>
                </div>
                <button
                  className="button button-small"
                  type="button"
                  onClick={() => setModal("exam")}
                >
                  <Plus size={15} /> Create Exam
                </button>
              </div>
              {examLoadError ? (
                <EmptyTeacher
                  title="Exams could not be loaded"
                  text="Please try refreshing the page."
                />
              ) : visibleExams.length ? (
                <div className="teacher-exam-list">
                  {visibleExams.map((exam) => (
                    <article className="teacher-exam-row" key={exam.id}>
                      <span className="learning-stat-icon">
                        <ClipboardCheck size={17} />
                      </span>
                      <div className="data-row-main">
                        <strong>{exam.title}</strong>
                        <small>
                          {
                            data.courses.find(
                              (item) => item.id === exam.course_id,
                            )?.name
                          }{" "}
                          · {exam.question_count} questions ·{" "}
                          {exam.duration_minutes} min{exam.scheduled_at ? ` · ${formatDate(exam.scheduled_at)}` : ""} · pass{" "}
                          {exam.passing_score}%
                        </small>
                      </div>
                      <span
                        className={`status-pill ${exam.is_published ? "active" : "pending"}`}
                      >
                        {exam.is_published ? "Published" : "Draft"}
                      </span>
                      <button
                        className="icon-button"
                        type="button"
                        aria-label={
                          exam.is_published ? "Unpublish exam" : "Publish exam"
                        }
                        onClick={async () => {
                          const { error: updateError } =
                            await createBrowserSupabase()!
                              .from("exams")
                              .update({ is_published: !exam.is_published })
                              .eq("id", exam.id);
                          if (updateError)
                            showError("Exam status could not be changed.");
                          else router.refresh();
                        }}
                      >
                        <Check size={16} />
                      </button>
                      <button
                        className="icon-button delete-icon"
                        type="button"
                        aria-label={`Delete exam ${exam.title}`}
                        title="Delete exam and its questions and results"
                        disabled={busy === `delete-${exam.id}`}
                        onClick={() => void deleteContent("exam", exam.id, `exam “${exam.title}”`)}
                      >
                        {busy === `delete-${exam.id}` ? <LoaderCircle className="spin" size={15} /> : <Trash2 size={15} />}
                      </button>
                    </article>
                  ))}
                </div>
              ) : data.exams.length ? (
                <EmptyTeacher
                  title="No exams match your search"
                  text="Clear the search to see all exams."
                />
              ) : (
                <EmptyTeacher
                  title="No exams yet"
                  text="Create an exam for any published course."
                />
              )}
            </section>
          )}

          {section === "homework" && (
            <section className="learning-section">
              <div className="learning-section-heading">
                <div>
                  <span className="eyebrow"><span className="eyebrow-dash" /> STUDENT WORK</span>
                  <h2>Homework submissions</h2>
                </div>
                <span>{data.homeworkSubmissions.length} submissions</span>
              </div>
              {data.homeworkSubmissions.length ? (
                <div className="data-list">
                  {data.homeworkSubmissions.map((submission) => {
                    const student = data.students.find((item) => item.user_id === submission.student_id);
                    const lesson = data.lessons.find((item) => item.id === submission.lesson_id);
                    return (
                      <article className="data-row" key={submission.id}>
                        <span className="learning-stat-icon"><FilePlus2 size={17} /></span>
                        <div className="data-row-main">
                          <strong>{student?.full_name ?? "Student"}</strong>
                          <small>{lesson?.title ?? "Homework"} · {submission.file_name} · {formatDate(submission.submitted_at)}</small>
                        </div>
                        <span className="status-pill pending">Submitted</span>
                        {submission.signed_url && (
                          <a className="quiet-link" href={submission.signed_url} target="_blank" rel="noreferrer">
                            <Download size={15} /> Download
                          </a>
                        )}
                      </article>
                    );
                  })}
                </div>
              ) : (
                <EmptyTeacher title="No homework submitted yet" text="Student uploads will appear here for review." />
              )}
            </section>
          )}

          {section === "results" && (
            <section className="learning-section">
              <div className="learning-section-heading">
                <div>
                  <span className="eyebrow">
                    <span className="eyebrow-dash" /> STUDENT PROGRESS
                  </span>
                  <h2>Exam results</h2>
                </div>
              </div>
              {data.attempts.length ? (
                <div className="data-list">
                  {data.attempts.map((attempt) => (
                    <article className="data-row" key={attempt.id}>
                      <span className="learning-stat-icon">
                        <Award size={17} />
                      </span>
                      <div className="data-row-main">
                        <strong>
                          {data.students.find(
                            (item) => item.user_id === attempt.student_id,
                          )?.full_name ?? "Student"}
                        </strong>
                        <small>
                          {data.exams.find(
                            (item) => item.id === attempt.exam_id,
                          )?.title ?? "Exam"}{" "}
                          · {formatDate(attempt.submitted_at)}
                        </small>
                      </div>
                      <span>
                        {attempt.correct_count}/{attempt.question_count} correct
                      </span>
                      <strong className="result-score">{attempt.score}%</strong>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyTeacher
                  title="Results will appear here"
                  text="Students' completed exams will be listed here."
                />
              )}
            </section>
          )}

          {section === "challenge-results" && (
            <section className="learning-section">
              <div className="learning-section-heading">
                <div>
                  <span className="eyebrow"><span className="eyebrow-dash" /> PLAY & EARN</span>
                  <h2>Challenge results</h2>
                </div>
                <span>{data.challenges.length} results</span>
              </div>
              {data.challenges.length ? (
                <div className="data-list">
                  {data.challenges.map((attempt) => {
                    const student = data.students.find((item) => item.user_id === attempt.claimed_by);
                    return <article className="data-row" key={attempt.id}>
                      <span className="learning-stat-icon"><Sparkles size={17} /></span>
                      <div className="data-row-main">
                        <strong>{student?.full_name ?? "Guest attempt"}</strong>
                        <small>{student ? `${student.email} · ${student.phone} · ${student.academic_stage}` : "No account linked"} · {formatDate(attempt.created_at)}</small>
                      </div>
                      <span>{attempt.correct_count}/{attempt.question_count} correct</span>
                      <strong className="result-score">{attempt.score}%</strong>
                      <span className="status-pill active">{attempt.discount_percent}% discount</span>
                      <button
                        className="icon-button delete-icon"
                        type="button"
                        aria-label={`Delete challenge result for ${student?.full_name ?? "guest attempt"}`}
                        title="Delete challenge result"
                        disabled={busy === `delete-result-${attempt.id}`}
                        onClick={() => void deleteChallengeResult(attempt.id, student?.full_name ?? "this guest attempt")}
                      >
                        {busy === `delete-result-${attempt.id}` ? <LoaderCircle className="spin" size={15} /> : <Trash2 size={15} />}
                      </button>
                    </article>;
                  })}
                </div>
              ) : (
                <EmptyTeacher title="No challenge results yet" text="Results appear here after a visitor completes a challenge." />
              )}
            </section>
          )}

          {section === "attendance" && (
            <section className="learning-section">
              <div className="learning-section-heading">
                <div>
                  <span className="eyebrow">
                    <span className="eyebrow-dash" /> A CLEAR CLASS RECORD
                  </span>
                  <h2>Attendance</h2>
                </div>
              </div>
              <div className="filter-row">
                <label className="dashboard-filter">
                  Course
                  <select
                    value={selectedCourse}
                    onChange={(event) => setSelectedCourse(event.target.value)}
                  >
                    <option value="">All courses</option>
                    {data.courses.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="teacher-student-list">
                {data.students.map((student) => {
                  const records = data.attendance.filter(
                    (item) =>
                      item.student_id === student.user_id &&
                      (!selectedCourse || item.course_id === selectedCourse),
                  );
                  const present = records.filter(
                    (item) => item.status === "present",
                  ).length;
                  return (
                    <article
                      className="attendance-student-row"
                      key={student.user_id}
                    >
                      <StudentMini
                        student={student}
                        onOpen={() => {
                          setSelectedStudent(student);
                          setModal("student-view");
                        }}
                      />
                      <div className="attendance-progress">
                        <strong>
                          {records.length
                            ? Math.round((present * 100) / records.length)
                            : 0}
                          %
                        </strong>
                        <small>
                          {present} present · {records.length - present} absent
                        </small>
                      </div>
                      <button
                        className="button button-outline button-small"
                        type="button"
                        onClick={() => {
                          setSelectedStudent(student);
                          setModal("attendance");
                        }}
                      >
                        <CalendarDays size={14} /> Mark attendance
                      </button>
                    </article>
                  );
                })}
              </div>
              <div className="data-list attendance-history">
                {data.attendance.slice(0, 12).map((record) => (
                  <article className="data-row" key={record.id}>
                    <span className={`attendance-mark ${record.status}`}>
                      <Check size={14} />
                    </span>
                    <div className="data-row-main">
                      <strong>
                        {data.students.find(
                          (item) => item.user_id === record.student_id,
                        )?.full_name ?? "Student"}
                      </strong>
                      <small>
                        {data.courses.find(
                          (item) => item.id === record.course_id,
                        )?.name ?? "Class"}{" "}
                        · {formatDate(record.attended_on)}
                      </small>
                    </div>
                    <span className={`status-pill ${record.status}`}>
                      {record.status}
                    </span>
                  </article>
                ))}
              </div>
            </section>
          )}

          {section === "payments" && (
            <section className="learning-section">
              <div className="learning-section-heading">
                <div>
                  <span className="eyebrow">
                    <span className="eyebrow-dash" /> APPROVE ACCESS IN ONE STEP
                  </span>
                  <h2>Payment requests</h2>
                </div>
                <span className="pending-count-label">
                  {pendingPayments.length} pending
                </span>
              </div>
              {data.payments.length ? (
                <div className="payment-review-list">
                  {data.payments.map((payment) => (
                    <article className="payment-review-card" key={payment.id}>
                      <div className="payment-review-top">
                        <span className={`status-pill ${payment.status}`}>
                          {payment.status === "pending"
                            ? "Under review"
                            : payment.status}
                        </span>
                        <time>{formatDate(payment.created_at)}</time>
                      </div>
                      <div className="payment-review-info">
                        <div>
                          <span>STUDENT</span>
                          <strong>
                            {data.students.find(
                              (item) => item.user_id === payment.student_id,
                            )?.full_name ?? "Student"}
                          </strong>
                          <small>
                            {data.students.find(
                              (item) => item.user_id === payment.student_id,
                            )?.email ?? ""}
                          </small>
                        </div>
                        <div>
                          <span>COURSE</span>
                          <strong>
                            {data.courses.find(
                              (item) => item.id === payment.course_id,
                            )?.name ?? "Course"}
                          </strong>
                          <small>{payment.payment_method}</small>
                        </div>
                        <div>
                          <span>AMOUNT</span>
                          <strong>{currency(payment.amount)}</strong>
                        </div>
                        <div>
                          <span>TRANSFER FROM</span>
                          <strong>{payment.sender_phone || "Not provided"}</strong>
                        </div>
                        <div>
                          <span>TRANSFER DATE</span>
                          <strong>{payment.transferred_at ? formatDate(payment.transferred_at) : "Not provided"}</strong>
                        </div>
                      </div>
                      {payment.status === "rejected" &&
                        payment.rejection_note && (
                          <p className="rejection-note">
                            {payment.rejection_note}
                          </p>
                        )}
                      <div className="payment-review-actions">
                        <button
                          className="button button-outline button-small"
                          type="button"
                          onClick={() => viewReceipt(payment)}
                        >
                          View receipt <ArrowRight size={14} />
                        </button>
                        {receipt?.id === payment.id && (
                          <a
                            className="quiet-link"
                            href={receipt.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open receipt <ArrowRight size={14} />
                          </a>
                        )}
                        {payment.status === "pending" && (
                          <>
                            <button
                              className="button button-small"
                              type="button"
                              disabled={busy === payment.id}
                              onClick={() => reviewPayment(payment, "approved")}
                            >
                              {busy === payment.id ? (
                                <LoaderCircle className="spin" size={14} />
                              ) : (
                                <Check size={14} />
                              )}{" "}
                              Approve Payment
                            </button>
                            <button
                              className="button button-reject button-small"
                              type="button"
                              disabled={busy === payment.id}
                              onClick={() => reviewPayment(payment, "rejected")}
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyTeacher
                  title="No payment requests yet"
                  text="Student payment submissions will show up here."
                />
              )}
            </section>
          )}

          {section === "challenges" && (
            <section className="learning-section">
              <div className="learning-section-heading">
                <div>
                  <span className="eyebrow">
                    <span className="eyebrow-dash" /> PLAY & EARN
                  </span>
                  <h2>Challenges & rewards</h2>
                </div>
                <button className="button button-outline button-small" type="button" onClick={() => setSection("challenge-results")}>
                  <Award size={14} /> Challenge results
                </button>
              </div>
              <div className="reward-rule-list">
                <div className="learning-section-heading">
                  <div>
                    <h3>Reward ladder</h3>
                    <p>Each correct answer earns 5%, up to 25% for all five.</p>
                  </div>
                </div>
                {Array.from({ length: 5 }, (_, index) => (
                  <div className="reward-rule-row" key={index + 1}>
                    <span>{index + 1}/5 correct</span>
                    <strong>{(index + 1) * 5}% course discount</strong>
                  </div>
                ))}
              </div>
              <div className="learning-section-heading challenge-question-heading">
                <div>
                  <h3>Five-question challenges</h3>
                  <p>Each saved challenge is published on the homepage. Visitors are assigned a random set.</p>
                </div>
                <span>{data.challengeSets.length} total</span>
              </div>
              <form className="challenge-add-row" onSubmit={addChallenge}>
                <label className="form-field">
                  <span>Challenge title</span>
                  <input name="title" type="text" placeholder="Grammar challenge 1" maxLength={100} required />
                </label>
                {Array.from({ length: 5 }, (_, index) => (
                  <fieldset className="challenge-question-form" key={index}>
                    <legend>Question {String(index + 1).padStart(2, "0")}</legend>
                    <input name={`prompt-${index + 1}`} type="text" placeholder="Question prompt" maxLength={500} required />
                    <div className="challenge-choice-grid">
                      {Array.from({ length: 4 }, (_, choiceIndex) => (
                        <input key={choiceIndex} name={`choice-${index + 1}-${choiceIndex + 1}`} type="text" placeholder={`Choice ${choiceIndex + 1}`} maxLength={200} required />
                      ))}
                    </div>
                    <input name={`answer-${index + 1}`} type="text" placeholder="Correct answer (must match one choice)" maxLength={200} required />
                  </fieldset>
                ))}
                <div className="challenge-row-actions">
                  <button className="button button-small" type="submit" disabled={busy === "challenge-set"}>
                    {busy === "challenge-set" ? <LoaderCircle className="spin" size={14} /> : <Check size={15} />} Save and publish
                  </button>
                </div>
              </form>
              <div className="challenge-set-list">
                {data.challengeSets.map((challenge) => {
                  const questions = data.questions
                    .filter((question) => question.challenge_id === challenge.id)
                    .sort((first, second) => first.position - second.position);
                  return (
                    <article className="challenge-set-row" key={challenge.id}>
                      <div className="challenge-set-heading">
                        <div>
                          <strong>{challenge.title}</strong>
                          <small>{questions.length} questions · {formatDate(challenge.created_at)}</small>
                        </div>
                        <span className={`status-pill ${challenge.is_published ? "active" : "pending"}`}>
                          {challenge.is_published ? "Published" : "Draft"}
                        </span>
                        <button
                          className="quiet-link"
                          type="button"
                          disabled={busy === `publish-${challenge.id}` || (!challenge.is_published && (questions.length !== 5 || questions.some((question) => !question.is_published)))}
                          title={!challenge.is_published && (questions.length !== 5 || questions.some((question) => !question.is_published)) ? "Only complete five-question challenges can be published." : undefined}
                          onClick={async () => {
                            setBusy(`publish-${challenge.id}`);
                            const { error: updateError } = await createBrowserSupabase()!
                              .from("challenge_sets")
                              .update({ is_published: !challenge.is_published })
                              .eq("id", challenge.id);
                            if (updateError) showError("Challenge visibility could not be changed.");
                            else {
                              showNotice(challenge.is_published ? "Challenge unpublished." : "Challenge published on the homepage.");
                              router.refresh();
                            }
                            setBusy("");
                          }}
                        >
                          {challenge.is_published ? "Unpublish" : "Publish"}
                        </button>
                        <button
                          className="icon-button delete-icon"
                          type="button"
                          aria-label={`Delete challenge ${challenge.title}`}
                          title="Delete challenge and its five questions"
                          disabled={busy === `delete-${challenge.id}`}
                          onClick={() => void deleteContent("challenge-set", challenge.id, `challenge “${challenge.title}”`)}
                        >
                          {busy === `delete-${challenge.id}` ? <LoaderCircle className="spin" size={15} /> : <Trash2 size={15} />}
                        </button>
                      </div>
                      <ol>
                        {questions.map((question) => (
                          <li key={question.id}>
                            <span>{question.prompt}</span>
                            <small>{question.choices.join(" · ")} · Answer: {question.correct_answer}</small>
                          </li>
                        ))}
                      </ol>
                    </article>
                  );
                })}
                {!data.challengeSets.length && <EmptyTeacher title="No challenges yet" text="Create a five-question challenge to publish it on the homepage." />}
              </div>
            </section>
          )}

          {section === "announcements" && (
            <section className="learning-section">
              <div className="learning-section-heading">
                <div>
                  <span className="eyebrow">
                    <span className="eyebrow-dash" /> NOTES FROM THE ZONE
                  </span>
                  <h2>Announcements</h2>
                </div>
                <button
                  className="button button-small"
                  type="button"
                  onClick={() => setModal("announcement")}
                >
                  <Plus size={15} /> New announcement
                </button>
              </div>
              {data.announcements.length ? (
                <div className="announcement-list">
                  {data.announcements.map((item) => (
                    <article key={item.id}>
                      <div>
                        <span
                          className={`status-pill ${item.is_published ? "active" : "pending"}`}
                        >
                          {item.is_published ? "Published" : "Draft"}
                        </span>
                        <small>
                          {item.audience_type === "all"
                            ? "All students"
                            : item.audience_type === "stage"
                              ? item.audience_value
                              : data.courses.find(
                                  (course) => course.id === item.audience_value,
                                )?.name}{" "}
                          · {formatDate(item.published_at)}
                        </small>
                      </div>
                      <h3>{item.title}</h3>
                      <p>{item.body}</p>
                      <button
                        className="quiet-link"
                        type="button"
                        onClick={async () => {
                          const { error: updateError } =
                            await createBrowserSupabase()!
                              .from("announcements")
                              .update({ is_published: !item.is_published })
                              .eq("id", item.id);
                          if (updateError)
                            showError(
                              "Announcement status could not be changed.",
                            );
                          else router.refresh();
                        }}
                      >
                        {item.is_published ? "Unpublish" : "Publish"}{" "}
                        <ArrowRight size={14} />
                      </button>
                      <button
                        className="icon-button delete-icon"
                        type="button"
                        aria-label={`Delete announcement ${item.title}`}
                        title="Delete announcement"
                        disabled={busy === `delete-${item.id}`}
                        onClick={() => void deleteContent("announcement", item.id, `announcement “${item.title}”`)}
                      >
                        {busy === `delete-${item.id}` ? <LoaderCircle className="spin" size={15} /> : <Trash2 size={15} />}
                      </button>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyTeacher
                  title="No announcements yet"
                  text="Create a note for all students, a course, or an educational stage."
                />
              )}
            </section>
          )}

          {section === "settings" && (
            <section className="learning-section">
              <div className="learning-section-heading">
                <div>
                  <span className="eyebrow">
                    <span className="eyebrow-dash" /> THE IMPORTANT DETAILS
                  </span>
                  <h2>Settings</h2>
                </div>
              </div>
              <form className="teacher-settings-form" onSubmit={saveSettings}>
                <div className="settings-group">
                  <span className="settings-group-icon">
                    <UserRound size={18} />
                  </span>
                  <div>
                    <h3>Teacher profile</h3>
                    <p>Your name as students see it.</p>
                  </div>
                  <label className="form-field">
                    <span>Teacher name</span>
                    <input
                      value={teacherName}
                      onChange={(event) => setTeacherName(event.target.value)}
                      required
                    />
                  </label>
                </div>
                <div className="settings-group">
                  <span className="settings-group-icon">
                    <CircleDollarSign size={18} />
                  </span>
                  <div>
                    <h3>Payment information</h3>
                    <p>
                      Displayed to students when they submit course payments.
                    </p>
                  </div>
                  <label className="form-field">
                    <span>InstaPay number</span>
                    <input
                      value={instapayNumber}
                      onChange={(event) =>
                        setInstapayNumber(event.target.value)
                      }
                      inputMode="tel"
                      required
                    />
                  </label>
                </div>
                <button className="button" type="submit">
                  Save settings
                </button>
              </form>
              <div className="teacher-security-note">
                <ShieldCheck size={17} /> Teacher actions and payment approvals
                are verified securely through Supabase.
              </div>
            </section>
          )}
        </div>
        <footer className="learning-footer">
          <span>ENGLISH ZONE · CLASSROOM CONTROL</span>
          <span>
            {pendingPayments.length} payments to review <Bell size={13} />
          </span>
        </footer>
      </section>

      {modal && (
        <Modal
          title={
            modal === "student"
              ? createdStudent
                  ? createdStudent.purpose === "approved"
                    ? "Student Approved"
                    : createdStudent.purpose === "issued"
                      ? "Access Code Issued"
                      : "Student Created Successfully"
                : "Add Student"
              : modal === "course"
                ? "Add Course"
                : modal === "lesson"
                  ? "Add Lesson"
                  : modal === "exam"
                    ? "Create Exam"
                    : modal === "announcement"
                      ? "New Announcement"
                      : modal === "attendance"
                        ? "Mark Attendance"
                        : "Student Profile"
          }
          onClose={() => {
            setModal(null);
            setCreatedStudent(null);
          }}
        >
          {modal === "student" &&
            (createdStudent ? (
              <div className="created-student">
                <span className="created-student-icon">
                  <CheckCircle2 size={24} />
                </span>
                <p>{createdStudent.purpose === "approved" ? "The student account is approved." : createdStudent.purpose === "issued" ? "A reusable access code is ready to share." : "Your new student account is ready."}</p>
                <dl>
                  <div>
                    <dt>Name</dt>
                    <dd>{createdStudent.name}</dd>
                  </div>
                  <div>
                    <dt>Email</dt>
                    <dd>{createdStudent.email}</dd>
                  </div>
                  <div>
                    <dt>Student Code</dt>
                    <dd>{createdStudent.studentCode}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>{createdStudent.status.replaceAll("_", " ")}</dd>
                  </div>
                </dl>
                <div className="generated-code">
                  <span>REUSABLE ACCESS CODE</span>
                  <strong>{createdStudent.accessCode}</strong>
                  <button
                    type="button"
                    className="button button-outline button-small"
                    onClick={async () => {
                      await navigator.clipboard.writeText(
                        createdStudent.accessCode,
                      );
                      showNotice("Access code copied.");
                    }}
                  >
                    <Copy size={14} /> Copy Access Code
                  </button>
                </div>
                <label className="form-field">
                  <span>Assign a course now</span>
                  <select
                    className="dashboard-select"
                    value={assignCourse}
                    onChange={(event) => setAssignCourse(event.target.value)}
                  >
                    <option value="">Choose course</option>
                    {data.courses
                      .filter((item) => item.is_published)
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                  </select>
                </label>
                <div className="modal-actions">
                  <button
                    className="button button-outline"
                    type="button"
                    onClick={() => {
                      setSearch(createdStudent.email);
                      setSection("students");
                      setModal(null);
                    }}
                  >
                    View Student
                  </button>
                  {assignCourse && (
                    <button
                      className="button"
                      type="button"
                      onClick={async () => {
                        await assignStudentCourse(
                          createdStudent.id,
                          assignCourse,
                        );
                        setModal(null);
                        setCreatedStudent(null);
                      }}
                    >
                      Assign Course <ArrowRight size={15} />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <form className="modal-form" onSubmit={createStudent}>
                <div className="form-grid-two">
                  <label className="form-field">
                    <span>Full name</span>
                    <input
                      name="fullName"
                      autoComplete="name"
                      required
                      minLength={2}
                    />
                  </label>
                  <label className="form-field">
                    <span>Student phone</span>
                    <input
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      required
                    />
                  </label>
                  <label className="form-field">
                    <span>Parent phone</span>
                    <input name="guardianPhone" type="tel" required />
                  </label>
                  <label className="form-field">
                    <span>Email</span>
                    <input
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                    />
                  </label>
                  <label className="form-field">
                    <span>Educational stage</span>
                    <select
                      value={newStage}
                      onChange={(event) => setNewStage(event.target.value)}
                      required
                    >
                      <option value="">Choose stage</option>
                      {stages.map((stage) => (
                        <option key={stage}>{stage}</option>
                      ))}
                    </select>
                  </label>
                  {newStage && newStage !== "3rd Preparatory" && (
                    <label className="form-field">
                      <span>Educational system</span>
                      <select name="educationalSystem" required>
                        <option value="">Choose system</option>
                        <option value="general">General</option>
                        <option value="baccalaureate">Baccalaureate</option>
                      </select>
                    </label>
                  )}
                </div>
                <label className="form-field">
                  <span>
                    Profile picture <small>Optional</small>
                  </span>
                  <input
                    name="avatar"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                  />
                </label>
                <button
                  className="button"
                  type="submit"
                  disabled={busy === "student"}
                >
                  {busy === "student" ? (
                    <LoaderCircle className="spin" size={16} />
                  ) : (
                    <Plus size={16} />
                  )}{" "}
                  Create Student
                </button>
              </form>
            ))}

          {modal === "course" && (
            <form className="modal-form" onSubmit={createCourse}>
              <div className="form-grid-two">
                <label className="form-field">
                  <span>Course name</span>
                  <input name="name" required />
                </label>
                <label className="form-field">
                  <span>Educational stage</span>
                  <select
                    value={newCourseStage}
                    onChange={(event) => setNewCourseStage(event.target.value)}
                    required
                  >
                    <option value="">Choose stage</option>
                    {stages.map((stage) => (
                      <option key={stage}>{stage}</option>
                    ))}
                  </select>
                </label>
                {newCourseStage && newCourseStage !== "3rd Preparatory" && (
                  <label className="form-field">
                    <span>Educational system</span>
                    <select name="educationalSystem" required>
                      <option value="">Choose system</option>
                      <option value="general">General</option>
                      <option value="baccalaureate">Baccalaureate</option>
                    </select>
                  </label>
                )}
                <label className="form-field">
                  <span>Original price (EGP)</span>
                  <input
                    name="originalPrice"
                    type="number"
                    min="0"
                    required={!courseIsFree}
                    value={coursePrices.original}
                    onChange={(event) =>
                      setCoursePrices({
                        ...coursePrices,
                        original: event.target.value,
                      })
                    }
                  />
                </label>
                <label className="form-field">
                  <span>Final price (EGP)</span>
                  <input
                    name="finalPrice"
                    type="number"
                    min="0"
                    max={coursePrices.original || undefined}
                    required={!courseIsFree}
                    value={coursePrices.final}
                    onChange={(event) =>
                      setCoursePrices({
                        ...coursePrices,
                        final: event.target.value,
                      })
                    }
                  />
                </label>
                <label className="form-field">
                  <span>Student limit (optional)</span>
                  <input name="studentLimit" type="number" min="1" placeholder="No limit" />
                </label>
              </div>
              <label className="form-field">
                <span>Course description</span>
                <textarea name="description" rows={3} />
              </label>
              <label className="form-field">
                <span>Cover image</span>
                <input
                  name="cover"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                />
              </label>
              {Number(coursePrices.original) > 0 &&
                Number(coursePrices.final) < Number(coursePrices.original) && (
                  <div className="discount-preview">
                    {Math.round(
                      ((Number(coursePrices.original) -
                        Number(coursePrices.final)) *
                        100) /
                        Number(coursePrices.original),
                    )}
                    % OFF
                  </div>
                )}
              <div className="form-toggle-row">
                <label>
                  <input name="isFree" type="checkbox" checked={courseIsFree} onChange={(event) => setCourseIsFree(event.target.checked)} /> Free course
                </label>
                <label>
                  <input name="isPublished" type="checkbox" defaultChecked />{" "}
                  Publish course
                </label>
              </div>
              <button
                className="button"
                type="submit"
                disabled={busy === "course"}
              >
                {busy === "course" ? (
                  <LoaderCircle className="spin" size={16} />
                ) : (
                  <Plus size={16} />
                )}{" "}
                Create Course
              </button>
            </form>
          )}

          {modal === "lesson" && (
            <form className="modal-form" onSubmit={createLesson}>
              <label className="form-field">
                <span>Course</span>
                <select name="courseId" value={selectedCourse} onChange={(event) => setSelectedCourse(event.target.value)} required>
                  <option value="">Choose course</option>
                  {data.courses.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span>Lesson title</span>
                <input name="title" required />
              </label>
              <label className="form-field">
                <span>Description</span>
                <textarea name="description" rows={2} />
              </label>
              <label className="form-field">
                <span>Playlist / unit</span>
                <select name="playlistId" defaultValue="">
                  <option value="">Course lessons</option>
                  {data.playlists
                    .filter((playlist) => playlist.course_id === selectedCourse)
                    .map((playlist) => (
                      <option key={playlist.id} value={playlist.id}>
                        {playlist.title}
                      </option>
                    ))}
                </select>
              </label>
              <label className="form-field">
                <span>Video link</span>
                <input name="videoUrl" type="url" placeholder="https://" />
              </label>
              <label className="form-field">
                <span>Homework</span>
                <textarea name="homework" rows={2} />
              </label>
              <label className="form-field">
                <span>Lesson file <small>Optional · PDF or image, up to 20 MB</small></span>
                <input name="material" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" />
              </label>
              <label className="toggle-label">
                <input name="isPublished" type="checkbox" /> Publish lesson for
                active students
              </label>
              <button
                className="button"
                type="submit"
                disabled={busy === "lesson"}
              >
                {busy === "lesson" ? (
                  <LoaderCircle className="spin" size={16} />
                ) : (
                  <Plus size={16} />
                )}{" "}
                Save Lesson
              </button>
            </form>
          )}

          {modal === "exam" && (
            <form className="modal-form exam-builder" onSubmit={createExam}>
              <div className="form-grid-two">
                <label className="form-field">
                  <span>Exam title</span>
                  <input name="title" required />
                </label>
                <label className="form-field">
                  <span>Course</span>
                  <select name="courseId" value={selectedCourse} onChange={(event) => setSelectedCourse(event.target.value)} required>
                    <option value="">Choose course</option>
                    {data.courses.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>Lesson / unit</span>
                  <select name="lessonId" defaultValue="">
                    <option value="">Course-wide exam</option>
                    {data.lessons.filter((lesson) => !selectedCourse || lesson.course_id === selectedCourse).map((lesson) => (
                      <option key={lesson.id} value={lesson.id}>{lesson.title}</option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>Scheduled date and time <small>Optional</small></span>
                  <input name="scheduledAt" type="datetime-local" />
                </label>
                <label className="form-field">
                  <span>Duration (minutes)</span>
                  <input
                    name="duration"
                    type="number"
                    min="1"
                    max="300"
                    defaultValue="30"
                    required
                  />
                </label>
                <label className="form-field">
                  <span>Passing score (%)</span>
                  <input
                    name="passingScore"
                    type="number"
                    min="0"
                    max="100"
                    defaultValue="60"
                    required
                  />
                </label>
              </div>
              <div className="exam-builder-questions">
                {examQuestions.map((question, index) => (
                  <fieldset className="exam-builder-question" key={index}>
                    <legend>Question {index + 1}</legend>
                    <label className="form-field">
                      <span>Question</span>
                      <input
                        value={question.prompt}
                        onChange={(event) =>
                          setExamQuestions(
                            examQuestions.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, prompt: event.target.value }
                                : item,
                            ),
                          )
                        }
                        required
                      />
                    </label>
                    <div className="form-grid-two">
                      <label className="form-field">
                        <span>Question type</span>
                        <select
                          value={question.questionType}
                          onChange={(event) =>
                            setExamQuestions(
                              examQuestions.map((item, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...item,
                                      questionType: event.target
                                        .value as DraftQuestion["questionType"],
                                    }
                                  : item,
                              ),
                            )
                          }
                        >
                          <option value="multiple_choice">
                            Multiple choice
                          </option>
                          <option value="true_false">True / False</option>
                          <option value="fill_blank">Fill in the blank</option>
                        </select>
                      </label>
                      {question.questionType === "multiple_choice" && (
                        <div className="form-grid-two">
                          {question.choices.map((choice, choiceIndex) => (
                            <label className="form-field" key={choiceIndex}>
                              <span>Choice {choiceIndex + 1}</span>
                              <input
                                value={choice}
                                onChange={(event) =>
                                  setExamQuestions(
                                    examQuestions.map((item, itemIndex) =>
                                      itemIndex === index
                                        ? {
                                            ...item,
                                            choices: item.choices.map((value, valueIndex) =>
                                              valueIndex === choiceIndex ? event.target.value : value,
                                            ),
                                          }
                                        : item,
                                    ),
                                  )
                                }
                              />
                            </label>
                          ))}
                        </div>
                      )}
                      <label className="form-field">
                        <span>Correct answer</span>
                        <input
                          value={question.answer}
                          onChange={(event) =>
                            setExamQuestions(
                              examQuestions.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, answer: event.target.value }
                                  : item,
                              ),
                            )
                          }
                          required
                        />
                      </label>
                    </div>
                    {examQuestions.length > 1 && (
                      <button
                        className="quiet-link"
                        type="button"
                        onClick={() =>
                          setExamQuestions(
                            examQuestions.filter(
                              (_, itemIndex) => itemIndex !== index,
                            ),
                          )
                        }
                      >
                        <Trash2 size={14} /> Remove question
                      </button>
                    )}
                  </fieldset>
                ))}
              </div>
              <button
                className="quiet-link"
                type="button"
                onClick={() =>
                  setExamQuestions([
                    ...examQuestions,
                    {
                      prompt: "",
                      questionType: "multiple_choice",
                        choices: ["", "", "", ""],
                      answer: "",
                    },
                  ])
                }
              >
                <Plus size={14} /> Add another question
              </button>
              <div className="form-toggle-row">
                <label>
                  <input name="showResults" type="checkbox" defaultChecked />{" "}
                  Show results after submission
                </label>
                <label>
                  <input name="showAnswers" type="checkbox" /> Show correct
                  answers
                </label>
                <label>
                  <input name="isPublished" type="checkbox" defaultChecked />{" "}
                  Publish exam
                </label>
              </div>
              <button
                className="button"
                type="submit"
                disabled={busy === "exam"}
              >
                {busy === "exam" ? (
                  <LoaderCircle className="spin" size={16} />
                ) : (
                  <Plus size={16} />
                )}{" "}
                Create Exam
              </button>
            </form>
          )}

          {modal === "announcement" && (
            <form className="modal-form" onSubmit={createAnnouncement}>
              <label className="form-field">
                <span>Title</span>
                <input name="title" required />
              </label>
              <label className="form-field">
                <span>Message</span>
                <textarea name="body" rows={4} required />
              </label>
              <label className="form-field">
                <span>Target audience</span>
                <select name="audienceType" defaultValue="all">
                  <option value="all">All students</option>
                  <option value="course">Specific course</option>
                  <option value="stage">Specific stage</option>
                </select>
              </label>
              <label className="form-field">
                <span>Course or stage</span>
                <select name="audienceValue">
                  <option value="">Choose audience</option>
                  <optgroup label="Courses">
                    {data.courses.map((item) => (
                      <option value={item.id} key={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Stages">
                    {stages.map((stage) => (
                      <option key={stage}>{stage}</option>
                    ))}
                  </optgroup>
                </select>
              </label>
              <label className="form-field">
                <span>Publish date</span>
                <input name="publishDate" type="datetime-local" />
              </label>
              <label className="toggle-label">
                <input name="isPublished" type="checkbox" defaultChecked />{" "}
                Publish now
              </label>
              <button className="button" type="submit">
                Save announcement
              </button>
            </form>
          )}

          {modal === "attendance" && selectedStudent && (
            <form className="modal-form" onSubmit={markAttendance}>
              <div className="selected-student-heading">
                <span className="learning-avatar learning-avatar-initial">
                  {selectedStudent.full_name.slice(0, 1)}
                </span>
                <div>
                  <strong>{selectedStudent.full_name}</strong>
                  <small>{selectedStudent.academic_stage}</small>
                </div>
              </div>
              <label className="form-field">
                <span>Course</span>
                <select name="courseId" required>
                  <option value="">Choose course</option>
                  {data.courses.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span>Date</span>
                <input
                  name="date"
                  type="date"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  required
                />
              </label>
              <label className="form-field">
                <span>Attendance</span>
                <select name="status">
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                </select>
              </label>
              <button className="button" type="submit">
                Save attendance
              </button>
            </form>
          )}

          {modal === "student-view" && selectedStudent && (
            <StudentDetail
              student={selectedStudent}
              courses={data.courses}
              enrollments={data.enrollments}
              payments={data.payments}
              attempts={data.attempts}
              progress={data.progress}
              challenges={data.challenges}
              exams={data.exams}
              attendance={data.attendance}
              lessons={data.lessons}
              onAssign={async (courseId) => {
                await assignStudentCourse(selectedStudent.user_id, courseId);
              }}
              onGrant={async (courseId) => {
                await assignStudentCourse(
                  selectedStudent.user_id,
                  courseId,
                  true,
                );
              }}
              onAttendance={() => setModal("attendance")}
            />
          )}
        </Modal>
      )}
    </main>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="dashboard-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="dashboard-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header>
          <div>
            <span className="eyebrow">
              <span className="eyebrow-dash" /> ENGLISH ZONE
            </span>
            <h2>{title}</h2>
          </div>
          <button
            className="icon-button"
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={17} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

function EmptyTeacher({ title, text }: { title: string; text: string }) {
  return (
    <div className="learning-empty">
      <span>
        <GraduationCap size={20} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function StudentMini({
  student,
  onOpen,
}: {
  student: Student;
  onOpen: () => void;
}) {
  return (
    <button className="student-mini-row" type="button" onClick={onOpen}>
      <span className="learning-avatar learning-avatar-initial">
        {student.full_name.slice(0, 1)}
      </span>
      <span className="student-mini-copy">
        <strong>{student.full_name}</strong>
        <small>
          {student.academic_stage} · {student.email}
        </small>
      </span>
      <ArrowRight size={15} />
    </button>
  );
}

function PaymentMini({
  payment,
  student,
  course,
  onReview,
}: {
  payment: Payment;
  student?: Student;
  course?: Course;
  onReview: () => void;
}) {
  return (
    <button
      className="student-mini-row payment-mini-row"
      type="button"
      onClick={onReview}
    >
      <span className="learning-stat-icon">
        <WalletCards size={16} />
      </span>
      <span className="student-mini-copy">
        <strong>
          {student?.full_name ?? "Student"} · {course?.name ?? "Course"}
        </strong>
        <small>
          {currency(payment.amount)} · {formatDate(payment.created_at)}
        </small>
      </span>
      <ChevronDown size={15} />
    </button>
  );
}

function StudentCard({
  student,
  courses,
  enrollments,
  onApprove,
  onIssueCode,
  onRevealAccessCode,
  revealedAccessCode,
  onManage,
  onAssign,
  onOpen,
  onAttendance,
  busy,
}: {
  student: Student;
  courses: Course[];
  enrollments: Enrollment[];
  onApprove: () => void;
  onIssueCode: () => void;
  onRevealAccessCode: () => void;
  revealedAccessCode?: string;
  onManage: (action: "suspend" | "restore" | "delete") => void;
  onAssign: (studentId: string, courseId: string, grant?: boolean) => void;
  onOpen: () => void;
  onAttendance: () => void;
  busy: string;
}) {
  const [courseSelection, setCourseSelection] = useState("");
  const active = enrollments.filter(
    (item) =>
      item.student_id === student.user_id && item.access_status === "active",
  );
  const assigned = enrollments.filter(
    (item) => item.student_id === student.user_id,
  );
  const freeCourses = courses.filter(
    (course) =>
      course.is_published &&
      !assigned.some((item) => item.course_id === course.id),
  );
  const awaitingApproval = student.access_status === "access_pending";
  return (
    <article className="teacher-student-card">
      <div className="teacher-student-primary">
        <span className="learning-avatar learning-avatar-initial">
          {student.full_name.slice(0, 1)}
        </span>
        <div>
          <button
            className="student-name-button"
            type="button"
            onClick={onOpen}
          >
            {student.full_name}
          </button>
          <span>
            {student.academic_stage}
            {student.educational_system
              ? ` · ${student.educational_system}`
              : ""}
          </span>
          <small>{student.email}</small>
        </div>
        <span className={`status-pill ${active.length && !awaitingApproval ? "active" : "pending"}`}>
          {student.is_suspended ? "Suspended" : awaitingApproval ? "Awaiting approval" : active.length ? "Active" : "Access pending"}
        </span>
      </div>
      <div className="teacher-student-details">
        <span>{student.phone}</span>
        <span>
          {assigned.length} course{assigned.length === 1 ? "" : "s"} assigned
        </span>
        <span>{student.access_status.replaceAll("_", " ")}</span>
      </div>
      {student.has_access_code && (
        <div className="teacher-student-access-code">
          <strong>Access code</strong>
          {revealedAccessCode ? (
            <code>{revealedAccessCode}</code>
          ) : !student.has_recoverable_access_code ? (
            <small>Older code is not recoverable; it remains valid.</small>
          ) : (
            <button
              className="quiet-link"
              type="button"
              disabled={busy === `show-code-${student.user_id}`}
              onClick={onRevealAccessCode}
            >
              {busy === `show-code-${student.user_id}` ? <LoaderCircle className="spin" size={13} /> : <ShieldCheck size={13} />} Show code
            </button>
          )}
          {revealedAccessCode && (
            <button
              className="quiet-link"
              type="button"
              onClick={() => void navigator.clipboard.writeText(revealedAccessCode)}
            >
              <Copy size={13} /> Copy
            </button>
          )}
        </div>
      )}
      <div className="teacher-student-actions">
        {awaitingApproval && (
          <button
            className="button button-small"
            type="button"
            disabled={busy === `approve-${student.user_id}`}
            onClick={onApprove}
          >
            {busy === `approve-${student.user_id}` ? (
              <LoaderCircle className="spin" size={14} />
            ) : (
              <Check size={14} />
            )} Approve account
          </button>
        )}
        {!awaitingApproval && student.access_status === "account_active" && !student.has_access_code && (
          <button
            className="button button-small"
            type="button"
            disabled={busy === `issue-code-${student.user_id}`}
            onClick={onIssueCode}
          >
            {busy === `issue-code-${student.user_id}` ? <LoaderCircle className="spin" size={14} /> : <ShieldCheck size={14} />} Issue access code
          </button>
        )}
        <button
          className="quiet-link"
          type="button"
          disabled={busy === `${student.is_suspended ? "restore" : "suspend"}-${student.user_id}`}
          onClick={() => onManage(student.is_suspended ? "restore" : "suspend")}
        >
          {busy === `${student.is_suspended ? "restore" : "suspend"}-${student.user_id}` ? (
            <LoaderCircle className="spin" size={14} />
          ) : (
            <Ban size={14} />
          )} {student.is_suspended ? "Restore" : "Suspend"}
        </button>
        <button
          className="quiet-link request-reject"
          type="button"
          disabled={busy === `delete-${student.user_id}`}
          onClick={() => onManage("delete")}
        >
          {busy === `delete-${student.user_id}` ? <LoaderCircle className="spin" size={14} /> : <Trash2 size={14} />} Delete
        </button>
        <button className="quiet-link" type="button" onClick={onOpen}>
          View <ArrowRight size={14} />
        </button>
        <button className="quiet-link" type="button" onClick={onAttendance}>
          Attendance <CalendarDays size={14} />
        </button>
        <label className="assign-inline">
          <select
            value={courseSelection}
            onChange={(event) => setCourseSelection(event.target.value)}
            aria-label={`Choose course for ${student.full_name}`}
          >
            <option value="">Assign course</option>
            {freeCourses.map((course) => (
              <option value={course.id} key={course.id}>
                {course.name}
              </option>
            ))}
          </select>
        </label>
        <button
          className="button button-small"
          type="button"
          disabled={!courseSelection || busy === `assign-${student.user_id}`}
          onClick={() => onAssign(student.user_id, courseSelection)}
        >
          {busy === `assign-${student.user_id}` ? (
            <LoaderCircle className="spin" size={14} />
          ) : (
            <Plus size={14} />
          )}{" "}
          Assign
        </button>
      </div>
    </article>
  );
}

function LessonList({
  lessons,
  courses,
  onMove,
  onDelete,
  onPublish,
}: {
  lessons: Lesson[];
  courses: Course[];
  onMove: (lesson: Lesson, direction: -1 | 1) => void;
  onDelete: (id: string) => void;
  onPublish: (lesson: Lesson) => void;
}) {
  if (!lessons.length)
    return (
      <EmptyTeacher
        title="No lessons yet"
        text="Add a lesson to get your course started."
      />
    );
  return (
    <div className="teacher-lesson-list">
      {lessons.map((lesson) => (
        <article className="teacher-lesson-row" key={lesson.id}>
          <span className="lesson-number">
            {String(lesson.position).padStart(2, "0")}
          </span>
          <div className="data-row-main">
            <strong>{lesson.title}</strong>
            <small>
              {courses.find((item) => item.id === lesson.course_id)?.name} ·{" "}
              {lesson.video_url ? "Video lesson" : "Reading lesson"}
            </small>
          </div>
          <span
            className={`status-pill ${lesson.is_published ? "active" : "pending"}`}
          >
            {lesson.is_published ? "Published" : "Draft"}
          </span>
          <div className="lesson-order-actions">
            <button
              className="icon-button"
              type="button"
              title="Move lesson up"
              onClick={() => onMove(lesson, -1)}
            >
              <ArrowUp size={15} />
            </button>
            <button
              className="icon-button"
              type="button"
              title="Move lesson down"
              onClick={() => onMove(lesson, 1)}
            >
              <ArrowDown size={15} />
            </button>
            <button
              className="icon-button"
              type="button"
              title={
                lesson.is_published ? "Unpublish lesson" : "Publish lesson"
              }
              onClick={() => onPublish(lesson)}
            >
              <Check size={15} />
            </button>
            <button
              className="icon-button delete-icon"
              type="button"
              title="Delete lesson"
              onClick={() => onDelete(lesson.id)}
            >
              <Trash2 size={15} />
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

function CourseManagement({
  course,
  data,
  onAddLesson,
  onDeleteLesson,
  onDelete,
  onDeleteExam,
  onDeletePlaylist,
  onEditPublish,
}: {
  course: Course;
  data: TeacherData;
  onAddLesson: () => void;
  onDeleteLesson: (id: string) => void;
  onDelete: (id: string) => void;
  onDeleteExam: (exam: Exam) => void;
  onDeletePlaylist: (playlist: Playlist) => void;
  onEditPublish: () => void;
}) {
  const [tab, setTab] = useState("overview");
  const lessons = data.lessons.filter((item) => item.course_id === course.id);
  const exams = data.exams.filter((item) => item.course_id === course.id);
  const enrolled = data.enrollments.filter(
    (item) => item.course_id === course.id,
  );
  const courseTabs = [
    "Overview",
    "Lessons",
    "Playlists",
    "Exams",
    "Students",
    "Results",
    "Settings",
  ];
  return (
    <div className="course-management">
      <nav className="course-management-tabs" aria-label="Course management">
        {courseTabs.map((item) => (
          <button
            type="button"
            className={tab === item.toLowerCase() ? "active" : ""}
            key={item}
            onClick={() => setTab(item.toLowerCase())}
          >
            {item}
          </button>
        ))}
      </nav>
      {tab === "overview" && (
        <>
          <div className="course-management-summary">
            <div>
              <span>COURSE STAGE</span>
              <strong>
                {course.academic_stage}
                {course.educational_system
                  ? ` · ${course.educational_system}`
                  : ""}
              </strong>
            </div>
            <div>
              <span>ENROLLED</span>
              <strong>
                {enrolled.length}
                {course.student_limit ? ` / ${course.student_limit}` : ""}
              </strong>
            </div>
            <div>
              <span>LESSONS</span>
              <strong>{lessons.length}</strong>
            </div>
            <div>
              <span>COURSE PRICE</span>
              <strong>{currency(course.price)}</strong>
            </div>
          </div>
          <p className="course-management-description">
            {course.description ||
              "Add a description to help students understand this course."}
          </p>
          <div className="teacher-quick-actions">
            <button type="button" onClick={onAddLesson}>
              <Plus size={16} /> Add Lesson
            </button>
            <button type="button" onClick={() => setTab("exams")}>
              <ClipboardCheck size={16} /> Create Exam
            </button>
            <button type="button" onClick={() => setTab("students")}>
              <Users size={16} /> View Students
            </button>
            <button type="button" onClick={() => setTab("results")}>
              <Award size={16} /> See Results
            </button>
          </div>
        </>
      )}
      {tab === "lessons" && (
        <>
          <div className="course-management-action">
            <h3>Lessons</h3>
            <button
              className="button button-small"
              type="button"
              onClick={onAddLesson}
            >
              <Plus size={15} /> Add Lesson
            </button>
          </div>
          <LessonList
            lessons={lessons}
            courses={data.courses}
            onMove={async (lesson, direction) => {
              const ordered = lessons
                .slice()
                .sort((a, b) => a.position - b.position);
              const index = ordered.findIndex((item) => item.id === lesson.id);
              const next = ordered[index + direction];
              if (!next) return;
              const client = createBrowserSupabase()!;
              await client
                .from("lessons")
                .update({ position: next.position })
                .eq("id", lesson.id);
              await client
                .from("lessons")
                .update({ position: lesson.position })
                .eq("id", next.id);
              location.reload();
            }}
            onDelete={async (id) => {
              onDeleteLesson(id);
            }}
            onPublish={async (lesson) => {
              await createBrowserSupabase()!
                .from("lessons")
                .update({ is_published: !lesson.is_published })
                .eq("id", lesson.id);
              location.reload();
            }}
          />
        </>
      )}
      {tab === "playlists" && (
        <PlaylistManager courseId={course.id} data={data} onDelete={onDeletePlaylist} />
      )}
      {tab === "exams" && (
        <div className="data-list">
          {exams.length ? (
            exams.map((exam) => (
              <article className="data-row" key={exam.id}>
                <span className="learning-stat-icon">
                  <ClipboardCheck size={16} />
                </span>
                <div className="data-row-main">
                  <strong>{exam.title}</strong>
                  <small>
                    {exam.question_count} questions ·{" "}
                    {exam.duration_minutes} min{exam.scheduled_at ? ` · ${formatDate(exam.scheduled_at)}` : ""}
                  </small>
                </div>
                <span
                  className={`status-pill ${exam.is_published ? "active" : "pending"}`}
                >
                  {exam.is_published ? "Published" : "Draft"}
                </span>
                <button
                  className="icon-button delete-icon"
                  type="button"
                  aria-label={`Delete exam ${exam.title}`}
                  title="Delete exam and its questions and results"
                  onClick={() => onDeleteExam(exam)}
                >
                  <Trash2 size={15} />
                </button>
              </article>
            ))
          ) : (
            <EmptyTeacher
              title="No exams yet"
              text="Create an exam from the Exams section."
            />
          )}
        </div>
      )}
      {tab === "students" && (
        <div className="compact-list">
          {enrolled.length ? (
            enrolled.map((entry) => {
              const student = data.students.find(
                (item) => item.user_id === entry.student_id,
              );
              return student ? (
                <article className="student-mini-row" key={entry.student_id}>
                  <span className="learning-avatar learning-avatar-initial">
                    {student.full_name.slice(0, 1)}
                  </span>
                  <span className="student-mini-copy">
                    <strong>{student.full_name}</strong>
                    <small>{entry.access_status.replaceAll("_", " ")}</small>
                  </span>
                </article>
              ) : null;
            })
          ) : (
            <EmptyTeacher
              title="No students enrolled"
              text="Assign a student from the Students section."
            />
          )}
        </div>
      )}
      {tab === "results" && (
        <div className="data-list">
          {data.attempts
            .filter((attempt) =>
              exams.some((exam) => exam.id === attempt.exam_id),
            )
            .map((attempt) => (
              <article className="data-row" key={attempt.id}>
                <span className="data-row-main">
                  <strong>
                    {
                      data.students.find(
                        (item) => item.user_id === attempt.student_id,
                      )?.full_name
                    }
                  </strong>
                  <small>
                    {
                      data.exams.find((exam) => exam.id === attempt.exam_id)
                        ?.title
                    }
                  </small>
                </span>
                <strong>{attempt.score}%</strong>
              </article>
            ))}
        </div>
      )}
      {tab === "settings" && (
        <div className="course-management-summary">
          <div>
            <span>STATUS</span>
            <strong>{course.is_published ? "Published" : "Draft"}</strong>
          </div>
          <div>
            <span>DISCOUNT</span>
            <strong>{course.discount_percent}% OFF</strong>
          </div>
          <button
            className="button button-outline button-small"
            type="button"
            onClick={onEditPublish}
          >
            {course.is_published ? "Unpublish course" : "Publish course"}
          </button>
          <button
            className="button button-outline button-small delete-icon"
            type="button"
            onClick={() => onDelete(course.id)}
          >
            <Trash2 size={14} /> Delete course
          </button>
        </div>
      )}
    </div>
  );
}

function PlaylistManager({
  courseId,
  data,
  onDelete,
}: {
  courseId: string;
  data: TeacherData;
  onDelete: (playlist: Playlist) => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const playlistRows = data.playlists
    .filter((playlist) => playlist.course_id === courseId)
    .sort((first, second) => first.position - second.position);
  const lessons = data.lessons.filter(
    (lesson) => lesson.course_id === courseId,
  );
  return (
    <div className="playlist-manager">
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (!title.trim()) return;
          const { error: insertError } = await createBrowserSupabase()!
            .from("course_playlists")
            .insert({
              course_id: courseId,
              title: title.trim(),
              position: playlistRows.length + 1,
            });
          if (!insertError) {
            setTitle("");
            router.refresh();
          }
        }}
      >
        <label className="form-field">
          <span>New unit / playlist</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Unit 1"
            required
          />
        </label>
        <button className="button button-small" type="submit">
          <Plus size={14} /> Add Playlist
        </button>
      </form>
      {playlistRows.length ? (
        playlistRows.map((playlist) => (
          <article className="playlist-row" key={playlist.id}>
            <BookOpen size={16} />
            <div>
              <strong>{playlist.title}</strong>
              <small>
                {
                  lessons.filter((lesson) => lesson.playlist_id === playlist.id)
                    .length
                }{" "}
                lessons
              </small>
            </div>
            <span>{String(playlist.position).padStart(2, "0")}</span>
            <button
              className="icon-button delete-icon"
              type="button"
              aria-label={`Delete playlist ${playlist.title}`}
              title="Delete playlist"
              onClick={() => onDelete(playlist)}
            >
              <Trash2 size={15} />
            </button>
          </article>
        ))
      ) : (
        <EmptyTeacher
          title="Organize lessons into units"
          text="Create a playlist such as Unit 1, then assign lessons to it."
        />
      )}
    </div>
  );
}

function StudentDetail({
  student,
  courses,
  enrollments,
  payments,
  attempts,
  progress,
  challenges,
  exams,
  attendance,
  lessons,
  onAssign,
  onGrant,
  onAttendance,
}: {
  student: Student;
  courses: Course[];
  enrollments: Enrollment[];
  payments: Payment[];
  attempts: Attempt[];
  progress: LessonProgress[];
  challenges: ChallengeAttempt[];
  exams: Exam[];
  attendance: Attendance[];
  lessons: Lesson[];
  onAssign: (courseId: string) => void;
  onGrant: (courseId: string) => void;
  onAttendance: () => void;
}) {
  const [courseId, setCourseId] = useState("");
  const [profilePhone, setProfilePhone] = useState(student.phone);
  const [saved, setSaved] = useState(false);
  const registered = enrollments.filter(
    (item) => item.student_id === student.user_id,
  );
  const completed = attempts.filter(
    (attempt) =>
      attempt.student_id === student.user_id &&
      exams.some((exam) => exam.id === attempt.exam_id),
  );
  const attendanceRows = attendance.filter(
    (item) => item.student_id === student.user_id,
  );
  const studentProgress = progress.filter((item) => item.student_id === student.user_id);
  const studentPayments = payments.filter((item) => item.student_id === student.user_id);
  const studentChallenges = challenges.filter((item) => item.claimed_by === student.user_id);
  return (
    <div className="student-detail">
      <div className="student-detail-hero">
        <span className="learning-avatar learning-avatar-initial">
          {student.full_name.slice(0, 1)}
        </span>
        <div>
          <h3>{student.full_name}</h3>
          <span>
            {student.academic_stage}
            {student.educational_system
              ? ` · ${student.educational_system}`
              : ""}
          </span>
          <small>{student.email}</small>
        </div>
      </div>
      <form
        className="student-detail-contact"
        onSubmit={async (event) => {
          event.preventDefault();
          await createBrowserSupabase()!
            .from("profiles")
            .update({
              phone: profilePhone,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", student.user_id);
          setSaved(true);
        }}
      >
        <label className="form-field">
          <span>Student phone</span>
          <input
            value={profilePhone}
            onChange={(event) => setProfilePhone(event.target.value)}
          />
        </label>
        <button className="button button-outline button-small" type="submit">
          {saved ? "Saved" : "Save phone"}
        </button>
      </form>
      <section>
        <div className="learning-section-heading">
          <h3>Assigned courses</h3>
          <button className="quiet-link" type="button" onClick={onAttendance}>
            Mark attendance <CalendarDays size={14} />
          </button>
        </div>
        {registered.length ? (
          registered.map((entry) => {
            const item = courses.find(
              (course) => course.id === entry.course_id,
            );
            return (
              <div className="student-course-assignment" key={entry.course_id}>
                <span>
                  <strong>{item?.name ?? "Course"}</strong>
                  <small>{entry.access_status.replaceAll("_", " ")}</small>
                </span>
                {entry.access_status !== "active" && (
                  <button
                    className="quiet-link"
                    type="button"
                    onClick={() => onGrant(entry.course_id)}
                  >
                    Grant Access <ArrowRight size={13} />
                  </button>
                )}
              </div>
            );
          })
        ) : (
          <p className="empty-inline">No courses assigned yet.</p>
        )}
        <label className="form-field">
          <span>Assign another course</span>
          <select
            value={courseId}
            onChange={(event) => setCourseId(event.target.value)}
          >
            <option value="">Choose course</option>
            {courses
              .filter(
                (item) =>
                  item.is_published &&
                  !registered.some((entry) => entry.course_id === item.id),
              )
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {currency(item.price)}
                </option>
              ))}
          </select>
        </label>
        {courseId && (
          <button
            className="button button-small"
            type="button"
            onClick={() => onAssign(courseId)}
          >
            <Plus size={14} /> Assign Course
          </button>
        )}
      </section>
      <div className="student-detail-grid">
        <article>
          <strong>
            {attendanceRows.filter((item) => item.status === "present").length}/
            {attendanceRows.length}
          </strong>
          <small>Attendance</small>
        </article>
        <article>
          <strong>{completed.length}</strong>
          <small>Exam results</small>
        </article>
        <article>
          <strong>
            {
              payments.filter((item) => item.student_id === student.user_id)
                .length
            }
          </strong>
          <small>Payments</small>
        </article>
        <article>
          <strong>
            {
              lessons.filter((lesson) =>
                registered.some(
                  (entry) =>
                    entry.course_id === lesson.course_id &&
                    entry.access_status === "active",
                ),
              ).length
            }
          </strong>
          <small>Available lessons</small>
        </article>
      </div>
      <section>
        <h3>Course progress</h3>
        {registered.filter((entry) => entry.access_status === "active").map((entry) => {
          const courseLessons = lessons.filter((lesson) => lesson.course_id === entry.course_id && lesson.is_published);
          const completedCount = courseLessons.filter((lesson) => studentProgress.some((item) => item.lesson_id === lesson.id)).length;
          const percentage = courseLessons.length ? Math.round(completedCount * 100 / courseLessons.length) : 0;
          const progressLabel = percentage === 100 && courseLessons.length ? "Completed" : percentage >= 75 ? "Almost complete" : percentage > 0 ? "In progress" : "Not started";
          return <div className="student-progress-row" key={entry.course_id}>
            <div><strong>{courses.find((course) => course.id === entry.course_id)?.name ?? "Course"}</strong><small>{progressLabel} · {completedCount}/{courseLessons.length} lessons</small></div>
            <span className="course-progress-line"><span><i style={{ width: `${percentage}%` }} /></span></span>
            <b>{percentage}%</b>
          </div>;
        })}
        {!registered.some((entry) => entry.access_status === "active") && <p className="empty-inline">Course progress appears after access is approved.</p>}
      </section>
      <section>
        <h3>Recent exam results</h3>
        {completed.slice(0, 4).map((attempt) => <div className="student-course-assignment" key={attempt.id}>
          <span><strong>{exams.find((exam) => exam.id === attempt.exam_id)?.title ?? "Exam"}</strong><small>{formatDate(attempt.submitted_at)} · {attempt.correct_count}/{attempt.question_count} correct</small></span>
          <strong className="result-score">{attempt.score}%</strong>
        </div>)}
        {!completed.length && <p className="empty-inline">No exam results yet.</p>}
      </section>
      <section>
        <h3>Recent attendance</h3>
        {attendanceRows.slice(0, 4).map((item) => <div className="student-course-assignment" key={item.id}>
          <span><strong>{courses.find((course) => course.id === item.course_id)?.name ?? "English Zone"}</strong><small>{formatDate(item.attended_on)}</small></span>
          <span className={`status-pill ${item.status}`}>{item.status}</span>
        </div>)}
        {!attendanceRows.length && <p className="empty-inline">No attendance has been marked yet.</p>}
      </section>
      <section>
        <h3>Recent payments</h3>
        {studentPayments
          .slice(0, 4)
          .map((item) => (
            <div className="student-course-assignment" key={item.id}>
              <span>
                <strong>
                  {courses.find((course) => course.id === item.course_id)?.name}
                </strong>
                <small>{formatDate(item.created_at)}</small>
              </span>
              <span className={`status-pill ${item.status}`}>
                {item.status}
              </span>
            </div>
          ))}
        {!studentPayments.length && <p className="empty-inline">No payment requests yet.</p>}
      </section>
      <section>
        <h3>Challenge rewards</h3>
        {studentChallenges.slice(0, 4).map((item) => <div className="student-course-assignment" key={item.id}>
          <span><strong>{item.score}% challenge score</strong><small>{item.correct_count}/{item.question_count} correct · {item.discount_percent}% course discount · {formatDate(item.created_at)}</small></span>
          <Award size={16} />
        </div>)}
        {!studentChallenges.length && <p className="empty-inline">No challenge rewards yet.</p>}
      </section>
    </div>
  );
}
