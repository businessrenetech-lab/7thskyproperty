import React from "react";
import Link from "next/link";
import { Target, Award, Users, Globe2, Heart, BookOpen, Lightbulb, Shield, TrendingUp, MapPin, ArrowRight, Star, CheckCircle2, Laptop } from "lucide-react";

export const metadata = {
  title: "About Us - Language Academy Bangladesh PTE Centre in Dhaka",
  description:
    "Language Academy Bangladesh is a world-class PTE centre in Dhanmondi, Dhaka, with IELTS preparation and English language courses also available for students planning global success.",
  alternates: { canonical: "https://languageacademy.com.bd/about" },
  openGraph: {
    title: "About Language Academy Bangladesh - Best PTE Centre in Dhaka",
    description: "Discover our mission, values, and world-class facilities designed for focused PTE preparation, with IELTS and English courses also available.",
    url: "https://languageacademy.com.bd/about",
    images: [{ url: "/hero_banner.png", width: 1200, height: 630, alt: "About Language Academy Bangladesh" }],
  },
};

const values = [
  { icon: Target, title: "Academic Excellence", desc: "We hold ourselves to the highest global standards of teaching quality and student outcomes." },
  { icon: Heart, title: "Student-First Approach", desc: "Every decision we make prioritizes student success, comfort, and interactive growth." },
  { icon: Lightbulb, title: "Innovation", desc: "We embrace AI, data analytics, and modern pedagogy to keep our students ahead." },
  { icon: Shield, title: "Integrity & Trust", desc: "Transparent pricing, honest guidance, and genuine care for every student walking through our doors." },
  { icon: Laptop, title: "Modern Facilities", desc: "Smart classrooms and computer labs designed specifically for focused PTE and IELTS training." },
  { icon: TrendingUp, title: "Continuous Improvement", desc: "We constantly refine our methods based on the latest exam patterns and algorithms." },
];

const campuses = [
  { name: "Dhanmondi Campus (Head Office)", address: "SEL SUFI SQUARE, Unit: 1104, Level: 11, Plot: 58, Road: 16 (New) / 27 (Old), Dhanmondi R/A, Dhaka 1209", features: ["Smart Classrooms", "Computer Lab", "Mock Test Center", "Student Lounge"] },
  { name: "Online Campus", address: "Available nationwide via Zoom & LMS Portal", features: ["Live Classes", "Recorded Lectures", "AI Mocks", "24/7 Support"] },
];

export default function AboutPage() {
  return (
    <div className="pb-24">
      {/* Hero */}
      <section className="pb-12 pt-6 md:pb-16 md:pt-8">
        <div className="container-shell">
          <div className="bg-gradient-to-br from-primary to-accent overflow-hidden rounded-[36px] px-8 py-12 text-white md:px-12 md:py-20 text-center relative shadow-xl shadow-primary/20">
            <div className="absolute inset-0 opacity-10 fine-grid mix-blend-overlay"></div>
            <div className="relative z-10">
              <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] shadow-sm">About Language Academy</span>
              <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-black leading-tight md:text-6xl tracking-tight">Best PTE Centre in Dhaka, Bangladesh</h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/90">
                Language Academy Bangladesh is a world-class PTE preparation centre in Dhaka. We help students learn smarter, speak better, and prepare with confidence, with IELTS and English language courses also available.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="pb-16">
        <div className="container-shell grid gap-6 md:grid-cols-2">
          <div className="premium-panel p-8 md:p-10 flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-6"><Target size={32} /></div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Our Mission</h2>
            <p className="text-slate-600 leading-relaxed">To be the best PTE centre in Dhaka, Bangladesh, providing world-class PTE Academic preparation through expert instructors, unlimited mock tests, and personalized coaching that helps every student build confidence and achieve their target score.</p>
          </div>
          <div className="premium-panel bg-slate-950 p-8 md:p-10 text-center text-white">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/20 text-accent mx-auto mb-6"><Globe2 size={32} /></div>
            <h2 className="text-2xl font-bold mb-4">Our Vision</h2>
            <p className="text-slate-300 leading-relaxed">To be the premier gateway for international education and global career opportunities by breaking down language barriers and fostering confident, articulate global citizens.</p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="pb-20">
        <div className="container-shell">
          <div className="rounded-[36px] bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/10 p-10 md:p-14">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { label: "AI Mocks & Labs", value: "Unlimited", icon: Laptop },
                { label: "Instructors", value: "Certified", icon: Award },
                { label: "Score Improvement", value: "Guaranteed", icon: Target },
                { label: "Facilities", value: "Premium", icon: Star },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <stat.icon className="mx-auto h-8 w-8 text-primary mb-3 opacity-80" />
                  <div className="text-3xl md:text-4xl font-black text-slate-900 mb-2 truncate">{stat.value}</div>
                  <div className="text-sm font-semibold text-slate-500 uppercase tracking-wide">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="section-space bg-white/70">
        <div className="container-shell">
          <div className="section-header">
            <span className="eyebrow">Our Values</span>
            <h2 className="mt-5 text-3xl font-extrabold text-slate-900 md:text-5xl">The principles that guide everything we do.</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {values.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="premium-panel p-7 hover:border-primary/30 transition-colors">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Icon size={22} /></div>
                <h3 className="mt-5 text-xl font-bold text-slate-900">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Approach */}
      <section className="section-space">
        <div className="container-shell">
          <div className="section-header">
            <span className="eyebrow">The Modern Approach</span>
            <h2 className="mt-5 text-3xl font-extrabold text-slate-900 md:text-5xl">International standards meets expert guidance.</h2>
          </div>
          <div className="mx-auto max-w-3xl space-y-4">
            {[
              { title: "Cutting-Edge AI Technology", desc: "Our platform uses AI to evaluate your mock tests instantly, giving you precise, actionable feedback designed to improve your PTE and IELTS scores fast." },
              { title: "Personalized Study Pipelines", desc: "No generic templates here. Every student receives tailored feedback, weak-point identification, and customized practice routines." },
              { title: "World-Class Ambience", desc: "Enjoy interactive smart classrooms, a dedicated computer lab for mock tests, and a student lounge to study in comfortable, focused environments." }
            ].map((item, i) => (
              <div key={i} className="premium-panel flex flex-col sm:flex-row items-start gap-5 p-6 border-l-4 border-l-primary">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-xl font-black text-white shadow-md">
                  0{i + 1}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-600">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Campuses */}
      <section className="section-space bg-white/70">
        <div className="container-shell">
          <div className="section-header">
            <span className="eyebrow">Our Campuses</span>
            <h2 className="mt-5 text-3xl font-extrabold text-slate-900 md:text-5xl">Modern learning spaces designed for focus and growth.</h2>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {campuses.map((campus) => (
              <div key={campus.name} className="premium-panel p-7 h-full flex flex-col group hover:border-accent/30 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 flex shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent group-hover:bg-accent group-hover:text-white transition-colors">
                    <MapPin size={18} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{campus.name}</h3>
                </div>
                <p className="text-sm text-slate-600 mb-5">{campus.address}</p>
                <div className="flex-1 space-y-3">
                  {campus.features.map((f) => (
                    <div key={f} className="flex items-center gap-3 text-sm text-slate-700 font-medium">
                      <CheckCircle2 size={16} className="text-primary shrink-0" />{f}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-space">
        <div className="container-shell">
          <div className="overflow-hidden rounded-[36px] bg-gradient-to-br from-primary to-accent px-8 py-12 text-white text-center md:px-14 md:py-16 relative shadow-2xl shadow-primary/20">
            <div className="absolute inset-0 opacity-10 fine-grid mix-blend-overlay"></div>
            <div className="relative z-10">
              <h2 className="text-3xl font-black md:text-5xl tracking-tight">Ready to start your journey with us?</h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-white/90">Book a free consultation with our academic advisors. We&apos;ll help you find the perfect course and batch.</p>
              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Link href="/contact" className="secondary-btn bg-white text-primary border-white hover:text-primary hover:bg-slate-50 text-base px-8 py-4 shadow-xl">Book Free Consultation</Link>
                <Link href="/courses" className="primary-btn bg-slate-950 hover:bg-slate-900 text-white border-0 text-base px-8 py-4 shadow-xl">Explore Courses <ArrowRight size={18} /></Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
