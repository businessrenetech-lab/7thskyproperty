import React from "react";
import HomepageClient from "./HomepageClient";
import JsonLd, { faqSchema, breadcrumbSchema } from "@/components/JsonLd";
import { getApiBase } from "@/lib/api";
import { COURSE_FALLBACKS } from "@/lib/courseFallbacks";

export const revalidate = 300;

const HOMEPAGE_REVALIDATE_SECONDS = 300;
const isProductionBuild = process.env.NEXT_PHASE === "phase-production-build";

/* ─── Homepage SEO Metadata ────────────────────────────────── */
export const metadata = {
  title: "Best PTE Coaching Centre in Dhaka | PTE Practice Online — Language Academy",
  description:
    "Score 79+ with the best PTE coaching centre in Dhaka. PTE practice online with AI-scored mock tests, expert trainers & small batches. IELTS preparation & online PTE course available. Book free consultation!",
  keywords: [
    "PTE practice online",
    "best PTE coaching centre Dhaka",
    "PTE coaching centre Dhaka",
    "PTE course Dhaka",
    "online PTE course Bangladesh",
    "best PTE coaching",
    "PTE Academic preparation Dhaka",
    "PTE mock test online Bangladesh",
    "IELTS coaching Dhaka",
    "IELTS preparation Bangladesh",
    "best IELTS coaching centre Bangladesh",
    "Spoken English course Dhaka",
    "study abroad Bangladesh",
    "PTE classes online Bangladesh",
    "PTE coaching near me Dhanmondi",
    "PTE vs IELTS Bangladesh",
    "PTE score for Australia migration",
    "study abroad from Bangladesh",
    "English proficiency test Dhaka",
    "PTE training centre Dhaka",
    "IELTS 7 band preparation Bangladesh",
    "PTE score requirement Australia PR",
    "PTE exam preparation Bangladesh",
    "affordable PTE coaching Dhaka",
    "PTE weekend batch Dhaka",
    "PTE online classes AI feedback",
    "Language Academy Bangladesh",
    "language institute Dhanmondi Dhaka",
    "how to get 79+ in PTE",
    "PTE coaching with mock tests Dhaka",
  ],
  alternates: {
    canonical: "https://languageacademy.com.bd",
  },
  openGraph: {
    title: "Best PTE Coaching Centre Dhaka | PTE Practice Online — Language Academy",
    description:
      "Score 79+ with the best PTE coaching in Dhaka. AI mock tests, expert trainers, small batches & online PTE courses. IELTS preparation available. Enroll now!",
    url: "https://languageacademy.com.bd",
    images: [{ url: "/hero_banner.webp", width: 1200, height: 630, alt: "PTE Practice Online - Best PTE Coaching Centre Dhaka - Language Academy Bangladesh" }],
  },
};

/* ─── Homepage FAQ data (for structured data) ──────────────── */
const homeFaqs = [
  ["What is the best PTE coaching centre in Dhaka?", "Language Academy Bangladesh in Dhanmondi, Dhaka is a top-rated PTE coaching centre offering AI-scored mock tests, expert trainers, and small batches of max 12 students. We offer both online and offline PTE courses for students and professionals."],
  ["Can I practice PTE online from Bangladesh?", "Yes! Language Academy offers PTE practice online with AI-scored full-length mock tests, detailed analytics, and expert-led review sessions. Our online PTE course gives you the same curriculum, AI mock tests, and trainer support as in-person learners."],
  ["How do I choose the right PTE or IELTS course?", "Start with a free consultation. Our academic advisors assess your current English level, timeline, and target score to recommend the perfect PTE or IELTS course and batch for you."],
  ["Do you offer flexible PTE coaching schedules?", "Yes. We run weekday morning, afternoon, and weekend PTE batches so you can fit serious PTE preparation into your busy routine. Both online and offline classes are available."],
  ["Is AI mock test support included in PTE coaching?", "Absolutely. All PTE courses at Language Academy include unlimited AI-scored full-length mock tests, detailed analytics, and trainer-led review sessions — the best PTE practice online experience in Bangladesh."],
  ["What is the class size in your PTE coaching centre?", "We maintain a maximum of 12 students per cohort to ensure personalized PTE coaching attention, stronger accountability, and faster score improvement."],
  ["What is the difference between PTE and IELTS?", "PTE Academic is fully computer-based with AI scoring and results in 1\u20132 days, while IELTS has a face-to-face speaking test with results in 3\u201313 days. Both are accepted worldwide. PTE is especially popular for Australia and New Zealand immigration. Language Academy prepares you for both."],
  ["What PTE score do I need to study abroad in Australia?", "For Australian student visas, you typically need a PTE score of 50\u201365 depending on the course. For Skilled Migration (PR), a PTE score of 65+ is generally required. Language Academy's PTE coaching is designed to help you achieve 79+ for maximum migration points."],
  ["Do you offer study abroad consulting from Bangladesh?", "Yes. Along with PTE coaching and IELTS preparation, Language Academy provides study abroad guidance for Australia, Canada, UK, New Zealand, and more. Our advisors help with university selection, visa requirements, and score targets."],
  ["How long does PTE or IELTS preparation take?", "Most students at Language Academy achieve their target PTE or IELTS score within 4\u20138 weeks of focused preparation. The exact timeline depends on your current English level and target score. Our online PTE course offers the same intensive experience."],
];

async function getFeaturedCourses() {
  try {
    const res = await fetch(`${getApiBase()}/api/public/courses`, {
      next: { revalidate: HOMEPAGE_REVALIDATE_SECONDS },
    });
    if (!res.ok) return COURSE_FALLBACKS.slice(0, 6);
    const data = await res.json();
    return (Array.isArray(data) && data.length > 0 ? data : COURSE_FALLBACKS).slice(0, 6);
  } catch (error) {
    if (!isProductionBuild) console.error("Error fetching courses:", error);
    return COURSE_FALLBACKS.slice(0, 6);
  }
}

async function getRecentBlogs() {
  try {
    const res = await fetch(`${getApiBase()}/api/public/blog`, {
      next: { revalidate: HOMEPAGE_REVALIDATE_SECONDS },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.slice(0, 3);
  } catch (error) {
    if (!isProductionBuild) console.error("Error fetching blogs:", error);
    return [];
  }
}

export default async function Home() {
  const [featuredCourses, recentBlogs] = await Promise.all([
    getFeaturedCourses(),
    getRecentBlogs(),
  ]);

  return (
    <>
      {/* FAQ Schema for AI Search — this is what ChatGPT/Perplexity/Google AI Overview parse */}
      <JsonLd data={faqSchema(homeFaqs)} />
      <JsonLd data={breadcrumbSchema([
        { name: "Home", url: "https://languageacademy.com.bd" },
      ])} />
      <HomepageClient courses={featuredCourses} blogs={recentBlogs} />
    </>
  );
}
