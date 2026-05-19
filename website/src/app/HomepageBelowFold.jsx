"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight, BookOpen, Check, ChevronDown, Globe,
  GraduationCap, Headphones, MessageSquare, PhoneCall, Target, Users, PlayCircle, Star
} from "lucide-react";
import AnimateOnScroll from "@/components/AnimateOnScroll";
import { useState } from "react";

export default function HomepageBelowFold({ onBook }) {
  const [openFormatFaq, setOpenFormatFaq] = useState(0);

  return (
    <div className="relative bg-slate-50">
      {/* ═══════ 3. BEST PTE CLASSES (PARALLAX + GLASSMORPHISM) ═══════ */}
      <section className="relative py-32 overflow-hidden">
        {/* Parallax Background */}
        <div
          className="absolute inset-0 bg-[url('/hero_banner.webp')] bg-cover bg-center bg-fixed opacity-10"
          style={{ filter: "grayscale(100%)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-slate-50/90 to-slate-50" />

        <div className="container-shell relative z-10">
          <div className="grid gap-16 lg:grid-cols-2 items-center">
            <AnimateOnScroll variant="slide-left">
              <div className="relative group">
                <div className="absolute -inset-4 rounded-[2.5rem] bg-gradient-to-br from-primary/30 to-accent/30 blur-2xl opacity-50 group-hover:opacity-70 transition-opacity duration-700" />
                <div className="relative rounded-[2rem] overflow-hidden shadow-2xl border border-white/50 bg-white/50 backdrop-blur-sm">
                  <div className="relative h-[500px] w-full transform transition-transform duration-700 group-hover:scale-105">
                    <Image src="/hero_banner.webp" alt="Best PTE coaching centre in Dhaka - Language Academy Bangladesh" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
                  </div>
                  {/* Floating badge */}
                  <div className="absolute bottom-6 left-6 right-6 rounded-2xl bg-white/90 backdrop-blur-md p-5 shadow-xl flex items-center gap-4 transform translate-y-2 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 shrink-0">
                      <Star fill="currentColor" size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">Rated #1 in Dhaka</p>
                      <p className="text-xs font-medium text-slate-500">For PTE Academic Preparation</p>
                    </div>
                  </div>
                </div>
              </div>
            </AnimateOnScroll>

            <AnimateOnScroll variant="slide-right">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-black uppercase tracking-[0.2em] text-primary mb-6 shadow-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                  PTE Coaching Excellence
                </div>

                <h2 className="text-[2.5rem] lg:text-[3.5rem] font-black text-slate-900 leading-[1.1] tracking-tight mb-8">
                  World-Class PTE<br className="hidden lg:block" />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Preparation in Dhaka</span>
                </h2>

                <div className="space-y-6 text-slate-600 text-lg leading-relaxed mb-10">
                  <p className="font-medium text-slate-700">
                    Language Academy Bangladesh helps students prepare for PTE with expert trainers, unlimited online PTE practice tests, small-batch classes, and practical feedback.
                  </p>
                  <p>
                    Every class is meticulously designed to help you decode the exam algorithm, improve your English proficiency, and build absolute confidence before test day. Alongside our main PTE programs, we also offer <strong className="text-slate-900">IELTS preparation courses</strong>, <strong className="text-slate-900">English language courses</strong>, and comprehensive <strong className="text-slate-900">study abroad consulting</strong>.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <button onClick={() => onBook("PTE")} className="group relative overflow-hidden rounded-full bg-slate-900 px-8 py-4 text-white font-bold shadow-2xl transition-all hover:shadow-slate-900/20 hover:-translate-y-1">
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      Book Free Consultation <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                    </span>
                    <div className="absolute inset-0 h-full w-full bg-gradient-to-r from-primary to-accent opacity-0 transition-opacity group-hover:opacity-100" />
                  </button>
                  <button onClick={() => onBook("")} className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-slate-200 bg-white px-8 py-4 font-bold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50">
                    <PhoneCall size={18} /> Call +880 1913-373581
                  </button>
                </div>
              </div>
            </AnimateOnScroll>
          </div>
        </div>
      </section>

      {/* ═══════ HOW IT WORKS (STICKY SCROLL PARALLAX) ═══════ */}
      <section className="relative py-32 bg-slate-900 text-white selection:bg-primary/30">
        <div className="container-shell">
          <div className="mb-20 text-center max-w-3xl mx-auto">
            <span className="text-primary font-bold uppercase tracking-widest text-sm mb-4 block">The Success Formula</span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white mb-6">
              Your Path to Success
            </h2>
          </div>

          <AnimateOnScroll variant="fade-up">
            <div className="grid lg:grid-cols-4 gap-6">
              {[
                { step: "01", icon: MessageSquare, title: "Expert Consultation", desc: "Our academic advisors assess your current English level, timeline, and target score to recommend the perfect course." },
                { step: "02", icon: Users, title: "Join Small Batches", desc: "Start your PTE or IELTS course in a small batch of max 12 students, ensuring personalized attention and accountability." },
                { step: "03", icon: Target, title: "AI Mock Tests", desc: "Practice PTE online with unlimited AI-scored full-length mock tests, detailed analytics, and trainer-led reviews." },
                { step: "04", icon: GraduationCap, title: "Achieve Target Score", desc: "Walk into your exam fully prepared. Our students consistently achieve their required scores for migration and study." },
              ].map((item, i) => (
                <div key={i} className="group relative h-full rounded-[2rem] bg-white/[0.03] border border-white/[0.05] p-8 transition-all hover:bg-white/[0.08] hover:-translate-y-2 overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 text-7xl font-black text-white/[0.03] transition-colors group-hover:text-primary/10">
                    {item.step}
                  </div>
                  <div className="relative z-10">
                    <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/20 text-primary transition-transform group-hover:scale-110">
                      <item.icon size={28} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-4">{item.title}</h3>
                    <p className="text-slate-400 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </AnimateOnScroll>
        </div>
      </section>

      {/* ═══════ WHY ACADEMY (USER REQUESTED DESIGN) ═══════ */}
      <section className="py-24 bg-slate-50 relative">
        <div className="container-shell">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Column: Content and Bullets */}
            <AnimateOnScroll variant="slide-left">
              <div className="space-y-6">
                <span className="inline-flex items-center rounded-full bg-[#E5F3FF] px-4 py-1.5 text-xs font-black uppercase tracking-wider text-[#4CAF50]">
                  Why Choose Us
                </span>

                <h2 className="text-[2.5rem] md:text-[3.5rem] font-black text-[#0B1A28] leading-[1.1] tracking-tight">
                  Why Language Academy<br />
                  is Dhaka&apos;s #1 choice
                </h2>

                <p className="text-lg text-slate-600 leading-relaxed max-w-lg">
                  We specialize in PTE Academic coaching with proven results — plus IELTS, Spoken English, and study abroad support. Online and offline classes available.
                </p>

                <ul className="space-y-4 pt-4">
                  {[
                    "Expert PTE & IELTS trainers with proven track records",
                    "AI-powered mock tests with instant score analysis",
                    "Small batches (max 12 students) for personalized coaching",
                    "Both online and offline classes from Dhanmondi, Dhaka",
                    "PTE, IELTS, Spoken English & study abroad consulting"
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="mt-2 h-2 w-2 rounded-full bg-[#8BC34A] shrink-0" />
                      <span className="text-[15px] font-medium text-slate-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </AnimateOnScroll>

            {/* Right Column: Green CTA Card */}
            <AnimateOnScroll variant="slide-right">
              <div className="rounded-[3rem] bg-[#8BC34A] p-10 md:p-14 shadow-xl">
                <h3 className="text-3xl md:text-4xl font-black text-white mb-4">
                  Ready to ace your PTE<br />
                  or IELTS?
                </h3>
                <p className="text-white/90 text-lg leading-relaxed mb-10 max-w-sm">
                  Join Bangladesh&apos;s top-rated coaching centre — online or offline in Dhaka.
                </p>
                <div className="flex justify-end md:justify-start">
                  <button onClick={() => onBook()} className="rounded-[2rem] bg-white px-8 py-4 font-bold text-[#8BC34A] shadow-md transition-transform hover:scale-105 w-auto">
                    Enroll<br />Today
                  </button>
                </div>
              </div>
            </AnimateOnScroll>
          </div>
        </div>
      </section>

      {/* ═══════ PTE FORMAT & SCORE SCALE (DARK MODE PREMIUM) ═══════ */}
      <section className="py-32 bg-slate-900 text-white relative overflow-hidden">
        {/* Abstract Background */}
        <div className="absolute top-0 right-0 -mt-32 -mr-32 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] opacity-50 mix-blend-screen" />
        <div className="absolute bottom-0 left-0 -mb-32 -ml-32 w-[600px] h-[600px] bg-accent/20 rounded-full blur-[120px] opacity-50 mix-blend-screen" />

        <div className="container-shell relative z-10">
          <div className="mb-20 text-center max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6">Understand the PTE Exam</h2>
            <p className="text-lg text-slate-400">Master the format and scoring system to achieve your target 79+.</p>
          </div>

          <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
            {/* Format FAQ */}
            <AnimateOnScroll variant="slide-left">
              <div className="space-y-4">
                {["Speaking and Writing", "Reading", "Listening"].map((title, i) => (
                  <div
                    key={i}
                    className={`cursor-pointer overflow-hidden rounded-[1.5rem] border transition-all duration-300 ${openFormatFaq === i ? 'border-primary/50 bg-white/10 shadow-lg shadow-primary/10' : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05]'}`}
                    onClick={() => setOpenFormatFaq(openFormatFaq === i ? null : i)}
                  >
                    <div className="flex items-center justify-between p-6 font-bold text-lg md:text-xl">
                      {title}
                      <span className={`transition-transform duration-300 ${openFormatFaq === i ? 'rotate-180 text-primary' : 'text-slate-400'}`}>
                        <ChevronDown size={24} />
                      </span>
                    </div>
                    <div
                      className={`px-6 text-slate-400 leading-relaxed transition-all duration-300 ease-in-out overflow-hidden ${openFormatFaq === i ? 'pb-6 max-h-[200px] opacity-100' : 'max-h-0 opacity-0'}`}
                    >
                      {title === "Speaking and Writing" ? "Assesses your ability to produce spoken and written English in an academic environment through read alouds, repeat sentences, and essay writing." :
                        title === "Reading" ? "Evaluates your ability to understand, analyze, and interpret written academic texts through fill in the blanks, reorder paragraphs, and multiple choice." :
                          "Tests your ability to understand spoken English in various accents and speeds through summarize spoken text, fill in the blanks, and write from dictation."}
                    </div>
                  </div>
                ))}
              </div>
            </AnimateOnScroll>

            {/* Score Table */}
            <AnimateOnScroll variant="slide-right">
              <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] backdrop-blur-xl p-8">
                <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                  <Target className="text-primary" /> PTE Score Scale vs IELTS
                </h3>
                <div className="overflow-hidden rounded-xl border border-white/10">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-white/5">
                        <th className="p-4 font-bold text-white w-1/3">PTE Score</th>
                        <th className="p-4 font-bold text-slate-300 w-1/3">IELTS Band</th>
                        <th className="p-4 font-bold text-slate-300 w-1/3">Skill Level</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {[
                        { pte: "85-90", ielts: "9.0", cefr: "Expert" },
                        { pte: "76-84", ielts: "8.0-8.5", cefr: "Very Good" },
                        { pte: "68-75", ielts: "7.0-7.5", cefr: "Good" },
                        { pte: "59-67", ielts: "6.0-6.5", cefr: "Competent" },
                        { pte: "50-58", ielts: "5.0-5.5", cefr: "Modest" },
                      ].map((row, i) => (
                        <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-4 font-bold text-primary">{row.pte}</td>
                          <td className="p-4 text-slate-300">{row.ielts}</td>
                          <td className="p-4 text-slate-400">{row.cefr}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </AnimateOnScroll>
          </div>
        </div>
      </section>

      {/* ═══════ STUDY ABROAD DESTINATIONS (USER REQUESTED DESIGN) ═══════ */}
      <section className="py-24 bg-[#F5F5FA] relative">
        <div className="container-shell">
          <div className="mb-12 text-center max-w-3xl mx-auto space-y-4">
            <h2 className="text-3xl md:text-4xl font-medium text-[#1e1147] tracking-tight">
              Countries Who Accepts PTE
            </h2>
            <h3 className="text-2xl md:text-3xl font-medium text-[#1e1147]">
              Where do you want to go with PTE?
            </h3>
            <p className="text-[15px] text-[#1e1147]/80">
              Select your destination country, and we&apos;ll help find the right test for you
            </p>
          </div>

          <AnimateOnScroll variant="fade-up">
            <div className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto">
              {[
                { country: "Australia", flag: "🇦🇺" },
                { country: "Canada", flag: "🇨🇦" },
                { country: "New Zealand", flag: "🇳🇿" },
                { country: "United Kingdom", flag: "🇬🇧" },
                { country: "United States", flag: "🇺🇸" },
              ].map((dest, i) => (
                <button
                  key={i}
                  onClick={() => onBook(dest.country)}
                  className="flex items-center gap-4 w-full rounded-2xl bg-white border border-[#1e1147]/20 px-6 py-5 transition-all duration-300 hover:border-[#1e1147] hover:shadow-md"
                >
                  <span className="text-2xl">{dest.flag}</span>
                  <span className="text-[15px] font-semibold text-[#1e1147]">{dest.country}</span>
                </button>
              ))}
            </div>
          </AnimateOnScroll>
        </div>
      </section>

      {/* ═══════ UNLIMITED PRACTICE PROMO (IMMERSIVE CTA) ═══════ */}
      <section className="relative py-32 bg-slate-900 overflow-hidden">
        {/* Full Parallax Background for CTA */}
        <div
          className="absolute inset-0 bg-[url('/pte_course.webp')] bg-cover bg-center bg-fixed opacity-20 mix-blend-luminosity"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-slate-900/40" />

        <div className="container-shell relative z-10 text-center">
          <AnimateOnScroll variant="scale">
            <h2 className="text-5xl md:text-6xl lg:text-7xl font-black text-white tracking-tight mb-8">
              Unlock Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500">True Potential</span>
            </h2>
            <p className="mx-auto max-w-2xl text-xl text-slate-300 leading-relaxed mb-12">
              Join the best PTE coaching centre in Dhaka. Get unlimited access to AI-scored mock tests and expert-led sessions until you hit your target score.
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-6">
              <button onClick={() => onBook()} className="group relative overflow-hidden rounded-full bg-white px-10 py-5 text-slate-900 font-bold shadow-2xl transition-all hover:scale-105 hover:shadow-white/20 w-full sm:w-auto">
                <span className="relative z-10 text-lg">Start Your Preparation Today</span>
              </button>
              <Link href="/courses" className="inline-flex items-center justify-center rounded-full border border-white/30 bg-white/10 backdrop-blur-md px-10 py-5 font-bold text-white transition-all hover:bg-white/20 text-lg w-full sm:w-auto">
                Explore Courses
              </Link>
            </div>
          </AnimateOnScroll>
        </div>
      </section>
    </div>
  );
}
