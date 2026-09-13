"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { 
  ChevronDown, 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  Droplets, 
  Wind, 
  Palette, 
  FileText, 
  MapPin, 
  Scroll, 
  Landmark, 
  Truck, 
  Hotel,
  Key,
  Building2
} from "lucide-react";

const SERVICE_GROUPS = [
  {
    title: "Care & Maintenance",
    items: [
      {
        name: "Water Tank Cleaning",
        desc: "Mechanized 6-stage jet & hospital disinfection",
        slug: "water-tank",
        icon: Droplets,
      },
      {
        name: "Air Conditioning Care",
        desc: "Chemical coil wash, gas refill & PCB repairs",
        slug: "air-conditioning",
        icon: Wind,
      },
      {
        name: "Property Care & Concierge",
        desc: "Keyholding, audits & caretaker supervision",
        slug: "property-care-concierge",
        icon: ShieldCheck,
      },
    ],
  },
  {
    title: "Design & Relocation",
    items: [
      {
        name: "Interior Design & Fit-Out",
        desc: "3D concepts, modular kitchens & renovation",
        slug: "interior-design",
        icon: Palette,
        badge: "POPULAR",
      },
      {
        name: "Removal & Relocation",
        desc: "5-layer protective packing & hydraulic transport",
        slug: "removal-relocation",
        icon: Truck,
      },
      {
        name: "Short Stay Serviced Flats",
        desc: "Fully furnished luxury suites for business & leisure stays",
        slug: "short-stay",
        icon: Hotel,
      },
    ],
  },
  {
    title: "Legal & Land Advisory",
    items: [
      {
        name: "Title Search & Deed Vetting",
        desc: "Sub-Registry BIA search & AC Land mutation",
        slug: "property-documentation-verification",
        icon: FileText,
      },
      {
        name: "Land Survey & Valuation",
        desc: "Digital total station boundary demarcation",
        slug: "land-property-assessment",
        icon: MapPin,
      },
      {
        name: "Property Will & Succession",
        desc: "Warishan certificates & probate guidance",
        slug: "property-will-succession",
        icon: Scroll,
      },
    ],
  },
  {
    title: "Tenancy & Management",
    items: [
      {
        name: "Residential Management",
        desc: "Tenant screening, rent collection & ledgers",
        slug: "property-management",
        icon: Key,
      },
      {
        name: "Property Loan Advisory",
        desc: "Mortgage pre-approvals with major banks",
        slug: "loan-financial-support",
        icon: Landmark,
      },
      {
        name: "Residential Sales Brokerage",
        desc: "Qualified buyer search & escrow closing",
        slug: "residential-sales",
        icon: Building2,
      },
    ],
  },
];

export default function HeaderNav() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const timeoutRef = useRef(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setDropdownOpen(true);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setDropdownOpen(false);
    }, 180);
  };

  const handleClose = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setDropdownOpen(false);
  };

  return (
    <nav className="flex items-center gap-2 sm:gap-4 md:gap-6" aria-label="Primary navigation">
      
      {/* Services Hover Mega Menu */}
      <div 
        className="relative"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Link 
          href="/services" 
          onClick={handleClose}
          className={`flex items-center gap-1.5 text-xs sm:text-sm font-semibold transition py-2 ${
            dropdownOpen ? "text-blue-400" : "text-slate-300 hover:text-white"
          }`}
        >
          <Sparkles size={13} className="text-blue-400" />
          <span>Property Care Services</span>
          <ChevronDown 
            size={13} 
            className={`transition-transform duration-200 ${dropdownOpen ? "rotate-180 text-blue-400" : "text-slate-500"}`} 
          />
        </Link>

        {/* Mega Menu Dropdown */}
        {dropdownOpen && (
          <div 
            className="fixed left-1/2 -translate-x-1/2 top-16 pt-2 z-50 w-[96vw] max-w-6xl animate-fade-in"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div className="rounded-3xl border border-slate-800 bg-slate-950/98 p-6 sm:p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] backdrop-blur-2xl space-y-6 text-slate-200">
              
              {/* Header Bar */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                    <Sparkles size={14} />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-300">
                    Seventh Sky Dedicated Service Directory
                  </span>
                </div>

                <Link
                  href="/services"
                  onClick={handleClose}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 transition"
                >
                  <span>Browse All Services</span>
                  <ArrowRight size={13} />
                </Link>
              </div>

              {/* 4 Specialized Columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {SERVICE_GROUPS.map((grp, colIdx) => (
                  <div key={colIdx} className="space-y-3">
                    <div className="pb-2 border-b border-slate-800/60">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        {grp.title}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {grp.items.map((svc) => (
                        <Link
                          key={svc.slug}
                          href={`/services/${svc.slug}`}
                          onClick={handleClose}
                          className="group flex items-start gap-3 rounded-2xl p-2.5 transition-all duration-200 hover:bg-slate-900 border border-transparent hover:border-slate-800"
                        >
                          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-slate-300 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <svc.icon size={15} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors truncate">
                                {svc.name}
                              </span>
                              {svc.badge && (
                                <span className="shrink-0 rounded bg-blue-500/20 px-1.5 py-0.5 text-[9px] font-bold text-blue-300">
                                  {svc.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-[10.5px] text-slate-400 leading-tight mt-0.5 line-clamp-2">
                              {svc.desc}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer Bar */}
              <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={15} className="text-emerald-400 shrink-0" />
                  <span className="text-[11px]">Quality guaranteed work, digital photo logs & certified inspections.</span>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href="/services/interior-design"
                    onClick={handleClose}
                    className="text-xs font-bold text-blue-400 hover:text-blue-300 transition"
                  >
                    Interior Design
                  </Link>
                  <span className="text-slate-700">•</span>
                  <Link
                    href="/services/water-tank"
                    onClick={handleClose}
                    className="text-xs font-bold text-blue-400 hover:text-blue-300 transition"
                  >
                    Water Tank Care
                  </Link>
                  <span className="text-slate-700">•</span>
                  <a
                    href="tel:+8801913373581"
                    className="text-xs font-bold text-slate-300 hover:text-white transition"
                  >
                    +880 1913-373581
                  </a>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* Direct Quick Links */}
      <Link 
        href="/services/interior-design" 
        className="text-xs sm:text-sm font-semibold text-blue-400 transition hover:text-blue-300 hidden md:inline"
      >
        Interior & Renovation
      </Link>

      <Link 
        href="/short-stays" 
        className="text-xs sm:text-sm font-semibold text-slate-300 transition hover:text-white"
      >
        Short Stays
      </Link>

      <a 
        href="tel:+8801913373581" 
        className="hidden lg:inline text-xs sm:text-sm font-semibold text-slate-400 transition hover:text-white"
      >
        +880 1913-373581
      </a>

      <Link
        href="/services#book-service"
        className="rounded-xl bg-blue-600 hover:bg-blue-500 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-blue-600/20 transition active:scale-95 shrink-0"
      >
        Book Care
      </Link>
    </nav>
  );
}
