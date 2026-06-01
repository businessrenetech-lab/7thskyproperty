import React from "react";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, MonitorPlay, Users, GraduationCap, ArrowRight, Target, Clock, BookOpen, Star, Award, MapPin, Globe } from "lucide-react";
import JsonLd, { faqSchema } from "@/components/JsonLd";

export const metadata = {
  title: "Best PTE Coaching Centre in Dhaka | Language Academy",
  description:
    "Language Academy is the top PTE coaching center in Dhaka, offering expert-led offline and online courses. Get 79+ score with our AI mock tests and master trainers.",
  keywords: [
    "PTE coaching centre in Dhaka",
    "best PTE coaching in Bangladesh",
    "PTE mock test Dhaka",
    "PTE online course Bangladesh",
    "PTE exam fee in Bangladesh",
    "PTE course fee in Bangladesh",
    "Language Academy PTE",
    "PTE Core preparation Dhaka",
  ],
  alternates: {
    canonical: "https://languageacademy.com.bd/blog/best-pte-coaching-centre-in-dhaka",
  },
  openGraph: {
    title: "Best PTE Coaching Centre in Dhaka | Language Academy",
    description: "Discover why Language Academy is Dhaka's premier choice for PTE preparation. Details on course fees, online classes, and AI mock tests.",
    url: "https://languageacademy.com.bd/blog/best-pte-coaching-centre-in-dhaka",
    images: [{ url: "/hero_banner.webp", width: 1200, height: 630, alt: "PTE Coaching in Dhaka - Language Academy" }],
  },
};

export default function PteCoachingDhakaPost() {
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": "https://languageacademy.com.bd/blog/best-pte-coaching-centre-in-dhaka"
    },
    "headline": "The Best PTE Coaching Centre in Dhaka, Bangladesh",
    "description": "Language Academy is the top PTE coaching center in Dhaka, offering expert-led offline and online courses. Get 79+ score with our AI mock tests and master trainers.",
    "image": "https://languageacademy.com.bd/hero_banner.webp",
    "author": {
      "@type": "Organization",
      "name": "Language Academy Bangladesh",
      "url": "https://languageacademy.com.bd"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Language Academy Bangladesh",
      "logo": {
        "@type": "ImageObject",
        "url": "https://languageacademy.com.bd/logo.webp"
      }
    },
    "datePublished": "2024-01-15T00:00:00Z",
    "dateModified": "2026-05-20T01:14:16Z"
  };

  const faqData = faqSchema([
    ["What is the PTE Exam Fee in Bangladesh?", "As of the current academic year, the standard PTE Academic exam fee in Bangladesh is USD 220 (approximately BDT 26,000 to BDT 28,000, depending on the bank's exchange rate). We offer complimentary exam booking assistance for our enrolled students."],
    ["Where are the PTE Exam Centers in Dhaka?", "There are verified Pearson VUE test centers available in Dhaka, primarily located in Dhanmondi and Uttara. A third center is also available in Chittagong for students outside the capital."],
    ["Does Canada accept PTE for Study & PR?", "Yes, absolutely! Over 91% of Canadian Universities and colleges accept PTE Academic for admission. Furthermore, the Canadian immigration authority now fully accepts PTE Core for permanent residency (PR) and economic immigration applications."]
  ]);

  return (
    <>
      <JsonLd data={articleSchema} />
      <JsonLd data={faqData} />
      <article className="min-h-screen bg-slate-50 pb-20">
        {/* Premium Full-Width Hero Section */}
        <header className="relative w-full min-h-[50vh] md:min-h-[60vh] flex items-end pb-12 md:pb-20 overflow-hidden bg-slate-950">
        <div className="absolute inset-0 z-0">
          <Image
            src="/hero_banner.webp"
            alt="Best PTE Coaching Centre in Dhaka"
            fill
            sizes="100vw"
            className="object-cover opacity-50 mix-blend-overlay"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent" />
        </div>

        <div className="container-shell relative z-10 w-full pt-32 text-center md:text-left">
          <div className="max-w-4xl mx-auto md:mx-0">
            {/* Category + Meta */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mb-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-full font-bold uppercase tracking-wider text-[11px] shadow-lg shadow-primary/20">
                <BookOpen size={11} />
                PTE Preparation Guide
              </span>
              <div className="flex items-center gap-5 text-[13px] text-white/80 font-medium">
                <span className="flex items-center gap-1.5">
                  <Clock size={14} />
                  8 min read
                </span>
                <span className="flex items-center gap-1.5 text-yellow-400">
                  <Star size={14} className="fill-current" />
                  Rated 4.9/5 by 1000+ Students
                </span>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-[2rem] sm:text-[2.5rem] md:text-[3.25rem] lg:text-[4rem] font-black text-white leading-[1.1] tracking-tight mb-6 drop-shadow-md">
              The Best PTE Coaching Centre in Dhaka, Bangladesh
            </h1>

            {/* Excerpt */}
            <p className="text-[16px] md:text-xl text-white/80 leading-relaxed max-w-3xl mb-8 font-medium mx-auto md:mx-0">
              Achieve your target score of 79+ for Australian PR, Canadian immigration, or global study abroad with Dhaka&apos;s most advanced, AI-driven PTE training programs.
            </p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
              <Link
                href="/courses"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-primary to-emerald-500 text-white font-bold px-8 py-4 rounded-full text-[15px] hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 transition-all"
              >
                <MonitorPlay size={18} />
                Explore PTE Courses
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="container-shell max-w-7xl pt-12 pb-20">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-20 justify-between">
          
          {/* Main Article Column */}
          <article className="flex-1 min-w-0 max-w-[850px] mx-auto lg:mx-0">
            <div className="bg-white rounded-3xl border border-slate-200/60 shadow-xl p-8 md:p-12 lg:p-16">
              
              {/* Article Meta */}
              <div className="flex items-center gap-6 pb-10 border-b border-slate-100 mb-10">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                    <GraduationCap size={28} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-lg">Language Academy Editorial</p>
                    <p className="text-sm text-slate-500 font-medium">Updated for 2024-2025 Academic Year</p>
                  </div>
                </div>
              </div>

              {/* Intro Content */}
              <div className="prose prose-lg prose-slate max-w-none prose-headings:text-slate-900 prose-headings:font-bold prose-a:text-primary hover:prose-a:underline">
                <p className="text-xl text-slate-700 leading-relaxed font-medium mb-8">
                  Securing a high score in the <strong>PTE Academic exam</strong> is one of the most critical steps toward studying abroad or securing permanent residency (PR) in countries like Australia, Canada, and the UK. At Language Academy Bangladesh, we have revolutionized PTE coaching in Dhaka by combining expert human instruction with cutting-edge AI scoring technology.
                </p>

                <p>
                  With thousands of successful students who have achieved their desired scores (65+, 79+, and even perfect 90s), Language Academy has cemented its reputation as a pioneer in English language proficiency training. Whether you need PTE Academic for university admissions, PTE Core for Canadian PR, or PTE Home for UK visas, we are your one-stop solution.
                </p>

                <h2 className="text-3xl mt-12 mb-6">Why Choose Language Academy for PTE?</h2>
                <p>
                  Unlike traditional coaching centers that rely on outdated paper-based methods, PTE is a fully computer-based exam assessed by a complex algorithm. Your preparation must reflect this reality. Here is why we are Dhaka's top choice:
                </p>

                <div className="grid sm:grid-cols-2 gap-6 my-10 not-prose">
                  {[
                    { icon: MonitorPlay, title: "Digital AI Lab", desc: "Practice on a portal that perfectly mimics the Pearson VUE exam environment and AI scoring engine." },
                    { icon: Users, title: "Small Batches", desc: "Class sizes are strictly limited to ensure every student receives personalized feedback and attention." },
                    { icon: Target, title: "Proven Templates", desc: "Gain access to our high-scoring, algorithm-tested templates for essays, summaries, and describe image tasks." },
                    { icon: Award, title: "Master Trainers", desc: "Learn directly from highly qualified trainers with years of experience decoding the PTE scoring algorithm." },
                    { icon: BookOpen, title: "Free Premium Materials", desc: "Get exclusive access to premium question banks, e-books, and grammar foundation classes." },
                    { icon: Clock, title: "Flexible Timings", desc: "We offer convenient morning, afternoon, and evening batches to suit working professionals and students." }
                  ].map((feature, idx) => (
                    <div key={idx} className="bg-slate-50 rounded-2xl p-6 border border-slate-200/60 hover:border-primary/40 hover:shadow-lg transition-all group">
                      <feature.icon className="text-primary mb-4 group-hover:scale-110 transition-transform" size={32} />
                      <h3 className="text-lg font-bold text-slate-900 mb-2">{feature.title}</h3>
                      <p className="text-[15px] text-slate-600 leading-relaxed">{feature.desc}</p>
                    </div>
                  ))}
                </div>

                <h2 className="text-3xl mt-12 mb-6">Our PTE Course Programs & Fees</h2>
                <p>
                  We understand that every student has a different baseline of English proficiency and unique time constraints. Therefore, we offer highly flexible programs available both online and on-campus.
                </p>

                {/* Pricing/Course Cards */}
                <div className="grid md:grid-cols-2 gap-8 my-10 not-prose">
                  {/* Comprehensive Course */}
                  <div className="relative rounded-3xl bg-white border border-slate-200 p-8 shadow-xl flex flex-col hover:border-primary/50 transition-colors">
                    <div className="mb-6">
                      <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 font-bold text-xs rounded-full uppercase tracking-wider mb-4">Most Popular</span>
                      <h3 className="text-2xl font-black text-slate-900">Comprehensive Long Course</h3>
                      <p className="text-sm text-slate-500 mt-2">Perfect for thorough preparation from scratch.</p>
                      <div className="mt-5 flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-primary">BDT 15,000</span>
                      </div>
                    </div>
                    <ul className="space-y-4 mb-8 flex-1">
                      {["2.5 Months Duration", "24+ Interactive Classes", "8 Full AI Mock Tests", "Grammar & Vocabulary Foundation", "1-on-1 Speaking Feedback"].map((item, i) => (
                        <li key={i} className="flex gap-3 text-slate-600 text-[15px] font-medium">
                          <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={20} />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Crash Course */}
                  <div className="relative rounded-3xl bg-slate-900 border border-slate-800 p-8 shadow-xl flex flex-col text-white">
                    <div className="mb-6">
                      <span className="inline-block px-3 py-1 bg-emerald-500/20 text-emerald-400 font-bold text-xs rounded-full uppercase tracking-wider mb-4">Fast Track</span>
                      <h3 className="text-2xl font-black text-white">1-Month Crash Course</h3>
                      <p className="text-sm text-slate-400 mt-2">Ideal for quick revision and exam retakers.</p>
                      <div className="mt-5 flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-emerald-400">BDT 8,000</span>
                      </div>
                    </div>
                    <ul className="space-y-4 mb-8 flex-1">
                      {["4 Weeks Duration", "12+ Intensive Classes", "5 Full AI Mock Tests", "Strategy & Template Focused", "High-Priority Doubt Clearing"].map((item, i) => (
                        <li key={i} className="flex gap-3 text-slate-300 text-[15px] font-medium">
                          <CheckCircle2 className="text-emerald-400 shrink-0 mt-0.5" size={20} />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <p>
                  <em>Note: We also offer highly customized <strong>One-to-One Private Tuition</strong> starting from BDT 18,000 for students who require dedicated, exclusive attention from a master trainer.</em>
                </p>

                <h2 className="text-3xl mt-12 mb-6">Frequently Asked Questions</h2>
                
                <div className="space-y-6 not-prose my-8">
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/60 shadow-sm">
                    <h4 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <Globe size={20} className="text-primary"/> What is the PTE Exam Fee in Bangladesh?
                    </h4>
                    <p className="text-slate-600 text-[15px] leading-relaxed">As of the current academic year, the standard PTE Academic exam fee in Bangladesh is <strong>USD 220</strong> (approximately BDT 26,000 to 28,000, depending on the bank's exchange rate). We offer complimentary exam booking assistance for our enrolled students.</p>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/60 shadow-sm">
                    <h4 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <MapPin size={20} className="text-primary"/> Where are the PTE Exam Centers in Dhaka?
                    </h4>
                    <p className="text-slate-600 text-[15px] leading-relaxed">There are verified Pearson VUE test centers available in Dhaka, primarily located in <strong>Dhanmondi</strong> and <strong>Uttara</strong>. A third center is also available in Chittagong for students outside the capital.</p>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/60 shadow-sm">
                    <h4 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <Target size={20} className="text-primary"/> Does Canada accept PTE for Study & PR?
                    </h4>
                    <p className="text-slate-600 text-[15px] leading-relaxed">Yes, absolutely! Over 91% of Canadian Universities and colleges accept PTE Academic for admission. Furthermore, the Canadian immigration authority now fully accepts <strong>PTE Core</strong> for permanent residency (PR) and economic immigration applications.</p>
                  </div>
                </div>

                {/* Final CTA */}
                <div className="mt-16 relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-8 py-14 md:px-14 md:py-16 text-center shadow-2xl not-prose">
                  <div className="absolute top-0 right-0 w-80 h-80 bg-primary/25 rounded-full blur-[120px]" />
                  <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-400/15 rounded-full blur-[120px]" />
                  
                  <div className="relative z-10">
                    <h2 className="text-3xl md:text-4xl font-black mb-6 text-white tracking-tight">Ready to hit 79+ in PTE?</h2>
                    <p className="text-lg text-white/80 mb-10 max-w-xl mx-auto font-medium">
                      Stop guessing and start preparing smartly. Join Dhaka's top-rated PTE coaching center and get access to unlimited AI practice today.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <Link href="/courses" className="inline-flex items-center justify-center gap-2 bg-primary text-white px-8 py-4 rounded-full font-bold hover:shadow-lg hover:shadow-primary/40 hover:-translate-y-0.5 transition-all">
                        View Course Details
                      </Link>
                      <Link href="/contact" className="inline-flex items-center justify-center gap-2 bg-white/10 border border-white/20 text-white px-8 py-4 rounded-full font-bold hover:bg-white/20 transition-all backdrop-blur-sm">
                        Book Free Consultation <ArrowRight size={20} />
                      </Link>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </article>

          {/* Optional Sidebar */}
          <aside className="hidden lg:block w-[320px] shrink-0">
             <div className="sticky top-32 space-y-8">
               
               {/* Contact Widget */}
               <div className="bg-white rounded-3xl border border-slate-200/60 p-8 shadow-xl">
                 <h3 className="text-xl font-bold text-slate-900 mb-4">Need Help?</h3>
                 <p className="text-[15px] text-slate-600 mb-6">Our academic counselors are available to guide you on your PTE journey.</p>
                 <div className="space-y-4">
                   <a href="tel:+880123456789" className="flex items-center gap-3 text-slate-700 hover:text-primary transition-colors font-medium">
                     <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                       <Clock size={18} />
                     </div>
                     10:00 AM - 7:00 PM
                   </a>
                   <Link href="/contact" className="flex items-center gap-3 text-slate-700 hover:text-primary transition-colors font-medium">
                     <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                       <MapPin size={18} />
                     </div>
                     Dhanmondi, Dhaka
                   </Link>
                 </div>
                 <Link href="/contact" className="mt-6 w-full flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors">
                   Contact Us
                 </Link>
               </div>

             </div>
          </aside>

        </div>
      </div>
    </article>
    </>
  );
}
