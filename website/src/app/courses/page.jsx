import CoursesPageClient from "./CoursesPageClient";
import JsonLd, { courseListSchema, breadcrumbSchema } from "@/components/JsonLd";
import { COURSE_FALLBACKS } from "@/lib/courseFallbacks";
import { fetchPublicJson } from "@/lib/serverApi";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Online PTE Course & IELTS Classes in Dhaka | Language Academy",
  description:
    "Explore courses at Language Academy, the best PTE coaching centre in Dhaka. PTE practice online, IELTS preparation, and study abroad consulting available.",
  alternates: { canonical: "https://languageacademy.com.bd/courses" },
  openGraph: {
    title: "Online PTE Course & IELTS Preparation | Language Academy",
    description: "Find the right PTE course with AI mock tests, expert trainers, and small batches. IELTS and study abroad support also available.",
    url: "https://languageacademy.com.bd/courses",
    images: [{ url: "/pte_course.webp", width: 1200, height: 630, alt: "Online PTE Course at Language Academy" }],
  },
};

async function getCourses() {
  const data = await fetchPublicJson("/api/public/courses", { fallback: COURSE_FALLBACKS, requireNonEmptyArray: true });
  return Array.isArray(data) && data.length > 0 ? data : COURSE_FALLBACKS;
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
