import Link from "next/link";
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, Award, BookMarked, BookOpen,
  Check, Compass, Headphones, Lightbulb, MessageCircle, Mic2, PenLine,
  Play, Quote, Sparkles, Star, Target, Trophy, TrendingUp, Video,
} from "lucide-react";
import { ChallengeWidget } from "@/components/challenge-widget";
import { CourseCard, type Course } from "@/components/course-card";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { createServerSupabase } from "@/lib/supabase/server";

const features = [
  { icon: BookMarked, title: "Structured learning", text: "A clear path from your first lesson to your next big milestone." },
  { icon: PenLine, title: "Practice & exams", text: "Put what you learn to work with thoughtful practice and real tests." },
  { icon: TrendingUp, title: "Track your progress", text: "See your effort add up, one lesson and one skill at a time." },
  { icon: Target, title: "Exam preparation", text: "Walk into every exam with a plan, a stronger foundation, and confidence." },
  { icon: Sparkles, title: "Challenges & rewards", text: "Make a little room for play and celebrate the progress you earn." },
  { icon: Compass, title: "Learn anywhere", text: "Your lessons and practice are ready when you are, wherever you are." },
];

const categories = [
  { name: "Grammar", icon: PenLine, note: "Build clear sentences" },
  { name: "Vocabulary", icon: BookOpen, note: "Find the right words" },
  { name: "Reading", icon: BookMarked, note: "Read between the lines" },
  { name: "Writing", icon: PenLine, note: "Put ideas on paper" },
  { name: "Listening", icon: Headphones, note: "Catch every detail" },
  { name: "Speaking", icon: Mic2, note: "Speak with confidence" },
  { name: "Exam prep", icon: Target, note: "Make your next move" },
  { name: "Revision", icon: Lightbulb, note: "Bring it all together" },
];

const journey = [
  { number: "01", title: "Learn", text: "Build your understanding.", icon: BookOpen },
  { number: "02", title: "Practice", text: "Strengthen your skills.", icon: PenLine },
  { number: "03", title: "Test", text: "Challenge yourself.", icon: Target },
  { number: "04", title: "Improve", text: "Track your progress and keep growing.", icon: TrendingUp },
];

const dashboardItems = [
  { label: "Course progress", value: "68%", icon: TrendingUp, width: "68%" },
  { label: "Lessons completed", value: "12 / 18", icon: BookOpen, width: "66%" },
  { label: "Latest exam grade", value: "A−", icon: Award, width: "84%" },
];

export default async function Home() {
  let courses: Course[] = [];
  let announcements: { id: string; kind: string; title: string; body: string; published_at: string }[] = [];
  let rewardRules: { minimum_score: number; discount_percent: number }[] = [];
  const supabase = await createServerSupabase();

  if (supabase) {
    const [{ data: courseData }, { data: announcementData }, { data: rewardData }] = await Promise.all([
      supabase.from("courses").select("id,name,academic_stage,description,price,original_price,discount_percent,lesson_count,status,is_free").eq("is_published", true).order("featured_order"),
      supabase.from("announcements").select("id,kind,title,body,published_at").eq("is_published", true).order("published_at", { ascending: false }).limit(3),
      supabase.from("challenge_reward_rules").select("minimum_score,discount_percent").eq("is_active", true).order("minimum_score", { ascending: false }),
    ]);
    courses = (courseData ?? []) as Course[];
    announcements = announcementData ?? [];
    rewardRules = rewardData ?? [];
  }

  return (
    <>
      <SiteHeader showTeacherName />
      <main>
        <section className="hero-section">
          <div className="hero-scribble hero-scribble-one" aria-hidden="true" />
          <div className="hero-scribble hero-scribble-two" aria-hidden="true" />
          <div className="wrap hero-grid">
            <div className="hero-copy">
              <span className="eyebrow hero-eyebrow"><span className="eyebrow-dot" /> SOMETHING BIG IS COMING</span>
              <h1>Are You Ready<br />To Improve Your <em>English?</em></h1>
              <p className="hero-description">A clearer path to confident English. Learn with structure, practise with purpose, take on challenges, and get ready for the exams that matter to you.</p>
              <div className="hero-actions">
                <Link className="button" href="/join">Join English Zone <ArrowUpRight size={17} /></Link>
                <Link className="text-link" href="#courses"><span className="play-circle"><Play size={12} fill="currentColor" /></span> Explore courses</Link>
              </div>
              <div className="hero-proof"><div className="proof-avatars" aria-hidden="true"><span>A</span><span>M</span><span>+</span></div><p><strong>Small steps. Real progress.</strong><br />A learning experience built around you.</p></div>
            </div>
            <div className="hero-art" aria-label="Animated English-learning shapes">
              <div className="art-backdrop" />
              <div className="art-motion-scene" aria-hidden="true">
                <span className="motion-arch" />
                <span className="motion-arch-outline" />
                <span className="motion-ring motion-ring-one" />
                <span className="motion-ring motion-ring-two" />
                <span className="motion-letter motion-letter-one">A</span>
                <span className="motion-letter motion-letter-two">b</span>
                <span className="motion-page motion-page-one">Aa</span>
                <span className="motion-page motion-page-two">G</span>
                <span className="motion-book-shape"><i /><i /><i /></span>
                <span className="motion-cutout motion-cutout-one" />
                <span className="motion-cutout motion-cutout-two" />
                <span className="motion-diamond" />
                <span className="motion-dash motion-dash-one" />
                <span className="motion-dash motion-dash-two" />
              </div>
              <div className="art-paper art-paper-main"><span className="paper-rule short" /><span className="paper-rule" /><span className="paper-rule medium" /><span className="paper-rule" /><span className="paper-rule short" /><span className="paper-word">believe</span><span className="paper-word paper-word-small">/bɪˈliːv/</span></div>
              <div className="art-vocab"><span>WORD OF THE DAY</span><strong>opportunity</strong><small>an occasion to grow</small></div>
              <div className="art-note"><span>practice</span><span>makes progress <i>↗</i></span></div>
              <div className="art-sparkle sparkle-one">✳</div><div className="art-sparkle sparkle-two">✦</div>
              <div className="art-caption"><span>YOUR NEXT CHAPTER</span><ArrowDownRight size={17} /></div>
            </div>
          </div>
          <div className="hero-bottom wrap"><span>MADE FOR YOUR NEXT BIG STEP</span><span className="hero-bottom-line" /><span>LEARN · PRACTICE · ACHIEVE</span></div>
        </section>

        <section className="challenge-section section-pad" id="challenge">
          <div className="wrap challenge-layout">
            <div className="challenge-copy">
              <span className="eyebrow"><span className="eyebrow-dash" /> PLAY & EARN</span>
              <h2>Play. Test Your English.<br /><em>Unlock Your Discount.</em></h2>
              <p>A quick challenge is a lovely way to see what you know. Answer a few questions, get your score, and earn a course discount to save to your new account.</p>
              <div className="reward-ladder">
                {rewardRules.length ? rewardRules.map((rule, index) => {
                  const upperScore = index === 0 ? 100 : rewardRules[index - 1].minimum_score - 1;
                  return <div key={rule.minimum_score}><span className="reward-score">{rule.minimum_score}–{upperScore}%</span><span className="reward-dots" /><strong>{rule.discount_percent}% OFF</strong></div>;
                }) : <p className="reward-unavailable">Challenge rewards will appear here once they are published.</p>}
              </div>
              <p className="small-note"><Check size={14} /> Your result is saved securely. Create an account to claim it.</p>
            </div>
            <ChallengeWidget />
          </div>
        </section>

        <section className="features-section section-pad" id="why">
          <div className="wrap">
            <div className="section-heading section-heading-centered"><span className="eyebrow"><span className="eyebrow-dash" /> A GOOD PLACE TO GROW</span><h2>Why English Zone<span className="heading-question">?</span></h2><p>Good English opens doors. The right learning experience helps you walk through them.</p></div>
            <div className="feature-grid">{features.map(({ icon: Icon, title, text }, index) => <article className="feature-card" key={title}><span className={`feature-icon feature-icon-${index}`}><Icon size={22} strokeWidth={1.6} /></span><span className="feature-number">0{index + 1}</span><h3>{title}</h3><p>{text}</p></article>)}</div>
          </div>
        </section>

        <section className="journey-section section-pad">
          <div className="wrap">
            <div className="journey-heading"><div><span className="eyebrow"><span className="eyebrow-dash" /> YOUR NEXT CHAPTER</span><h2>Learn. Practice.<br /><em>Test. Improve.</em></h2></div><p>Every confident English speaker started somewhere. Here, every step has a purpose and every bit of progress counts.</p></div>
            <div className="journey-track">{journey.map(({ number, title, text, icon: Icon }, index) => <article className="journey-step" key={number}><span className="journey-step-number">{number}</span><span className="journey-icon"><Icon size={24} strokeWidth={1.5} /></span>{index < journey.length - 1 && <span className="journey-connector" aria-hidden="true"><ArrowRight size={16} /></span>}<h3>{title}</h3><p>{text}</p></article>)}</div>
          </div>
        </section>

        <section className="categories-section section-pad">
          <div className="wrap">
            <div className="section-heading section-heading-row"><div><span className="eyebrow"><span className="eyebrow-dash" /> FIND YOUR FOCUS</span><h2>Explore learning<br /><em>categories</em></h2></div><p>From the rules behind a sentence to the confidence behind a conversation, there is always something new to discover.</p></div>
            <div className="category-grid">{categories.map(({ name, icon: Icon, note }, index) => <Link className={`category-item category-item-${index % 4}`} href="/join" key={name}><span className="category-icon"><Icon size={22} strokeWidth={1.5} /></span><span className="category-name">{name}</span><span className="category-note">{note}</span><ArrowUpRight className="category-arrow" size={16} /></Link>)}</div>
          </div>
        </section>

        <section className="courses-section section-pad" id="courses">
          <div className="wrap">
            <div className="section-heading section-heading-row"><div><span className="eyebrow"><span className="eyebrow-dash" /> A PLACE TO BEGIN</span><h2>Featured <em>courses</em></h2></div><p>Thoughtfully designed courses for your stage, your goals, and the future you are working towards.</p></div>
            {courses.length ? <div className="course-grid">{courses.map((course, index) => <CourseCard key={course.id} course={course} index={index} />)}</div> : <div className="empty-courses"><span className="empty-course-mark"><BookOpen size={25} /></span><div><h3>Your next course is taking shape.</h3><p>New courses will appear here as they are published.</p></div><Link className="text-link" href="/join">Get started <ArrowRight size={15} /></Link></div>}
            <div className="courses-footnote"><span>MORE TO LEARN, MORE TO COME</span><span className="footer-rule" /><Link href="/join">Find your place <ArrowUpRight size={15} /></Link></div>
          </div>
        </section>

        <section className="student-preview-section section-pad">
          <div className="wrap preview-layout">
            <div className="preview-copy"><span className="eyebrow"><span className="eyebrow-dash" /> YOUR LEARNING JOURNEY, ALL IN ONE PLACE</span><h2>A little more<br />clarity. A lot more <em>confidence.</em></h2><p>Lessons, exams, grades, attendance, challenges and achievements, all brought together so you can focus on what comes next.</p><Link className="button" href="/join">Start your journey <ArrowUpRight size={16} /></Link><span className="preview-handnote">Made for steady progress <i>↗</i></span></div>
            <div className="dashboard-preview" aria-label="Preview of the English Zone student progress dashboard">
              <div className="dashboard-preview-header"><div><span className="dashboard-greeting">GOOD AFTERNOON</span><h3>Your progress, at a glance.</h3></div><span className="dashboard-avatar">S</span></div>
              <div className="dashboard-welcome"><span className="welcome-sun">✳</span><div><span>KEEP YOUR MOMENTUM</span><strong>You&apos;re finding your rhythm.</strong></div><ArrowUpRight size={17} /></div>
              <div className="dashboard-stats">{dashboardItems.map(({ label, value, icon: Icon, width }) => <div className="dashboard-stat" key={label}><div className="dashboard-stat-top"><span className="dashboard-stat-icon"><Icon size={16} /></span><strong>{value}</strong></div><span className="dashboard-stat-label">{label}</span><span className="stat-track"><i style={{ width }} /></span></div>)}</div>
              <div className="dashboard-bottom"><div><span className="eyebrow">UP NEXT</span><strong>Reading for meaning</strong><small><Video size={13} /> Lesson 04 <span>·</span> 18 min</small></div><span className="dashboard-play"><Play size={14} fill="currentColor" /></span></div>
              <div className="dashboard-sticker"><Star size={13} fill="currentColor" /> 4 day streak</div>
            </div>
          </div>
        </section>

        <section className="achievement-section section-pad">
          <div className="wrap achievement-wrap">
            <div className="achievement-intro"><span className="eyebrow"><span className="eyebrow-dash" /> LITTLE WINS ADD UP</span><h2>Learn. Challenge<br /><em>yourself. Achieve more.</em></h2><p>Make your progress visible. Celebrate the skills you build, the goals you reach, and the person you are becoming.</p><Link className="text-link" href="/join">Make your first move <ArrowRight size={15} /></Link></div>
            <div className="achievement-board"><div className="achievement-heading"><span>YOUR MOMENTUM</span><span>THIS WEEK <ArrowUpRight size={13} /></span></div><div className="achievement-points"><div><span>POINTS EARNED</span><strong>+240</strong><small>↑ 18% from last week</small></div><div className="points-mark"><Sparkles size={23} /></div></div><div className="week-bars" aria-label="Weekly points activity"><span style={{ height: "36%" }} /><span style={{ height: "62%" }} /><span style={{ height: "47%" }} /><span style={{ height: "82%" }} /><span style={{ height: "57%" }} /><span style={{ height: "100%" }} /><span style={{ height: "71%" }} /></div><div className="week-labels"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span></div><div className="achievement-badges"><span className="badge-star"><Trophy size={17} /></span><div><strong>First steps</strong><small>Badge unlocked</small></div><span className="badge-label">YOUR FIRST 5 LESSONS</span></div></div>
            <div className="achievement-orbit" aria-hidden="true"><span>✳</span><span>✦</span></div>
            <div className="achievement-caption"><Award size={15} /> Points · Badges · Streaks · Lessons · Results · Rewards</div>
          </div>
        </section>

        <section className="teacher-section section-pad" id="teacher">
          <div className="wrap teacher-layout">
            <div className="teacher-art"><div className="teacher-art-paper"><span className="teacher-monogram">AM</span><span className="teacher-art-caption">A teacher who believes<br />in your next step.</span></div><div className="teacher-art-note"><Quote size={16} /><span>Confidence grows<br />with every word.</span></div><span className="teacher-art-star">✳</span><span className="teacher-art-line" /></div>
            <div className="teacher-copy"><span className="eyebrow"><span className="eyebrow-dash" /> A LITTLE ABOUT YOUR TEACHER</span><h2>Learn with<br /><em>Mr Abdelrahman<br />Mohamed.</em></h2><p>English is more than a subject. It is a way to meet new ideas, find your voice, and create opportunities for yourself. English Zone is built to make that journey clear, encouraging, and worth showing up for.</p><div className="teacher-signature">Mr Abdelrahman Mohamed <span>ENGLISH TEACHER</span></div><Link className="button button-outline" href="/join">Meet your teacher <ArrowUpRight size={16} /></Link></div>
          </div>
        </section>

        <section className="news-section section-pad" id="news">
          <div className="wrap">
            <div className="section-heading section-heading-row"><div><span className="eyebrow"><span className="eyebrow-dash" /> FRESH FROM THE ZONE</span><h2>What&apos;s <em>new</em></h2></div><p>A new lesson, a fresh challenge, a note from your teacher. There is always something happening here.</p></div>
            {announcements.length ? <div className="news-grid">{announcements.map((item, index) => <article className={`news-item news-item-${index}`} key={item.id}><span className="news-kind">{item.kind.replaceAll("_", " ")}</span><time>{new Date(item.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</time><h3>{item.title}</h3><p>{item.body}</p><Link href="/join" aria-label={`Read ${item.title}`}><ArrowUpRight size={17} /></Link></article>)}</div> : <div className="news-empty"><span className="news-empty-icon"><MessageCircle size={20} /></span><div><strong>A note from the Zone will be here soon.</strong><p>New courses, lessons, exams and special offers will appear here.</p></div><span className="news-empty-star">✳</span></div>}
          </div>
        </section>

        <section className="final-cta-section">
          <div className="wrap final-cta"><div className="cta-mark" aria-hidden="true">✳</div><div><span className="eyebrow"><span className="eyebrow-dash" /> YOUR NEXT CHAPTER STARTS HERE</span><h2>Your English journey<br /><em>starts here.</em></h2><p>Start with one lesson. Keep going with a little practice. See where your English can take you.</p></div><Link className="button" href="/join">Join English Zone <ArrowUpRight size={17} /></Link><span className="cta-handdrawn" aria-hidden="true">let&apos;s begin ↗</span></div>
        </section>
      </main>
      <SiteFooter showTeacherName />
    </>
  );
}