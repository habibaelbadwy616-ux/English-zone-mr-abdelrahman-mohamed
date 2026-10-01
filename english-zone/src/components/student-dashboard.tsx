"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toDataURL } from "qrcode";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  CircleHelp,
  ClipboardCheck,
  Copy,
  CreditCard,
  FileText,
  GraduationCap,
  House,
  LoaderCircle,
  LogOut,
  Play,
  Printer,
  QrCode,
  Sparkles,
  Upload,
  UserRound,
  Video,
  WalletCards,
} from "lucide-react";
import { createBrowserSupabase } from "@/lib/supabase/client";

type Material = { name?: string; url: string };
type ExamQuestion = {
  id: string;
  question_type: string;
  prompt: string;
  choices: string[];
  position: number;
};
type Row = {
  id: string;
  user_id?: string;
  student_id?: string;
  full_name?: string;
  phone?: string;
  guardian_phone?: string;
  academic_stage?: string;
  educational_system?: string | null;
  profile_picture_url?: string | null;
  access_status?: string;
  student_code?: string;
  role?: string;
  email?: string;
  teacher_id?: string;
  course_id?: string;
  exam_id?: string;
  lesson_id?: string;
  playlist_id?: string | null;
  name?: string;
  title?: string;
  description?: string;
  body?: string;
  kind?: string;
  url?: string;
  price?: number | null;
  original_price?: number | null;
  discount_percent?: number;
  lesson_count?: number;
  is_free?: boolean;
  is_published?: boolean;
  cover_image_url?: string | null;
  status?: string;
  audience_type?: string;
  audience_value?: string | null;
  published_at?: string;
  created_at?: string;
  scheduled_at?: string | null;
  expires_at?: string;
  submitted_at?: string;
  completed_at?: string;
  updated_at?: string;
  payment_method?: string;
  sender_phone?: string;
  transferred_at?: string;
  amount?: number;
  rejection_note?: string;
  proof_path?: string;
  attended_on?: string;
  score?: number;
  correct_count?: number;
  question_count?: number;
  video_url?: string | null;
  materials?: Material[];
  homework?: string;
  position?: number;
  duration_minutes?: number;
  passing_score?: number;
  show_results?: boolean;
  show_correct_answers?: boolean;
  exam_questions?: { count: number }[];
  questions?: ExamQuestion[];
  question_type?: string;
  prompt?: string;
  choices?: string[];
};
type StudentDashboardData = {
  userId: string;
  accessCode: string | null;
  profile: Row;
  teacherName: string;
  courses: Row[];
  enrollments: Row[];
  payments: Row[];
  announcements: Row[];
  attendance: Row[];
  homeworkSubmissions: HomeworkSubmission[];
  lessons: Row[];
  playlists: Row[];
  exams: Row[];
  progress: Row[];
  instapayNumber: string;
};

type HomeworkSubmission = {
  id: string;
  lesson_id: string;
  file_name: string;
  submitted_at: string;
};

const navigation = [
  { id: "overview", label: "Overview", icon: House },
  { id: "courses", label: "My Courses", icon: BookOpen },
  { id: "lessons", label: "Lessons", icon: Play },
  { id: "exams", label: "Exams", icon: ClipboardCheck },
  { id: "homework", label: "Homework", icon: Upload },
  { id: "attendance", label: "Attendance", icon: CalendarDays },
  { id: "payment", label: "Payment", icon: WalletCards },
  { id: "profile", label: "Profile", icon: UserRound },
];

function money(value?: number | null) {
  return value == null
    ? "Free"
    : `${Number(value).toLocaleString("en-EG")} EGP`;
}

function dateLabel(value: string | undefined, options?: Intl.DateTimeFormatOptions) {
  return value ? new Date(value).toLocaleDateString("en-GB", options) : "—";
}

function courseStatus(
  course: Row,
  enrollment: Row | undefined,
  payments: Row[],
) {
  if (enrollment?.access_status === "active")
    return { label: "Active", tone: "active" };
  const lastPayment = payments.find(
    (payment) => payment.course_id === course.id,
  );
  if (lastPayment?.status === "pending")
    return { label: "Payment Under Review", tone: "pending" };
  if (lastPayment?.status === "rejected")
    return { label: "Payment Rejected", tone: "rejected" };
  if (enrollment?.access_status === "access_pending")
    return { label: "Access Pending", tone: "pending" };
  if (enrollment?.access_status === "payment_pending")
    return { label: "Payment Pending", tone: "pending" };
  return { label: course.is_free ? "Available" : "Locked", tone: "locked" };
}

export function StudentDashboard({ data }: { data: StudentDashboardData }) {
  const router = useRouter();
  const [section, setSection] = useState("overview");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [qr, setQr] = useState("");
  const [proofCourse, setProofCourse] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [homeworkLessonId, setHomeworkLessonId] = useState("");
  const [homeworkFile, setHomeworkFile] = useState<File | null>(null);
  const [senderPhone, setSenderPhone] = useState(data.profile.phone ?? "");
  const [transferDate, setTransferDate] = useState(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  });
  const [profileName, setProfileName] = useState(data.profile.full_name ?? "");
  const [profilePhone, setProfilePhone] = useState(data.profile.phone ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [activeExam, setActiveExam] = useState<Row | null>(null);
  const [examAnswers, setExamAnswers] = useState<Record<string, string>>({});
  const [examSubmitted, setExamSubmitted] = useState(false);

  const enrollments = useMemo(
    () => new Map(data.enrollments.filter((entry) => entry.course_id).map((entry) => [entry.course_id as string, entry])),
    [data.enrollments],
  );
  const activeCourses = data.courses.filter(
    (course) => enrollments.get(course.id)?.access_status === "active",
  );
  const completedIds = useMemo(
    () => new Set(data.progress.map((item) => item.lesson_id).filter((id): id is string => Boolean(id))),
    [data.progress],
  );
  const attended = data.attendance.filter(
    (item) => item.status === "present",
  ).length;
  const attendanceRate = data.attendance.length
    ? Math.round((attended * 100) / data.attendance.length)
    : 0;
  const currentCourse = data.courses.find(
    (course) => course.id === selectedCourse,
  );
  const stageCourses = data.courses;
  const homeworkLessons = data.lessons.filter((lesson) => Boolean(lesson.homework?.trim()));
  const visibleAnnouncements = data.announcements.filter(
    (item) =>
      item.audience_type === "all" ||
      (item.audience_type === "stage" &&
        item.audience_value === data.profile.academic_stage) ||
      (item.audience_type === "course" &&
        data.enrollments.some(
          (entry) => entry.course_id === item.audience_value,
        )),
  );

  useEffect(() => {
    toDataURL(
      `${window.location.origin}/teacher/dashboard?student=${encodeURIComponent(data.profile.student_code ?? "")}`,
      { width: 170, margin: 1, color: { dark: "#252a35", light: "#fffdfa" } },
    )
      .then(setQr)
      .catch(() => setQr(""));
  }, [data.profile.student_code]);

  function clearNotices() {
    setMessage("");
    setError("");
  }

  async function continueCourse(courseId: string) {
    const selected = data.courses.find((course) => course.id === courseId);
    if (selected?.is_free && enrollments.get(courseId)?.access_status !== "active") {
      const supabase = createBrowserSupabase();
      if (!supabase) {
        setError("Course access is not available right now.");
        return;
      }
      const { error: enrollmentError } = await supabase.rpc("student_enroll_free_course", { p_course_id: courseId });
      if (enrollmentError) {
        setError(enrollmentError.message || "This course could not be opened.");
        return;
      }
      router.refresh();
    }
    setSelectedCourse(courseId);
    setSection("lessons");
  }

  async function signOut() {
    const supabase = createBrowserSupabase();
    await supabase?.auth.signOut();
    router.replace("/join");
  }

  async function uploadPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearNotices();
    if (!proofCourse || !proofFile || senderPhone.trim().length < 6 || !transferDate) {
      setError("Enter the transfer phone and date, then choose a payment screenshot.");
      return;
    }
    const supabase = createBrowserSupabase();
    if (!supabase) {
      setError("Payment services are not available right now.");
      return;
    }
    setBusy("payment");
    const extension =
      proofFile.type === "application/pdf"
        ? "pdf"
        : proofFile.type.split("/")[1];
    const path = `${data.userId}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("payment-proofs")
      .upload(path, proofFile, { upsert: false, contentType: proofFile.type });
    if (uploadError) {
      setError(
        "We could not upload that receipt. Please try another image or PDF.",
      );
      setBusy("");
      return;
    }
    const { error: submitError } = await supabase.rpc("submit_course_payment", {
      p_course_id: proofCourse,
      p_proof_path: path,
      p_sender_phone: senderPhone.trim(),
      p_transfer_date: transferDate,
    });
    if (submitError) {
      await supabase.storage.from("payment-proofs").remove([path]);
      setError(submitError.message || "We could not submit your payment.");
    } else {
      setMessage(
        "Payment Under Review. Your course will open after your teacher approves the payment.",
      );
      setProofFile(null);
      router.refresh();
    }
    setBusy("");
  }

  async function completeLesson(lessonId: string) {
    clearNotices();
    const supabase = createBrowserSupabase();
    if (!supabase) return;
    const { error: saveError } = await supabase
      .from("lesson_progress")
      .insert({ student_id: data.userId, lesson_id: lessonId });
    if (saveError && !saveError.message.toLowerCase().includes("duplicate"))
      setError("We could not save your progress. Try again.");
    else router.refresh();
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearNotices();
    const supabase = createBrowserSupabase();
    if (!supabase) return;
    setBusy("profile");
    const { error: saveError } = await supabase
      .from("profiles")
      .update({
        full_name: profileName.trim(),
        phone: profilePhone.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", data.userId);
    if (saveError) setError("We could not update your profile.");
    else {
      setMessage("Your profile has been updated.");
      router.refresh();
    }
    setBusy("");
  }

  async function savePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearNotices();
    if (newPassword.length < 8 || newPassword !== confirmNewPassword) {
      setError(newPassword.length < 8 ? "Choose a password with at least 8 characters." : "Your passwords do not match.");
      return;
    }
    const supabase = createBrowserSupabase();
    if (!supabase) return;
    setBusy("password");
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) setError("Your password could not be changed. Please try again.");
    else {
      setNewPassword("");
      setConfirmNewPassword("");
      setMessage("Your password is ready for email sign-in.");
    }
    setBusy("");
  }

  async function copyNumber() {
    await navigator.clipboard.writeText(data.instapayNumber);
    setMessage("InstaPay number copied.");
    setError("");
  }

  async function submitHomework(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearNotices();
    if (!homeworkLessonId || !homeworkFile) {
      setError("Choose an assigned homework and attach your file.");
      return;
    }
    const allowedTypes = new Set([
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg",
      "image/png",
      "image/webp",
    ]);
    if (!allowedTypes.has(homeworkFile.type) || homeworkFile.size > 10 * 1024 * 1024) {
      setError("Upload a PDF, Word document, or image no larger than 10 MB.");
      return;
    }

    const supabase = createBrowserSupabase();
    if (!supabase) {
      setError("Homework upload is not available right now.");
      return;
    }

    setBusy("homework");
    const safeFileName = homeworkFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${data.userId}/${homeworkLessonId}/${crypto.randomUUID()}-${safeFileName}`;
    const { error: uploadError } = await supabase.storage
      .from("homework-submissions")
      .upload(storagePath, homeworkFile, { contentType: homeworkFile.type, upsert: false });

    if (uploadError) {
      setError("Your homework file could not be uploaded. Please try again.");
      setBusy("");
      return;
    }

    const { error: submissionError } = await supabase.from("homework_submissions").insert({
      student_id: data.userId,
      lesson_id: homeworkLessonId,
      storage_path: storagePath,
      file_name: homeworkFile.name,
    });
    if (submissionError) {
      await supabase.storage.from("homework-submissions").remove([storagePath]);
      setError("Your homework could not be submitted. Please try again.");
    } else {
      event.currentTarget.reset();
      setHomeworkLessonId("");
      setHomeworkFile(null);
      setMessage("Homework submitted for your teacher to review.");
      router.refresh();
    }
    setBusy("");
  }

  async function submitExam(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearNotices();
    if (!activeExam) return;
    setBusy("exam");
    const supabase = createBrowserSupabase();
    const answers = Object.entries(examAnswers).map(([questionId, answer]) => ({
      questionId,
      answer,
    }));
    const { error: submitError } = await supabase!.rpc(
      "submit_exam_attempt",
      { p_exam_id: activeExam.id, p_answers: answers },
    );
    if (submitError)
      setError(submitError.message || "Your exam could not be submitted.");
    else {
      setExamSubmitted(true);
      setActiveExam(null);
      router.refresh();
    }
    setBusy("");
  }

  async function openExam(exam: Row) {
    clearNotices();
    setExamAnswers({});
    setExamSubmitted(false);
    setBusy(`exam-${exam.id}`);
    const supabase = createBrowserSupabase();
    const { data: questions, error: questionError } = await supabase!
      .from("exam_questions")
      .select("id,question_type,prompt,choices,position")
      .eq("exam_id", exam.id)
      .order("position");
    if (questionError || !questions?.length)
      setError("This exam is not ready yet.");
    else setActiveExam({ ...exam, questions });
    setBusy("");
  }

  const sectionTitle =
    navigation.find((item) => item.id === section)?.label ?? "Overview";

  return (
    <main className="learning-app">
      <aside className="learning-sidebar">
        <Link className="brand learning-brand" href="/">
          <span className="brand-mark">EZ</span>
          <span className="brand-name">
            ENGLISH <b>ZONE</b>
            <small>LEARN WITH PURPOSE</small>
          </span>
        </Link>
        <div className="learning-side-label">YOUR LEARNING SPACE</div>
        <nav aria-label="Student navigation">
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
                clearNotices();
              }}
            >
              <Icon size={17} strokeWidth={1.7} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="learning-sidebar-bottom">
          <div className="teacher-mini">
            <span className="teacher-mini-mark">AM</span>
            <span>
              <strong>{data.teacherName}</strong>
              <small>Your English teacher</small>
            </span>
          </div>
          <button className="learning-signout" type="button" onClick={signOut}>
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>
      <section className="learning-main">
        <header className="learning-topbar">
          <div>
            <span className="eyebrow">
              <span className="eyebrow-dash" /> YOUR ENGLISH ZONE
            </span>
            <h1>{sectionTitle}</h1>
          </div>
          <div className="learning-user">
            <span className="learning-stage">
              {data.profile.academic_stage}
              {data.profile.educational_system
                ? ` · ${data.profile.educational_system}`
                : ""}
            </span>
            {data.profile.profile_picture_url ? (
              <Image
                src={data.profile.profile_picture_url}
                alt=""
                width={42}
                height={42}
                className="learning-avatar"
                unoptimized
              />
            ) : (
              <span className="learning-avatar learning-avatar-initial">
                {data.profile.full_name?.slice(0, 1) || "S"}
              </span>
            )}
            <button className="icon-button student-signout" type="button" onClick={signOut} title="Sign out" aria-label="Sign out">
              <LogOut size={16} />
            </button>
          </div>
        </header>
        <div className="learning-content">
          {(message || error) && (
            <div
              className={error ? "learning-notice error" : "learning-notice"}
              role={error ? "alert" : "status"}
            >
              {error || message}
              <button
                type="button"
                aria-label="Dismiss message"
                onClick={clearNotices}
              >
                ×
              </button>
            </div>
          )}

          {section === "overview" && (
            <>
              <div className="learning-welcome">
                <div>
                  <span className="eyebrow">
                    <span className="eyebrow-dash" /> A GOOD DAY TO GROW
                  </span>
                  <h2>
                    Welcome back,{" "}
                    <em>{data.profile.full_name?.split(" ")[0]}.</em>
                  </h2>
                  <p>Your next step is ready whenever you are.</p>
                  <span className="profile-status-line">
                    <span className="status-dot" /> {data.profile.access_status === "account_active" ? "Account active" : "Account created"} <i />{" "}
                    {activeCourses.length
                      ? `${activeCourses.length} active course${activeCourses.length === 1 ? "" : "s"}`
                      : "Course access pending"}
                  </span>
                </div>
                <span className="welcome-mark">
                  <BookOpen size={34} strokeWidth={1.3} />
                </span>
              </div>
              <div className="learning-stat-grid">
                <article>
                  <span className="learning-stat-icon">
                    <BookOpen size={17} />
                  </span>
                  <strong>{activeCourses.length}</strong>
                  <span>Active courses</span>
                </article>
                <article>
                  <span className="learning-stat-icon">
                    <CheckCircle2 size={17} />
                  </span>
                  <strong>{data.progress.length}</strong>
                  <span>Lessons completed</span>
                </article>
                <article>
                  <span className="learning-stat-icon">
                    <CalendarDays size={17} />
                  </span>
                  <strong>{attendanceRate}%</strong>
                  <span>Attendance</span>
                </article>
                <article>
                  <span className="learning-stat-icon">
                    <FileText size={17} />
                  </span>
                  <strong>{data.homeworkSubmissions.length}</strong>
                  <span>Homework submitted</span>
                </article>
              </div>
              <div className="learning-two-column">
                <section className="learning-section">
                  <div className="learning-section-heading">
                    <div>
                      <span className="eyebrow">
                        <span className="eyebrow-dash" /> KEEP MOVING
                      </span>
                      <h2>My courses</h2>
                    </div>
                    <button
                      className="quiet-link"
                      onClick={() => setSection("courses")}
                    >
                      All courses <ArrowRight size={14} />
                    </button>
                  </div>
                  <CourseList
                    courses={stageCourses.slice(0, 3)}
                    enrollments={enrollments}
                    payments={data.payments}
                    activeLessons={data.lessons}
                    progress={completedIds}
                    onContinue={continueCourse}
                    onPay={(courseId) => router.push(`/student/payment?course=${encodeURIComponent(courseId)}`)}
                  />
                </section>
                <section className="learning-section">
                  <div className="learning-section-heading">
                    <div>
                      <span className="eyebrow">
                        <span className="eyebrow-dash" /> FROM YOUR TEACHER
                      </span>
                      <h2>Latest notes</h2>
                    </div>
                  </div>
                  {visibleAnnouncements.length ? (
                    <div className="student-announcements">
                      {visibleAnnouncements.slice(0, 3).map((item) => (
                        <article key={item.id}>
                          <span>{item.kind?.replaceAll("_", " ")}</span>
                          <h3>{item.title}</h3>
                          <p>{item.body}</p>
                          <time>
                            {dateLabel(item.published_at, { day: "numeric", month: "short" })}
                          </time>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={<FileText size={20} />}
                      title="No new notes just yet"
                      text="Your teacher's latest announcements will appear here."
                    />
                  )}
                </section>
              </div>
              <StudentCard profile={data.profile} qr={qr} accessCode={data.accessCode} />
            </>
          )}

          {section === "courses" && (
            <section className="learning-section">
              <div className="learning-section-heading">
                <div>
                  <span className="eyebrow">
                    <span className="eyebrow-dash" /> YOUR LEARNING PATH
                  </span>
                  <h2>Available courses</h2>
                </div>
              </div>
              {stageCourses.length ? (
                <CourseList
                  courses={stageCourses}
                  enrollments={enrollments}
                  payments={data.payments}
                  activeLessons={data.lessons}
                  progress={completedIds}
                  onContinue={continueCourse}
                  onPay={(courseId) => router.push(`/student/payment?course=${encodeURIComponent(courseId)}`)}
                />
              ) : (
                <EmptyState
                  icon={<BookOpen size={20} />}
                  title="Your course list is on its way"
                  text="Published courses for your learning stage will appear here."
                />
              )}
            </section>
          )}

          {section === "lessons" && (
            <section className="learning-section">
              <div className="learning-section-heading">
                <div>
                  <span className="eyebrow">
                    <span className="eyebrow-dash" /> LEARN AT YOUR PACE
                  </span>
                  <h2>{currentCourse?.name ?? "Your lessons"}</h2>
                </div>
                <select
                  className="dashboard-select"
                  value={selectedCourse}
                  onChange={(event) => setSelectedCourse(event.target.value)}
                >
                  <option value="">Choose an active course</option>
                  {activeCourses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name}
                    </option>
                  ))}
                </select>
              </div>
              {!selectedCourse ? (
                <EmptyState
                  icon={<Video size={20} />}
                  title="Choose an active course"
                  text="Lessons become available here after course access is approved."
                />
              ) : data.lessons.filter(
                  (lesson) => lesson.course_id === selectedCourse,
                ).length ? (
                <div className="lesson-list">
                  {data.lessons
                    .filter((lesson) => lesson.course_id === selectedCourse)
                    .map((lesson, index, lessons) => (
                      <article className="lesson-row" id={`lesson-${lesson.id}`} key={lesson.id}>
                        <span className="lesson-number">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <div className="lesson-copy">
                          <h3>{lesson.title}</h3>
                          <p>
                            {lesson.description || "A lesson in your course."}
                          </p>
                          {lesson.playlist_id && (
                            <small>
                              {data.playlists.find((playlist) => playlist.id === lesson.playlist_id)?.title}
                            </small>
                          )}
                          {lesson.homework && (
                            <small>Homework: {lesson.homework}</small>
                          )}
                          {Array.isArray(lesson.materials) &&
                            lesson.materials.map(
                              (file: Material, fileIndex: number) => (
                                <a
                                  key={fileIndex}
                                  href={file.url}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  {file.name || "Lesson material"}
                                </a>
                              ),
                            )}
                        </div>
                        {completedIds.has(lesson.id) ? (
                          <span className="lesson-complete">
                            <Check size={14} /> Completed
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="button button-small"
                            onClick={() =>
                              lesson.video_url
                                ? window.open(
                                    lesson.video_url,
                                    "_blank",
                                    "noopener,noreferrer",
                                  )
                                : completeLesson(lesson.id)
                            }
                          >
                            {lesson.video_url ? (
                              <>
                                <Play size={14} /> Watch
                              </>
                            ) : (
                              <>
                                <Check size={14} /> Complete
                              </>
                            )}
                          </button>
                        )}
                        {lesson.video_url && !completedIds.has(lesson.id) && (
                          <button
                            type="button"
                            className="quiet-link"
                            onClick={() => completeLesson(lesson.id)}
                          >
                            Mark complete <ArrowRight size={14} />
                          </button>
                        )}
                        {index > 0 && (
                          <button
                            type="button"
                            className="lesson-nav"
                            onClick={() =>
                              document
                                .getElementById(
                                  `lesson-${lessons[index - 1].id}`,
                                )
                                ?.scrollIntoView({ behavior: "smooth" })
                            }
                            aria-label="Previous lesson"
                          >
                            <ArrowLeft size={15} />
                          </button>
                        )}
                      </article>
                    ))
                  }
                </div>
              ) : (
                <EmptyState
                  icon={<Video size={20} />}
                  title="Your teacher is preparing lessons"
                  text="Published lessons will appear as soon as they are ready."
                />
              )}
            </section>
          )}

          {section === "exams" && (
            <section className="learning-section">
              <div className="learning-section-heading">
                <div>
                  <span className="eyebrow">
                    <span className="eyebrow-dash" /> SHOW WHAT YOU KNOW
                  </span>
                  <h2>Exams & practice</h2>
                </div>
              </div>
              {examSubmitted && (
                <div className="exam-result">
                  <span className="learning-stat-icon">
                    <CheckCircle2 size={19} />
                  </span>
                  <div>
                    <strong>Exam submitted</strong>
                    <p>Your teacher will review your answers.</p>
                  </div>
                </div>
              )}
              {activeExam ? (
                <form className="exam-taking" onSubmit={submitExam}>
                  <div className="exam-taking-head">
                    <div>
                      <span className="eyebrow">
                        {activeExam.duration_minutes} MINUTES
                      </span>
                      <h3>{activeExam.title}</h3>
                    </div>
                    <button
                      className="icon-button"
                      type="button"
                      aria-label="Close exam"
                      onClick={() => setActiveExam(null)}
                    >
                      ×
                    </button>
                  </div>
                  {activeExam.questions?.map((question, index) => (
                    <fieldset className="exam-question" key={question.id}>
                      <legend>
                        <span>{String(index + 1).padStart(2, "0")}</span>
                        {question.prompt}
                      </legend>
                      {question.question_type === "fill_blank" ? (
                        <input
                          required
                          value={examAnswers[question.id] ?? ""}
                          onChange={(event) =>
                            setExamAnswers({
                              ...examAnswers,
                              [question.id]: event.target.value,
                            })
                          }
                        />
                      ) : (
                        (question.choices as string[]).map((choice) => (
                          <label key={choice}>
                            <input
                              type="radio"
                              name={question.id}
                              value={choice}
                              checked={examAnswers[question.id] === choice}
                              onChange={() =>
                                setExamAnswers({
                                  ...examAnswers,
                                  [question.id]: choice,
                                })
                              }
                              required
                            />{" "}
                            {choice}
                          </label>
                        ))
                      )}
                    </fieldset>
                  ))}
                  <button
                    className="button"
                    type="submit"
                    disabled={busy === "exam"}
                  >
                    {busy === "exam" ? (
                      <LoaderCircle className="spin" size={16} />
                    ) : (
                      <ClipboardCheck size={16} />
                    )}{" "}
                    Submit exam
                  </button>
                </form>
              ) : data.exams.length ? (
                <div className="data-list">
                  {data.exams.map((exam) => (
                    <article className="data-row" key={exam.id}>
                      <span className="learning-stat-icon">
                        <ClipboardCheck size={17} />
                      </span>
                      <div className="data-row-main">
                        <strong>{exam.title}</strong>
                        <small>
                          {
                            data.courses.find(
                              (course) => course.id === exam.course_id,
                            )?.name
                          }{" "}
                          · {exam.exam_questions?.[0]?.count ?? 0} questions ·{" "}
                          {exam.duration_minutes} min{exam.scheduled_at ? ` · ${dateLabel(exam.scheduled_at, { day: "numeric", month: "short" })}` : ""}
                        </small>
                      </div>
                      <button
                        className="button button-small"
                        type="button"
                        disabled={busy === `exam-${exam.id}`}
                        onClick={() => openExam(exam)}
                      >
                        {busy === `exam-${exam.id}` ? (
                          <LoaderCircle className="spin" size={14} />
                        ) : (
                          "Start exam"
                        )}
                      </button>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<CircleHelp size={20} />}
                  title="No exams available yet"
                  text="Your teacher's published exams will appear here."
                />
              )}
            </section>
          )}

          {section === "homework" && (
            <section className="learning-section">
              <div className="learning-section-heading">
                <div>
                  <span className="eyebrow"><span className="eyebrow-dash" /> YOUR ASSIGNMENTS</span>
                  <h2>Upload homework</h2>
                </div>
              </div>
              {homeworkLessons.length ? (
                <form className="payment-submit" onSubmit={submitHomework}>
                  <label className="form-field">
                    <span>Homework assignment</span>
                    <select required value={homeworkLessonId} onChange={(event) => setHomeworkLessonId(event.target.value)}>
                      <option value="">Choose an assignment</option>
                      {homeworkLessons.map((lesson) => (
                        <option key={lesson.id} value={lesson.id}>{lesson.title}</option>
                      ))}
                    </select>
                  </label>
                  {homeworkLessonId && (
                    <p className="field-help">{homeworkLessons.find((lesson) => lesson.id === homeworkLessonId)?.homework}</p>
                  )}
                  <label className="form-field">
                    <span>Attach your work</span>
                    <input
                      required
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,image/webp"
                      onChange={(event) => setHomeworkFile(event.target.files?.[0] ?? null)}
                    />
                    <small className="field-help">PDF, Word, or image · up to 10 MB</small>
                  </label>
                  <button className="button" type="submit" disabled={busy === "homework"}>
                    {busy === "homework" ? <LoaderCircle className="spin" size={16} /> : <Upload size={16} />}
                    Submit homework
                  </button>
                </form>
              ) : (
                <EmptyState icon={<FileText size={20} />} title="No homework assigned yet" text="Your teacher's assignments will appear here." />
              )}
              {data.homeworkSubmissions.length > 0 && (
                <div className="data-list">
                  {data.homeworkSubmissions.map((submission) => (
                    <article className="data-row" key={submission.id}>
                      <span className="learning-stat-icon"><FileText size={17} /></span>
                      <div className="data-row-main">
                        <strong>{data.lessons.find((lesson) => lesson.id === submission.lesson_id)?.title ?? "Homework"}</strong>
                        <small>{submission.file_name} · {dateLabel(submission.submitted_at, { day: "numeric", month: "short", year: "numeric" })}</small>
                      </div>
                      <span className="status-pill pending">Submitted</span>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {section === "attendance" && (
            <section className="learning-section">
              <div className="learning-section-heading">
                <div>
                  <span className="eyebrow">
                    <span className="eyebrow-dash" /> SHOWING UP ADDS UP
                  </span>
                  <h2>Your attendance</h2>
                </div>
              </div>
              <div className="attendance-summary">
                <div
                  className="attendance-ring"
                  style={
                    {
                      "--attendance": `${attendanceRate}%`,
                    } as React.CSSProperties
                  }
                >
                  <strong>{attendanceRate}%</strong>
                  <span>attendance</span>
                </div>
                <div>
                  <strong>{attended} present</strong>
                  <p>out of {data.attendance.length} marked sessions</p>
                </div>
              </div>
              {data.attendance.length ? (
                <div className="data-list">
                  {data.attendance.map((record) => (
                    <article className="data-row" key={record.id}>
                      <span className={`attendance-mark ${record.status}`}>
                        <Check size={15} />
                      </span>
                      <div className="data-row-main">
                        <strong>
                          {record.status === "present" ? "Present" : "Absent"}
                        </strong>
                        <small>
                          {data.courses.find(
                            (course) => course.id === record.course_id,
                          )?.name ?? "English Zone"}
                        </small>
                      </div>
                      <time>
                        {dateLabel(record.attended_on, { day: "numeric", month: "short", year: "numeric" })}
                      </time>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<CalendarDays size={20} />}
                  title="No attendance recorded yet"
                  text="Your teacher will mark attendance for your sessions here."
                />
              )}
            </section>
          )}

          {section === "payment" && (
            <div className="payment-layout">
              <section className="learning-section payment-history">
                <div className="learning-section-heading">
                  <div>
                    <span className="eyebrow">
                      <span className="eyebrow-dash" /> CLEAR & SIMPLE
                    </span>
                    <h2>Payment history</h2>
                  </div>
                </div>
                {data.payments.length ? (
                  <div className="data-list">
                    {data.payments.map((payment) => (
                      <article className="data-row" key={payment.id}>
                        <span className="learning-stat-icon">
                          <CreditCard size={17} />
                        </span>
                        <div className="data-row-main">
                          <strong>
                            {data.courses.find(
                              (course) => course.id === payment.course_id,
                            )?.name ?? "Course payment"}
                          </strong>
                          <small>
                            {payment.payment_method} ·{" "}
                            {dateLabel(payment.created_at, {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            {payment.sender_phone ? ` · From ${payment.sender_phone}` : ""}
                            {payment.transferred_at ? ` · Sent ${dateLabel(payment.transferred_at)}` : ""}
                            {payment.status === "rejected" &&
                            payment.rejection_note
                              ? ` · ${payment.rejection_note}`
                              : ""}
                          </small>
                        </div>
                        <span className={`status-pill ${payment.status}`}>
                          {payment.status === "pending"
                            ? "Under review"
                            : payment.status}
                        </span>
                        <strong>{money(payment.amount)}</strong>
                      </article>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={<WalletCards size={20} />}
                    title="No payment requests yet"
                    text="When you request a paid course, its status will show here."
                  />
                )}
              </section>
              <section className="payment-panel">
                <span className="eyebrow">
                  <span className="eyebrow-dash" /> JOIN A COURSE
                </span>
                <h2>Make your next move.</h2>
                <label className="form-field">
                  <span>Course summary</span>
                  <div className="input-wrap select-wrap">
                    <select
                      value={proofCourse}
                      onChange={(event) => setProofCourse(event.target.value)}
                    >
                      <option value="">Choose a paid course</option>
                      {stageCourses
                        .filter(
                          (course) =>
                            !course.is_free &&
                            enrollments.get(course.id)?.access_status !==
                              "active" &&
                            !data.payments.some(
                              (payment) =>
                                payment.course_id === course.id &&
                                payment.status === "pending",
                            ),
                        )
                        .map((course) => (
                          <option key={course.id} value={course.id}>
                            {course.name} · {money(course.price)}
                          </option>
                        ))}
                    </select>
                  </div>
                </label>
                {proofCourse && (
                  <div className="payment-summary">
                    <span>
                      {
                        data.courses.find((course) => course.id === proofCourse)
                          ?.name
                      }
                    </span>
                    <div>
                      <small>Original price</small>
                      <del>
                        {money(
                          data.courses.find(
                            (course) => course.id === proofCourse,
                          )?.original_price ??
                            data.courses.find(
                              (course) => course.id === proofCourse,
                            )?.price,
                        )}
                      </del>
                    </div>
                    {Boolean(
                      data.courses.find((course) => course.id === proofCourse)
                        ?.discount_percent,
                    ) && (
                      <div>
                        <small>Discount</small>
                        <strong>
                          {
                            data.courses.find(
                              (course) => course.id === proofCourse,
                            )?.discount_percent
                          }
                          % OFF
                        </strong>
                      </div>
                    )}
                    <div className="payment-total">
                      <small>Final price</small>
                      <strong>
                        {money(
                          data.courses.find(
                            (course) => course.id === proofCourse,
                          )?.price,
                        )}
                      </strong>
                    </div>
                  </div>
                )}
                <div className="instapay-box">
                  <span>PAYMENT METHOD</span>
                  <strong>InstaPay</strong>
                  <small>InstaPay Number</small>
                  <div>
                    <b>{data.instapayNumber}</b>
                    <button
                      type="button"
                      className="icon-button"
                      title="Copy number"
                      aria-label="Copy InstaPay number"
                      onClick={copyNumber}
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                </div>
                <ol className="payment-steps">
                  <li>Send the exact course price through InstaPay.</li>
                  <li>Take a screenshot of the successful payment.</li>
                  <li>Upload your screenshot, then submit it for review.</li>
                </ol>
                <form className="payment-submit" onSubmit={uploadPayment}>
                  <label className="form-field">
                    <span>Transfer sender phone</span>
                    <input
                      type="tel"
                      inputMode="tel"
                      value={senderPhone}
                      onChange={(event) => setSenderPhone(event.target.value)}
                      minLength={6}
                      maxLength={30}
                      required
                    />
                  </label>
                  <label className="form-field">
                    <span>Transfer date</span>
                    <input
                      type="date"
                      value={transferDate}
                      max={new Date().toISOString().slice(0, 10)}
                      onChange={(event) => setTransferDate(event.target.value)}
                      required
                    />
                  </label>
                  <label className="form-field">
                    <span>Payment screenshot</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      onChange={(event) =>
                        setProofFile(event.target.files?.[0] ?? null)
                      }
                      required
                    />
                  </label>
                  <button
                    type="submit"
                    className="button"
                    disabled={busy === "payment" || !proofCourse}
                  >
                    {busy === "payment" ? (
                      <>
                        <LoaderCircle className="spin" size={16} /> Submitting…
                      </>
                    ) : (
                      <>
                        Submit Payment <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                  <small>
                    Course access begins only after your teacher approves your
                    payment.
                  </small>
                </form>
              </section>
            </div>
          )}

          {section === "profile" && (
            <div className="profile-layout">
              <section className="learning-section profile-form-panel">
                <div className="learning-section-heading">
                  <div>
                    <span className="eyebrow">
                      <span className="eyebrow-dash" /> YOUR DETAILS
                    </span>
                    <h2>Profile</h2>
                  </div>
                </div>
                <form className="profile-edit-form" onSubmit={saveProfile}>
                  <label className="form-field">
                    <span>Full name</span>
                    <input
                      value={profileName}
                      onChange={(event) => setProfileName(event.target.value)}
                      required
                      minLength={2}
                    />
                  </label>
                  <label className="form-field">
                    <span>Student phone</span>
                    <input
                      value={profilePhone}
                      onChange={(event) => setProfilePhone(event.target.value)}
                      required
                    />
                  </label>
                  <label className="form-field">
                    <span>Email address</span>
                    <input value={data.profile.email ?? ""} readOnly />
                  </label>
                  <label className="form-field">
                    <span>Parent / guardian phone</span>
                    <input value={data.profile.guardian_phone ?? ""} readOnly />
                  </label>
                  <label className="form-field">
                    <span>Educational stage</span>
                    <input
                      value={`${data.profile.academic_stage}${data.profile.educational_system ? ` · ${data.profile.educational_system}` : ""}`}
                      readOnly
                    />
                  </label>
                  <button
                    type="submit"
                    className="button"
                    disabled={busy === "profile"}
                  >
                    {busy === "profile" ? "Saving…" : "Save changes"}
                  </button>
                </form>
                <form className="profile-edit-form password-edit-form" onSubmit={savePassword}>
                  <div className="learning-section-heading">
                    <div>
                      <span className="eyebrow"><span className="eyebrow-dash" /> SIGN IN SECURELY</span>
                      <h2>Set your password</h2>
                    </div>
                  </div>
                  <label className="form-field">
                    <span>New password</span>
                    <input type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={8} required />
                  </label>
                  <label className="form-field">
                    <span>Confirm new password</span>
                    <input type="password" autoComplete="new-password" value={confirmNewPassword} onChange={(event) => setConfirmNewPassword(event.target.value)} minLength={8} required />
                  </label>
                  <button type="submit" className="button" disabled={busy === "password"}>{busy === "password" ? "Saving…" : "Save password"}</button>
                </form>
              </section>
              <StudentCard profile={data.profile} qr={qr} accessCode={data.accessCode} />
            </div>
          )}
        </div>
        <footer className="learning-footer">
          <span>ENGLISH ZONE · LEARN WITH PURPOSE</span>
          <span>
            One lesson at a time <Sparkles size={13} />
          </span>
        </footer>
      </section>
    </main>
  );
}

function CourseList({
  courses,
  enrollments,
  payments,
  activeLessons,
  progress,
  onContinue,
  onPay,
}: {
  courses: Row[];
  enrollments: Map<string, Row>;
  payments: Row[];
  activeLessons: Row[];
  progress: Set<string>;
  onContinue: (id: string) => void;
  onPay: (id: string) => void;
}) {
  if (!courses.length)
    return (
      <EmptyState
        icon={<BookOpen size={20} />}
        title="No courses published yet"
        text="Your teacher's courses will appear here."
      />
    );
  return (
    <div className="student-course-grid">
      {courses.map((course, index) => {
        const status = courseStatus(
          course,
          enrollments.get(course.id),
          payments,
        );
        const lessons = activeLessons.filter(
          (lesson) => lesson.course_id === course.id,
        );
        const completed = lessons.filter((lesson) =>
          progress.has(lesson.id),
        ).length;
        const percent = lessons.length
          ? Math.round((completed * 100) / lessons.length)
          : 0;
        return (
          <article
            className={`student-course-card student-course-${index % 3}`}
            key={course.id}
          >
            <div
              className="student-course-cover"
              style={
                course.cover_image_url
                  ? {
                      backgroundImage: `linear-gradient(180deg, transparent, rgb(37 42 53 / 24%)), url("${course.cover_image_url}")`,
                    }
                  : undefined
              }
            >
              <span>
                {course.academic_stage}
                {course.educational_system
                  ? ` · ${course.educational_system}`
                  : ""}
              </span>
              {!course.cover_image_url && (
                <BookOpen size={29} strokeWidth={1.3} />
              )}
            </div>
            <div className="student-course-copy">
              <div className="student-course-meta">
                <span>MR ABDELRAHMAN MOHAMED</span>
                <span className={`status-pill ${status.tone}`}>
                  {status.label}
                </span>
              </div>
              <h3>{course.name}</h3>
              <p>
                {course.description ||
                  "A structured course made for your next step."}
              </p>
              <div className="student-course-price">
                {course.original_price &&
                  course.original_price > (course.price ?? 0) && (
                    <del>{money(course.original_price)}</del>
                  )}
                <strong>{money(course.is_free ? null : course.price)}</strong>
                {(course.discount_percent ?? 0) > 0 && (
                  <span>{course.discount_percent}% OFF</span>
                )}
              </div>
              {status.tone === "active" || status.label === "Completed" ? (
                <>
                  <div className="course-progress-line">
                    <span>
                      <i style={{ width: `${percent}%` }} />
                    </span>
                    <small>
                      {completed}/{lessons.length || course.lesson_count}{" "}
                      lessons · {percent}%
                    </small>
                  </div>
                  <button
                    className="course-continue"
                    type="button"
                    onClick={() => onContinue(course.id)}
                  >
                    Continue Course <ArrowRight size={15} />
                  </button>
                </>
              ) : status.tone === "locked" || status.label === "Payment Rejected" ? (
                <button
                  className="course-continue"
                  type="button"
                  onClick={() =>
                    course.is_free ? onContinue(course.id) : onPay(course.id)
                  }
                >
                  {course.is_free ? "Start course" : status.label === "Payment Rejected" ? "Resubmit payment" : "Buy now"}{" "}
                  <ArrowRight size={15} />
                </button>
              ) : (
                <span className="course-waiting">
                  {status.label === "Payment Rejected"
                    ? "Please review your payment or contact your teacher."
                    : "Your teacher will update your access here."}
                </span>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function StudentCard({ profile, qr, accessCode }: { profile: Row; qr: string; accessCode: string | null }) {
  return (
    <section className="student-id-section">
      <div className="learning-section-heading">
        <div>
          <span className="eyebrow">
            <span className="eyebrow-dash" /> YOUR ENGLISH ZONE ID
          </span>
          <h2>A card for your next chapter</h2>
        </div>
        <button
          className="button button-outline button-small print-card-button"
          type="button"
          onClick={() => window.print()}
        >
          <Printer size={14} /> Print Student Card
        </button>
      </div>
      <article className="student-id-card">
        <div className="student-id-card-head">
          <span className="student-id-brand">
            <span className="brand-mark">EZ</span>
            <span>
              ENGLISH <b>ZONE</b>
              <small>STUDENT IDENTIFICATION</small>
            </span>
          </span>
          <span className="student-id-stamp">
            <GraduationCap size={19} />
          </span>
        </div>
        <div className="student-id-card-body">
          <div>
            <span>STUDENT NAME</span>
            <strong>{profile.full_name}</strong>
            <span>STUDENT PHONE</span>
            <b>{profile.phone}</b>
            <div className="student-id-card-details">
              <span>
                <small>EDUCATIONAL STAGE</small>
                <b>
                  {profile.academic_stage}
                  {profile.educational_system
                    ? ` · ${profile.educational_system}`
                    : ""}
                </b>
              </span>
              <span>
                <small>STUDENT ID</small>
                <b>{profile.student_code}</b>
              </span>
            </div>
          </div>
          <div className="student-qr">
            {qr ? (
              <Image src={qr} alt={`Student QR code for ${profile.full_name}`} width={120} height={120} unoptimized />
            ) : (
              <QrCode size={53} strokeWidth={1.2} />
            )}
            <small>SCAN TO IDENTIFY</small>
          </div>
        </div>
        <div className="student-id-card-foot">
          <span>LEARN · PRACTICE · ACHIEVE</span>
          <span>ENGLISH ZONE · STUDENT CARD</span>
        </div>
      </article>
      <div className="student-access-code-panel">
        <div>
          <span>YOUR REUSABLE ACCESS CODE</span>
          <small>Use this code to sign in to English Zone.</small>
        </div>
        <code>{accessCode ?? "This older code cannot be displayed. Keep using the code you were given."}</code>
      </div>
    </section>
  );
}

function EmptyState({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="learning-empty">
      <span>{icon}</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
