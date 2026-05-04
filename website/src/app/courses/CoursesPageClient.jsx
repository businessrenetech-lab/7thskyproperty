"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import AnimateOnScroll, { StaggerContainer, StaggerItem } from "@/components/AnimateOnScroll";
import CourseCard from "@/components/CourseCard";
import SectionHeading from "@/components/SectionHeading";

export default function CoursesPageClient({ initialCourses }) {
  const [courses, setCourses] = useState(initialCourses || []);
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Client-side fallback: re-fetch if SSR delivered empty data
  useEffect(() => {
    if (!initialCourses || initialCourses.length === 0) {
      fetch("/api/public/courses")
        .then((res) => res.ok ? res.json() : [])
        .then((data) => { if (data.length > 0) setCourses(data); })
        .catch(() => {});
    }
  }, [initialCourses]);

  const categories = ["All", "PTE", "IELTS", "Spoken English"];

  const filteredCourses = courses.filter((c) => {
    const matchCategory = activeCategory === "All" || c.category === activeCategory;
    const matchSearch = !searchQuery || c.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div className="pb-24 pt-10 md:pt-14">
      {/* Filter Bar */}
      <section className="pb-8">
        <div className="container-shell">
          <AnimateOnScroll variant="fade-up">
            <div className="premium-panel p-4 md:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setActiveCategory(category)}
                      className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-200 ${activeCategory === category ? "bg-primary text-white shadow-md" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search courses..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-full border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary lg:w-64"
                  />
                </div>
              </div>
            </div>
          </AnimateOnScroll>
        </div>
      </section>

      {/* Course Grid */}
      <section>
        <div className="container-shell">
          {filteredCourses.length === 0 ? (
            <div className="premium-panel px-8 py-16 text-center">
              <h3 className="text-2xl font-bold text-slate-900">No courses found</h3>
              <p className="mt-3 text-slate-500">Try a different filter or contact us for latest batch info.</p>
              <Link href="/contact" className="primary-btn mt-6">Contact Us</Link>
            </div>
          ) : (
            <StaggerContainer className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredCourses.map((course) => (
                <StaggerItem key={course.id}>
                  <CourseCard course={course} />
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}
        </div>
      </section>

      {/* Compare CTA */}
      <section className="section-space">
        <div className="container-shell">
          <AnimateOnScroll variant="scale">
            <div className="overflow-hidden rounded-[36px] bg-slate-950 px-8 py-12 text-white text-center md:px-14 md:py-16">
              <h2 className="text-3xl font-extrabold md:text-4xl">Not sure which course is right for you?</h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-slate-300">Our advisors will help you compare programs, choose the right batch, and create a personalized study plan.</p>
              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Link href="/contact" className="accent-btn text-base px-8 py-4">Book Free Consultation <ArrowRight size={18} /></Link>
                <Link href="/enroll" className="secondary-btn border-white/20 bg-white/10 text-white hover:border-white text-base px-8 py-4">Enroll Now</Link>
              </div>
            </div>
          </AnimateOnScroll>
        </div>
      </section>
    </div>
  );
}
