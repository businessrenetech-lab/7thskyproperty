import React from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Calendar, ArrowLeft, Clock, BookOpen, ChevronRight } from "lucide-react";
import JsonLd, { breadcrumbSchema } from "@/components/JsonLd";
import { getAbsolutePublicImageUrl, getPublicImageUrl } from "@/lib/imageUrl";
import { fetchPublicJson } from "@/lib/serverApi";
import TableOfContents from "@/components/blog/TableOfContents";
import BlogCard from "@/components/blog/BlogCard";
import ShareButtons from "@/components/blog/ShareButtons";

export const dynamic = "force-dynamic";

async function getBlogDetails(slug) {
  return fetchPublicJson(`/api/public/blog/${slug}`, { fallback: null });
}

async function getRelatedBlogs(currentSlug) {
  const data = await fetchPublicJson("/api/public/blog", { fallback: [], requireNonEmptyArray: true });
  return data.filter(b => b.slug !== currentSlug).slice(0, 3);
}

export async function generateMetadata({ params }) {
  const blog = await getBlogDetails(params.slug);
  if (!blog) return { title: "Post Not Found" };
  return {
    title: blog.seo_title || blog.title,
    description: blog.seo_description || blog.excerpt || `Read ${blog.title} on Language Academy Blog.`,
    alternates: { canonical: `https://languageacademy.com.bd/blog/${params.slug}` },
    openGraph: {
      type: "article",
      title: blog.seo_title || blog.title,
      description: blog.seo_description || blog.excerpt,
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

  const relatedBlogs = await getRelatedBlogs(params.slug);

  const formattedDate = new Date(blog.published_at || new Date()).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Parse tags if they come as a JSON string from the API
  const parsedTags = (() => {
    if (Array.isArray(blog.tags)) return blog.tags;
    if (typeof blog.tags === 'string') {
      try { return JSON.parse(blog.tags); } catch { return []; }
    }
    return [];
  })();

  return (
    <>
      <JsonLd data={breadcrumbSchema([
        { name: "Home", url: "https://languageacademy.com.bd" },
        { name: "Learning Hub", url: "https://languageacademy.com.bd/blog" },
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

      <div className="blog-detail-page">

        {/* ─── Breadcrumb Bar ─── */}
        <div className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-[124px] md:top-[138px] z-30">
          <div className="container-shell max-w-6xl">
            <nav className="flex items-center gap-2 py-3 text-[13px] text-slate-500 overflow-x-auto hide-scrollbar">
              <Link href="/" className="hover:text-slate-800 transition-colors whitespace-nowrap">Home</Link>
              <ChevronRight size={12} className="text-slate-300 flex-shrink-0" />
              <Link href="/blog" className="hover:text-slate-800 transition-colors whitespace-nowrap">Learning Hub</Link>
              <ChevronRight size={12} className="text-slate-300 flex-shrink-0" />
              {blog.category && (
                <>
                  <span className="text-slate-400 whitespace-nowrap">{blog.category}</span>
                  <ChevronRight size={12} className="text-slate-300 flex-shrink-0" />
                </>
              )}
              <span className="text-slate-800 font-medium truncate max-w-[200px] md:max-w-[400px]">{blog.title}</span>
            </nav>
          </div>
        </div>

        {/* ─── Hero Section ─── */}
        <header className="relative bg-gradient-to-b from-slate-50 to-white">
          <div className="container-shell max-w-6xl pt-8 pb-6 md:pt-12 md:pb-8">
            <div className="max-w-4xl">

            {/* Back Link */}
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-[13px] font-semibold text-slate-500 hover:text-primary transition-colors mb-6 group"
            >
              <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-1" />
              Back to Learning Hub
            </Link>

            {/* Category + Meta */}
            <div className="flex flex-wrap items-center gap-3 mb-5">
              {blog.category && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/8 text-primary rounded-full font-bold uppercase tracking-wider text-[11px] border border-primary/10">
                  <BookOpen size={11} />
                  {blog.category}
                </span>
              )}
              <div className="flex items-center gap-4 text-[13px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Calendar size={13} />
                  {formattedDate}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock size={13} />
                  {blog.reading_time || 5} min read
                </span>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-[1.75rem] sm:text-[2rem] md:text-[2.25rem] lg:text-[2.5rem] font-extrabold text-slate-900 leading-[1.2] tracking-tight mb-4">
              {blog.title}
            </h1>

            {/* Excerpt */}
            {blog.excerpt && (
              <p className="text-[15px] md:text-base text-slate-500 leading-relaxed max-w-2xl mb-5">
                {blog.excerpt}
              </p>
            )}

            {/* Tags */}
            {parsedTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-5">
                {parsedTags.map(tag => (
                  <span key={tag} className="text-[11px] font-medium bg-slate-100 text-slate-500 px-2.5 py-1 rounded-md border border-slate-200/60 hover:bg-slate-200/80 transition-colors cursor-default">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Course CTA */}
            {blog.course_relation && (
              <Link
                href={`/courses`}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-primary to-emerald-500 text-white font-semibold px-5 py-2.5 rounded-xl text-[13px] hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 transition-all"
              >
                <BookOpen size={14} />
                Explore {blog.course_relation} Courses
                <ChevronRight size={14} />
              </Link>
            )}
            </div>
          </div>

          {/* Hero Image — full width within max-width container */}
          <div className="container-shell max-w-6xl pb-8 md:pb-12">
            <div className="aspect-[2/1] sm:aspect-[2.2/1] w-full overflow-hidden rounded-2xl md:rounded-3xl relative shadow-xl shadow-slate-200/50 ring-1 ring-slate-200/50">
              <Image
                src={getPublicImageUrl(blog.image_url)}
                alt={blog.title}
                fill
                sizes="(max-width: 768px) 100vw, 1152px"
                className="object-cover"
                priority
                unoptimized
              />
              {/* Subtle gradient overlay for polish */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent" />
            </div>
          </div>
        </header>

        {/* ─── Content Area ─── */}
        <div className="container-shell max-w-6xl">
          <div className="flex flex-col lg:flex-row gap-10 lg:gap-14 justify-between">

            {/* Main Article Column */}
            <article className="flex-1 min-w-0 max-w-3xl pb-16">
              {/* Article Body */}
              <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm">
                {blog.content ? (
                  <div
                    className="
                      blog-prose
                      prose prose-slate max-w-none
                      px-6 py-8 sm:px-8 sm:py-10 md:px-10 md:py-12

                      prose-headings:font-extrabold prose-headings:tracking-tight prose-headings:text-slate-900
                      prose-h2:text-[1.3rem] prose-h2:md:text-[1.45rem] prose-h2:mt-10 prose-h2:mb-4 prose-h2:pb-3 prose-h2:border-b prose-h2:border-slate-100
                      prose-h3:text-[1.1rem] prose-h3:md:text-[1.2rem] prose-h3:mt-7 prose-h3:mb-3
                      prose-h4:text-[1rem] prose-h4:mt-6 prose-h4:mb-2

                      prose-p:text-[15px] prose-p:md:text-[15.5px] prose-p:leading-[1.8] prose-p:text-slate-600 prose-p:mb-4
                      prose-a:text-primary prose-a:font-semibold prose-a:no-underline hover:prose-a:underline prose-a:transition-colors
                      prose-strong:text-slate-800 prose-strong:font-bold

                      prose-ul:my-4 prose-ul:pl-0
                      prose-ol:my-4 prose-ol:pl-0
                      prose-li:text-[15px] prose-li:md:text-[15.5px] prose-li:leading-[1.75] prose-li:text-slate-600 prose-li:mb-1.5
                      prose-li:marker:text-primary/50

                      prose-img:rounded-xl prose-img:shadow-md prose-img:my-6
                      prose-blockquote:border-l-[3px] prose-blockquote:border-primary/40 prose-blockquote:bg-primary/[0.03] prose-blockquote:pl-5 prose-blockquote:py-3 prose-blockquote:rounded-r-xl prose-blockquote:not-italic prose-blockquote:text-slate-600

                      prose-code:bg-slate-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-[13px] prose-code:font-medium prose-code:text-slate-700 prose-code:before:content-none prose-code:after:content-none

                      prose-table:w-full prose-table:text-[14px] prose-table:border-collapse
                      prose-th:bg-slate-50 prose-th:text-slate-700 prose-th:font-bold prose-th:text-left prose-th:px-4 prose-th:py-3 prose-th:border prose-th:border-slate-200
                      prose-td:px-4 prose-td:py-3 prose-td:border prose-td:border-slate-200 prose-td:text-slate-600
                    "
                    dangerouslySetInnerHTML={{ __html: blog.content }}
                  />
                ) : (
                  <div className="px-8 py-16 text-center">
                    <BookOpen size={40} className="mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-500 text-[15px]">
                      Content is being prepared. Stay tuned!
                    </p>
                  </div>
                )}
              </div>

              {/* Share Section */}
              <ShareButtons />

              {/* Author Card */}
              <div className="mt-6 bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 flex items-center gap-5">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-emerald-400 flex items-center justify-center flex-shrink-0 shadow-md shadow-primary/20">
                  <span className="text-white font-bold text-lg">LA</span>
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-[15px]">Language Academy Bangladesh</p>
                  <p className="text-[13px] text-slate-400 leading-relaxed mt-0.5">
                    Expert PTE & IELTS preparation with proven strategies and unlimited mock tests.
                  </p>
                </div>
              </div>
            </article>

            {/* Sticky Table of Contents */}
            <TableOfContents content={blog.content} />
          </div>
        </div>

        {/* ─── Related Posts ─── */}
        {relatedBlogs.length > 0 && (
          <section className="border-t border-slate-200/60 bg-slate-50/50 mt-8">
            <div className="container-shell max-w-7xl py-14 md:py-20">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
                  Continue Reading
                </h2>
                <Link
                  href="/blog"
                  className="hidden sm:inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  View all articles
                  <ChevronRight size={14} />
                </Link>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {relatedBlogs.map((b) => (
                  <BlogCard key={b.id} blog={b} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ─── CTA Banner ─── */}
        <section className="bg-white">
          <div className="container-shell max-w-4xl py-14 md:py-20">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-8 py-14 md:px-14 md:py-16 text-center">
              {/* Decorative Glow */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-primary/25 rounded-full blur-[120px]" />
              <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-400/15 rounded-full blur-[120px]" />

              <div className="relative z-10">
                <span className="inline-block rounded-full bg-white/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-white/70 mb-5">
                  Start Your Journey
                </span>
                <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mb-4">
                  Ready to ace your {blog.category || 'English'} exam?
                </h2>
                <p className="mx-auto max-w-lg text-[15px] text-slate-300 leading-relaxed mb-8">
                  Join Language Academy and prepare with expert trainers, proven strategies, and unlimited mock tests.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link
                    href="/courses"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-white px-7 py-3 text-[14px] font-semibold transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/30 w-full sm:w-auto"
                  >
                    Explore Courses
                    <ChevronRight size={16} />
                  </Link>
                  <Link
                    href="/contact"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 text-white px-7 py-3 text-[14px] font-semibold transition-all hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/10 w-full sm:w-auto"
                  >
                    Book Consultation
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
