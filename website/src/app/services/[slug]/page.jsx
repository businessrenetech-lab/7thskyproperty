import React from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  SERVICES,
  getServiceBySlug,
  getServicesByCategory,
  SERVICE_HERO_CONFIG,
} from "@/lib/servicesData";
import ServiceStepForm from "@/components/ServiceStepForm";
import InteriorDesignLanding from "@/components/InteriorDesignLanding";
import WaterTankLanding from "@/components/WaterTankLanding";
import AirConditioningLanding from "@/components/AirConditioningLanding";
import {
  CheckCircle2,
  Clock,
  ShieldCheck,
  MapPin,
  HelpCircle,
  ArrowRight,
  ChevronRight,
  Phone,
  MessageSquare,
  Sparkles,
  ChevronDown,
  Building2,
  Calendar,
  Layers,
  Award,
} from "lucide-react";

export async function generateStaticParams() {
  return SERVICES.map((service) => ({
    slug: service.slug,
  }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  if (!service) {
    return { title: "Service Not Found" };
  }

  const title = service.seo?.metaTitle || `${service.title} | Seventh Sky Properties`;
  const description = service.seo?.metaDescription || service.tagline;

  return {
    title,
    description,
    keywords: service.seo?.keywords || [],
    alternates: {
      canonical: `/services/${service.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `https://seventhskybd.com/services/${service.slug}`,
      siteName: "Seventh Sky Properties",
      images: [
        {
          url: service.heroImage,
          width: 1200,
          height: 630,
          alt: service.title,
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [service.heroImage],
    },
  };
}

export default async function ServiceDetailPage({ params }) {
  const { slug } = await params;
  const service = getServiceBySlug(slug);

  if (!service) {
    notFound();
  }

  // Related sibling services in similar domain
  const relatedServices = SERVICES.filter(
    (s) => s.slug !== service.slug && (s.category === service.category || true)
  ).slice(0, 3);

  const sopSteps = service.sop || service.processSteps || [];
  const coverageList = service.coverage || service.coverageAreas || [];
  const highlightsList = service.keyHighlights || [];
  const featuresList = service.features || [];
  const optionsList = service.serviceOptions || [];
  const faqsList = service.faqs || [];

  // Schema.org Structured Data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": service.title,
    "description": service.tagline,
    "provider": {
      "@type": "RealEstateAgent",
      "name": "Seventh Sky Properties",
      "url": "https://seventhskybd.com",
      "telephone": "+8801913373581",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "SEL Sufi Square, Unit 1104, Level 11",
        "addressLocality": "Corporate Headquarters",
        "postalCode": "1209",
        "addressCountry": "BD",
      },
    },
    "areaServed": {
      "@type": "AdministrativeArea",
      "name": "Seventh Sky Managed Regions",
    },
    "offers": {
      "@type": "Offer",
      "priceCurrency": "BDT",
      "price": service.pricingGuide ? service.pricingGuide.replace(/[^0-9]/g, "") || "3500" : "3500",
      "priceSpecification": {
        "@type": "UnitPriceSpecification",
        "priceCurrency": "BDT",
        "description": service.pricingGuide,
      },
    },
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": service.title,
      "itemListElement": service.features.map((f, i) => ({
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": f.title,
          "description": f.desc,
        },
      })),
    },
  };

  // Bespoke editorial landing page for Interior Design & Space Planning
  if (service.slug === "interior-design") {
    return (
      <div className="min-h-screen bg-white text-[#012a4e] flex flex-col">
        {/* JSON-LD Schema Injection */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <InteriorDesignLanding service={service} />
      </div>
    );
  }

  // Bespoke editorial landing page for Water Tank Cleaning & Sanitisation
  if (service.slug === "water-tank") {
    return (
      <div className="min-h-screen bg-white text-[#012a4e] flex flex-col">
        {/* JSON-LD Schema Injection */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <WaterTankLanding service={service} />
      </div>
    );
  }

  // Bespoke editorial landing page for Air Conditioning Solutions
  if (service.slug === "air-conditioning") {
    return (
      <div className="min-h-screen bg-white text-[#012a4e] flex flex-col">
        {/* JSON-LD Schema Injection */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <AirConditioningLanding service={service} />
      </div>
    );
  }

  const heroConfig = SERVICE_HERO_CONFIG[service.slug] || {
    image: service.heroImage,
    line1: service.shortTitle || service.title,
    line2: "Institutional Standards.",
    ctaText: `Schedule ${service.shortTitle || "Service"}`,
  };

  return (
    <div className="min-h-screen bg-white text-[#012a4e] flex flex-col">
      {/* JSON-LD Schema Injection */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ── HERO SECTION (FULL-VIEWPORT MINIMALIST) ─────────────── */}
      <section className="relative w-full h-screen min-h-screen flex items-center justify-center overflow-hidden">
        {/* Full-width service-relevant photography */}
        <img
          src={heroConfig.image || service.heroImage}
          alt={service.title}
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {/* Subtle ambient gradient overlay for optimal text contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/25" />

        {/* Hero Content: Short punchy headline only & request button */}
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-8">
          <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight text-white leading-tight">
            {heroConfig.line1} <br />
            <span className="text-[#00AEEF]">{heroConfig.line2}</span>
          </h1>

          <div className="pt-2">
            <a
              href="#book-service"
              className="inline-flex items-center gap-2.5 rounded-full bg-[#00AEEF] px-9 py-4 text-sm sm:text-base font-bold text-white shadow-xl shadow-[#00AEEF]/30 hover:bg-[#0096ce] transition active:scale-95 cursor-pointer"
            >
              <span>{heroConfig.ctaText || "Request Service & Schedule"}</span>
              <ArrowRight size={18} />
            </a>
          </div>
        </div>
      </section>

      {/* ── SUB-HEADER NAVIGATION & BREADCRUMBS BAR ─────────────── */}
      <div className="sticky top-16 sm:top-20 z-30 border-y border-slate-200 bg-white/95 backdrop-blur-md shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap">
            <Link href="/" className="text-slate-500 hover:text-[#012a4e] transition">
              Home
            </Link>
            <span className="text-slate-300">/</span>
            <Link href="/services" className="text-slate-500 hover:text-[#012a4e] transition">
              Services
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-[#00AEEF] font-bold truncate">{service.shortTitle}</span>
          </div>

          <div className="hidden md:flex items-center gap-6 text-slate-600">
            <a href="#overview" className="hover:text-[#012a4e] transition">Overview</a>
            <a href="#scope" className="hover:text-[#012a4e] transition">Scope & Standards</a>
            {sopSteps.length > 0 && (
              <a href="#sop" className="hover:text-[#012a4e] transition">Process SOP</a>
            )}
            {optionsList.length > 0 && (
              <a href="#options" className="hover:text-[#012a4e] transition">Packages</a>
            )}
            {faqsList.length > 0 && (
              <a href="#faqs" className="hover:text-[#012a4e] transition">FAQs</a>
            )}
            <a
              href="#book-service"
              className="rounded-full bg-[#00AEEF] px-4 py-1.5 text-white font-bold hover:bg-[#0096ce] transition shadow-xs"
            >
              Book Service
            </a>
          </div>
        </div>
      </div>

      {/* ── BANGLADESH MARKET CONTEXT CALLOUT ────────────────────── */}
      {service.marketContextBD && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="rounded-3xl border border-[#00AEEF]/20 bg-gradient-to-r from-[#00AEEF]/10 via-white to-white p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <div className="h-10 w-10 rounded-2xl bg-[#00AEEF]/15 text-[#00AEEF] flex items-center justify-center shrink-0">
                <MapPin size={20} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-[#00AEEF]">
                    Operational Reality & Standards
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-[#012a4e]">
                  Why Professional Standards Matter in the Local Market
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {service.marketContextBD}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── OVERVIEW & SCOPE HIGHLIGHTS ─────────────────────────── */}
      <section id="overview" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 scroll-mt-24 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left: Overview prose */}
          <div className="lg:col-span-7 space-y-6">
            <h2 className="text-2xl sm:text-3xl font-black text-[#012a4e]">
              Service Scope & Deliverables
            </h2>
            <div className="text-slate-600 text-sm sm:text-base leading-relaxed space-y-4 whitespace-pre-line">
              {service.overview}
            </div>

            {/* Key highlights checklist */}
            <div className="pt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Key Technical Highlights
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {highlightsList.map((hl, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs"
                  >
                    <CheckCircle2 size={16} className="text-[#00AEEF] shrink-0 mt-0.5" />
                    <span className="text-xs font-semibold text-slate-700 leading-snug">{hl}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Technical Features Grid */}
          <div id="scope" className="lg:col-span-5 space-y-4 scroll-mt-24">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Engineering Deliverables
            </h3>
            {featuresList.map((feat, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-slate-300 transition shadow-2xs"
              >
                <div className="flex items-center gap-2 text-sm font-bold text-[#012a4e] mb-1.5">
                  <div className="h-2 w-2 rounded-full bg-[#00AEEF]" />
                  {feat.title}
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {feat.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STANDARD OPERATING PROCEDURE (SOP) ──────────────────── */}
      {sopSteps.length > 0 && (
        <section id="sop" className="bg-slate-50/70 border-y border-slate-200/80 px-4 sm:px-6 lg:px-8 py-16 scroll-mt-24">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-[#00AEEF]">
                Standard of Excellence
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-[#012a4e]">
                4-Stage Standard Operating Procedure (SOP)
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Transparent and verifiable process from on-site diagnostic to final digital sign-off.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {sopSteps.map((step) => (
                <div
                  key={step.step}
                  className="rounded-3xl border border-slate-200 bg-slate-50/70 p-6 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00AEEF]/15 border border-[#00AEEF]/30 text-sm font-black text-[#00AEEF]">
                        0{step.step}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                        <Clock size={12} className="text-[#00AEEF]" /> {step.duration || "Standard Inspection"}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-[#012a4e] mb-2">{step.title}</h4>
                    <p className="text-xs text-slate-500 leading-relaxed mb-4">{step.desc}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-200 flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                    <ShieldCheck size={13} className="text-emerald-600 shrink-0" />
                    <span>Quality Sign-off Checked</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── SERVICE PACKAGES & COVERAGE ─────────────────────────── */}
      <section id="options" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 scroll-mt-24 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Packages / Options */}
          {optionsList.length > 0 && (
            <div className="lg:col-span-7 space-y-4">
              <h3 className="text-xl font-bold text-[#012a4e] mb-2">Available Service Models</h3>
              <div className="space-y-3">
                {optionsList.map((opt, i) => (
                  <div
                    key={i}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-[#012a4e]">{opt.name}</span>
                        {opt.tag && (
                          <span className="rounded bg-[#00AEEF]/15 px-2 py-0.5 text-[10px] font-bold text-[#00AEEF]">
                            {opt.tag}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">{opt.desc}</p>
                    </div>
                    <a
                      href="#book-service"
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#00AEEF] hover:text-[#0096ce] shrink-0"
                    >
                      Select Plan <ArrowRight size={13} />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Right: Coverage Areas */}
          <div className="lg:col-span-5 space-y-4">
            <h3 className="text-xl font-bold text-[#012a4e] mb-2">Operational Coverage Hubs</h3>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 space-y-4 shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                <MapPin size={14} className="text-[#00AEEF]" /> Active Field Dispatch
              </div>
              <div className="flex flex-wrap gap-2">
                {coverageList.map((area, i) => (
                  <span
                    key={i}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600 font-medium"
                  >
                    {area}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                Special arrangements across extended regional zones available upon booking.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── STEP-BY-STEP SERVICE BOOKING WIZARD ───────────────────── */}
      <section
        id="book-service"
        className="scroll-mt-24 bg-white border-t border-slate-200/80 px-4 sm:px-6 lg:px-8 py-16 sm:py-20"
      >
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#00AEEF]/30 bg-[#00AEEF]/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#00AEEF]">
              <Calendar size={13} /> Official Booking & Dispatch
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#012a4e]">
              Schedule Your {service.shortTitle}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
              Configure your requirements below. Our care operations desk logs the request and connects with you for scheduling.
            </p>
          </div>

          <ServiceStepForm service={service} />
        </div>
      </section>

      {/* ── FREQUENTLY ASKED QUESTIONS (FAQS) ───────────────────── */}
      {faqsList.length > 0 && (
        <section id="faqs" className="border-t border-slate-200/80 bg-slate-50/60 px-4 sm:px-6 lg:px-8 py-16 scroll-mt-24">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-[#00AEEF]">
                Clarifications
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-[#012a4e]">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="space-y-3">
              {faqsList.map((faq, i) => (
                <details
                  key={i}
                  className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 [&_summary::-webkit-details-marker]:hidden shadow-2xs"
                >
                  <summary className="flex cursor-pointer items-center justify-between text-left font-bold text-[#012a4e] text-sm sm:text-base">
                    <span>{faq.q}</span>
                    <ChevronDown
                      size={18}
                      className="text-slate-400 transition-transform duration-200 group-open:rotate-180 shrink-0 ml-4"
                    />
                  </summary>
                  <p className="mt-3 text-xs sm:text-sm text-slate-500 leading-relaxed border-t border-slate-100 pt-3">
                    {faq.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── RELATED SERVICES ────────────────────────────────────── */}
      <section className="border-t border-slate-200/80 bg-white px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#00AEEF]">
                Complementary Solutions
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-[#012a4e] mt-1">
                Explore Sibling Property Services
              </h3>
            </div>
            <Link
              href="/services"
              className="inline-flex items-center gap-1 text-xs font-bold text-[#00AEEF] hover:text-[#0096ce]"
            >
              Browse All Services <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {relatedServices.map((rel) => (
              <Link
                key={rel.slug}
                href={`/services/${rel.slug}`}
                className="group rounded-2xl border border-slate-200 bg-slate-50/60 p-5 hover:border-[#00AEEF] hover:bg-white transition flex flex-col justify-between shadow-2xs"
              >
                <div>
                  <span className="text-[11px] font-bold text-[#00AEEF] uppercase tracking-wider">
                    {rel.categoryLabel}
                  </span>
                  <h4 className="text-base font-bold text-[#012a4e] mt-1 group-hover:text-[#00AEEF] transition">
                    {rel.shortTitle}
                  </h4>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-2 leading-relaxed">
                    {rel.tagline}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>{rel.pricingGuide}</span>
                  <ArrowRight size={13} className="text-[#00AEEF] group-hover:translate-x-1 transition" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
