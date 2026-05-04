import React from "react";
import HomepageClient from "./HomepageClient";
import JsonLd, { faqSchema, breadcrumbSchema } from "@/components/JsonLd";
import { getApiBase } from "@/lib/api";

export const dynamic = "force-dynamic";

/* ─── Homepage SEO Metadata ────────────────────────────────── */
export const metadata = {
  title: "Best PTE Coaching Centre in Bangladesh | Language Academy Dhaka",
  description:
    "Language Academy is the #1 PTE coaching centre in Dhaka, Bangladesh. Expert-led PTE Academic, IELTS preparation, and Spoken English courses — online & offline. Small batches, AI mock tests, and 94% target-score success rate. Located in Dhanmondi, Dhaka.",
  keywords: [
    "best PTE coaching centre Bangladesh",
    "PTE coaching Dhaka",
    "PTE classes near me",
    "IELTS coaching Dhaka",
    "IELTS preparation Bangladesh",
    "Spoken English Dhaka",
    "Language Academy",
    "PTE mock test Bangladesh",
    "English language school Dhaka",
    "best IELTS coaching centre Bangladesh",
    "PTE Academic preparation Dhaka",
    "study abroad Bangladesh",
    "PTE classes online",
    "language institute Dhanmondi",
  ],
  alternates: {
    canonical: "https://languageacademy.com.bd",
  },
  openGraph: {
    title: "Best PTE Coaching Centre in Bangladesh — Language Academy Dhaka",
    description:
      "Expert-led PTE, IELTS, and Spoken English courses in Dhaka. Online & offline classes. 94% success rate. Book a free consultation!",
    url: "https://languageacademy.com.bd",
    images: [{ url: "/hero_banner.png", width: 1200, height: 630, alt: "Language Academy — Best PTE Coaching Centre in Dhaka, Bangladesh" }],
  },
};

/* ─── Homepage FAQ data (for structured data) ──────────────── */
const homeFaqs = [
  ["What skills are tested in the PTE Listening section?", "Identifying key information from spoken audio clips, understanding different English accents, accurate note-taking under time pressure, identifying errors in spoken content, writing from dictation, and selecting the most appropriate summary."],
  ["How do I choose the right course?", "Start with a free consultation. Our academic advisors assess your current level, timeline, and target score to recommend the perfect course and batch for you."],
  ["Do you offer flexible schedules?", "Yes. We run weekday morning, afternoon, and weekend batches so you can fit serious preparation into your busy routine."],
  ["Is mock test support included?", "Absolutely. All courses include AI-scored full-length mock tests, detailed analytics, and trainer-led review sessions."],
  ["What is the class size?", "We maintain a maximum of 12 students per cohort to ensure personalized attention, stronger accountability, and faster improvement."],
];

async function getFeaturedCourses() {
  try {
    const res = await fetch(`${getApiBase()}/api/public/courses`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.slice(0, 6);
  } catch (error) {
    console.error("Error fetching courses:", error);
    return [];
  }
}

async function getRecentBlogs() {
  try {
    const res = await fetch(`${getApiBase()}/api/public/blog`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.slice(0, 3);
  } catch (error) {
    console.error("Error fetching blogs:", error);
    return [];
  }
}

export default async function Home() {
  const featuredCourses = await getFeaturedCourses();
  const recentBlogs = await getRecentBlogs();

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
