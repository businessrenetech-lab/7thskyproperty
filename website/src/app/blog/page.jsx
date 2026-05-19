import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Calendar, Clock, User } from "lucide-react";
import { getPublicImageUrl } from "@/lib/imageUrl";
import { fetchPublicJson } from "@/lib/serverApi";
import LearningHubClient from "@/components/blog/LearningHubClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Learning Hub — PTE Practice Online & IELTS Tips | Language Academy",
  description:
    "Free PTE practice online materials, IELTS preparation tips, and study abroad guides from Language Academy, the best PTE coaching centre in Dhaka.",
  alternates: { canonical: "https://languageacademy.com.bd/blog" },
  openGraph: {
    title: "Learning Hub — PTE Practice Online Tips",
    description: "Free guides, PDFs, strategies, and expert tips for PTE and IELTS preparation.",
    url: "https://languageacademy.com.bd/blog",
    images: [{ url: "/hero_banner.webp", width: 1200, height: 630, alt: "PTE Practice Online Tips from Language Academy" }],
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
