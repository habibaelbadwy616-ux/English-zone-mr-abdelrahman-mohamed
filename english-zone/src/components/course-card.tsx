import Link from "next/link";
import { ArrowUpRight, BookOpen, Clock3 } from "lucide-react";

export type Course = {
  id: string;
  name: string;
  academic_stage: string;
  description: string;
  price: number | null;
  original_price: number | null;
  discount_percent: number;
  lesson_count: number;
  status: string;
  is_free: boolean;
};

export function CourseCard({ course, index }: { course: Course; index: number }) {
  const purchaseHref = `/student/payment?course=${encodeURIComponent(course.id)}`;
  return (
    <article className={`course-card course-card-${index % 3}`}>
      <div className="course-card-top"><span className="course-index">0{index + 1}</span><span className="course-stage">{course.academic_stage}</span></div>
      <div className="course-illustration" aria-hidden="true"><span className="course-orbit" /><BookOpen size={36} strokeWidth={1.2} /><span className="course-illustration-dot">✳</span></div>
      <div className="course-card-copy">
        <h3>{course.name}</h3>
        <p>{course.description}</p>
      </div>
      <div className="course-meta"><span><Clock3 size={14} /> {course.lesson_count} lessons</span><span className={`course-status status-${course.status}`}>{course.status.replaceAll("_", " ")}</span></div>
      <div className="course-card-bottom">
        <div className="course-price">
          {course.is_free ? <strong>FREE</strong> : <>
            {course.discount_percent > 0 && course.original_price !== null && <del>{course.original_price} EGP</del>}
            <strong>{course.price ?? "—"} <small>EGP</small></strong>
          </>}
          {course.discount_percent > 0 && <span className="discount-tag">-{course.discount_percent}%</span>}
        </div>
        <Link className="course-link" href={purchaseHref} aria-label={`${course.is_free ? "Start" : "Buy"} ${course.name}`}><ArrowUpRight size={18} /></Link>
      </div>
      <Link className="course-action" href={purchaseHref}>{course.is_free ? "Start now" : "Buy now"} <ArrowUpRight size={15} /></Link>
    </article>
  );
}