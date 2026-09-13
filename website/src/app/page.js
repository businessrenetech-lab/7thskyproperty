import React from "react";
import Link from "next/link";
import {
  KeyRound,
  Hammer,
  ShieldCheck,
  Sparkles,
  Palette,
  Droplets,
  Wind,
  Phone,
  Mail,
  MapPin,
  ArrowRight,
  CheckCircle2,
  Building2,
} from "lucide-react";

export default function Home() {
  const coreServices = [
    {
      icon: Palette,
      title: "Interior Design & Fit-Out",
      slug: "interior-design",
      categoryBadge: "Interior & Renovation",
      desc: "Turnkey residential & corporate interiors, modular kitchens, false ceilings, architectural lighting, and complete post-tenancy renovations across residential and corporate properties.",
      price: "From ৳1,200 / sft",
      features: ["3D Concept Visualisation", "Custom Cabinetry & Woodwork", "Turnkey Material Sourcing"],
    },
    {
      icon: Droplets,
      title: "Water Tank Sanitisation",
      slug: "water-tank",
      categoryBadge: "Care & Maintenance",
      desc: "6-stage mechanized jet washing, heavy-duty sludge evacuation, and hospital-grade food-safe disinfection for underground & rooftop tanks.",
      price: "From ৳3,500 / tank",
      features: ["Deep Sediment & Sludge Removal", "Food-Grade Disinfection", "Lab Testing Available"],
    },
    {
      icon: Wind,
      title: "Air Conditioning Solutions",
      slug: "air-conditioning",
      categoryBadge: "Care & Maintenance",
      desc: "Chemical deep cleaning, digital refrigerant leak tests, precision inverter PCB repairs, and annual maintenance contracts (AMC).",
      price: "From ৳1,500 / unit",
      features: ["Jet Pressure Coil Wash", "Pure R410A/R32 Gas Top-Up", "AMC Seasonal Packages"],
    },
    {
      icon: KeyRound,
      title: "Tenancy & Folio Management",
      slug: "property-management",
      categoryBadge: "Rentals & Sales",
      desc: "Hands-off landlord folio management, tenant screening, automated monthly rent collection, arrears tracking, and banking disbursement.",
      price: "8% - 10% Monthly Rent",
      features: ["Bank/bKash Collection", "Digital Owner Portal", "Annual Property Audits"],
    },
    {
      icon: ShieldCheck,
      title: "Title Search & Legal Vetting",
      slug: "property-documentation-verification",
      categoryBadge: "Legal & Title Verification",
      desc: "Comprehensive deed vetting at Sub-Registry offices, AC Land Mutation checks, Khatian authentication (CS, SA, RS, BS), and encumbrance certificates.",
      price: "From ৳15,000 / property",
      features: ["AC Land Namjari Search", "Sub-Registry BIA Vetting", "Civil Lawyer Sign-Off"],
    },
    {
      icon: Building2,
      title: "NRB Keyholding & Concierge",
      slug: "property-care-concierge",
      categoryBadge: "Expat Concierge",
      desc: "Bespoke keyholding, periodic property health visits, utility bill settlement, and photo/video audits for Non-Resident Bangladeshis worldwide.",
      price: "From ৳6,000 / month",
      features: ["High-Def Video Audits", "Utility Bill Settlements", "Immediate Repair Desk"],
    },
  ];

  return (
    <div className="flex-1 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 text-slate-100 flex flex-col justify-center items-center py-16 px-6">
      {/* ── HERO BANNER SECTION ─────────────────────────────────── */}
      <div className="max-w-4xl w-full text-center mb-16">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-blue-400 mb-6">
          <Sparkles size={14} /> Premium Real Estate & Facility Care
        </span>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight tracking-tight text-white mb-6">
          Property Management & <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-300 to-indigo-400">
            Care Made Actionable.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed mb-8">
          Seventh Sky Properties delivers engineered property care, turnkey interior renovations, certified water tank cleaning, legal title search, and rental folios for modern homeowners and expatriate NRB landlords.
        </p>

        {/* Hero Quick Links */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/services"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 transition active:scale-[0.98]"
          >
            Explore All Services <ArrowRight size={16} />
          </Link>
          <Link
            href="/services?category=interior-design"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-5 py-3.5 text-xs sm:text-sm font-semibold text-blue-400 hover:text-white hover:border-slate-600 transition"
          >
            <Palette size={15} /> Interior & Renovation
          </Link>
          <Link
            href="/short-stays"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-5 py-3.5 text-xs sm:text-sm font-semibold text-slate-300 hover:text-white hover:border-slate-600 transition"
          >
            Serviced Stays
          </Link>
        </div>
      </div>

      {/* ── CORE SERVICES GRID WITH DEDICATED LINKS ──────────────── */}
      <div className="max-w-6xl w-full mb-20">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-blue-400">
              Institutional Care & Fit-Out
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              Dedicated Service Lines
            </h2>
          </div>
          <Link
            href="/services"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-300"
          >
            View Directory & Category Filter <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {coreServices.map((item, index) => (
            <div
              key={index}
              className="group relative rounded-3xl border border-slate-800 bg-slate-900/50 p-7 hover:bg-slate-900/80 hover:border-slate-700 transition duration-300 flex flex-col justify-between shadow-xl shadow-slate-950/20"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-5">
                  <div className="h-12 w-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition duration-300">
                    <item.icon size={22} />
                  </div>
                  <span className="rounded-full bg-slate-800/90 border border-slate-700/80 px-2.5 py-1 text-[11px] font-bold text-blue-300">
                    {item.price}
                  </span>
                </div>

                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  {item.categoryBadge}
                </span>
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition">
                  <Link href={`/services/${item.slug}`}>{item.title}</Link>
                </h3>
                <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-5">
                  {item.desc}
                </p>

                {/* Micro Features */}
                <div className="space-y-1.5 mb-6">
                  {item.features.map((feat, fIdx) => (
                    <div key={fIdx} className="flex items-center gap-2 text-xs text-slate-300">
                      <CheckCircle2 size={13} className="text-blue-400 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                <Link
                  href={`/services/${item.slug}`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-300"
                >
                  View Details & SOP <ArrowRight size={13} />
                </Link>
                <Link
                  href={`/services/${item.slug}#book-service`}
                  className="rounded-xl bg-slate-800 hover:bg-blue-600 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:text-white transition"
                >
                  Book Now
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Directory Banner */}
        <div className="mt-8 rounded-3xl border border-blue-500/20 bg-gradient-to-r from-blue-950/30 via-slate-900 to-slate-900 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h4 className="text-lg font-bold text-white">Need a Specialized Real Estate Service?</h4>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
              We also handle Land Survey & Mouza Mapping, Property Succession (Warishan) Law, Home & Office Relocation, and Banking Loan Support.
            </p>
          </div>
          <Link
            href="/services"
            className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-3 text-xs font-bold text-white transition shadow-lg shadow-blue-600/20"
          >
            Browse All 12 Services <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* ── CONTACT PANEL CARD ──────────────────────────────────── */}
      <div className="max-w-3xl w-full rounded-[32px] border border-slate-800 bg-slate-950 p-8 sm:p-12 text-center relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-4">Contact Our Offices</h2>
        <p className="text-slate-400 text-sm sm:text-base max-w-lg mx-auto mb-8">
          Get in touch with our team for leasing inquiries, property onboarding, interior fit-outs, or facility management solutions.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left max-w-2xl mx-auto">
          <div className="flex gap-3">
            <MapPin size={20} className="text-blue-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-white text-sm">Address</h4>
              <p className="text-xs text-slate-400 leading-normal mt-1">
                SEL Sufi Square, Unit: 1104, Level: 11, Corporate Headquarters
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Phone size={20} className="text-blue-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-white text-sm">Phone</h4>
              <p className="text-xs text-slate-400 leading-normal mt-1">
                +880 1913-373581
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Mail size={20} className="text-blue-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-white text-sm">Email</h4>
              <p className="text-xs text-slate-400 leading-normal mt-1">
                info@seventhskybd.com
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
