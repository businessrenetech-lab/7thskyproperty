import React, { useState } from "react";
import { Link } from "react-router-dom";
import ServiceStepForm from "./ServiceStepForm";
import {
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Droplets,
  Phone,
  Check,
  Sparkles,
  Zap,
  Clock,
  Video,
  Layers,
  Wrench,
  Building2,
  FileCheck,
  AlertTriangle,
  RefreshCw,
  HeartPulse,
} from "lucide-react";

// Curated visual photography collections representing our core water tank cleaning operations
const GALLERY_ITEMS = [
  {
    id: 1,
    category: "overhead",
    title: "Rooftop Concrete Overhead Tank",
    subtitle: "Algae & Scum Stripped Clean",
    image: "/assets/services/water-tank-overhead-concrete.png",
    specs: [
      "Removed 2 inches of baked green algae and black biofilm from roof tank walls",
      "Food-grade anti-bacterial sanitisation spray kills 99.9% waterborne bacteria",
      "Zero chemical bleach smell—drinking water tastes 100% natural and fresh",
      "Installed airtight insect mesh on overflow pipe to block mosquitoes and dust",
    ],
  },
  {
    id: 2,
    category: "jetwash",
    title: "150-Bar Rotary High Pressure Jet",
    subtitle: "High-Power Mechanical Scrub",
    image: "/assets/services/water-tank-high-pressure-jet.png",
    specs: [
      "Industrial 150-bar rotary pressure jet removes stubborn mineral scaling",
      "Deeply scrubs all corners, ceiling baffles, and internal ladder rungs",
      "Non-corrosive pressure prevents damage to tank internal waterproofing mortar",
      "Extracts all dirty wastewater directly into building drainage lines",
    ],
  },
  {
    id: 3,
    category: "underground",
    title: "Underground Reservoir Sludge Removal",
    subtitle: "Heavy Mud & Silt Extracted",
    image: "/assets/services/water-tank-underground-sludge.png",
    specs: [
      "Submersible trash pumps extracted thick municipal mud without pipe clogs",
      "Forced fresh air ventilation blower keeps confined tank space safe for crew",
      "Full wall and floor wash down leaving pristine bare concrete surfaces",
      "Completed in 3.5 hours with zero interruption to building water supply",
    ],
  },
  {
    id: 4,
    category: "sanitisation",
    title: "Food-Safe Disinfection Spray",
    subtitle: "WHO-Approved Biodegradable Agent",
    image: "/assets/services/water-tank-disinfection-spray.png",
    specs: [
      "Hospital-grade disinfectant destroys cholera, typhoid, and coliform germs",
      "100% biodegradable formula certified safe for cooking, babies, and food prep",
      "Zero harsh caustic bleaching powder that eats away at plumbing pipes",
      "Water is immediately safe for whole-family use as soon as tank refills",
    ],
  },
  {
    id: 5,
    category: "overhead",
    title: "PVC & Plastic Overhead Tanks",
    subtitle: "Residential Single-Family Tank",
    image: "/assets/services/water-tank-pvc-plastic.png",
    specs: [
      "Gentle rotary micro-scrubbing safe for PVC plastic and fiberglass tanks",
      "Removes yellow water discoloration, iron rust stains, and floor sediment",
      "Inspects automatic water float switch and resets electrical cutoff switch",
      "Fast 90-minute express service perfect for single apartments and villas",
    ],
  },
  {
    id: 6,
    category: "repairs",
    title: "Waterproof Polymer Crack Sealing",
    subtitle: "Leak & Seepage Repairs",
    image: "/assets/services/water-tank-crack-sealing.png",
    specs: [
      "Food-grade polymer cementitious coating permanently stops tank leakage",
      "Prevents contaminated ground water from seeping into clean reservoir water",
      "Replaced broken brass float ball-valve to stop costly water tank overflows",
      "Includes a written 1-year guarantee on all waterproofing patch repairs",
    ],
  },
  {
    id: 7,
    category: "testing",
    title: "Certified Water Quality Lab Testing",
    subtitle: "Laboratory Water Analysis",
    image: "/assets/services/water-tank-lab-testing.png",
    specs: [
      "Sterile water sample collected immediately after cleaning and tank refill",
      "Laboratory test for E. Coli, fecal coliform, TDS, pH, and heavy metals",
      "Signed lab certification accepted by building committees and health inspectors",
      "Full digital PDF report sent directly to your email and WhatsApp in 48 hours",
    ],
  },
  {
    id: 8,
    category: "underground",
    title: "Apartment Society Reservoir Complex",
    subtitle: "Full Building Water Package",
    image: "/assets/services/water-tank-society-complex.png",
    specs: [
      "Cleans underground reservoir and all rooftop overhead tanks on the same day",
      "Smart water bypass ensures zero dry taps for building residents during wash",
      "High-definition video walkthrough recorded for overseas landlords & flat owners",
      "Special discounted annual maintenance rate for building housing societies",
    ],
  },
];

const CATEGORIES = [
  { key: "all", label: "All Tank Work" },
  { key: "overhead", label: "Rooftop Tanks" },
  { key: "underground", label: "Underground Reservoirs" },
  { key: "jetwash", label: "Jet Washing & Scrub" },
  { key: "sanitisation", label: "Food-Safe Sanitisation" },
  { key: "repairs", label: "Repairs & Waterproofing" },
  { key: "testing", label: "Water Lab Testing" },
];

export default function WaterTankLanding({ service }) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeServiceTab, setActiveServiceTab] = useState(0);

  const filteredGallery =
    activeCategory === "all"
      ? GALLERY_ITEMS
      : GALLERY_ITEMS.filter((item) => item.category === activeCategory);

  // 6 official service disciplines simplified for everyday homeowners and building committees
  const serviceDisciplines = [
    {
      id: "overhead",
      icon: Droplets,
      title: "Rooftop Overhead Tank Cleaning",
      subtitle: "PVC, Plastic & Concrete Overhead Water Tanks",
      summary:
        "Fast, thorough cleaning and sanitisation for rooftop water tanks. We strip baked green algae, airborne soot, and insect debris so every tap in your home flows clear, clean, and safe.",
      scopes: [
        "150-bar rotary pressure wash strips green algae and sticky scum from all tank walls",
        "Submersible suction pump extracts sand, rust particles, and brown bottom sediment",
        "Food-grade anti-bacterial spray destroys 99.9% germs with zero caustic bleach smell",
        "Complete fresh water rinse—no chemical aftertaste or smell in your drinking water",
        "Automatic float valve check and tight lid sealing to block mosquitoes and birds",
        "High-definition before-and-after photos sent directly to your WhatsApp",
      ],
      highlights: ["150-Bar Jet Wash", "100% Algae Stripped", "Fast 2-Hour Express"],
    },
    {
      id: "underground",
      icon: Building2,
      title: "Underground Reservoir De-Sludging",
      subtitle: "Large Concrete Basement Water Reservoirs (Up to 100,000+ Gallons)",
      summary:
        "Heavy-duty mud pump extraction and deep chemical sterilisation for underground reservoirs. We pull out years of buried city pipe silt and foul-smelling black sludge without dirtying your building.",
      scopes: [
        "Heavy-duty slurry trash pumps extract thick black mud without clogging building drains",
        "Confined-space certified technicians equipped with fresh air ventilation blowers",
        "High-power mechanical wall scrub strips stubborn slimy biofilms and mineral crust",
        "Biodegradable food-safe sterilisation destroys coliform, typhoid, and cholera bacteria",
        "Thorough inspection for internal foundation cracks, roots, or groundwater seepage",
        "Coordinated pump scheduling so building residents never experience dry taps",
      ],
      highlights: ["Heavy Mud Suction", "Confined Space Certified", "Zero Plaster Harm"],
    },
    {
      id: "complex",
      icon: Layers,
      title: "Whole Building Complex Package",
      subtitle: "Underground Reservoir + All Rooftop Tanks (Residential Societies)",
      summary:
        "The complete water care solution for residential apartment societies and commercial buildings. We clean the underground reservoir and all rooftop tanks together on the same day.",
      scopes: [
        "Multi-crew simultaneous cleaning completes the entire building in 3 to 4 hours",
        "Smart water bypass routing: flats keep water pressure while one tank is being washed",
        "Building committee package with formal quotation, invoice, and executive summary",
        "High-definition before-and-after video recorded for flat owners and expatriate landlords",
        "Free inspection of main building booster pumps, float switches, and pipe unions",
        "Substantial cost savings compared to booking individual tanks separately",
      ],
      highlights: ["Society Discount", "Zero Dry-Tap Guarantee", "Committee Video Report"],
    },
    {
      id: "sanitisation",
      icon: HeartPulse,
      title: "Food-Safe Anti-Bacterial Sanitisation",
      subtitle: "Hospital-Grade, WHO-Approved Biodegradable Disinfection",
      summary:
        "100% safe disinfection that destroys dangerous microbes without toxic bleach or corrosive acid. Safe for babies, daily cooking, and immediate drinking water.",
      scopes: [
        "Hospital-grade anti-microbial agent approved by international food safety standards",
        "Kills 99.99% of dangerous waterborne bacteria (E. coli, Salmonella, Giardia, Amoeba)",
        "Non-corrosive formula protects your tank's internal waterproofing mortar and pipes",
        "Zero caustic chemical residue—no burning eyes, skin irritation, or chemical fumes",
        "Deep fogging mist penetrates hard-to-reach corner crevices and ceiling vents",
        "Water is ready and 100% safe for drinking and cooking immediately after refill",
      ],
      highlights: ["Zero Bleach Smell", "Hospital-Grade Safe", "Kills 99.9% Bacteria"],
    },
    {
      id: "repairs",
      icon: Wrench,
      title: "Crack, Seepage & Float Valve Repairs",
      subtitle: "Food-Grade Polymer Waterproofing & Overflow Protection",
      summary:
        "Stop dirty groundwater leaking in and clean water leaking out. We seal cracks with food-safe polymer waterproofing and replace broken float valves permanently.",
      scopes: [
        "Instant diagnostic of hidden wall cracks, cold joints, and outside seepage points",
        "Food-grade polymer cementitious waterproof coating that never leaches toxins",
        "Heavy-duty brass or stainless-steel float valve replacement to stop tank overflows",
        "Airtight manhole cover sealing to stop rainwater, dust, and insects from entering",
        "Pipe joint sealing and anti-rust treatment for metal suction pipes and fittings",
        "Written warranty on all crack repairs and waterproofing patches",
      ],
      highlights: ["Food-Safe Sealant", "Stops Dirty Seepage", "Overflow Protection"],
    },
    {
      id: "testing",
      icon: FileCheck,
      title: "Certified Water Quality Lab Testing",
      subtitle: "Independent Laboratory Analysis & Health Certificate",
      summary:
        "Know exactly what your family or tenants are drinking. Independent laboratory testing measuring bacteria levels, TDS, pH, hardness, and heavy metals.",
      scopes: [
        "Sterile water sample collected by trained technician using sealed lab containers",
        "Comprehensive 12-parameter lab test: E. coli, fecal coliform, TDS, pH, iron, turbidity",
        "Official signed laboratory certificate accepted by health inspectors and committees",
        "Plain-English report explaining whether your water is safe for drinking and bathing",
        "Custom filtration recommendations if your municipal supply has high iron or mineral hardness",
        "Digital PDF certificate delivered via email and WhatsApp within 48 hours",
      ],
      highlights: ["Independent Lab Test", "E. Coli & Coliform Check", "Official Certificate"],
    },
  ];

  return (
    <div className="min-h-screen bg-white text-[#012a4e]">
      
      {/* ── FULL-WIDTH MINIMALIST HERO SECTION ──────────────────────── */}
      <section className="relative w-full h-screen min-h-screen flex items-center justify-center overflow-hidden">
        {/* Full-width minimalist service image */}
        <img
          src="/assets/services/water-tank-hero.png"
          alt="Water Tank Cleaning & Sanitisation"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {/* Subtle ambient gradient overlay for optimal text contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/25" />

        {/* Hero Content: Short headline only & request button */}
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-8">
          <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight text-white leading-tight">
            Pure Water. <br />
            <span className="text-[#00AEEF]">Certified Sanitisation.</span>
          </h1>

          <div className="pt-2">
            <a
              href="#book-service"
              className="inline-flex items-center gap-2.5 rounded-full bg-[#00AEEF] px-9 py-4 text-sm sm:text-base font-bold text-white shadow-xl shadow-[#00AEEF]/30 hover:bg-[#0096ce] transition active:scale-95"
            >
              <span>Request Water Tank Cleaning</span>
              <ArrowRight size={18} />
            </a>
          </div>
        </div>
      </section>

      {/* ── SUB-HEADER NAVIGATION BAR ──────────────────────────────── */}
      <div className="sticky top-16 sm:top-20 z-30 border-y border-slate-200 bg-white/95 backdrop-blur-md shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center gap-2">
            <Link to="/services" className="text-slate-500 hover:text-[#012a4e] transition">
              Services
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-[#00AEEF] font-bold">Water Tank Cleaning & Sanitisation</span>
          </div>

          <div className="hidden md:flex items-center gap-6 text-slate-600">
            <a href="#services" className="hover:text-[#012a4e] transition">What We Deliver</a>
            <a href="#gallery" className="hover:text-[#012a4e] transition">Real Tank Work</a>
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
              Professional Clean Water Care for Homes & Buildings
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
              From individual rooftop tanks to large apartment underground reservoirs, we remove mud, kill bacteria, and guarantee safe, crystal-clear drinking water.
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
                  <span>{disc.title.replace(" Cleaning", "").replace(" Service", "")}</span>
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
                        <span>Schedule this water tank service</span>
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

      {/* ── REAL TANK WORK (PHOTO GALLERY WITH FILTERS) ─────────────── */}
      <section id="gallery" className="py-20 sm:py-28 bg-slate-50/60 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-[#00AEEF]">
              Real Tank Work
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#012a4e]">
              See What Clean, Germ-Free Water Looks Like
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
              Real before-and-after results from overhead tanks and underground reservoirs cleaned by our certified crew.
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

                <div className="p-5 flex-1 flex flex-col">
                  <div>
                    <h3 className="text-base font-bold text-[#012a4e] group-hover:text-[#00AEEF] transition leading-snug">
                      {item.title}
                    </h3>
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
                      <Clock size={12} className="text-[#00AEEF]" /> 2-3 Hours
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
              No Caustic Bleach. No Mud Left Behind.
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
              Most local cleaners use cheap bleach powder that ruins plaster and leaves a toxic chemical smell. We bring modern European mechanized hygiene standards.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="p-6 rounded-3xl bg-blue-50/40 border border-blue-100/80 space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-white text-[#00AEEF] flex items-center justify-center shadow-xs border border-blue-100">
                <ShieldCheck size={24} />
              </div>
              <h3 className="text-lg font-black text-[#012a4e]">Zero Harsh Bleach</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                We strictly use WHO-certified food-safe sanitising agents. No burning eyes, no toxic smell, and no damage to your tank mortar.
              </p>
              <div className="pt-2">
                <span className="text-[11px] font-bold text-[#00AEEF] bg-white px-2.5 py-1 rounded-full border border-blue-100">
                  100% Food-Grade Safe
                </span>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-white text-[#012a4e] flex items-center justify-center shadow-xs border border-slate-200">
                <Zap size={24} />
              </div>
              <h3 className="text-lg font-black text-[#012a4e]">150-Bar Rotary Scrub</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                Hand brushes only smear slime. Our industrial rotary jet strips 100% of bacterial biofilm and calcified scaling from corners and ceilings.
              </p>
              <div className="pt-2">
                <span className="text-[11px] font-bold text-slate-700 bg-white px-2.5 py-1 rounded-full border border-slate-200">
                  Industrial Jet Power
                </span>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-white text-[#012a4e] flex items-center justify-center shadow-xs border border-slate-200">
                <Clock size={24} />
              </div>
              <h3 className="text-lg font-black text-[#012a4e]">Heavy Sludge Vacuum</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                Submersible slurry pumps extract thick mud and sand directly into drains. No buckets carried through your home or roof.
              </p>
              <div className="pt-2">
                <span className="text-[11px] font-bold text-slate-700 bg-white px-2.5 py-1 rounded-full border border-slate-200">
                  Zero Pipe Blockage
                </span>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-white text-[#012a4e] flex items-center justify-center shadow-xs border border-slate-200">
                <Video size={24} />
              </div>
              <h3 className="text-lg font-black text-[#012a4e]">WhatsApp Video Proof</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                Living abroad or busy at work? Our site supervisor captures clear HD before-and-after video walk-throughs sent directly to your phone.
              </p>
              <div className="pt-2">
                <span className="text-[11px] font-bold text-slate-700 bg-white px-2.5 py-1 rounded-full border border-slate-200">
                  Full Video Proof
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
              Clean, Safe Water in 4 Simple Steps
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
              Fast, hassle-free service completed in 2 to 3 hours with minimal disruption to your daily routine.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs relative">
              <span className="text-4xl font-black text-slate-100 absolute top-4 right-6">01</span>
              <div className="h-10 w-10 rounded-xl bg-blue-50 text-[#00AEEF] flex items-center justify-center font-bold text-sm mb-4">
                1
              </div>
              <h3 className="text-base font-bold text-[#012a4e] mb-2">Drain & Inspect</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                We shut the inlet valve, pump out old stagnant water, and inspect internal walls for cracks or leaks.
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs relative">
              <span className="text-4xl font-black text-slate-100 absolute top-4 right-6">02</span>
              <div className="h-10 w-10 rounded-xl bg-blue-50 text-[#00AEEF] flex items-center justify-center font-bold text-sm mb-4">
                2
              </div>
              <h3 className="text-base font-bold text-[#012a4e] mb-2">Sludge Vacuum</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Submersible slurry pumps pull out years of settled silt, mud, and rusty pipe sediment from the tank floor.
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs relative">
              <span className="text-4xl font-black text-slate-100 absolute top-4 right-6">03</span>
              <div className="h-10 w-10 rounded-xl bg-blue-50 text-[#00AEEF] flex items-center justify-center font-bold text-sm mb-4">
                3
              </div>
              <h3 className="text-base font-bold text-[#012a4e] mb-2">150-Bar Jet & Sanitise</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Rotary water jets strip green algae, followed by a food-grade antibacterial mist that kills 99.9% germs.
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs relative">
              <span className="text-4xl font-black text-slate-100 absolute top-4 right-6">04</span>
              <div className="h-10 w-10 rounded-xl bg-blue-50 text-[#00AEEF] flex items-center justify-center font-bold text-sm mb-4">
                4
              </div>
              <h3 className="text-base font-bold text-[#012a4e] mb-2">Refill & Video Report</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                We rinse, reset your float valves, refill the tank, and send an HD before-and-after video directly to your WhatsApp.
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
              Simple, Upfront Water Tank Packages
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
              No hidden fees, no surprise labor costs. Fixed transparent rates for homes, buildings, and commercial facilities.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            
            {/* Package 1 */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-xs hover:shadow-lg transition">
              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Single Tank</span>
                <h3 className="text-xl font-black text-[#012a4e]">Overhead Rooftop Tank</h3>
                <p className="text-xs text-slate-500 font-normal">
                  Ideal for single apartments, independent homes & rooftop PVC or concrete tanks up to 2,000 liters.
                </p>
                <div className="pt-2">
                  <span className="text-3xl font-black text-[#012a4e]">৳3,500</span>
                  <span className="text-xs text-slate-400 font-medium"> / tank</span>
                </div>
                <div className="space-y-2.5 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                    <Check size={14} className="text-[#00AEEF]" />
                    <span>Complete bottom silt extraction</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                    <Check size={14} className="text-[#00AEEF]" />
                    <span>150-bar rotary pressure scrub</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                    <Check size={14} className="text-[#00AEEF]" />
                    <span>Food-safe antibacterial spray</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                    <Check size={14} className="text-[#00AEEF]" />
                    <span>Float valve & lid inspection</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                    <Check size={14} className="text-[#00AEEF]" />
                    <span>WhatsApp photo proof</span>
                  </div>
                </div>
              </div>

              <a
                href="#book-service"
                className="w-full py-3 rounded-xl bg-slate-100 hover:bg-[#012a4e] hover:text-white text-xs font-bold text-[#012a4e] text-center transition"
              >
                Book Rooftop Tank
              </a>
            </div>

            {/* Package 2 (Highlighted) */}
            <div className="rounded-3xl border-2 border-[#00AEEF] bg-blue-50/30 p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-xl relative">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#00AEEF] text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                Most Popular
              </div>

              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-[#00AEEF]">Underground Deep Clean</span>
                <h3 className="text-xl font-black text-[#012a4e]">Underground Reservoir</h3>
                <p className="text-xs text-slate-500 font-normal">
                  Heavy mud de-sludging and confined-space sterilisation for apartment buildings up to 5,000 gallons.
                </p>
                <div className="pt-2">
                  <span className="text-3xl font-black text-[#012a4e]">৳7,500</span>
                  <span className="text-xs text-slate-400 font-medium"> / reservoir</span>
                </div>
                <div className="space-y-2.5 pt-4 border-t border-blue-100">
                  <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                    <Check size={14} className="text-[#00AEEF]" />
                    <span>Heavy slurry mud extraction</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                    <Check size={14} className="text-[#00AEEF]" />
                    <span>Confined space crew + air blower</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                    <Check size={14} className="text-[#00AEEF]" />
                    <span>Biofilm stripping & floor scrub</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                    <Check size={14} className="text-[#00AEEF]" />
                    <span>Food-safe anti-microbial fogging</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                    <Check size={14} className="text-[#00AEEF]" />
                    <span>HD WhatsApp video walk-through</span>
                  </div>
                </div>
              </div>

              <a
                href="#book-service"
                className="w-full py-3 rounded-xl bg-[#00AEEF] hover:bg-[#0096ce] text-white text-xs font-bold text-center transition shadow-md shadow-[#00AEEF]/30"
              >
                Book Underground Reservoir
              </a>
            </div>

            {/* Package 3 */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-xs hover:shadow-lg transition">
              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Complete Building</span>
                <h3 className="text-xl font-black text-[#012a4e]">Whole Complex Bundle</h3>
                <p className="text-xs text-slate-500 font-normal">
                  Underground reservoir + 2 rooftop overhead tanks cleaned together on the same day for maximum savings.
                </p>
                <div className="pt-2">
                  <span className="text-3xl font-black text-[#012a4e]">৳9,900</span>
                  <span className="text-xs text-slate-400 font-medium"> / building</span>
                </div>
                <div className="space-y-2.5 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                    <Check size={14} className="text-[#00AEEF]" />
                    <span>Underground + 2 Rooftop Tanks</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                    <Check size={14} className="text-[#00AEEF]" />
                    <span>Zero dry tap bypass management</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                    <Check size={14} className="text-[#00AEEF]" />
                    <span>Booster pump & float valve audit</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                    <Check size={14} className="text-[#00AEEF]" />
                    <span>Building committee certificate</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                    <Check size={14} className="text-[#00AEEF]" />
                    <span>Priority Annual AMC pricing</span>
                  </div>
                </div>
              </div>

              <a
                href="#book-service"
                className="w-full py-3 rounded-xl bg-slate-100 hover:bg-[#012a4e] hover:text-white text-xs font-bold text-[#012a4e] text-center transition"
              >
                Book Building Bundle
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
              Direct Dispatch
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#012a4e]">
              Book Your Water Tank Cleaning
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
              Select your tank type and preferred date. Our operations desk will confirm within 30 minutes with our crew schedule.
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
                <p className="text-xs text-slate-300 font-medium">Need immediate water tank service or urgent advice?</p>
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
