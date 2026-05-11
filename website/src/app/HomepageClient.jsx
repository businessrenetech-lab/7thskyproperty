"use client";

import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import {
  ArrowRight, BookOpen, ChevronDown,
  FileText, Globe, Target
} from "lucide-react";
import AnimateOnScroll, { StaggerContainer, StaggerItem } from "@/components/AnimateOnScroll";
import CourseCard from "@/components/CourseCard";
import BookingFormInline from "@/components/BookingFormInline";
import BookingModal from "@/components/BookingModal";
import { useState, useEffect } from "react";

const HomepageBelowFold = dynamic(() => import('./HomepageBelowFold'), { ssr: true });

/* â”€â”€â”€ Static Data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const faqs = [
  ["What skills are tested in the PTE Listening section?", "Identifying key information from spoken audio clips, understanding different English accents, accurate note-taking under time pressure, identifying errors in spoken content, writing from dictation, and selecting the most appropriate summary."],
  ["How do I choose the right course?", "Start with a free consultation. Our academic advisors assess your current level, timeline, and target score to recommend the perfect course and batch for you."],
  ["Do you offer flexible schedules?", "Yes. We run weekday morning, afternoon, and weekend batches so you can fit serious preparation into your busy routine."],
  ["Is mock test support included?", "Absolutely. All courses include AI-scored full-length mock tests, detailed analytics, and trainer-led review sessions."],
  ["What is the class size?", "We maintain a maximum of 12 students per cohort to ensure personalized attention, stronger accountability, and faster improvement."],
  ["What is the difference between PTE and IELTS?", "PTE Academic is fully computer-based with AI scoring and results in 1\u20132 days, while IELTS has a face-to-face speaking test with results in 3\u201313 days. Both are accepted worldwide. PTE is especially popular for Australia and New Zealand immigration."],
  ["What PTE score do I need to study in Australia?", "For Australian student visas, you typically need a PTE score of 50\u201365 depending on the course. For Skilled Migration (PR), a PTE score of 65+ is generally required, with higher scores earning additional points."],
  ["Do you offer study abroad consulting?", "Yes. Along with PTE and IELTS coaching, we provide study abroad guidance for Australia, Canada, UK, New Zealand, and more. Our advisors help with university selection, visa requirements, and score targets."],
  ["Can I prepare for PTE or IELTS online?", "Yes. Language Academy offers both online and offline classes from our Dhanmondi, Dhaka centre. Online students get the same curriculum, AI mock tests, and trainer support as in-person learners."],
  ["How long does PTE or IELTS preparation take?", "Most students achieve their target score within 4\u20138 weeks of focused preparation. The exact timeline depends on your current English level and target score."],
];

export default function HomepageClient({ courses: initialCourses, blogs }) {
  const [courses, setCourses] = useState(initialCourses || []);
  const [openFaq, setOpenFaq] = useState(0);

  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingInterest, setBookingInterest] = useState("");

  // Client-side fallback: re-fetch if SSR delivered empty courses
  useEffect(() => {
    if (!initialCourses || initialCourses.length === 0) {
      fetch("/api/public/courses")
        .then((res) => res.ok ? res.json() : [])
        .then((data) => { if (data.length > 0) setCourses(data.slice(0, 6)); })
        .catch(() => {});
    }
  }, [initialCourses]);

  const handleBook = (interest = "") => {
    setBookingInterest(interest);
    setIsBookingOpen(true);
  };

  return (
    <div className="bg-white min-h-screen">
      {/* â•â•â•â•â•â•â• 1. HERO SECTION â•â•â•â•â•â•â• */}

      {/* â€”â€”â€” DESKTOP / TABLET HERO (â‰¥1024px) â€”â€”â€” */}
      <section className="hidden lg:flex flex-col relative overflow-hidden bg-[#f4f8fc] h-[calc(100svh-120px)]" id="hero">
        {/* Background: desktop landscape image */}
        <div className="absolute inset-0">
          <Image
            src="/hero_desktop.jpg"
            alt="Student with world landmarks - study abroad from Bangladesh"
            fill
            sizes="100vw"
            className="object-cover object-right-top"
            priority
          />
          {/* Left-side gradient fade for text readability */}
          <div className="absolute inset-0" style={{background: 'linear-gradient(to right, #f4f8fc 5%, rgba(244,248,252,0.97) 20%, rgba(244,248,252,0.90) 35%, rgba(244,248,252,0.55) 48%, rgba(244,248,252,0.15) 58%, transparent 68%)'}} />
        </div>

        {/* Content grid â€” stretches to fill hero */}
        <div className="container-shell relative z-10 flex-1 flex flex-col justify-center">
          <div className="grid grid-cols-2 items-center flex-1">
            {/* Left: text content */}
            <div className="max-w-[560px] py-6">
              <AnimateOnScroll variant="slide-left">
                <span className="inline-flex items-center rounded-full bg-primary/10 border border-primary/20 px-5 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-primary mb-5">
                  Language Academy Bangladesh
                </span>

                <h1 className="text-[3rem] xl:text-[3.6rem] 2xl:text-[4rem] font-extrabold leading-[1.06] text-slate-900 tracking-tight">
                  Best PTE Centre<br />
                  in Dhaka,<br />
                  Bangladesh
                </h1>

                <p className="mt-4 text-[15px] xl:text-base leading-[1.7] text-slate-600 max-w-[480px]">
                  A world-class PTE preparation centre in Dhaka for students who want stronger English skills and smarter exam preparation. We also provide IELTS and English courses for study, migration, and career growth.
                </p>

                {/* Feature Pills â€” single row on desktop */}
                <div className="mt-5 flex flex-wrap gap-2.5">
                  {[
                    { label: "PTE Academic", icon: Target },
                    { label: "IELTS Preparation", icon: BookOpen },
                    { label: "Online & Offline Classes", icon: Globe },
                  ].map((pill) => (
                    <span key={pill.label} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-[13px] font-semibold text-slate-700 shadow-sm">
                      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <pill.icon size={12} />
                      </span>
                      {pill.label}
                    </span>
                  ))}
                </div>

                {/* CTA Buttons â€” single row */}
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => handleBook()}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-7 py-3 text-sm font-bold text-white shadow-lg shadow-accent/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-accent/30"
                  >
                    Book a Free Consultation <ArrowRight size={16} />
                  </button>
                  <Link
                    href="/courses"
                    className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-accent bg-white px-7 py-3 text-sm font-bold text-accent transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent/5"
                  >
                    Explore Courses <ArrowRight size={16} />
                  </Link>
                </div>
              </AnimateOnScroll>
            </div>
            {/* Right: transparent â€” background image shows through */}
            <div aria-hidden="true" />
          </div>
        </div>
      </section>

      {/* â€”â€”â€” MOBILE HERO (<1024px) â€”â€”â€” */}
      <section className="lg:hidden relative overflow-hidden bg-[#f4f8fc] min-h-[calc(100svh-96px)] flex flex-col" id="hero-mobile">
        {/* Background: mobile portrait image */}
        <div className="absolute inset-0">
          <Image
            src="/hero_mobile.jpg"
            alt="Student with world landmarks - study abroad from Bangladesh"
            fill
            sizes="100vw"
            className="object-cover object-center"
          />
          {/* Mobile gradient: readable text area at top, student visible below */}
          <div className="absolute inset-0" style={{background: 'linear-gradient(to bottom, rgba(244,248,252,0.97) 0%, rgba(244,248,252,0.85) 25%, rgba(244,248,252,0.45) 50%, rgba(244,248,252,0.3) 70%, rgba(244,248,252,0.8) 100%)'}} />
        </div>

        <div className="container-shell relative z-10 flex-1 flex flex-col py-6 sm:py-8">
          {/* Badge */}
          <AnimateOnScroll variant="slide-left">
            <div className="text-center">
              <span className="inline-flex items-center rounded-full bg-primary/10 border border-primary/20 px-4 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                Language Academy Bangladesh
              </span>
            </div>
          </AnimateOnScroll>

          {/* Headline */}
          <AnimateOnScroll variant="slide-left">
            <h1 className="mt-3 text-center text-[2rem] sm:text-[2.6rem] md:text-[3rem] font-extrabold leading-[1.08] text-slate-900 tracking-tight">
              Best PTE Centre<br />
              in Dhaka,<br />
              Bangladesh
            </h1>
          </AnimateOnScroll>

          {/* Paragraph */}
          <AnimateOnScroll variant="fade-up">
            <p className="mt-3 text-center text-[13px] sm:text-[14px] leading-[1.6] text-slate-600 max-w-[400px] mx-auto">
              A world-class PTE preparation centre in Dhaka for students who want stronger English skills and smarter exam preparation. We also provide IELTS and English courses for study, migration, and career growth.
            </p>
          </AnimateOnScroll>

          {/* Feature Pills */}
          <AnimateOnScroll variant="fade-up">
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {[
                { label: "PTE Academic", icon: Target },
                { label: "IELTS Preparation", icon: BookOpen },
                { label: "Online & Offline Classes", icon: Globe },
              ].map((pill) => (
                <span key={pill.label} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-slate-700 shadow-sm">
                  <span className="flex h-4 w-4 items-center justify-center rounded bg-primary/10 text-primary">
                    <pill.icon size={10} />
                  </span>
                  {pill.label}
                </span>
              ))}
            </div>
          </AnimateOnScroll>

          {/* CTA Buttons â€” full-width stacked, centered */}
          <AnimateOnScroll variant="fade-up">
            <div className="mt-5 flex flex-col sm:flex-row gap-2.5 max-w-[400px] mx-auto w-full">
              <button
                onClick={() => handleBook()}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-[13px] font-bold text-white shadow-lg shadow-accent/25 transition-all duration-300"
              >
                Book a Free Consultation <ArrowRight size={15} />
              </button>
              <Link
                href="/courses"
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-full border-2 border-accent bg-white px-6 py-3 text-[13px] font-bold text-accent transition-all duration-300"
              >
                Explore Courses <ArrowRight size={15} />
              </Link>
            </div>
          </AnimateOnScroll>
        </div>
      </section>

      {/* â•â•â•â•â•â•â• 2. FEATURED LIVE COURSES â•â•â•â•â•â•â• */}
      <section className="py-20 bg-white">
        <div className="container-shell">
          <div className="mb-12 text-center max-w-2xl mx-auto">
            <span className="text-sm font-bold uppercase tracking-widest text-primary mb-3 block">PTE First, English Always</span>
            <h2 className="text-3xl font-extrabold text-slate-900 md:text-4xl">PTE-focused courses - enroll in the next batch.</h2>
            <p className="mt-4 text-slate-500">PTE Academic preparation is our core focus, with IELTS and English language courses also available. Small batches, max 12 students. Online and offline in Dhaka.</p>
          </div>
          
          {courses.length > 0 ? (
            <StaggerContainer className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {courses.slice(0, 3).map((course) => (
                <StaggerItem key={course.id}>
                  <CourseCard course={course} />
                </StaggerItem>
              ))}
            </StaggerContainer>
          ) : (
            <div className="rounded-3xl border border-slate-100 bg-white p-12 text-center text-slate-500">
              Courses are being updated. Check back shortly.
            </div>
          )}
          {courses.length > 3 && (
            <AnimateOnScroll variant="fade" className="mt-12 flex justify-center">
              <Link href="/courses" className="secondary-btn bg-white">View All Courses <ArrowRight size={16} /></Link>
            </AnimateOnScroll>
          )}
        </div>
      </section>

      {/* â•â•â•â•â•â•â• BELOW-FOLD SECTIONS (code-split) â•â•â•â•â•â•â• */}
      <HomepageBelowFold onBook={handleBook} />


      {/* â•â•â•â•â•â•â• BLOG & RESOURCES PREVIEW â•â•â•â•â•â•â• */}
      {blogs && blogs.length > 0 && (
        <section className="py-24 bg-slate-50">
          <div className="container-shell">
            <div className="mb-12 text-center max-w-2xl mx-auto">
              <span className="text-sm font-bold uppercase tracking-widest text-primary mb-3 block">Resources & Tips</span>
              <h2 className="text-3xl font-extrabold text-slate-900 md:text-4xl">PTE & IELTS Preparation Tips</h2>
              <p className="mt-4 text-slate-500">Expert strategies, exam tips, and study abroad guides from our trainers to help you prepare smarter.</p>
            </div>

            <StaggerContainer className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {blogs.slice(0, 3).map((blog) => (
                <StaggerItem key={blog.id || blog.slug}>
                  <Link href={`/blog/${blog.slug}`} className="group block rounded-[28px] border border-slate-100 bg-white overflow-hidden shadow-[0_12px_40px_-20px_rgba(15,23,42,0.08)] transition-all duration-300 hover:shadow-[0_20px_50px_-20px_rgba(15,23,42,0.15)] hover:-translate-y-1">
                    <div className="relative h-48 w-full overflow-hidden">
                      {blog.coverImage ? (
                        <Image src={blog.coverImage} alt={blog.title || 'Blog post'} fill sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="h-full w-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                          <FileText size={40} className="text-primary/30" />
                        </div>
                      )}
                    </div>
                    <div className="p-6">
                      {blog.category && (
                        <span className="text-xs font-bold uppercase tracking-widest text-primary mb-2 block">{blog.category}</span>
                      )}
                      <h3 className="text-lg font-bold text-slate-900 mb-2 line-clamp-2 group-hover:text-primary transition-colors">{blog.title}</h3>
                      {blog.excerpt && (
                        <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">{blog.excerpt}</p>
                      )}
                      <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-primary">
                        Read More <ArrowRight size={14} />
                      </div>
                    </div>
                  </Link>
                </StaggerItem>
              ))}
            </StaggerContainer>

            <AnimateOnScroll variant="fade" className="mt-12 flex justify-center">
              <Link href="/blog" className="secondary-btn bg-white">View All Resources <ArrowRight size={16} /></Link>
            </AnimateOnScroll>
          </div>
        </section>
      )}

      {/* â•â•â•â•â•â•â• 8. FAQ & BOOKING FORM (2 COLUMN) â•â•â•â•â•â•â• */}
      <section className="py-24 bg-white border-t border-slate-100">
        <div className="container-shell">
          <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr] items-start">
            
            {/* Left: FAQs */}
            <AnimateOnScroll variant="slide-left">
              <div>
                <span className="text-sm font-bold uppercase tracking-widest text-primary mb-3 block">Got Questions?</span>
                <h2 className="text-3xl font-extrabold text-slate-900 md:text-4xl mb-8">Frequently Asked <br className="hidden md:block"/>Questions</h2>
                
                <div className="space-y-4">
                  {faqs.map(([q, a], i) => (
                    <div 
                      key={i} 
                      className={`group rounded-2xl border transition-all cursor-pointer ${openFaq === i ? 'border-primary/30 bg-primary/5 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                      open={openFaq === i}
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    >
                      <div className="flex items-center justify-between p-6 outline-none">
                        <span className="font-bold text-slate-900 pr-4">{q}</span>
                        <ChevronDown size={20} className={`shrink-0 text-slate-400 transition-transform ${openFaq === i ? 'rotate-180 text-primary' : ''}`} />
                      </div>
                      {openFaq === i && (
                        <div className="px-6 pb-6 pt-0 text-slate-600 leading-relaxed text-sm border-t border-slate-100 mt-2">
                          <p className="pt-4">{a}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </AnimateOnScroll>
            
            {/* Right: Inline Booking Form */}
            <AnimateOnScroll variant="slide-right">
              <BookingFormInline />
            </AnimateOnScroll>
            
          </div>
        </div>
      </section>

      {/* â•â•â•â•â•â• GLOBAL BOOKING MODAL â•â•â•â•â•â• */}
      <BookingModal 
        isOpen={isBookingOpen} 
        onClose={() => setIsBookingOpen(false)} 
        defaultInterest={bookingInterest}
      />
    </div>
  );
}
