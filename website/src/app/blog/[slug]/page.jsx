import React from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Calendar, User, ArrowLeft, Clock, Share2, Facebook, Twitter, Linkedin } from "lucide-react";
import JsonLd, { breadcrumbSchema } from "@/components/JsonLd";
import { getApiBase } from "@/lib/api";
import { getAbsolutePublicImageUrl, getPublicImageUrl } from "@/lib/imageUrl";

async function getBlogDetails(slug) {
  try {
    const res = await fetch(`${getApiBase()}/api/public/blog/${slug}`, { next: { revalidate: 60 } });
    if (!res.ok) { if (res.status === 404) return null; throw new Error("Failed"); }
    return res.json();
  } catch (error) { console.error("Error:", error); return null; }
}

async function getRelatedBlogs() {
  try {
    const res = await fetch(`${getApiBase()}/api/public/blog`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.slice(0, 3);
  } catch { return []; }
}

export async function generateMetadata({ params }) {
  const blog = await getBlogDetails(params.slug);
  if (!blog) return { title: "Post Not Found" };
  return {
    title: blog.title,
    description: blog.excerpt || `Read ${blog.title} on Language Academy Blog.`,
    alternates: { canonical: `https://languageacademy.com.bd/blog/${params.slug}` },
    openGraph: {
      type: "article",
      title: blog.title,
      description: blog.excerpt || `Read ${blog.title} on Language Academy Blog.`,
      url: `https://languageacademy.com.bd/blog/${params.slug}`,
      images: [{ url: getAbsolutePublicImageUrl(blog.image_url), width: 1200, height: 630, alt: blog.title }],
      publishedTime: blog.published_at,
      authors: ["Language Academy Bangladesh"],
    },
  };
}

export default async function BlogDetailPage({ params }) {
  const blog = await getBlogDetails(params.slug);
  if (!blog) notFound();

  const relatedBlogs = await getRelatedBlogs();
  const filtered = relatedBlogs.filter((b) => b.slug !== params.slug).slice(0, 2);

  return (
    <>
    <JsonLd data={breadcrumbSchema([
      { name: "Home", url: "https://languageacademy.com.bd" },
      { name: "Blog", url: "https://languageacademy.com.bd/blog" },
      { name: blog.title, url: `https://languageacademy.com.bd/blog/${blog.slug}` },
    ])} />
    <JsonLd data={{
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": blog.title,
      "description": blog.excerpt,
      "image": getAbsolutePublicImageUrl(blog.image_url),
      "datePublished": blog.published_at,
      "dateModified": blog.updated_at || blog.published_at,
      "author": { "@type": "Organization", "name": "Language Academy Bangladesh", "url": "https://languageacademy.com.bd" },
      "publisher": { "@type": "Organization", "name": "Language Academy Bangladesh", "logo": { "@type": "ImageObject", "url": "https://languageacademy.com.bd/logo.png" } },
      "mainEntityOfPage": { "@type": "WebPage", "@id": `https://languageacademy.com.bd/blog/${blog.slug}` },
    }} />
    <div className="pb-24">
      <article className="container-shell max-w-4xl pt-8">
        {/* Back Link */}
        <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-semibold text-primary mb-8 transition hover:gap-3">
          <ArrowLeft size={16} /> Back to Blog
        </Link>

        {/* Header */}
        <header className="mb-10">
          <div className="flex items-center gap-5 text-sm text-slate-500 font-medium mb-6">
            <span className="flex items-center gap-2"><Calendar size={16} className="text-primary" />{new Date(blog.published_at || new Date()).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
            <span className="flex items-center gap-2"><User size={16} className="text-primary" />Language Academy</span>
            <span className="flex items-center gap-2"><Clock size={16} className="text-primary" />5 min read</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 leading-tight mb-8">{blog.title}</h1>

          {blog.excerpt && (
            <p className="text-lg text-slate-600 leading-8 mb-8">{blog.excerpt}</p>
          )}

          <div className="aspect-[21/9] w-full overflow-hidden rounded-3xl relative shadow-lg">
            <Image src={getPublicImageUrl(blog.image_url)} alt={blog.title} fill sizes="100vw" className="object-cover" priority unoptimized />
          </div>
        </header>

        {/* Content */}
        <div className="premium-panel p-8 md:p-12">
          {blog.content ? (
            <div className="prose prose-lg prose-slate max-w-none prose-headings:font-extrabold prose-a:text-primary prose-img:rounded-2xl" dangerouslySetInnerHTML={{ __html: blog.content }} />
          ) : (
            <p className="text-slate-600 leading-relaxed text-lg">Content is being prepared for this article. Please stay tuned as our editorial team is working on valuable insights.</p>
          )}
        </div>

        {/* Share */}
        <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-8">
          <p className="text-sm font-semibold text-slate-700">Share this article</p>
          <div className="flex gap-3">
            {[
              { icon: "f", label: "Facebook", color: "bg-[#1877F2]" },
              { icon: "t", label: "Twitter", color: "bg-[#1DA1F2]" },
              { icon: "in", label: "LinkedIn", color: "bg-[#0A66C2]" },
            ].map((s) => (
              <button key={s.label} className={`flex h-10 w-10 items-center justify-center rounded-full ${s.color} text-white text-xs font-bold transition hover:opacity-80`} aria-label={`Share on ${s.label}`}>
                {s.icon}
              </button>
            ))}
          </div>
        </div>

        {/* Related Posts */}
        {filtered.length > 0 && (
          <div className="mt-16">
            <h3 className="text-2xl font-extrabold text-slate-900 mb-6">Related Articles</h3>
            <div className="grid gap-6 md:grid-cols-2">
              {filtered.map((b) => (
                <div key={b.id} className="premium-panel overflow-hidden flex flex-col h-full group">
                  <div className="aspect-[16/9] relative overflow-hidden">
                    <Image src={getPublicImageUrl(b.image_url)} alt={b.title} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-105" unoptimized />
                  </div>
                  <div className="p-6 flex flex-col flex-1">
                    <h4 className="text-lg font-bold text-slate-900 group-hover:text-primary transition line-clamp-2">
                      <Link href={`/blog/${b.slug}`}>{b.title}</Link>
                    </h4>
                    <p className="mt-2 text-sm text-slate-600 line-clamp-2 flex-1">{b.excerpt}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </article>
    </div>
    </>
  );
}
