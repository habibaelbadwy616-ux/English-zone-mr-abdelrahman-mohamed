import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export function SiteFooter({ showTeacherName = false }: { showTeacherName?: boolean }) {
  return (
    <footer className="site-footer" id="contact">
      <div className="wrap footer-main">
        <div className="footer-brand-block">
          <Link className="brand footer-brand" href="/">
            <span className="brand-mark" aria-hidden="true">EZ</span>
            <span className="brand-name">ENGLISH <b>ZONE</b>{showTeacherName && <span className="brand-teacher-name">MR ABDELRAHMAN MOHAMED</span>}<small>LEARN WITH PURPOSE</small></span>
          </Link>
          <p>Master English. Unlock Opportunities.<br />Learn. Practice. Achieve.</p>
        </div>
        <div className="footer-links">
          <span className="eyebrow">EXPLORE</span>
          <Link href="/">Home</Link>
          <Link href="/#courses">Courses</Link>
          <Link href="/#teacher">About</Link>
          <Link href="/#contact">Contact</Link>
        </div>
        <div className="footer-links">
          <span className="eyebrow">YOUR ENGLISH ZONE</span>
          <Link href="/join">Join English Zone <ArrowUpRight size={14} /></Link>
        </div>
        <div className="footer-note">
          <span className="footer-star" aria-hidden="true">✳</span>
          <p>A little practice today.<br />A bigger world tomorrow.</p>
        </div>
      </div>
      <div className="wrap footer-bottom"><span>© 2026 English Zone</span><span>Mr Abdelrahman Mohamed — English Learning Platform</span></div>
    </footer>
  );
}