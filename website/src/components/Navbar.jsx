"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X, ArrowRight, GraduationCap, ChevronDown, BookOpen, Mic, PenTool } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
  { name: "Courses", path: "/courses", hasDropdown: true },
  { name: "About", path: "/about" },
  { name: "Resources", path: "/blog" },
  { name: "Contact", path: "/contact" },
];

const courseDropdown = [
  { name: "PTE Academic", desc: "Score-focused AI-supported coaching", icon: PenTool, href: "/courses" },
  { name: "IELTS Preparation", desc: "Premium academic & general training", icon: BookOpen, href: "/courses" },
  { name: "Spoken English", desc: "Confidence-building communication", icon: Mic, href: "/courses" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [coursesOpen, setCoursesOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      {/* Top Bar */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white">
        <div className="container-shell flex min-h-[42px] items-center justify-between gap-3 text-xs font-medium sm:text-sm">
          <p className="text-white/80">
            🎓 Admissions open for upcoming PTE and IELTS batches. <span className="hidden sm:inline">Book a consultation to reserve your seat.</span>
          </p>
          <Link href="/contact" className="hidden whitespace-nowrap font-semibold text-accent transition hover:text-white md:inline-flex items-center gap-1">
            Speak to an advisor <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* Main Nav */}
      <nav className={`transition-all duration-300 ${scrolled ? "border-b border-slate-200/80 bg-white/95 shadow-[0_12px_40px_-20px_rgba(15,23,42,0.25)] backdrop-blur-xl" : "bg-white/90 backdrop-blur-lg"}`}>
        <div className={`container-shell flex items-center justify-between transition-all duration-300 ${scrolled ? "py-2.5" : "py-3.5"}`}>
          {/* Logo */}
          <Link href="/" className="flex items-center transition-transform hover:scale-105">
            <img src="/logo.png" alt="Language Academy Logo" className="h-16 w-auto object-contain drop-shadow-sm" />
          </Link>

          {/* Desktop Links */}
          <div className="hidden items-center gap-7 lg:flex">
            {navLinks.map((link) => (
              <div key={link.name} className="relative group">
                {link.hasDropdown ? (
                  <button
                    className="flex items-center gap-1 text-sm font-semibold text-slate-700 transition hover:text-primary"
                    onMouseEnter={() => setCoursesOpen(true)}
                    onMouseLeave={() => setCoursesOpen(false)}
                  >
                    {link.name}
                    <ChevronDown size={14} className={`transition-transform duration-200 ${coursesOpen ? 'rotate-180' : ''}`} />
                  </button>
                ) : (
                  <Link href={link.path} className="text-sm font-semibold text-slate-700 transition hover:text-primary animated-underline">
                    {link.name}
                  </Link>
                )}

                {/* Mega Dropdown */}
                {link.hasDropdown && (
                  <div
                    onMouseEnter={() => setCoursesOpen(true)}
                    onMouseLeave={() => setCoursesOpen(false)}
                    className={`absolute left-1/2 top-full pt-3 -translate-x-1/2 transition-all duration-200 ${coursesOpen ? "visible opacity-100 translate-y-0" : "invisible opacity-0 translate-y-2"}`}
                  >
                    <div className="w-80 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.3)]">
                      {courseDropdown.map((item) => (
                        <Link
                          key={item.name}
                          href={item.href}
                          className="flex items-start gap-3 rounded-xl p-3 transition hover:bg-slate-50"
                        >
                          <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <item.icon size={18} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{item.name}</p>
                            <p className="text-xs text-slate-500">{item.desc}</p>
                          </div>
                        </Link>
                      ))}
                      <div className="mt-1 border-t border-slate-100 pt-2">
                        <Link href="/courses" className="flex items-center gap-2 rounded-xl p-3 text-sm font-semibold text-primary transition hover:bg-primary/5">
                          View All Courses <ArrowRight size={14} />
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden items-center gap-2.5 lg:flex">
            <Link href="/contact" className="primary-btn px-4 py-2">
              Book Consultation
            </Link>
            <Link href="/enroll" className="accent-btn px-4 py-2">
              Enroll Now <ArrowRight size={14} />
            </Link>
          </div>

          {/* Mobile Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition active:scale-95 lg:hidden"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden border-t border-slate-200 bg-white lg:hidden"
            >
              <div className="container-shell flex flex-col gap-1 py-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    href={link.path}
                    className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-primary"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.name}
                  </Link>
                ))}

                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Link href="/contact" className="primary-btn" onClick={() => setMobileMenuOpen(false)}>
                    Book Consultation
                  </Link>
                  <Link href="/enroll" className="accent-btn" onClick={() => setMobileMenuOpen(false)}>
                    Enroll Now
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  );
}
