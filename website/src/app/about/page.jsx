import React from "react";
import Link from "next/link";
import Image from "next/image";
import { 
  Target, Globe2, CheckCircle2, Laptop,
  GraduationCap, Briefcase, FileSignature, Mic,
  Users, Award, TrendingUp, Clock, MapPin, ArrowRight
} from "lucide-react";

export const metadata = {
  title: "About Us - Language Academy Bangladesh | Best PTE & IELTS Centre in Dhaka",
  description:
    "Discover Language Academy Bangladesh, Dhaka's premier PTE and IELTS preparation centre. We connect ambitious students and professionals with global opportunities through expert coaching.",
  alternates: { canonical: "https://languageacademy.com.bd/about" },
  openGraph: {
    title: "About Language Academy Bangladesh - Best PTE Centre in Dhaka",
    description: "Discover our mission, values, and world-class facilities designed for focused PTE preparation, with IELTS and English courses also available.",
    url: "https://languageacademy.com.bd/about",
    images: [{ url: "/hero_banner.webp", width: 1200, height: 630, alt: "About Language Academy Bangladesh" }],
  },
};

export default function AboutPage() {
  return (
    <div className="pb-24 bg-white">
      {/* Hero Section - 70/30 Split inspired by Labourmate */}
      <section className="bg-academy-blue pt-24 pb-20 md:pt-32 md:pb-28 relative overflow-hidden">
        {/* Subtle background image/pattern */}
        <div className="absolute inset-0 opacity-20 mix-blend-overlay">
          <Image src="/hero_desktop.webp" alt="Background" fill className="object-cover" priority />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-academy-blue via-academy-blue/95 to-slate-900/80 z-0"></div>
        
        <div className="container-shell relative z-10">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left 70% */}
            <div className="lg:col-span-7 xl:col-span-8 text-white">
              <span className="inline-flex items-center gap-2 border border-white/20 bg-white/5 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-widest mb-8">
                <span className="w-2 h-2 rounded-full bg-primary"></span>
                About Language Academy
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight tracking-tight mb-6">
                Connecting ambition with <span className="text-primary">global opportunity.</span>
              </h1>
              <p className="text-lg md:text-xl text-slate-300 leading-relaxed max-w-2xl mb-8">
                Language Academy Bangladesh is a premium PTE and IELTS training centre in Dhaka. We combine expert instructors, AI-driven mock tests, and smart classrooms to help you achieve your target scores faster.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <Link href="/courses" className="primary-btn bg-primary hover:bg-primary-dark text-white text-base px-8 py-4 border-0">
                  Explore Courses
                </Link>
                <Link href="/contact" className="secondary-btn bg-white/5 border-white/20 text-white hover:bg-white/10 text-base px-8 py-4">
                  Contact Us
                </Link>
              </div>
            </div>

            {/* Right 30% - Operating Snapshot */}
            <div className="lg:col-span-5 xl:col-span-4">
              <div className="bg-white rounded-2xl p-6 md:p-8 shadow-2xl relative">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-6">Academy Snapshot</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <Award className="w-6 h-6 text-primary mb-3" />
                    <div className="text-2xl font-black text-slate-900 mb-1">World</div>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Class</div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <Laptop className="w-6 h-6 text-primary mb-3" />
                    <div className="text-2xl font-black text-slate-900 mb-1">Unlimited</div>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">AI Mocks</div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <Award className="w-6 h-6 text-primary mb-3" />
                    <div className="text-2xl font-black text-slate-900 mb-1">79+</div>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Target Score</div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <Clock className="w-6 h-6 text-primary mb-3" />
                    <div className="text-2xl font-black text-slate-900 mb-1">24/7</div>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Portal Access</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* "Built to remove friction" Section -> Overlapping Images Layout */}
      <section className="py-20 bg-slate-50">
        <div className="container-shell">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-12 items-center">
            {/* Left: Overlapping Images */}
            <div className="relative mx-auto lg:mx-0 max-w-md lg:max-w-none w-full aspect-square lg:aspect-auto lg:h-[600px]">
              <div className="absolute top-0 left-0 w-4/5 h-4/5 rounded-2xl overflow-hidden shadow-xl border-4 border-white z-10">
                <Image src="/students_classroom.webp" alt="Classroom" fill className="object-cover" />
              </div>
              <div className="absolute bottom-0 right-0 w-3/5 h-3/5 rounded-2xl overflow-hidden shadow-2xl border-4 border-white z-20">
                <Image src="/student_journey.webp" alt="Student Success" fill className="object-cover" />
              </div>
              <div className="absolute top-1/2 -right-4 md:-right-8 transform -translate-y-1/2 bg-white rounded-xl shadow-xl p-4 border-l-4 border-l-primary z-30 flex items-center gap-4 w-64">
                <div className="bg-primary/10 p-3 rounded-lg text-primary">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">Guaranteed Growth</div>
                  <div className="text-xs text-slate-500">Data-driven learning</div>
                </div>
              </div>
            </div>

            {/* Right: Content */}
            <div className="lg:pl-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-6 bg-primary rounded-full"></div>
                <h2 className="text-sm font-bold text-primary tracking-widest uppercase">Our Story</h2>
              </div>
              <h3 className="text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight mb-6">
                Built to remove the guesswork from <span className="text-primary">test preparation</span>
              </h3>
              <div className="prose prose-lg text-slate-600 mb-8">
                <p>
                  Language Academy was created for a market where students cannot afford unreliable strategies, and professionals need simple, direct access to quality PTE and IELTS training.
                </p>
                <p>
                  We saw the same problem across thousands of test-takers: the dedication was there, but the connection between raw effort and the right exam strategies was too fragmented, too slow, and often based on outdated templates.
                </p>
                <p>
                  Our model combines certified instructors, dedicated computer labs, structured AI scoring, and real-time feedback. That gives students a better learning experience and a clearer pathway into universities, visa applications, and global careers.
                </p>
              </div>
              <ul className="space-y-4 list-none p-0">
                <li className="flex items-start gap-4">
                  <div className="mt-1 bg-primary/10 p-1 rounded-full text-primary shrink-0"><CheckCircle2 size={18} /></div>
                  <span className="text-slate-700 font-medium">Pre-tested strategies for PTE Academic, IELTS, and Spoken English.</span>
                </li>
                <li className="flex items-start gap-4">
                  <div className="mt-1 bg-primary/10 p-1 rounded-full text-primary shrink-0"><CheckCircle2 size={18} /></div>
                  <span className="text-slate-700 font-medium">Dedicated mock test portals mirroring the actual Pearson and BC environments.</span>
                </li>
                <li className="flex items-start gap-4">
                  <div className="mt-1 bg-primary/10 p-1 rounded-full text-primary shrink-0"><CheckCircle2 size={18} /></div>
                  <span className="text-slate-700 font-medium">Unwavering student support focusing on score-fit, speed, and exam readiness.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision Panels */}
      <section className="py-20">
        <div className="container-shell">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">Clear purpose. Practical execution.</h2>
            <p className="text-lg text-slate-600">We are not just teaching English. We are building a dependable educational network that helps Bangladesh connect globally.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl p-8 md:p-12 border border-slate-200 shadow-lg shadow-slate-100 hover:shadow-xl transition-shadow">
              <div className="bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center text-primary mb-8">
                <Target size={32} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Our Mission</h3>
              <p className="text-slate-600 leading-relaxed mb-8">
                To connect ambitious individuals with global opportunities by providing them with the exact strategies, environment, and confidence needed to ace international language tests without the usual delays or guesswork.
              </p>
              <ul className="space-y-4">
                <li className="flex items-center gap-3 text-sm text-slate-700 font-bold"><div className="w-2 h-2 rounded-full bg-primary"></div> Make global access faster and easier.</li>
                <li className="flex items-center gap-3 text-sm text-slate-700 font-bold"><div className="w-2 h-2 rounded-full bg-primary"></div> Give students clearer pathways to higher education.</li>
                <li className="flex items-center gap-3 text-sm text-slate-700 font-bold"><div className="w-2 h-2 rounded-full bg-primary"></div> Support professionals with accurate migration prep.</li>
              </ul>
            </div>
            
            <div className="bg-academy-blue rounded-2xl p-8 md:p-12 shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 opacity-10 bg-[url('/students_classroom.webp')] bg-cover mix-blend-overlay"></div>
              <div className="relative z-10">
                <div className="bg-primary/20 w-16 h-16 rounded-2xl flex items-center justify-center text-white mb-8">
                  <Globe2 size={32} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Our Vision</h3>
                <p className="text-blue-100 leading-relaxed mb-8">
                  To become Bangladesh&apos;s most trusted educational platform for language proficiency, study abroad preparation, and long-term career partnerships.
                </p>
                <ul className="space-y-4">
                  <li className="flex items-center gap-3 text-sm text-white font-bold"><div className="w-2 h-2 rounded-full bg-primary"></div> A stronger global presence for Bangladeshi talent.</li>
                  <li className="flex items-center gap-3 text-sm text-white font-bold"><div className="w-2 h-2 rounded-full bg-primary"></div> More reliable exam outcomes for candidates.</li>
                  <li className="flex items-center gap-3 text-sm text-white font-bold"><div className="w-2 h-2 rounded-full bg-primary"></div> A connected community across Dhaka and online.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Operating Rhythm (Process) -> 4 Columns with Step Numbers */}
      <section className="py-20 bg-[#f4f6f8]">
        <div className="container-shell">
          <div className="max-w-3xl mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">A simple operating rhythm that keeps scores climbing.</h2>
            <p className="text-lg text-slate-600">Students need clear concepts. Professionals need reliable practice. Our process is built to make both faster and easier.</p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Step 1 */}
            <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-100 hover:border-primary/30 transition-colors">
              <div className="text-primary font-black tracking-widest text-sm mb-6">STEP 01</div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Assess</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Take a free diagnostic test. We evaluate your current grammar, vocabulary, and test-readiness.
              </p>
            </div>
            
            {/* Step 2 */}
            <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-100 hover:border-primary/30 transition-colors">
              <div className="text-primary font-black tracking-widest text-sm mb-6">STEP 02</div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Learn</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Join interactive classes in our smart labs. Master the templates and understand the algorithms.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-100 hover:border-primary/30 transition-colors">
              <div className="text-primary font-black tracking-widest text-sm mb-6">STEP 03</div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Practice</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Access unlimited AI mock tests in exam-like conditions. Get instantaneous scoring and feedback.
              </p>
            </div>

            {/* Step 4 */}
            <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-100 hover:border-primary/30 transition-colors">
              <div className="text-primary font-black tracking-widest text-sm mb-6">STEP 04</div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Achieve</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Hit your desired target score and move forward with your visa, study, or migration goals.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* For Students / For Professionals -> Vertical Cards */}
      <section className="py-20">
        <div className="container-shell">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">Designed for speed, trust, and clarity.</h2>
            <p className="text-lg text-slate-600">Language Academy works because we care about the end goal: your successful placement abroad.</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* For Students */}
            <div className="bg-white rounded-2xl p-8 md:p-12 border border-slate-200 shadow-md flex flex-col">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-8">
                <GraduationCap size={40} />
              </div>
              <h3 className="text-3xl font-bold text-slate-900 mb-4">For Students</h3>
              <p className="text-slate-600 mb-8 leading-relaxed">
                Whether you are aiming for a Bachelor&apos;s or Master&apos;s degree abroad, we help you secure the language score required by top-tier universities.
              </p>
              <ul className="space-y-4 mb-10 flex-1">
                <li className="flex items-center gap-3">
                  <div className="bg-slate-100 p-1 rounded-full"><CheckCircle2 className="text-slate-700 w-5 h-5" /></div>
                  <span className="font-medium text-slate-800">Pathway to UK, USA, Australia & Canada</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="bg-slate-100 p-1 rounded-full"><CheckCircle2 className="text-slate-700 w-5 h-5" /></div>
                  <span className="font-medium text-slate-800">Scholarship-friendly high score targeting</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="bg-slate-100 p-1 rounded-full"><CheckCircle2 className="text-slate-700 w-5 h-5" /></div>
                  <span className="font-medium text-slate-800">Unlimited lab access for constant practice</span>
                </li>
              </ul>
              <Link href="/courses" className="primary-btn bg-primary hover:bg-primary-dark text-white border-0 w-full text-center py-4 rounded-xl text-lg">
                Explore Courses
              </Link>
            </div>

            {/* For Professionals */}
            <div className="bg-white rounded-2xl p-8 md:p-12 border border-slate-200 shadow-md flex flex-col">
              <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-800 mb-8">
                <Briefcase size={40} />
              </div>
              <h3 className="text-3xl font-bold text-slate-900 mb-4">For Professionals</h3>
              <p className="text-slate-600 mb-8 leading-relaxed">
                From nurses and engineers to skilled tradesmen seeking PR or work visas, we provide accelerated, flexible coaching that fits your schedule.
              </p>
              <ul className="space-y-4 mb-10 flex-1">
                <li className="flex items-center gap-3">
                  <div className="bg-slate-100 p-1 rounded-full"><CheckCircle2 className="text-slate-700 w-5 h-5" /></div>
                  <span className="font-medium text-slate-800">Evening & Weekend batches available</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="bg-slate-100 p-1 rounded-full"><CheckCircle2 className="text-slate-700 w-5 h-5" /></div>
                  <span className="font-medium text-slate-800">Target 79+ for maximum PR points</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="bg-slate-100 p-1 rounded-full"><CheckCircle2 className="text-slate-700 w-5 h-5" /></div>
                  <span className="font-medium text-slate-800">Direct, no-nonsense strategy sessions</span>
                </li>
              </ul>
              <Link href="/student-booking?branch=1" className="primary-btn bg-slate-900 hover:bg-slate-800 text-white border-0 w-full text-center py-4 rounded-xl text-lg">
                Book a Batch
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Campuses & CTA Combination */}
      <section className="py-20 bg-slate-50 border-t border-slate-200">
        <div className="container-shell">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">Our Campuses</h2>
            <p className="text-lg text-slate-600">Modern learning spaces designed for focus and growth.</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 mb-16">
            <div className="bg-white rounded-xl p-8 border border-slate-200 flex flex-col md:flex-row gap-6 items-center md:items-start text-center md:text-left">
              <div className="bg-primary/10 text-primary p-4 rounded-full shrink-0">
                <MapPin size={28} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Dhanmondi Campus</h3>
                <p className="text-slate-600 text-sm mb-4">SEL SUFI SQUARE, Unit: 1104, Level: 11, Plot: 58, Road: 16 (New) / 27 (Old), Dhanmondi R/A, Dhaka 1209</p>
                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                  <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-full">Smart Labs</span>
                  <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-full">Mock Center</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-8 border border-slate-200 flex flex-col md:flex-row gap-6 items-center md:items-start text-center md:text-left">
              <div className="bg-slate-100 text-slate-700 p-4 rounded-full shrink-0">
                <Globe2 size={28} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Online Campus</h3>
                <p className="text-slate-600 text-sm mb-4">Accessible nationwide via Zoom and our interactive Learning Management System (LMS) portal.</p>
                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                  <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-full">Live Classes</span>
                  <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-full">24/7 Access</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-academy-blue rounded-2xl p-8 md:p-12 text-center text-white relative overflow-hidden shadow-2xl">
             <div className="absolute inset-0 opacity-20 mix-blend-overlay bg-[url('/hero_banner.webp')] bg-cover bg-center"></div>
             <div className="relative z-10">
               <h2 className="text-3xl md:text-4xl font-black mb-6">Ready to start your journey?</h2>
               <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">At Language Academy, we connect talent to the world. Get started today and secure your target score.</p>
               <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                 <Link href="/student-booking?branch=1" className="inline-flex items-center justify-center gap-2 bg-slate-900 text-white font-bold px-8 py-4 rounded-xl hover:bg-slate-800 transition-colors shadow-lg">
                   Book a Batch
                 </Link>
                 <Link href="/contact" className="inline-flex items-center justify-center gap-2 bg-white text-academy-blue font-bold px-8 py-4 rounded-xl hover:bg-slate-50 transition-colors shadow-lg">
                   Book a Free Consultation <ArrowRight size={20} />
                 </Link>
               </div>
             </div>
          </div>
        </div>
      </section>
    </div>
  );
}
