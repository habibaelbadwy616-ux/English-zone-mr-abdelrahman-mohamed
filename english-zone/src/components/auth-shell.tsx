import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, Check, Sparkles } from "lucide-react";

export function AuthShell({
  children,
  mode,
  title,
  description,
}: {
  children: React.ReactNode;
  mode: "student" | "teacher" | "join";
  title: string;
  description: string;
}) {
  return (
    <main className="auth-page">
      <div className="auth-topbar">
        <Link className="brand" href="/" aria-label="English Zone home"><span className="brand-mark">EZ</span><span className="brand-name">ENGLISH <b>ZONE</b><small>LEARN WITH PURPOSE</small></span></Link>
        <Link className="auth-back-link" href="/"><ArrowLeft size={15} /> Back to home</Link>
      </div>
      <div className={`auth-layout auth-layout-${mode}`}>
        <aside className="auth-aside">
          <div className="auth-aside-orbit" aria-hidden="true" />
          <div className="auth-aside-content">
            <span className="eyebrow"><span className="eyebrow-dash" /> {mode === "teacher" ? "YOUR TEACHER SPACE" : mode === "join" ? "A PLACE TO BEGIN" : "YOUR NEXT CHAPTER"}</span>
            <h1>{mode === "teacher" ? <>A little space<br />to make a <em>big impact.</em></> : mode === "join" ? <>Good things<br />start with <em>one step.</em></> : <>Your English.<br />Your <em>next chapter.</em></>}</h1>
            <p>{mode === "teacher" ? "Sign in to manage your classroom, share new lessons, and celebrate your students' progress." : mode === "join" ? "A thoughtful way to learn English, find your confidence, and make progress that stays with you." : "Build your skills with clear lessons, useful practice, and a learning path made to move you forward."}</p>
            <div className="auth-aside-note"><span className="auth-note-icon"><BookOpen size={19} /></span><div><strong>Master English. Unlock Opportunities.</strong><small>Learn. Practice. Achieve.</small></div><Sparkles size={16} className="auth-note-sparkle" /></div>
          </div>
          <div className="auth-aside-art" aria-hidden="true">
            <div className="auth-art-page"><span className="auth-art-title">a word<br />at a time</span><span className="auth-art-line" /><span className="auth-art-line short" /><span className="auth-art-word">possibility</span></div>
            <div className="auth-art-card"><span>WORD TO KEEP</span><strong>grow</strong><small>/ɡrəʊ/</small></div>
            <span className="auth-art-star">✳</span>
          </div>
          <span className="auth-aside-footer">ENGLISH ZONE · EST. FOR YOUR FUTURE</span>
        </aside>
        <section className="auth-main">
          <div className="auth-form-wrap">
            {mode !== "join" && (
              <div className="auth-field-shapes" aria-hidden="true">
                <span className="auth-field-shape auth-field-ring" />
                <span className="auth-field-shape auth-field-diamond" />
                <span className="auth-field-shape auth-field-bar" />
                <span className="auth-field-shape auth-field-square" />
              </div>
            )}
            <div className="auth-heading"><span className="eyebrow"><span className="eyebrow-dash" /> {mode === "teacher" ? "WELCOME, MR ABDELRAHMAN MOHAMED" : mode === "join" ? "CHOOSE YOUR NEXT STEP" : "WELCOME TO YOUR ZONE"}</span><h2>{title}</h2><p>{description}</p></div>
            {children}
            <div className="auth-security-note"><span><Check size={13} /></span> Your account and personal details stay protected.</div>
            <Link className="auth-home-link" href="/"><ArrowLeft size={14} /> Return to English Zone</Link>
          </div>
        </section>
      </div>
    </main>
  );
}

export function AuthRouteArrow() {
  return <ArrowRight size={16} />;
}