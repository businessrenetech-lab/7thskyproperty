"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight, BookOpen, Check, ChevronDown, Globe,
  GraduationCap, Headphones, MessageSquare, PhoneCall, Target, Users
} from "lucide-react";
import AnimateOnScroll from "@/components/AnimateOnScroll";
import { useState } from "react";

export default function HomepageBelowFold({ onBook }) {
  const [openFormatFaq, setOpenFormatFaq] = useState(0);

  return (
    <>
      {/* ═══════ 3. BEST PTE CLASSES ═══════ */}
      <section className="py-20 bg-slate-50">
        <div className="container-shell">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <AnimateOnScroll variant="slide-left">
              <div className="rounded-[2rem] overflow-hidden shadow-2xl shadow-slate-200/50">
                <div className="relative h-[400px] w-full">
                  <Image src="/hero_banner.png" alt="Best PTE centre in Dhaka - Language Academy Bangladesh" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
                </div>
              </div>
            </AnimateOnScroll>
            <AnimateOnScroll variant="slide-right">
              <div>
                <h2 className="text-3xl font-extrabold text-primary md:text-4xl leading-tight mb-6">
                  World-Class PTE Preparation <br className="hidden md:block"/>
                  in Dhaka
                </h2>
                <div className="space-y-6 text-slate-600 leading-relaxed">
                  <p>
                    Language Academy Bangladesh helps students prepare for PTE with expert trainers, unlimited mock tests, small-batch classes, and practical feedback. Every class is designed to help you understand the exam, improve your English, and build confidence before test day.
                  </p>
                  <p>
                    Alongside our main PTE programs, we also offer <strong>IELTS preparation</strong>, <strong>English language courses</strong>, and <strong>study abroad consulting</strong> for students and professionals who want to study abroad, migrate, improve communication, or grow their careers.
                  </p>
                </div>
              </div>
            </AnimateOnScroll>
          </div>
          <AnimateOnScroll variant="fade-up" className="mt-14 flex items-center justify-center gap-4 flex-wrap">
            <button onClick={() => onBook("PTE")} className="bg-primary text-white hover:bg-primary/90 px-6 py-4 rounded-xl font-bold shadow-xl shadow-primary/20 transition-all text-sm sm:text-base">
              Want to Study PTE? Book Now for PTE Classes
            </button>
            <button onClick={() => onBook("")} className="bg-amber-500 text-slate-900 hover:bg-amber-400 px-6 py-4 rounded-xl font-bold shadow-xl shadow-amber-500/20 transition-all flex items-center gap-2 text-sm sm:text-base">
              <PhoneCall size={18} /> Free Counselling
            </button>
          </AnimateOnScroll>
        </div>
      </section>

      {/* ═══════ HOW IT WORKS ═══════ */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="absolute top-0 left-0 -mt-20 -ml-20 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-0 right-0 -mb-20 -mr-20 h-64 w-64 rounded-full bg-accent/5 blur-3xl" />
        <div className="container-shell relative z-10">
          <div className="mb-16 text-center max-w-2xl mx-auto">
            <span className="text-sm font-bold uppercase tracking-widest text-primary mb-3 block">Your Path to Success</span>
            <h2 className="text-3xl font-extrabold text-slate-900 md:text-4xl">How It Works</h2>
            <p className="mt-4 text-slate-500">From your first enquiry to achieving your target score — here is the clear, structured path every Language Academy student follows.</p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {[
              { step: "01", icon: MessageSquare, title: "Book a Free Consultation", desc: "Our academic advisors assess your current level, timeline, and target score to recommend the right course and batch." },
              { step: "02", icon: BookOpen, title: "Join the Right Batch", desc: "Start your PTE, IELTS, or Spoken English course in a small batch of max 12 students — online or in-person at Dhanmondi." },
              { step: "03", icon: Headphones, title: "Practice with AI Mock Tests", desc: "Access unlimited AI-scored full-length mock tests with detailed analytics and expert-led review sessions." },
              { step: "04", icon: GraduationCap, title: "Achieve Your Target Score", desc: "Walk into your PTE or IELTS exam fully prepared. Our students consistently achieve their required scores." },
            ].map((item, i) => (
              <AnimateOnScroll key={i} variant="fade-up">
                <div className="group relative rounded-[28px] border border-slate-100 bg-white p-8 shadow-[0_12px_40px_-20px_rgba(15,23,42,0.08)] transition-all duration-300 hover:shadow-[0_20px_50px_-20px_rgba(15,23,42,0.15)] hover:-translate-y-1">
                  <div className="mb-6 flex items-center justify-between">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                      <item.icon size={26} />
                    </div>
                    <span className="text-4xl font-black text-slate-100 transition-colors group-hover:text-primary/10">{item.step}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-3">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-500">{item.desc}</p>
                </div>
              </AnimateOnScroll>
            ))}
          </div>

          <AnimateOnScroll variant="fade-up" className="mt-14 flex justify-center">
            <button onClick={() => onBook()} className="primary-btn px-8 py-4 shadow-xl shadow-primary/20 bg-primary">
              Start Your Journey — Book Free Consultation
            </button>
          </AnimateOnScroll>
        </div>
      </section>

      {/* ═══════ PTE FORMAT & SCORE SCALE ═══════ */}
      <section className="py-24 bg-accent text-white page-shell overflow-hidden">
        <div className="container-shell relative z-10">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center mb-32">
            <AnimateOnScroll variant="slide-left">
              <div>
                <h2 className="text-3xl font-black uppercase tracking-wide mb-8">PTE Format</h2>
                <div className="space-y-4">
                  {["Speaking and Writing", "Reading", "Listening"].map((title, i) => (
                    <div
                      key={i}
                      className={`cursor-pointer rounded-xl border transition-all ${openFormatFaq === i ? 'border-amber-400/50 bg-white/10' : 'border-white/20 bg-white/5 hover:bg-white/10'}`}
                      onClick={() => setOpenFormatFaq(openFormatFaq === i ? null : i)}
                    >
                      <div className="flex items-center justify-between p-5 font-bold text-lg">
                        {title}
                        <span className="text-xl font-light">{openFormatFaq === i ? '−' : '+'}</span>
                      </div>
                      {openFormatFaq === i && (
                        <div className="px-5 pb-5 pt-0 text-white/80 leading-relaxed text-sm">
                          {title === "Speaking and Writing" ? "This section assesses your ability to produce spoken and written English in an academic environment." :
                           title === "Reading" ? "Evaluates your ability to understand, analyze, and interpret written academic texts." :
                           "Tests your ability to understand spoken English in various accents and speeds."}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </AnimateOnScroll>

            <AnimateOnScroll variant="slide-right">
              <div className="rounded-[2rem] overflow-hidden shadow-2xl relative group">
                <div className="relative h-[400px] w-full">
                  <Image src="/pte_course.png" alt="PTE exam format and structure - Language Academy Dhaka" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                </div>
                <div className="absolute inset-0 bg-accent/20 mix-blend-overlay"></div>
              </div>
            </AnimateOnScroll>
          </div>

          <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr]">
            <AnimateOnScroll variant="slide-left">
              <h3 className="text-2xl font-bold mb-8 text-balance">What skills are tested in the PTE Listening section?</h3>
              <ul className="space-y-4 text-white/70">
                {[
                  "Identifying key information from spoken audio clips",
                  "Understanding different English accents (Australian, British, American)",
                  "Accurate note-taking and recall under time pressure",
                  "Identifying errors and inconsistencies in spoken content",
                  "Writing from dictation with correct spelling and grammar",
                  "Selecting the most appropriate summary for a spoken passage"
                ].map((item, i) => (
                  <li key={i} className="flex gap-4 items-start">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400"></span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </AnimateOnScroll>

            <AnimateOnScroll variant="slide-right">
              <h3 className="text-2xl font-bold mb-8">PTE Score Scale</h3>
              <div className="overflow-x-auto rounded-xl border border-white/20 bg-white/5 backdrop-blur-md">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/20 bg-white/10 text-white">
                      <th className="p-4 font-semibold text-center w-1/3">PTE Score</th>
                      <th className="p-4 font-semibold text-center border-l border-white/10 w-1/3">CEFR Level</th>
                      <th className="p-4 font-semibold text-center border-l border-white/10 w-1/3">IELTS Equivalent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {[
                      { pte: "85-90", cefr: "C2", ielts: "9.0" },
                      { pte: "76-84", cefr: "C1", ielts: "8.0-8.5" },
                      { pte: "68-75", cefr: "B2", ielts: "7.0-7.5" },
                      { pte: "59-67", cefr: "B2", ielts: "6.0-6.5" },
                      { pte: "50-58", cefr: "B1", ielts: "5.0-5.5" },
                      { pte: "43-49", cefr: "B1", ielts: "Modest" },
                      { pte: "30-42", cefr: "A2", ielts: "Limited" },
                      { pte: "10-29", cefr: "A1", ielts: "Very Limited" }
                    ].map((row, i) => (
                      <tr key={i} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 text-center font-medium">{row.pte}</td>
                        <td className="p-4 text-center border-l border-white/10 text-white/80">{row.cefr}</td>
                        <td className="p-4 text-center border-l border-white/10 text-white/80">{row.ielts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </AnimateOnScroll>
          </div>
        </div>
      </section>

      {/* ═══════ PTE vs IELTS COMPARISON ═══════ */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="container-shell">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] items-center">
            <AnimateOnScroll variant="slide-left">
              <div>
                <span className="text-sm font-bold uppercase tracking-widest text-primary mb-3 block">Choose the Right Exam</span>
                <h2 className="text-3xl font-extrabold text-slate-900 md:text-4xl mb-4 leading-tight">
                  PTE Academic vs IELTS{'\u00A0'}<br className="hidden md:block"/>Which Exam Should You Take?
                </h2>
                <p className="text-slate-500 mb-8 leading-relaxed">
                  Both PTE Academic and IELTS are globally accepted English proficiency tests for study abroad and migration from Bangladesh. The right choice depends on your strengths, timeline, and destination country. Language Academy prepares you for both.
                </p>
                <div className="rounded-[2rem] overflow-hidden shadow-2xl shadow-slate-200/50">
                  <div className="relative h-[280px] w-full">
                    <Image src="/pte_vs_ielts.png" alt="PTE vs IELTS comparison - which English exam to choose in Bangladesh" fill sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover" />
                  </div>
                </div>
              </div>
            </AnimateOnScroll>

            <AnimateOnScroll variant="slide-right">
              <div className="overflow-x-auto rounded-[28px] border border-slate-200/80 bg-white shadow-[0_18px_50px_-28px_rgba(15,23,42,0.18)]">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="p-5 font-bold text-slate-900 w-1/3">Feature</th>
                      <th className="p-5 font-bold text-primary text-center border-l border-slate-100 w-1/3">PTE Academic</th>
                      <th className="p-5 font-bold text-accent text-center border-l border-slate-100 w-1/3">IELTS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[
                      { feature: "Test Format", pte: "100% Computer-based", ielts: "Paper or Computer" },
                      { feature: "Speaking Test", pte: "AI-scored, no examiner", ielts: "Face-to-face with examiner" },
                      { feature: "Results Timeline", pte: "1\u20132 business days", ielts: "3\u201313 days" },
                      { feature: "Score Validity", pte: "2 years", ielts: "2 years" },
                      { feature: "Accepted For", pte: "Australia, NZ, Canada, UK", ielts: "Worldwide" },
                      { feature: "Test Duration", pte: "~2 hours", ielts: "~2 hrs 45 min" },
                      { feature: "Score Range", pte: "10\u201390 points", ielts: "Band 1\u20139" },
                    ].map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-4 font-medium text-slate-700">{row.feature}</td>
                        <td className="p-4 text-center text-slate-600 border-l border-slate-100">{row.pte}</td>
                        <td className="p-4 text-center text-slate-600 border-l border-slate-100">{row.ielts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                <button onClick={() => onBook("PTE")} className="primary-btn px-6 py-3">Prepare for PTE</button>
                <button onClick={() => onBook("IELTS")} className="primary-btn px-6 py-3 bg-accent hover:bg-accent/90">Prepare for IELTS</button>
              </div>
            </AnimateOnScroll>
          </div>
        </div>
      </section>

      {/* ═══════ WHY ACADEMY ═══════ */}
      <section className="py-24 bg-slate-50 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 h-96 w-96 rounded-full bg-blue-100/50 blur-3xl mix-blend-multiply opacity-60"></div>
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 h-64 w-64 rounded-full bg-amber-100/50 blur-3xl mix-blend-multiply opacity-60"></div>
        <div className="container-shell relative z-10">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <AnimateOnScroll variant="slide-left">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-blue-100/60 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-primary shadow-sm mb-6">WHY CHOOSE US</span>
                <h2 className="text-4xl font-extrabold text-slate-900 md:text-5xl tracking-tight mb-6">
                  Why Language Academy<br/>is Dhaka&apos;s #1 choice
                </h2>
                <p className="text-lg leading-relaxed text-slate-600 mb-8 max-w-lg">
                  We specialize in PTE Academic coaching with proven results — plus IELTS, Spoken English, and study abroad support. Online and offline classes available.
                </p>
                <ul className="space-y-4">
                  {[
                    "Expert PTE & IELTS trainers with proven track records",
                    "AI-powered mock tests with instant score analysis",
                    "Small batches (max 12 students) for personalized coaching",
                    "Both online and offline classes from Dhanmondi, Dhaka",
                    "PTE, IELTS, Spoken English & study abroad consulting"
                  ].map((item, i) => (
                    <li key={i} className="flex gap-4 items-center">
                      <div className="flex h-2 w-2 shrink-0 items-center justify-center rounded-full bg-primary shadow-sm mt-0.5" />
                      <span className="text-slate-700 font-medium">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </AnimateOnScroll>
            <AnimateOnScroll variant="scale">
              <div className="rounded-[2.5rem] bg-primary text-white shadow-2xl shadow-primary/20 p-8 sm:p-12 relative overflow-hidden flex flex-col md:flex-row items-center gap-8 justify-between">
                <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                <div className="relative z-10 text-center md:text-left flex-1">
                  <h3 className="text-2xl sm:text-3xl font-bold mb-3 tracking-tight">Ready to ace your PTE or IELTS?</h3>
                  <p className="text-white/80 text-sm sm:text-base">Join Bangladesh&apos;s top-rated coaching centre — online or offline in Dhaka.</p>
                </div>
                <div className="relative z-10 shrink-0">
                  <button onClick={() => onBook()} className="bg-white text-primary hover:bg-slate-50 hover:scale-105 px-8 py-5 sm:px-12 sm:py-6 rounded-full font-bold shadow-lg shadow-black/10 transition-all">
                    Enroll<br/>Today
                  </button>
                </div>
              </div>
            </AnimateOnScroll>
          </div>
        </div>
      </section>

      {/* ═══════ STUDY ABROAD DESTINATIONS ═══════ */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="container-shell">
          <div className="mb-16 text-center max-w-2xl mx-auto">
            <span className="text-sm font-bold uppercase tracking-widest text-primary mb-3 block">Study Abroad from Bangladesh</span>
            <h2 className="text-3xl font-extrabold text-slate-900 md:text-4xl">Where Will Your English Take You?</h2>
            <p className="mt-4 text-slate-500">With a strong PTE or IELTS score, you can study, work, or migrate to the world&apos;s top English-speaking countries. Language Academy prepares you for every destination.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { country: "Australia", flag: "\uD83C\uDDE6\uD83C\uDDFA", pte: "50\u201379+", ielts: "6.0\u20137.5", desc: "Most popular destination for Bangladeshi students. PTE widely accepted for student visas and PR.", color: "from-blue-600 to-sky-500" },
              { country: "Canada", flag: "\uD83C\uDDE8\uD83C\uDDE6", pte: "58\u201365+", ielts: "6.0\u20137.0", desc: "Growing PTE acceptance for study permits and Express Entry immigration pathways.", color: "from-red-600 to-rose-500" },
              { country: "United Kingdom", flag: "\uD83C\uDDEC\uD83C\uDDE7", pte: "59\u201376+", ielts: "6.5\u20137.5", desc: "PTE accepted by 99% of UK universities and for UKVI immigration applications.", color: "from-indigo-600 to-blue-500" },
              { country: "New Zealand", flag: "\uD83C\uDDF3\uD83C\uDDFF", pte: "50\u201365+", ielts: "5.5\u20136.5", desc: "PTE accepted for all visa categories including Skilled Migrant and student visas.", color: "from-emerald-600 to-green-500" },
              { country: "USA", flag: "\uD83C\uDDFA\uD83C\uDDF8", pte: "53\u201368+", ielts: "6.0\u20137.0", desc: "PTE increasingly accepted at major American universities alongside IELTS and TOEFL.", color: "from-blue-700 to-indigo-500" },
              { country: "Europe", flag: "\uD83C\uDDEA\uD83C\uDDFA", pte: "50\u201365+", ielts: "5.5\u20137.0", desc: "Germany, Ireland, and more accept PTE and IELTS for English-taught programs.", color: "from-amber-600 to-yellow-500" },
            ].map((dest, i) => (
              <AnimateOnScroll key={i} variant="fade-up">
                <div className="group rounded-[28px] border border-slate-100 bg-white overflow-hidden shadow-[0_12px_40px_-20px_rgba(15,23,42,0.08)] transition-all duration-300 hover:shadow-[0_20px_50px_-20px_rgba(15,23,42,0.15)] hover:-translate-y-1">
                  <div className={`bg-gradient-to-br ${dest.color} p-6 text-white`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-3xl">{dest.flag}</span>
                      <Globe size={20} className="text-white/40" />
                    </div>
                    <h3 className="text-xl font-bold">{dest.country}</h3>
                  </div>
                  <div className="p-6">
                    <p className="text-sm text-slate-500 leading-relaxed mb-4">{dest.desc}</p>
                    <div className="flex gap-3">
                      <span className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">PTE {dest.pte}</span>
                      <span className="rounded-full bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent">IELTS {dest.ielts}</span>
                    </div>
                  </div>
                </div>
              </AnimateOnScroll>
            ))}
          </div>
          <AnimateOnScroll variant="fade-up" className="mt-14 text-center">
            <button onClick={() => onBook()} className="primary-btn px-8 py-4 shadow-xl shadow-primary/20 bg-primary">
              Get Free Study Abroad Counselling
            </button>
          </AnimateOnScroll>
        </div>
      </section>

      {/* ═══════ UNLIMITED PRACTICE PROMO ═══════ */}
      <section className="py-24 bg-primary text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 fine-grid mix-blend-overlay"></div>
        <div className="absolute top-0 right-0 h-full w-1/2 bg-gradient-to-l from-black/20 to-transparent"></div>
        <div className="container-shell relative z-10 text-center">
          <AnimateOnScroll variant="scale">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-white/10 shadow-[0_0_40px_rgba(255,255,255,0.2)] mb-8 border border-white/20 backdrop-blur-sm">
               <Target size={40} className="text-white" />
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight mb-6">
              Enroll in PTE or IELTS & Get <br className="hidden md:block"/>
              <span className="text-amber-300">Unlimited Practice</span>
            </h2>
            <p className="mx-auto max-w-2xl text-lg md:text-xl text-white/90 leading-relaxed mb-10">
              Whether you&apos;re preparing for PTE Academic, IELTS, or improving your Spoken English — get unlimited access to AI-scored mock tests, expert-led sessions, and comprehensive study materials until you hit your target score.
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
               <button onClick={() => onBook()} className="bg-white text-primary hover:bg-slate-50 hover:scale-105 px-8 py-4 sm:px-10 sm:py-5 font-extrabold shadow-xl shadow-black/10 transition-all rounded-full text-base sm:text-lg w-full sm:w-auto">
                 Unlock Unlimited Access
               </button>
               <Link href="/courses" className="bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 px-8 py-4 sm:px-10 sm:py-5 font-bold transition-all rounded-full text-base sm:text-lg w-full sm:w-auto inline-block">
                 Explore Course Features
               </Link>
            </div>
          </AnimateOnScroll>
        </div>
      </section>
    </>
  );
}
