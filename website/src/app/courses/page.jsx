import CoursesPageClient from "./CoursesPageClient";
import JsonLd, { courseListSchema, breadcrumbSchema } from "@/components/JsonLd";
import { getApiBase } from "@/lib/api";
import { COURSE_FALLBACKS } from "@/lib/courseFallbacks";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Courses — PTE, IELTS & Spoken English Programs in Dhaka",
  description:
    "Explore premium PTE Academic, IELTS preparation, and Spoken English courses at Language Academy, the best PTE coaching centre in Bangladesh. Expert faculty, small batches (max 12), AI mock tests, online & offline classes.",
  alternates: { canonical: "https://languageacademy.com.bd/courses" },
  openGraph: {
    title: "PTE, IELTS & Spoken English Courses — Language Academy Dhaka",
    description: "Find the right course for your English proficiency goals. Small batches, AI mocks, certified faculty. Enroll online.",
    url: "https://languageacademy.com.bd/courses",
    images: [{ url: "/pte_course.png", width: 1200, height: 630, alt: "Language Academy Courses" }],
  },
};

async function getCourses() {
  try {
    const res = await fetch(`${getApiBase()}/api/public/courses`, { cache: "no-store" });
    if (!res.ok) return COURSE_FALLBACKS;
    const data = await res.json();
    return Array.isArray(data) && data.length > 0 ? data : COURSE_FALLBACKS;
  } catch (error) {
    console.error("Error fetching courses:", error);
    return COURSE_FALLBACKS;
  }
}

export default async function CoursesPage() {
  const courses = await getCourses();

  return (
    <>
      {/* ItemList schema — shows courses as rich cards in Google search */}
      {courses.length > 0 && <JsonLd data={courseListSchema(courses)} />}
      <JsonLd data={breadcrumbSchema([
        { name: "Home", url: "https://languageacademy.com.bd" },
        { name: "Courses", url: "https://languageacademy.com.bd/courses" },
      ])} />
      <CoursesPageClient initialCourses={courses} />
    </>
  );
}
