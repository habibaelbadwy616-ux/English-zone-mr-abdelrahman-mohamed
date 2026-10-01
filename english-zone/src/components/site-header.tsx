"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Menu, X } from "lucide-react";

const navigation = [
  { label: "Home", href: "/" },
  { label: "Courses", href: "/#courses" },
  { label: "About", href: "/#teacher" },
  { label: "Contact", href: "/#contact" },
];

export function SiteHeader({ showTeacherName = false }: { showTeacherName?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="header-inner wrap">
        <Link className="brand" href="/" aria-label="English Zone home" onClick={() => setMenuOpen(false)}>
          <span className="brand-mark" aria-hidden="true">EZ</span>
          <span className="brand-name">ENGLISH <b>ZONE</b>{showTeacherName && <span className="brand-teacher-name">MR ABDELRAHMAN MOHAMED</span>}<small>LEARN WITH PURPOSE</small></span>
        </Link>

        <button
          className="icon-button menu-toggle"
          type="button"
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>

        <nav className={`header-navigation ${menuOpen ? "is-open" : ""}`} aria-label="Main navigation">
          <div className="nav-links">
            {navigation.map((item) => (
              <Link href={item.href} key={item.label} onClick={() => setMenuOpen(false)}>{item.label}</Link>
            ))}
          </div>
          <div className="nav-actions">
            <Link className="button button-small" href="/join" onClick={() => setMenuOpen(false)}>
              Join English Zone <ArrowUpRight size={15} />
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}