"use client";

import React, { useState } from "react";
import Link from "next/link";
import ServiceStepForm from "./ServiceStepForm";
import {
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Wind,
  Phone,
  Check,
  Zap,
  Clock,
  Sparkles,
  Cpu,
  Wrench,
  Droplet,
  Truck,
  Layers,
  ThermometerSnowflake,
  ShieldAlert,
} from "lucide-react";

// Curated visual photography collections representing our core AC cleaning and maintenance operations
const GALLERY_ITEMS = [
  {
    id: 1,
    category: "jetwash",
    title: "Indoor Split Master Jet Wash",
    subtitle: "Mess-Free Waterproof Jacket",
    image: "/assets/services/ac-indoor-split-jet-wash.png",
    desc: "120-bar rotary pressure wash with waterproof jacket that catches every drop of dirty water.",
    duration: "45-60 Min",
    specs: [
      "Fitted waterproof wash jacket keeps your room walls and floors 100% dry",
      "Rotary water jet strips 2 years of baked grime and oily soot from cooling fins",
      "Restores immediate ice-cold airflow and cuts power consumption by up to 30%",
    ],
  },
  {
    id: 2,
    category: "outdoor",
    title: "Outdoor Condenser Power Clean",
    subtitle: "Exterior Unit High-Pressure Wash",
    image: "/assets/services/ac-outdoor-condenser-clean.png",
    desc: "Strips thick road dust and debris to keep the compressor cool and prevent power trips.",
    duration: "30-45 Min",
    specs: [
      "Strips thick road dust, bird debris, and leaves blocking heat release",
      "Protects expensive inverter compressor from overheating and thermal trips",
      "Cleans motor fan bearings, mounting bolts, and rubber vibration pads",
    ],
  },
  {
    id: 3,
    category: "chemical",
    title: "Deep Chemical Foam Sanitisation",
    subtitle: "Odor & Mold Eradication",
    image: "/assets/services/ac-chemical-foam-sanitisation.png",
    desc: "Biodegradable expanding foam dissolves kitchen grease and eliminates damp sour smells.",
    duration: "60 Min",
    specs: [
      "Biodegradable expanding foam dissolves stubborn kitchen grease and mildew",
      "Destroys 99.9% of bacteria and black mold colonies inside blower wheel",
      "Permanently eliminates sour, damp AC odors with lasting freshness",
    ],
  },
  {
    id: 4,
    category: "gas",
    title: "Refrigerant Gas Leak Fix & Refill",
    subtitle: "Pure Virgin R32 & R410A Gas",
    image: "/assets/services/ac-gas-leak-fix-refill.png",
    desc: "Electronic leak detection and 100% pure virgin gas recharge to restore full cooling power.",
    duration: "45-60 Min",
    specs: [
      "Electronic sniffer detector locates micro-pinhole leaks at copper joints",
      "High-pressure nitrogen pressure hold test guarantees 100% sealed piping",
      "Charged strictly with certified pure virgin refrigerant (zero mixed gas)",
    ],
  },
  {
    id: 5,
    category: "drainage",
    title: "Water Leakage & Drain Clearing",
    subtitle: "Zero Indoor Water Dripping",
    image: "/assets/services/ac-water-leakage-drain-clearing.png",
    desc: "Unclogs jelly slime and re-aligns unit slope to permanently stop water dripping on walls.",
    duration: "30-45 Min",
    specs: [
      "Pressure-flushed clogged jelly slime and fungus blocking drain hose",
      "Re-leveled indoor wall mounting bracket for natural gravity drainage",
      "Insulated sweating copper pipes to permanently stop ceiling dampness",
    ],
  },
  {
    id: 6,
    category: "pcb",
    title: "Inverter Circuit & Sensor Repair",
    subtitle: "PCB Diagnostic & Error Code Fix",
    image: "/assets/services/ac-inverter-circuit-repair.png",
    desc: "Fixes blinking LED error codes (E1, E6, F0, P0) and sudden compressor shutdowns.",
    duration: "60-90 Min",
    specs: [
      "Troubleshoots and clears blinking LED error codes (E1, E6, F0, P0, H6)",
      "Component-level micro-soldering for inverter IPM modules and capacitors",
      "Replaces faulty temperature sensors and coil thermistors with OEM parts",
    ],
  },
  {
    id: 7,
    category: "commercial",
    title: "Ceiling Cassette & Ducted AC",
    subtitle: "Offices, Retail & Restaurants",
    image: "/assets/services/ac-ceiling-cassette-service.png",
    desc: "Specialized servicing for 4-way ceiling cassettes, ducted split systems, and VRF networks.",
    duration: "60-90 Min",
    specs: [
      "Comprehensive servicing for 4-way ceiling cassette and hidden ducted units",
      "Cleans motorized condensate lift pumps to prevent ceiling tile leaks",
      "Airflow balancing and thermostat calibration for whole-office comfort",
    ],
  },
  {
    id: 8,
    category: "shifting",
    title: "Safe AC Dismantling & Shifting",
    subtitle: "Relocation with Gas Pump-Down",
    image: "/assets/services/ac-dismantling-shifting.png",
    desc: "Safely pump-down and lock 100% of gas inside compressor before relocating units.",
    duration: "90-120 Min",
    specs: [
      "Safe refrigerant pump-down traps 100% of gas inside compressor",
      "Saves you from expensive full gas recharge costs during flat moves",
      "Precision flaring and vacuuming of copper lines ensures zero air leaks",
    ],
  },
];

const CATEGORIES = [
  { key: "all", label: "All AC Works" },
  { key: "jetwash", label: "Master Jet Wash" },
  { key: "chemical", label: "Chemical Foam Clean" },
  { key: "gas", label: "Gas Leak & Refill" },
  { key: "drainage", label: "Water Leak Repair" },
  { key: "pcb", label: "Inverter PCB Repair" },
  { key: "commercial", label: "Commercial Cassette" },
];

export default function AirConditioningLanding({ service }) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeServiceTab, setActiveServiceTab] = useState(0);

  const filteredGallery =
    activeCategory === "all"
      ? GALLERY_ITEMS
      : GALLERY_ITEMS.filter((item) => item.category === activeCategory);

  // 6 official service disciplines simplified for everyday homeowners and corporate office managers
  const serviceDisciplines = [
    {
      id: "jetwash",
      icon: Wind,
      title: "Master Jet Wash (Indoor & Outdoor)",
      subtitle: "High-Pressure Water Jet Cleaning with Waterproof Jacket",
      summary:
        "Deep pressure cleaning that restores ice-cold airflow and eliminates musty smells. We wash indoor cooling coils, fan blower wheels, and outdoor compressor units with zero water dripping on your walls.",
      scopes: [
        "Waterproof collection jacket keeps your room walls, wallpaper, and wooden floors 100% dry",
        "120-bar rotary pressure jet strips greasy dirt, thick soot, and dust from deep inside cooling coils",
        "Blower fan wheel wash stops vibrating rattling noises and doubles air throw distance",
        "Outdoor compressor condenser wash removes baked road dust to cut heavy electricity bills",
        "Free drain pipe flush to stop dirty water overflowing and dripping into your room",
        "Temperature test before and after service proving ice-cold cooling recovery",
      ],
      highlights: ["100% Mess-Free Jacket", "Indoor + Outdoor Clean", "Ice-Cold Airflow"],
    },
    {
      id: "chemical",
      icon: Sparkles,
      title: "Deep Chemical Foam Coil Wash",
      subtitle: "Hospital-Grade Biodegradable Foam Disinfection",
      summary:
        "Deep anti-microbial foam wash for AC units that smell damp, sour, or haven't been cleaned in over 6 months. Destroys hidden fungal mold and airborne bacteria permanently.",
      scopes: [
        "Heavy chemical expanding foam dissolves stubborn kitchen grease, cigarette smoke, and mold",
        "Kills 99.9% airborne bacteria and fungal spores growing on the wet indoor evaporator fins",
        "Eliminates nasty sour, damp, and stale AC odors permanently without artificial perfumes",
        "Safe, non-corrosive formula protects delicate aluminum fins from bending or rusting",
        "Deep antibacterial misting through air vents and internal airflow louvers",
        "Clean, crisp, fresh air that is safe for children, asthma sufferers, and family health",
      ],
      highlights: ["Removes Damp Odor", "Kills 99.9% Mold", "Safe Biodegradable Foam"],
    },
    {
      id: "gas",
      icon: ThermometerSnowflake,
      title: "Refrigerant Gas Leak Fix & Refill",
      subtitle: "100% Virgin R32, R410A & R22 Refrigerant",
      summary:
        "Is your AC blowing room-temperature or lukewarm air? We find the copper pipe leak, braze it tight, and recharge certified pure virgin gas for maximum cooling.",
      scopes: [
        "Electronic sniffer detector locates micro-pinhole leaks at flared copper joint nuts",
        "High-pressure nitrogen test ensures copper pipe system is 100% leak-free before refill",
        "Recharging strictly with certified pure virgin refrigerant (R32, R410A, or R22)",
        "Zero adulterated or contaminated gas that burns out expensive inverter compressors",
        "Vacuum pump dehydration removes air and moisture from copper lines before charging",
        "Running pressure and ampere testing to verify compressor is running at optimal load",
      ],
      highlights: ["Pure Virgin Gas", "Electronic Leak Test", "Protects Inverter Compressor"],
    },
    {
      id: "pcb",
      icon: Cpu,
      title: "Inverter Diagnostics & Circuit Board Repair",
      subtitle: "Inverter PCB, Sensor & Capacitor Fixes",
      summary:
        "Fix annoying blinking error codes (E1, E6, F0, P0) and sudden AC shutdowns. Expert electronic repair for all major inverter air conditioner brands.",
      scopes: [
        "Advanced digital multimeter diagnostics of indoor and outdoor inverter circuit boards",
        "Fixes blinking LED light codes, communication errors, and sudden power cutoffs",
        "Component-level micro-soldering: IPM inverter modules, power capacitors, and relays",
        "Ambient temperature sensor and coil thermistor replacements with original OEM parts",
        "DC brushless fan motor testing and speed controller restoration",
        "Saves up to 70% cost compared to buying a completely new circuit board or replacement AC",
      ],
      highlights: ["Fixes Blinking Error Codes", "Component-Level Repair", "Saves New AC Cost"],
    },
    {
      id: "drainage",
      icon: Droplet,
      title: "Water Leakage & Drainage Repair",
      subtitle: "Permanent Solution for Water Dripping Inside Room",
      summary:
        "Stop dirty water dripping down your bedroom wall or ruining expensive furniture. We unclog drainage lines, realign drain trays, and re-insulate copper lines permanently.",
      scopes: [
        "Pressure flush of blocked, slimy drain hoses to restore free gravity water drainage",
        "Internal drainage pan inspection and crack sealing with waterproof silicone epoxy",
        "AC unit level and slope re-alignment so condensed water drains outside naturally",
        "Re-insulation of sweating copper pipes to stop moisture condensation stains on ceilings",
        "Anti-algae drain pan tablet installed to prevent future slime and mold blockages",
        "Written 30-day guarantee against water dripping on your walls or floors",
      ],
      highlights: ["Stops Room Dripping", "Clears Drain Slime", "Protects Wall Finish"],
    },
    {
      id: "shifting",
      icon: Truck,
      title: "Safe AC Uninstallation & Shifting",
      subtitle: "Careful Dismantling & Factory-Grade Re-Installation",
      summary:
        "Moving to a new flat or office? We pump down and save your refrigerant gas, dismantle carefully, and re-install with heavy-duty brackets and neat piping.",
      scopes: [
        "Professional gas pump-down locks all refrigerant safely inside the outdoor compressor unit",
        "Zero gas loss during removal—saves you from paying for an expensive full gas recharge",
        "Heavy-duty vibration-damping wall brackets that prevent noisy rattling on the balcony wall",
        "Precision copper pipe flaring and vacuuming to eliminate internal air contamination",
        "Aesthetic white PVC trunking to conceal ugly loose copper pipes and electrical wires",
        "Full cooling verification and testing before technician leaves your new home",
      ],
      highlights: ["Zero Gas Loss", "Anti-Vibration Mounting", "Neat Wire & Pipe Routing"],
    },
  ];

  return (
    <div className="min-h-screen bg-white text-[#012a4e]">
      
      {/* ── FULL-WIDTH MINIMALIST HERO SECTION ──────────────────────── */}
      <section className="relative w-full h-screen min-h-screen flex items-center justify-center overflow-hidden">
        {/* Full-width minimalist service image relevant to AC cleaning */}
        <img
          src="/assets/services/ac-hero.png"
          alt="Air Conditioning Maintenance & Jet Wash Servicing"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {/* Subtle ambient gradient overlay for optimal text contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/25" />

        {/* Hero Content: Short headline only & request button */}
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-8">
          <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight text-white leading-tight">
            Optimal Climate. <br />
            <span className="text-[#00AEEF]">Precision Air Care.</span>
          </h1>

          <div className="pt-2">
            <a
              href="#book-service"
              className="inline-flex items-center gap-2.5 rounded-full bg-[#00AEEF] px-9 py-4 text-sm sm:text-base font-bold text-white shadow-xl shadow-[#00AEEF]/30 hover:bg-[#0096ce] transition active:scale-95"
            >
              <span>Request AC Servicing</span>
              <ArrowRight size={18} />
            </a>
          </div>
        </div>
      </section>

      {/* ── SUB-HEADER NAVIGATION BAR ──────────────────────────────── */}
      <div className="sticky top-16 sm:top-20 z-30 border-y border-slate-200 bg-white/95 backdrop-blur-md shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center gap-2">
            <Link href="/services" className="text-slate-500 hover:text-[#012a4e] transition">
              Services
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-[#00AEEF] font-bold">Air Conditioning Solutions</span>
          </div>

          <div className="hidden md:flex items-center gap-6 text-slate-600">
            <a href="#services" className="hover:text-[#012a4e] transition">What We Deliver</a>
            <a href="#gallery" className="hover:text-[#012a4e] transition">Real Service Work</a>
            <a href="#difference" className="hover:text-[#012a4e] transition">Why Seventh Sky</a>
            <a href="#process" className="hover:text-[#012a4e] transition">How It Works</a>
            <a href="#packages" className="hover:text-[#012a4e] transition">Pricing Plans</a>
            <a
              href="#book-service"
              className="rounded-full bg-[#00AEEF] px-4 py-1.5 text-white font-bold hover:bg-[#0096ce] transition shadow-xs"
            >
              Book Service
            </a>
          </div>
        </div>
      </div>

      {/* ── 6 SPECIALIZED SERVICE DISCIPLINES ──────────────────────── */}
      <section id="services" className="py-20 sm:py-28 bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-[#00AEEF]">
              What We Deliver
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#012a4e]">
              Master Air Conditioning Care for Homes & Offices
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
              From mess-free indoor jet washes to inverter PCB fixes and leak-proof gas refills, we restore instant ice-cold cooling with zero water mess on your walls.
            </p>
          </div>

          {/* Service Disciplines Tabbed Navigation */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
            {serviceDisciplines.map((disc, idx) => {
              const Icon = disc.icon;
              return (
                <button
                  key={disc.id}
                  onClick={() => setActiveServiceTab(idx)}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    activeServiceTab === idx
                      ? "bg-[#012a4e] text-white shadow-md"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/80 border border-slate-200"
                  }`}
                >
                  <Icon size={14} className={activeServiceTab === idx ? "text-[#00AEEF]" : "text-slate-400"} />
                  <span>{disc.title.replace(" (Indoor & Outdoor)", "").replace(" Repair", "")}</span>
                </button>
              );
            })}
          </div>

          {/* Active Service Discipline Showcase Card */}
          {(() => {
            const cur = serviceDisciplines[activeServiceTab];
            const CurIcon = cur.icon;
            return (
              <div className="rounded-3xl border border-slate-200/90 bg-slate-50/50 p-6 sm:p-10 shadow-lg">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  
                  <div className="lg:col-span-5 space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-2xl bg-blue-50 text-[#00AEEF] flex items-center justify-center shrink-0 border border-blue-100">
                        <CurIcon size={24} />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#00AEEF] block">
                          Service 0{activeServiceTab + 1}
                        </span>
                        <h3 className="text-2xl font-black text-[#012a4e]">{cur.title}</h3>
                      </div>
                    </div>

                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      {cur.subtitle}
                    </p>

                    <p className="text-sm text-slate-700 leading-relaxed font-normal">
                      {cur.summary}
                    </p>

                    {/* Benefit Badges */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {cur.highlights.map((h, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-[#00AEEF] border border-blue-100"
                        >
                          <Check size={12} />
                          <span>{h}</span>
                        </span>
                      ))}
                    </div>

                    <div className="pt-4 border-t border-slate-200">
                      <a
                        href="#book-service"
                        className="inline-flex items-center gap-2 text-xs font-bold text-[#00AEEF] hover:text-[#012a4e] transition"
                      >
                        <span>Schedule this AC service</span>
                        <ArrowRight size={14} />
                      </a>
                    </div>
                  </div>

                  {/* Right: What You Get Deliverables List */}
                  <div className="lg:col-span-7 bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                        What We Deliver (Complete Scope)
                      </h4>
                      <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                        Guaranteed Results
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      {cur.scopes.map((scope, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 font-medium leading-relaxed"
                        >
                          <CheckCircle2 size={16} className="text-[#00AEEF] shrink-0 mt-0.5" />
                          <span>{scope}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            );
          })()}

        </div>
      </section>

      {/* ── REAL SERVICE WORK (PHOTO GALLERY WITH FILTERS) ──────────── */}
      <section id="gallery" className="py-20 sm:py-28 bg-slate-50/60 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-[#00AEEF]">
              Real Service Work
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#012a4e]">
              See Our Technicians in Action
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
              Clean setups, specialized waterproof containment, digital pressure gauges, and factory-certified repair standards.
            </p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  activeCategory === cat.key
                    ? "bg-[#00AEEF] text-white shadow-md shadow-[#00AEEF]/20"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Gallery Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredGallery.map((item) => (
              <div
                key={item.id}
                className="group bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs hover:shadow-xl hover:border-[#00AEEF]/40 transition-all duration-300 flex flex-col"
              >
                {/* Fixed Uniform Image Height */}
                <div className="relative h-48 w-full overflow-hidden bg-slate-100 shrink-0">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    loading="lazy"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-1 rounded-full bg-[#012a4e]/90 backdrop-blur-md text-[10px] font-bold text-white uppercase tracking-wider shadow-xs">
                      {item.subtitle}
                    </span>
                  </div>
                </div>

                {/* Card Body with Tight, Balanced Vertical Cadence */}
                <div className="p-5 flex-1 flex flex-col">
                  <div>
                    <h3 className="text-base font-bold text-[#012a4e] group-hover:text-[#00AEEF] transition leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1.5 leading-relaxed font-normal">
                      {item.desc}
                    </p>
                  </div>

                  <div className="space-y-2 mt-4 pt-3.5 border-t border-slate-100">
                    {item.specs.map((spec, sIdx) => (
                      <div key={sIdx} className="flex items-start gap-2 text-[11px] text-slate-600 font-medium">
                        <CheckCircle2 size={13} className="text-[#00AEEF] shrink-0 mt-0.5" />
                        <span className="leading-snug">{spec}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-500 flex items-center gap-1.5">
                      <Clock size={12} className="text-[#00AEEF]" /> {item.duration}
                    </span>
                    <a
                      href="#book-service"
                      className="font-bold text-[#00AEEF] hover:text-[#012a4e] inline-flex items-center gap-1 group/link transition"
                    >
                      <span>Book Service</span>
                      <ArrowRight size={11} className="group-hover/link:translate-x-0.5 transition" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── THE SEVENTH SKY DIFFERENCE (4 VISUAL QUALITY PILLARS) ──── */}
      <section id="difference" className="py-20 sm:py-28 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-[#00AEEF]">
              Why Choose Seventh Sky
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#012a4e]">
              No Wall Mess. No Adulterated Gas.
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
              Most local street technicians use messy buckets that ruin wall paint or inject cheap adulterated refrigerant that burns out inverter compressors. We do things right.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="p-6 rounded-3xl bg-blue-50/40 border border-blue-100/80 space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-white text-[#00AEEF] flex items-center justify-center shadow-xs border border-blue-100">
                <ShieldCheck size={24} />
              </div>
              <h3 className="text-lg font-black text-[#012a4e]">100% Mess-Free</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                Waterproof collection jackets channel all dirty wash water into buckets. Your wallpapers, curtains, and floor remain completely dry.
              </p>
              <div className="pt-2">
                <span className="text-[11px] font-bold text-[#00AEEF] bg-white px-2.5 py-1 rounded-full border border-blue-100">
                  Zero Wall Splashes
                </span>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-white text-[#012a4e] flex items-center justify-center shadow-xs border border-slate-200">
                <Zap size={24} />
              </div>
              <h3 className="text-lg font-black text-[#012a4e]">Pure Virgin Gas Only</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                We strictly use 100% pure virgin R32 and R410A gas. Zero fake or mixed refrigerants that damage expensive inverter compressors.
              </p>
              <div className="pt-2">
                <span className="text-[11px] font-bold text-slate-700 bg-white px-2.5 py-1 rounded-full border border-slate-200">
                  Certified Virgin Gas
                </span>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-white text-[#012a4e] flex items-center justify-center shadow-xs border border-slate-200">
                <Cpu size={24} />
              </div>
              <h3 className="text-lg font-black text-[#012a4e]">Multi-Brand Certified</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                Specialized in Gree, Daikin, General, Midea, Panasonic, LG, Haier, and Samsung inverter electronics and VRF systems.
              </p>
              <div className="pt-2">
                <span className="text-[11px] font-bold text-slate-700 bg-white px-2.5 py-1 rounded-full border border-slate-200">
                  Factory-Trained Techs
                </span>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-white text-[#012a4e] flex items-center justify-center shadow-xs border border-slate-200">
                <Clock size={24} />
              </div>
              <h3 className="text-lg font-black text-[#012a4e]">30-Day Service Warranty</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                If any cooling or water dripping issue recurs within 30 days of service, our technician visits and fixes it free of charge.
              </p>
              <div className="pt-2">
                <span className="text-[11px] font-bold text-slate-700 bg-white px-2.5 py-1 rounded-full border border-slate-200">
                  Written Guarantee
                </span>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ── 4-STEP SIMPLE PROCESS ─────────────────────────────────── */}
      <section id="process" className="py-20 sm:py-28 bg-slate-50/50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-[#00AEEF]">
              How It Works
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#012a4e]">
              Ice-Cold Cooling in 4 Simple Steps
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
              Clean, quiet, and fast doorstep service completed in 60 to 90 minutes per AC unit.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs relative">
              <span className="text-4xl font-black text-slate-100 absolute top-4 right-6">01</span>
              <div className="h-10 w-10 rounded-xl bg-blue-50 text-[#00AEEF] flex items-center justify-center font-bold text-sm mb-4">
                1
              </div>
              <h3 className="text-base font-bold text-[#012a4e] mb-2">Diagnostic Check</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                We measure airflow speed, coil cooling delta, compressor ampere load, and check for any blinking error codes.
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs relative">
              <span className="text-4xl font-black text-slate-100 absolute top-4 right-6">02</span>
              <div className="h-10 w-10 rounded-xl bg-blue-50 text-[#00AEEF] flex items-center justify-center font-bold text-sm mb-4">
                2
              </div>
              <h3 className="text-base font-bold text-[#012a4e] mb-2">Mess-Free Setup</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                We wrap the indoor unit in a heavy-duty waterproof collection jacket and place floor protection sheets underneath.
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs relative">
              <span className="text-4xl font-black text-slate-100 absolute top-4 right-6">03</span>
              <div className="h-10 w-10 rounded-xl bg-blue-50 text-[#00AEEF] flex items-center justify-center font-bold text-sm mb-4">
                3
              </div>
              <h3 className="text-base font-bold text-[#012a4e] mb-2">High-Pressure Jet Wash</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Deep rotary jet cleaning flushes out all dirt and bacteria from indoor cooling coils, blower fans, and outdoor units.
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs relative">
              <span className="text-4xl font-black text-slate-100 absolute top-4 right-6">04</span>
              <div className="h-10 w-10 rounded-xl bg-blue-50 text-[#00AEEF] flex items-center justify-center font-bold text-sm mb-4">
                4
              </div>
              <h3 className="text-base font-bold text-[#012a4e] mb-2">Cooling Test & Sign-Off</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                We verify ice-cold temperature output, check drain flow, wipe the unit dry, and issue your 30-day service warranty.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* ── PRICING & PACKAGES ─────────────────────────────────────── */}
      <section id="packages" className="py-20 sm:py-28 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-[#00AEEF]">
              Transparent Pricing
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#012a4e]">
              Simple, Upfront AC Service Packages
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
              Fixed transparent rates for split, inverter, and commercial ACs. No surprise technician fees or extra charges.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            
            {/* Package 1 */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-xs hover:shadow-lg transition">
              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Regular Maintenance</span>
                <h3 className="text-xl font-black text-[#012a4e]">Master Jet Wash</h3>
                <p className="text-xs text-slate-500 font-normal">
                  Complete indoor & outdoor high-pressure wash with protective jacket for units needing routine seasonal cleaning.
                </p>
                <div className="pt-2">
                  <span className="text-3xl font-black text-[#012a4e]">৳1,200</span>
                  <span className="text-xs text-slate-400 font-medium"> / unit</span>
                </div>
                <div className="space-y-2.5 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                    <Check size={14} className="text-[#00AEEF]" />
                    <span>Indoor unit pressure jet wash</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                    <Check size={14} className="text-[#00AEEF]" />
                    <span>Outdoor compressor unit clean</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                    <Check size={14} className="text-[#00AEEF]" />
                    <span>Air filter & drain line flush</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                    <Check size={14} className="text-[#00AEEF]" />
                    <span>100% mess-free wash jacket</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                    <Check size={14} className="text-[#00AEEF]" />
                    <span>Airflow & cooling performance check</span>
                  </div>
                </div>
              </div>

              <a
                href="#book-service"
                className="w-full py-3 rounded-xl bg-slate-100 hover:bg-[#012a4e] hover:text-white text-xs font-bold text-[#012a4e] text-center transition"
              >
                Book Master Jet Wash
              </a>
            </div>

            {/* Package 2 (Highlighted) */}
            <div className="rounded-3xl border-2 border-[#00AEEF] bg-blue-50/30 p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-xl relative">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#00AEEF] text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                Most Popular
              </div>

              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-[#00AEEF]">Deep Sanitisation</span>
                <h3 className="text-xl font-black text-[#012a4e]">Deep Chemical Foam Wash</h3>
                <p className="text-xs text-slate-500 font-normal">
                  Expanding chemical foam removes mold, grease, and sour damp smell. Includes written 30-day service warranty.
                </p>
                <div className="pt-2">
                  <span className="text-3xl font-black text-[#012a4e]">৳2,200</span>
                  <span className="text-xs text-slate-400 font-medium"> / unit</span>
                </div>
                <div className="space-y-2.5 pt-4 border-t border-blue-100">
                  <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                    <Check size={14} className="text-[#00AEEF]" />
                    <span>Everything in Master Jet Wash</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                    <Check size={14} className="text-[#00AEEF]" />
                    <span>Biodegradable expanding chemical foam</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                    <Check size={14} className="text-[#00AEEF]" />
                    <span>Complete mold & odor eradication</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                    <Check size={14} className="text-[#00AEEF]" />
                    <span>Blower wheel deep decontamination</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                    <Check size={14} className="text-[#00AEEF]" />
                    <span>Written 30-day service warranty</span>
                  </div>
                </div>
              </div>

              <a
                href="#book-service"
                className="w-full py-3 rounded-xl bg-[#00AEEF] hover:bg-[#0096ce] text-white text-xs font-bold text-center transition shadow-md shadow-[#00AEEF]/30"
              >
                Book Chemical Foam Wash
              </a>
            </div>

            {/* Package 3 */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-xs hover:shadow-lg transition">
              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Care & Gas</span>
                <h3 className="text-xl font-black text-[#012a4e]">Full Care + Gas Top-Up</h3>
                <p className="text-xs text-slate-500 font-normal">
                  Master wash + refrigerant gas recharge (R32 / R410A) with electronic leak test. Best for low cooling units.
                </p>
                <div className="pt-2">
                  <span className="text-3xl font-black text-[#012a4e]">৳3,500</span>
                  <span className="text-xs text-slate-400 font-medium"> / unit</span>
                </div>
                <div className="space-y-2.5 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                    <Check size={14} className="text-[#00AEEF]" />
                    <span>Everything in Master Jet Wash</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                    <Check size={14} className="text-[#00AEEF]" />
                    <span>Electronic refrigerant leak detection</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                    <Check size={14} className="text-[#00AEEF]" />
                    <span>100% pure virgin gas top-up</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                    <Check size={14} className="text-[#00AEEF]" />
                    <span>Compressor electrical load diagnostic</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                    <Check size={14} className="text-[#00AEEF]" />
                    <span>Extended 60-day cooling warranty</span>
                  </div>
                </div>
              </div>

              <a
                href="#book-service"
                className="w-full py-3 rounded-xl bg-slate-100 hover:bg-[#012a4e] hover:text-white text-xs font-bold text-[#012a4e] text-center transition"
              >
                Book Full Care & Gas
              </a>
            </div>

          </div>

        </div>
      </section>

      {/* ── INTERACTIVE BOOKING STEP FORM SECTION ──────────────────── */}
      <section id="book-service" className="py-20 sm:py-28 bg-slate-50/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          
          <div className="text-center space-y-3 mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-[#00AEEF]">
              Direct Doorstep Dispatch
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#012a4e]">
              Book Your AC Servicing & Repair
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
              Select your AC brand, number of units, and preferred timeslot. Our team confirms your booking within 30 minutes.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xl">
            <ServiceStepForm service={service} />
          </div>

          {/* Quick Contact Helpline Card */}
          <div className="mt-8 p-6 rounded-2xl bg-[#012a4e] text-white flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/10 text-[#00AEEF] flex items-center justify-center">
                <Phone size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-300 font-medium">Need emergency AC repair or same-day servicing?</p>
                <p className="text-base font-bold text-white">Call Direct: +880 1913-373581</p>
              </div>
            </div>

            <a
              href="https://wa.me/8801913373581"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition shadow-md shrink-0"
            >
              <span>Chat on WhatsApp</span>
            </a>
          </div>

        </div>
      </section>

    </div>
  );
}
