"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import {
  SERVICES,
  SERVICE_CATEGORIES,
  getServicesByCategory,
} from "@/lib/servicesData";
import {
  Droplets,
  Wind,
  Palette,
  Compass,
  Landmark,
  ShieldCheck,
  Scroll,
  Truck,
  KeyRound,
  Building2,
  Home,
  Hotel,
  ArrowRight,
  Search,
  CheckCircle2,
  Phone,
  MessageSquare,
  Sparkles,
  Layers,
  MapPin,
} from "lucide-react";

const ICON_MAP = {
  Droplets,
  Wind,
  Palette,
  Compass,
  Landmark,
  ShieldCheck,
  Scroll,
  Truck,
  KeyRound,
  Building2,
  Home,
  Hotel,
};

export default function ServicesDirectoryClient({ initialCategory = "all" }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const currentCategoryQuery = searchParams.get("category") || initialCategory;
  const [activeCategory, setActiveCategory] = useState(currentCategoryQuery);
  const [searchQuery, setSearchQuery] = useState("");

  // Sync state if URL searchParams changes externally
  useEffect(() => {
    const cat = searchParams.get("category");
    if (cat) {
      setActiveCategory(cat);
    } else if (!searchParams.has("category") && initialCategory !== "all") {
      setActiveCategory(initialCategory);
    }
  }, [searchParams, initialCategory]);

  const handleCategorySelect = (catId) => {
    setActiveCategory(catId);
    startTransition(() => {
      const params = new URLSearchParams(window.location.search);
      if (catId === "all") {
        params.delete("category");
      } else {
        params.set("category", catId);
      }
      const qs = params.toString();
      router.replace(`/services${qs ? `?${qs}` : ""}`, { scroll: false });
    });
  };

  // Filter services by category and search
  const filteredServices = SERVICES.filter((service) => {
    const matchesCategory =
      activeCategory === "all" || service.category === activeCategory;

    if (!matchesCategory) return false;

    if (!searchQuery.trim()) return true;

    const q = searchQuery.toLowerCase();
    return (
      service.title.toLowerCase().includes(q) ||
      service.tagline.toLowerCase().includes(q) ||
      service.categoryLabel.toLowerCase().includes(q) ||
      service.keyHighlights.some((h) => h.toLowerCase().includes(q)) ||
      service.coverage.some((c) => c.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* ── HERO BANNER ─────────────────────────────────────────── */}
      <section className="relative border-b border-slate-800 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 px-6 py-16 sm:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-600/10 via-transparent to-transparent pointer-events-none" />
        
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-blue-400 mb-6">
            <Sparkles size={14} /> Full-Spectrum Property Solutions • Resident & Expatriate Care
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white mb-6">
            Engineering Precision & <br className="hidden sm:inline" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-300 to-indigo-500">
              Institutional Care for Your Property.
            </span>
          </h1>

          <p className="max-w-3xl mx-auto text-sm sm:text-base text-slate-400 leading-relaxed mb-10">
            From luxury interior design and turnkey renovations to certified water tank sanitisation, AC solutions, title vetting, and tenancy management — Seventh Sky operates with ISO-grade checklists, transparent pricing, and digital photo logs for local and expatriate landlords.
          </p>

          {/* Quick Search Bar */}
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search services (e.g. Interior, Water Tank, AC, Legal, Rent, Relocation)..."
              className="w-full rounded-2xl border border-slate-800 bg-slate-900/90 pl-12 pr-4 py-3.5 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-xl"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── CATEGORY FILTER TABS ────────────────────────────────── */}
      <section className="sticky top-[73px] z-30 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-lg px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {SERVICE_CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategorySelect(cat.id)}
                className={`whitespace-nowrap rounded-xl px-4 py-2 text-xs font-bold transition ${
                  isActive
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25"
                    : "border border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── SERVICES GRID ───────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-12 sm:py-16 flex-1 w-full">
        {filteredServices.length === 0 ? (
          <div className="py-20 text-center rounded-3xl border border-slate-800 bg-slate-900/40 p-10">
            <Layers className="mx-auto text-slate-600 mb-4" size={40} />
            <h3 className="text-xl font-bold text-white mb-2">No Services Found</h3>
            <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
              We couldn&apos;t find any service matching &ldquo;{searchQuery}&rdquo; in this category.
            </p>
            <button
              onClick={() => {
                setActiveCategory("all");
                setSearchQuery("");
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-500 transition"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {filteredServices.map((service) => {
              const IconComponent = ICON_MAP[service.iconName] || Layers;
              return (
                <article
                  key={service.slug}
                  className="group flex flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900/90 hover:border-slate-700 transition duration-300 shadow-xl shadow-slate-950/40"
                >
                  {/* Service Hero Thumbnail */}
                  <div className="relative aspect-[16/10] overflow-hidden bg-slate-950">
                    <Image
                      src={service.heroImage}
                      alt={service.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover transition duration-700 group-hover:scale-105 opacity-90 group-hover:opacity-100"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                    
                    {/* Badge */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-slate-950/80 px-2.5 py-1 text-[11px] font-bold text-blue-300 backdrop-blur-md">
                        <IconComponent size={12} /> {service.categoryLabel}
                      </span>
                      {service.pricingGuide && (
                        <span className="rounded-full bg-blue-600/90 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur shadow-md">
                          {service.pricingGuide}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition">
                        <Link href={`/services/${service.slug}`}>
                          {service.title}
                        </Link>
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-400 line-clamp-2 leading-relaxed mb-4">
                        {service.tagline}
                      </p>

                      {/* Key Highlights Bullet points */}
                      <div className="space-y-1.5 mb-6">
                        {service.keyHighlights.slice(0, 3).map((item, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                            <CheckCircle2 size={13} className="text-blue-400 shrink-0 mt-0.5" />
                            <span className="line-clamp-1">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Card Footer CTAs */}
                    <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                      <Link
                        href={`/services/${service.slug}`}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 transition"
                      >
                        Explore Details <ArrowRight size={14} />
                      </Link>

                      <Link
                        href={`/services/${service.slug}#book-service`}
                        className="rounded-xl bg-slate-800 hover:bg-blue-600 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:text-white transition"
                      >
                        Book Service
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ── BANGLADESH TRUST & NRB PROMISE SECTION ──────────────── */}
      <section className="border-t border-slate-800 bg-slate-900/40 px-6 py-16">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
            <ShieldCheck size={28} className="text-blue-400 mb-4" />
            <h4 className="text-base font-bold text-white mb-2">Institutional Transparency</h4>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Every job adheres to clear technical standards, verified technician IDs, itemised rate cards, and digital billing through corporate bank accounts.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
            <Compass size={28} className="text-indigo-400 mb-4" />
            <h4 className="text-base font-bold text-white mb-2">Comprehensive Regional Coverage</h4>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Dedicated field teams stationed across managed sectors for rapid dispatch to residential apartments, luxury residences, and commercial premises.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
            <MessageSquare size={28} className="text-emerald-400 mb-4" />
            <h4 className="text-base font-bold text-white mb-2">Dedicated NRB Overseas Care</h4>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Non-resident Bangladeshi property owners in the UK, USA, Canada, and GCC receive real-time video audits, before-and-after photo portfolios, and executive WhatsApp coordination.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
