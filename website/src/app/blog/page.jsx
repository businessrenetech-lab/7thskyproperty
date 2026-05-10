import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Calendar, Clock, User } from "lucide-react";
import { getApiBase } from "@/lib/api";
import { getPublicImageUrl } from "@/lib/imageUrl";
import LearningHubClient from "@/components/blog/LearningHubClient";

export const metadata = {
  title: "Learning Hub — PTE & IELTS Tips, Resources & Guides",
  description:
    "Expert PTE and IELTS preparation tips, strategies, free resources, PDFs, and practice materials from Language Academy Bangladesh.",
  alternates: { canonical: "https://languageacademy.com.bd/blog" },
  openGraph: {
    title: "Learning Hub — Language Academy",
    description: "Free guides, PDFs, strategies, and expert tips for PTE and IELTS preparation.",
    url: "https://languageacademy.com.bd/blog",
    images: [{ url: "/hero_banner.png", width: 1200, height: 630, alt: "Language Academy Learning Hub" }],
  },
};

async function getBlogs() {
  try {
    const res = await fetch(`${getApiBase()}/api/public/blog`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    return res.json();
  } catch (error) {
    console.error("Error fetching blogs:", error);
    return [];
  }
}

async function getResources() {
  try {
    const res = await fetch(`${getApiBase()}/api/public/resources`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    return res.json();
  } catch (error) {
    console.error("Error fetching resources:", error);
    return [];
  }
}

export default async function LearningHubPage() {
  const blogs = await getBlogs();
  const resources = await getResources();

  return <LearningHubClient blogs={blogs} resources={resources} />;
}
