import CoursesPageClient from "./CoursesPageClient";
import JsonLd, { courseListSchema, breadcrumbSchema } from "@/components/JsonLd";
import { COURSE_FALLBACKS } from "@/lib/courseFallbacks";
import { fetchPublicJson } from "@/lib/serverApi";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Courses - PTE Preparation, IELTS & English Language Programs in Dhaka",
  description:
    "Explore PTE-focused courses at Language Academy Bangladesh, with IELTS preparation and English language courses also available. Small batches, unlimited mock tests, online and offline classes in Dhaka.",
  alternates: { canonical: "https://languageacademy.com.bd/courses" },
  openGraph: {
    title: "PTE-Focused Courses - Language Academy Bangladesh",
    description: "Find the right PTE course, with IELTS and English language programs also available. Small batches, unlimited mock tests, and certified faculty.",
    url: "https://languageacademy.com.bd/courses",
    images: [{ url: "/pte_course.webp", width: 1200, height: 630, alt: "Language Academy Courses" }],
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
