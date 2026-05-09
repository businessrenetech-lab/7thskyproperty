import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Calendar, Clock, User } from "lucide-react";
import { getApiBase } from "@/lib/api";
import { getPublicImageUrl } from "@/lib/imageUrl";

export const metadata = {
  title: "Blog & Resources — PTE & IELTS Tips from Dhaka's Best Coaches",
  description:
    "Expert PTE and IELTS preparation tips, strategies, and success stories from Language Academy Bangladesh. Free guides for students preparing for PTE Academic, IELTS, and Spoken English exams.",
  alternates: { canonical: "https://languageacademy.com.bd/blog" },
  openGraph: {
    title: "PTE & IELTS Tips — Language Academy Blog",
    description: "Free guides, strategies, and expert tips for PTE and IELTS preparation from Bangladesh's best coaching centre.",
    url: "https://languageacademy.com.bd/blog",
    images: [{ url: "/hero_banner.png", width: 1200, height: 630, alt: "Language Academy Blog" }],
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

export default async function BlogListingPage() {
  const blogs = await getBlogs();
  const featured = blogs[0] || null;
  const remaining = blogs.slice(1);

  return (
    <div className="pb-24">
      {/* Hero */}
      <section className="pb-12 pt-6 md:pb-16 md:pt-8">
        <div className="container-shell">
          <div className="gradient-hero fine-grid overflow-hidden rounded-[36px] px-8 py-12 text-white md:px-12 md:py-16 text-center">
            <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/85">Blog & Resources</span>
            <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-extrabold leading-tight md:text-6xl">
              Insights, Strategies & Expert Guidance
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-200">
              Tips, techniques, and updates from our academic team to help you prepare smarter and score higher.
            </p>
          </div>
        </div>
      </section>

      <section>
        <div className="container-shell">
          {blogs.length === 0 ? (
            <div className="premium-panel px-8 py-20 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary mb-6">
                <Clock size={32} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">Expert insights coming soon</h3>
              <p className="text-slate-500 mb-8 max-w-md mx-auto">Our editorial team is preparing valuable PTE, IELTS, and language learning strategies. Check back soon!</p>
              <Link href="/courses" className="primary-btn">Explore Courses Instead</Link>
            </div>
          ) : (
            <>
              {/* Featured Post */}
              {featured && (
                <div className="premium-panel overflow-hidden mb-10">
                  <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="aspect-[16/10] lg:aspect-auto relative overflow-hidden">
                      <Image src={getPublicImageUrl(featured.image_url)} alt={featured.title} fill sizes="(min-width: 1024px) 52vw, 100vw" className="object-cover transition-transform duration-500 hover:scale-105" priority unoptimized />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent lg:bg-gradient-to-r" />
                    </div>
                    <div className="p-8 md:p-10 flex flex-col justify-center">
                      <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-accent w-fit mb-4">Featured</span>
                      <h2 className="text-2xl font-extrabold text-slate-900 md:text-3xl line-clamp-2">
                        <Link href={`/blog/${featured.slug}`} className="hover:text-primary transition">{featured.title}</Link>
                      </h2>
                      <p className="mt-4 text-base leading-8 text-slate-600 line-clamp-3">{featured.excerpt || "Read this article to discover valuable insights and strategies."}</p>
                      <div className="mt-6 flex items-center gap-5 text-sm text-slate-500">
                        <span className="flex items-center gap-1.5"><Calendar size={14} />{new Date(featured.published_at || new Date()).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1.5"><Clock size={14} />5 min read</span>
                      </div>
                      <Link href={`/blog/${featured.slug}`} className="primary-btn mt-8 w-fit">Read Article <ArrowRight size={16} /></Link>
                    </div>
                  </div>
                </div>
              )}

              {/* Remaining Posts Grid */}
              {remaining.length > 0 && (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {remaining.map((blog) => (
                    <div key={blog.id} className="premium-panel overflow-hidden flex flex-col h-full group">
                      <div className="aspect-[16/9] relative overflow-hidden">
                        <Image src={getPublicImageUrl(blog.image_url)} alt={blog.title} fill sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-105" unoptimized />
                      </div>
                      <div className="p-6 md:p-7 flex flex-col flex-1">
                        <h3 className="text-lg font-bold text-slate-900 mb-3 group-hover:text-primary transition line-clamp-2">
                          <Link href={`/blog/${blog.slug}`}>{blog.title}</Link>
                        </h3>
                        <p className="text-sm text-slate-600 mb-5 line-clamp-3 flex-1">{blog.excerpt || "Read this article to discover valuable insights."}</p>
                        <div className="flex items-center justify-between text-xs text-slate-500 font-medium pt-5 border-t border-slate-100">
                          <span className="flex items-center gap-1.5"><Calendar size={13} />{new Date(blog.published_at || new Date()).toLocaleDateString()}</span>
                          <Link href={`/blog/${blog.slug}`} className="text-primary hover:text-primary/80 flex items-center gap-1 transition group-hover:translate-x-1">
                            Read More <ArrowRight size={13} />
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="section-space">
        <div className="container-shell">
          <div className="overflow-hidden rounded-[36px] bg-slate-950 px-8 py-12 text-white text-center md:px-14 md:py-16">
            <h2 className="text-3xl font-extrabold md:text-4xl">Want personalized guidance?</h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-slate-300">Our academic advisors can answer all your questions and help you create a study plan tailored to your goals.</p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link href="/contact" className="accent-btn text-base px-8 py-4">Book Free Consultation <ArrowRight size={18} /></Link>
              <Link href="/courses" className="secondary-btn border-white/20 bg-white/10 text-white hover:border-white text-base px-8 py-4">Browse Courses</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
