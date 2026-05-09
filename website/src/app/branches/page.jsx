import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Clock3, MapPin, Phone, Sparkles } from "lucide-react";
import JsonLd, { breadcrumbSchema } from "@/components/JsonLd";
import { getApiBase } from "@/lib/api";
import { getPublicImageUrl } from "@/lib/imageUrl";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Language Academy Branches - PTE, IELTS and English Courses in Bangladesh",
  description: "Find active Language Academy branches and see branch-specific PTE, IELTS and English courses, schedules, contact details, and booking links.",
  alternates: { canonical: "https://languageacademy.com.bd/branches" },
};

async function getBranches() {
  try {
    const res = await fetch(`${getApiBase()}/api/public/branches`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error fetching branches:", error);
    return [];
  }
}

function BranchCard({ branch }) {
  const branchImage = getPublicImageUrl(branch.hero_image_url, "/hero_banner.png");
  const active = !!branch.is_active;
  const content = (
    <div className="group relative h-full overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_70px_-40px_rgba(15,23,42,0.35)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_30px_90px_-40px_rgba(15,23,42,0.45)]" data-depth="3">
      <div className="relative aspect-[16/10] overflow-hidden">
        <Image src={branchImage} alt={branch.public_title || branch.name} fill sizes="(min-width: 1024px) 33vw, 100vw" className="object-cover transition duration-700 group-hover:scale-105" unoptimized />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/15 to-transparent" aria-hidden="true" />
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3">
          <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.16em] text-slate-900">{branch.type === "head" ? "HQ" : "Branch"}</span>
          <span className={`rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-[0.16em] ${active ? "bg-emerald-500 text-white" : "bg-amber-400 text-slate-950"}`}>{active ? "Open" : "Coming Soon"}</span>
        </div>
      </div>
      <div className="p-7">
        <h2 className="text-2xl font-extrabold text-slate-900">{branch.public_title || `Language Academy ${branch.name}`}</h2>
        <p className="mt-3 line-clamp-3 text-sm leading-7 text-slate-600">{active ? branch.public_description : (branch.coming_soon_message || "Admissions and course schedules for this branch will be announced soon.")}</p>
        <div className="mt-6 space-y-3 text-sm font-medium text-slate-500">
          <p className="flex items-start gap-2"><MapPin size={16} className="mt-1 shrink-0 text-primary" />{branch.address || "Address will be announced soon"}</p>
          {branch.phone && <p className="flex items-center gap-2"><Phone size={16} className="shrink-0 text-primary" />{branch.phone}</p>}
          <p className="flex items-center gap-2"><Clock3 size={16} className="shrink-0 text-primary" />{branch.opening_hours || "Sat-Thu: 9:00 AM - 8:00 PM"}</p>
        </div>
        {active ? (
          <div className="mt-7 inline-flex items-center gap-2 text-sm font-extrabold text-primary">View branch courses <ArrowRight size={16} /></div>
        ) : (
          <div className="mt-7 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">Coming soon</div>
        )}
      </div>
    </div>
  );

  return active ? <Link href={`/branches/${branch.slug || branch.id}`} className="block h-full">{content}</Link> : content;
}

export default async function BranchesPage() {
  const branches = await getBranches();

  return (
    <>
      <JsonLd data={breadcrumbSchema([
        { name: "Home", url: "https://languageacademy.com.bd" },
        { name: "Branches", url: "https://languageacademy.com.bd/branches" },
      ])} />
      <div className="pb-24">
        <section className="relative overflow-hidden pb-14 pt-8 md:pb-20 md:pt-14" data-depth="0">
          <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" aria-hidden="true" data-depth="1" />
          <div className="container-shell text-center" data-depth="4">
            <span className="eyebrow"><Sparkles size={14} /> Branch Network</span>
            <h1 className="mx-auto mt-6 max-w-4xl text-balance text-4xl font-extrabold text-slate-900 md:text-6xl">Choose your Language Academy branch.</h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-600 md:text-lg">Each active branch has its own courses, batches, posts, and booking links. Upcoming locations are marked as coming soon.</p>
          </div>
        </section>

        <section className="container-shell grid gap-6 md:grid-cols-2 lg:grid-cols-3" data-depth="4">
          {branches.map((branch) => <BranchCard key={branch.id} branch={branch} />)}
          {branches.length === 0 && (
            <div className="premium-panel p-10 text-center md:col-span-2 lg:col-span-3">
              <h2 className="text-2xl font-extrabold text-slate-900">No branches found</h2>
              <p className="mt-3 text-slate-500">Please check back soon or contact our main campus.</p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
