import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Calendar, Clock, User } from "lucide-react";
import { getPublicImageUrl } from "@/lib/imageUrl";
import { fetchPublicJson } from "@/lib/serverApi";
import LearningHubClient from "@/components/blog/LearningHubClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Learning Hub — PTE & IELTS Tips, Resources & Guides",
  description:
    "Expert PTE and IELTS preparation tips, strategies, free resources, PDFs, and practice materials from Language Academy Bangladesh.",
  alternates: { canonical: "https://languageacademy.com.bd/blog" },
  openGraph: {
    title: "Learning Hub — Language Academy",
    description: "Free guides, PDFs, strategies, and expert tips for PTE and IELTS preparation.",
    url: "https://languageacademy.com.bd/blog",
    images: [{ url: "/hero_banner.webp", width: 1200, height: 630, alt: "Language Academy Learning Hub" }],
  },
};

async function getBlogs() {
  return fetchPublicJson("/api/public/blog", { fallback: [], requireNonEmptyArray: true });
}

async function getResources() {
  return fetchPublicJson("/api/public/resources", { fallback: [] });
}

export default async function LearningHubPage() {
  const blogs = await getBlogs();
  const resources = await getResources();

  return <LearningHubClient blogs={blogs} resources={resources} />;
}
