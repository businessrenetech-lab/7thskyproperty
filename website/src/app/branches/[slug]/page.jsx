import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowRight, BookOpen, Calendar, Clock3, MapPin, Phone, Star, Users } from "lucide-react";
import JsonLd, { breadcrumbSchema } from "@/components/JsonLd";
import { getPublicImageUrl } from "@/lib/imageUrl";
import { fetchPublicJson } from "@/lib/serverApi";

export const dynamic = "force-dynamic";

async function fetchJson(path, fallback) {
  return fetchPublicJson(path, { fallback, requireNonEmptyArray: Array.isArray(fallback) });
}

async function getBranch(slug) {
  return fetchJson(`/api/public/branches/${slug}`, null);
}

async function getBranchCourses(slug) {
  const data = await fetchJson(`/api/public/branches/${slug}/courses`, []);
  return Array.isArray(data) ? data : [];
}

async function getBranchBlogs(slug) {
  const data = await fetchJson(`/api/public/branches/${slug}/blog`, []);
  return Array.isArray(data) ? data : [];
}

function branchSchema(branch) {
  return {
    "@context": "https://schema.org",
    "@type": ["EducationalOrganization", "LocalBusiness"],
    "name": branch.public_title || `Language Academy ${branch.name}`,
    "url": `https://languageacademy.com.bd/branches/${branch.slug}`,
    "description": branch.seo_description || branch.public_description,
    "telephone": branch.phone || undefined,
    "email": branch.email || undefined,
    "address": branch.address ? {
      "@type": "PostalAddress",
      "streetAddress": branch.address,
      "addressCountry": "BD"
    } : undefined,
    "openingHours": branch.opening_hours || undefined,
  };
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const branch = await getBranch(slug);
  if (!branch) return { title: "Branch Not Found" };

  const title = branch.seo_title || `${branch.public_title || branch.name} - PTE, IELTS and English Courses`;
  const description = branch.seo_description || branch.public_description || `Explore PTE, IELTS and English courses at Language Academy ${branch.name}.`;

  return {
    title,
    description,
    alternates: { canonical: `https://languageacademy.com.bd/branches/${branch.slug || slug}` },
    openGraph: {
      title,
      description,
      url: `https://languageacademy.com.bd/branches/${branch.slug || slug}`,
      images: [{ url: getPublicImageUrl(branch.hero_image_url, "/hero_banner.webp"), width: 1200, height: 630, alt: branch.public_title || branch.name }],
    },
  };
}

function CourseOfferCard({ course, branch }) {
  const image = getPublicImageUrl(course.image_url, course.category === "IELTS" ? "/ielts_course.webp" : "/pte_course.webp");
  return (
    <article className="group overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_20px_60px_-38px_rgba(15,23,42,0.35)] transition hover:-translate-y-1 hover:shadow-[0_28px_80px_-38px_rgba(15,23,42,0.45)]" data-depth="3">
      <div className="relative aspect-[16/10] overflow-hidden">
        <Image src={image} alt={`${course.title} at ${branch.name}`} fill sizes="(min-width: 1024px) 33vw, 100vw" className="object-cover transition duration-700 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent" aria-hidden="true" />
        <div className="absolute bottom-4 left-4 flex gap-2">
          <span className="rounded-full bg-white px-3 py-1 text-xs font-extrabold text-slate-900">{course.category || "PTE"}</span>
          <span className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-extrabold text-white">{course.level || "All Levels"}</span>
        </div>
      </div>
      <div className="p-7">
        <h3 className="text-xl font-extrabold text-slate-900">{course.title}</h3>
        <p className="mt-3 line-clamp-3 text-sm leading-7 text-slate-600">{course.short_description || course.description || `Focused ${course.category || "PTE"} coaching at ${branch.name}.`}</p>
        <div className="mt-5 flex flex-wrap gap-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
          <span className="inline-flex items-center gap-1.5"><Clock3 size={14} className="text-primary" />{course.duration_weeks ? `${course.duration_weeks} weeks` : "Flexible"}</span>
          <span className="inline-flex items-center gap-1.5"><Users size={14} className="text-primary" />Small batch</span>
          <span className="inline-flex items-center gap-1.5"><Star size={14} className="text-amber-400" fill="currentColor" />Mock support</span>
        </div>
        <div className="mt-7 flex items-center justify-between gap-4">
          {course.show_pricing !== false && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Course Fee</p>
            <p className="text-2xl font-extrabold text-slate-900">BDT {Number(course.base_fee || 0).toLocaleString()}</p>
          </div>
          )}
          <Link href={`/enroll?branch=${branch.id}&course=${course.slug || course.id}`} className="ml-auto rounded-full bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-primary">Enroll <ArrowRight size={15} className="inline" /></Link>
        </div>
      </div>
    </article>
  );
}

export default async function BranchDetailPage({ params }) {
  const { slug } = await params;
  const branch = await getBranch(slug);
  if (!branch) notFound();

  const [courses, blogs] = await Promise.all([
    getBranchCourses(branch.slug || slug),
    getBranchBlogs(branch.slug || slug),
  ]);

  const pteCourses = courses.filter((course) => String(course.category || '').toLowerCase().includes('pte'));
  const otherCourses = courses.filter((course) => !String(course.category || '').toLowerCase().includes('pte'));
  const heroImage = getPublicImageUrl(branch.hero_image_url, "/hero_banner.webp");

  return (
    <>
      <JsonLd data={branchSchema(branch)} />
      <JsonLd data={breadcrumbSchema([
        { name: "Home", url: "https://languageacademy.com.bd" },
        { name: "Branches", url: "https://languageacademy.com.bd/branches" },
        { name: branch.name, url: `https://languageacademy.com.bd/branches/${branch.slug}` },
      ])} />
      <div className="pb-24">
        <section className="relative overflow-hidden bg-slate-950 py-16 text-white md:py-24" data-depth="0">
          <Image src={heroImage} alt={branch.public_title || branch.name} fill sizes="100vw" className="object-cover opacity-35" priority />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/88 to-slate-950/40" aria-hidden="true" />
          <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-primary/20 blur-3xl" aria-hidden="true" data-depth="1" />
          <div className="container-shell relative z-10 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end" data-depth="4">
            <div>
              <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.22em] text-white/75">Branch Campus</span>
              <h1 className="mt-6 max-w-3xl text-balance text-4xl font-extrabold md:text-6xl">{branch.public_title || `Language Academy ${branch.name}`}</h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-white/75 md:text-lg">{branch.public_description || `PTE, IELTS and English language courses at our ${branch.name} branch.`}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href={`/student-booking?branch=${branch.id}&source=walk_in&channel=kiosk`} className="accent-btn">Branch Booking Kiosk <ArrowRight size={16} /></Link>
                <Link href={`/enroll?branch=${branch.id}`} className="secondary-btn border-white/25 bg-white/10 text-white hover:bg-white/20">Enroll at this branch</Link>
              </div>
            </div>
            <div className="rounded-[32px] border border-white/10 bg-white/10 p-6 backdrop-blur" data-depth="3">
              <div className="space-y-4 text-sm font-medium text-white/75">
                <p className="flex items-start gap-3"><MapPin className="mt-1 shrink-0 text-accent" size={18} />{branch.address || "Address will be announced soon"}</p>
                {branch.phone && <p className="flex items-center gap-3"><Phone className="shrink-0 text-accent" size={18} />{branch.phone}</p>}
                <p className="flex items-center gap-3"><Clock3 className="shrink-0 text-accent" size={18} />{branch.opening_hours || "Sat-Thu: 9:00 AM - 8:00 PM"}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="container-shell section-space" data-depth="4">
          <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="eyebrow"><BookOpen size={14} /> Branch Courses</p>
              <h2 className="mt-5 text-3xl font-extrabold text-slate-900 md:text-5xl">PTE Courses Offered at {branch.name}</h2>
              <p className="mt-4 max-w-2xl text-slate-600">These courses and schedules are published by the {branch.name} branch only.</p>
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {(pteCourses.length ? pteCourses : courses).map((course) => <CourseOfferCard key={course.id} course={course} branch={branch} />)}
          </div>
          {courses.length === 0 && (
            <div className="premium-panel p-10 text-center">
              <h3 className="text-2xl font-extrabold text-slate-900">Courses will be announced soon</h3>
              <p className="mt-3 text-slate-500">Contact this branch to ask about upcoming PTE, IELTS, and English batches.</p>
            </div>
          )}
        </section>

        {otherCourses.length > 0 && pteCourses.length > 0 && (
          <section className="container-shell pb-20" data-depth="4">
            <h2 className="text-3xl font-extrabold text-slate-900">Other Courses Offered at {branch.name}</h2>
            <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {otherCourses.map((course) => <CourseOfferCard key={course.id} course={course} branch={branch} />)}
            </div>
          </section>
        )}

        {blogs.length > 0 && (
          <section className="bg-slate-50 py-20" data-depth="0">
            <div className="container-shell" data-depth="4">
              <p className="eyebrow"><Calendar size={14} /> Branch Posts</p>
              <h2 className="mt-5 text-3xl font-extrabold text-slate-900 md:text-5xl">Updates from {branch.name}</h2>
              <div className="mt-10 grid gap-6 md:grid-cols-3">
                {blogs.slice(0, 3).map((post) => (
                  <article key={post.id} className="premium-panel p-6">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{post.published_at ? new Date(post.published_at).toLocaleDateString() : "Branch update"}</p>
                    <h3 className="mt-3 text-xl font-extrabold text-slate-900">{post.title}</h3>
                    <p className="mt-3 line-clamp-3 text-sm leading-7 text-slate-600">{post.excerpt || "Read the latest update from this branch."}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="container-shell pt-20" data-depth="4">
          <div className="gradient-hero fine-grid rounded-[36px] p-8 text-white md:p-12">
            <h2 className="text-3xl font-extrabold md:text-5xl">Ready to book at {branch.name}?</h2>
            <p className="mt-4 max-w-2xl text-white/75">Use the branch-specific booking form so your details go directly to this branch team.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={`/student-booking?branch=${branch.id}&source=walk_in&channel=kiosk`} className="accent-btn">Open Branch Booking Form</Link>
              {branch.map_url && <a href={branch.map_url} target="_blank" rel="noreferrer" className="secondary-btn border-white/20 bg-white/10 text-white hover:bg-white/20">Open Map</a>}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
