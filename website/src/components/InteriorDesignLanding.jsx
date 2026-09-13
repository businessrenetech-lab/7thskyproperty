"use client";

import React, { useState } from "react";
import Link from "next/link";
import ServiceStepForm from "./ServiceStepForm";
import {
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Layers,
  Compass,
  Ruler,
  Phone,
  Check,
  Lightbulb,
  Hammer,
  Home,
  Briefcase,
  Activity,
  Moon,
  Sparkles,
} from "lucide-react";

// Curated visual photography collections representing our core interior services
const GALLERY_ITEMS = [
  {
    id: 1,
    category: "residential",
    title: "Grand Living & Dining Room",
    subtitle: "Modern Living Space",
    image: "/assets/services/interior-grand-living.jpg",
    specs: [
      "Natural wood wall feature with all TV wires and cables completely hidden",
      "Warm ceiling lighting with easy dimming for relaxing movie nights",
      "Custom sectional sofa in spill-resistant, easy-to-clean premium fabric",
      "Wide open entryway that connects living and dining areas naturally",
    ],
  },
  {
    id: 2,
    category: "commercial",
    title: "Modern Executive Boardroom",
    subtitle: "Corporate Workspace",
    image: "/assets/services/interior-executive-boardroom.jpg",
    specs: [
      "Double-glazed soundproof glass walls for completely private discussions",
      "Solid walnut conference table with built-in laptop charging and HDMI ports",
      "Glare-free ceiling lights that keep eyes relaxed during long meetings",
      "Neat hidden cable channels under the floor—no loose wires anywhere",
    ],
  },
  {
    id: 3,
    category: "fitout",
    title: "Modern Chef's Kitchen",
    subtitle: "Modular Kitchen",
    image: "/assets/services/interior-chefs-kitchen.jpg",
    specs: [
      "Stain-proof quartz waterfall island that resists hot pots, oil, and spices",
      "100% waterproof marine wood cabinets that never swell or rot",
      "German soft-close drawers that slide open and close silently",
      "Bright under-cabinet LED lights for safe, easy cooking and food prep",
    ],
  },
  {
    id: 4,
    category: "residential",
    title: "Serene Master Bedroom",
    subtitle: "Master Suite",
    image: "/assets/services/interior-master-bedroom.jpg",
    specs: [
      "Padded floor-to-ceiling headboard that absorbs corridor noise for deep sleep",
      "Walk-in wardrobe with tinted glass doors and automatic sensor lights",
      "Floating bedside tables in solid oak with concealed charging slots",
      "Dual curtains: sheer daytime sun filters and 100% blackout night drapes",
    ],
  },
  {
    id: 5,
    category: "fitness",
    title: "Private Home & Office Gym",
    subtitle: "Fitness & Wellness",
    image: "/assets/services/interior-home-gym.jpg",
    specs: [
      "Heavy-duty rubber flooring that prevents floor tile cracks from dropped weights",
      "Full-height wall mirrors with backlight so you can watch your exercise posture",
      "Dedicated cooling ventilation that keeps workout air fresh and odor-free",
      "Safe layout with wide walkways around all treadmills and benches",
    ],
  },
  {
    id: 6,
    category: "prayer",
    title: "Peaceful Prayer Sanctuary",
    subtitle: "Prayer Room (Musallah)",
    image: "/assets/services/interior-prayer-sanctuary.jpg",
    specs: [
      "Exact Qibla direction verified with digital laser alignment",
      "Thick, plush prayer carpeting with soft row guidelines for family prayers",
      "Custom solid oak Quran shelves and easy-reach prayer bookstands",
      "Adjoining private Wudu washing area with safe anti-slip floor tiles",
    ],
  },
  {
    id: 7,
    category: "renovation",
    title: "Open-Plan Living Renovation",
    subtitle: "Remodeling & Makeover",
    image: "/assets/services/interior-open-renovation.jpg",
    specs: [
      "Removed non-loadbearing walls to flood the entire apartment with sunlight",
      "Brand new bathroom plumbing with 100% leak-proof waterproof coating",
      "Wide, comfortable walkways between rooms with zero awkward corners",
      "Durable smooth flooring that is easy to mop and resistant to scratches",
    ],
  },
  {
    id: 8,
    category: "styling",
    title: "Handcrafted Furniture & Decor",
    subtitle: "Furniture & Styling",
    image: "/assets/services/interior-furniture-decor.jpg",
    specs: [
      "Custom 8-seater dining table handcrafted from premium solid teak wood",
      "Stain-guarded fabric chairs that survive coffee, juice, or food spills",
      "Handpicked framed wall art, modern ceramic vases, and leafy indoor plants",
      "Complete white-glove setup: our crew delivers, unboxes, and arranges everything",
    ],
  },
];

const CATEGORIES = [
  { key: "all", label: "All Works" },
  { key: "residential", label: "Homes & Flats" },
  { key: "commercial", label: "Offices & Commercial" },
  { key: "fitout", label: "Kitchens & Cabinets" },
  { key: "renovation", label: "Renovation & Remodeling" },
  { key: "fitness", label: "Gyms & Wellness" },
  { key: "prayer", label: "Prayer Rooms" },
  { key: "styling", label: "Furniture & Styling" },
];

export default function InteriorDesignLanding({ service }) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeServiceTab, setActiveServiceTab] = useState(0);

  const filteredGallery =
    activeCategory === "all"
      ? GALLERY_ITEMS
      : GALLERY_ITEMS.filter((item) => item.category === activeCategory);

  // The 7 official service disciplines simplified for everyday homeowners and business owners
  const serviceDisciplines = [
    {
      id: "residential",
      icon: Home,
      title: "Full Home & Apartment Interiors",
      subtitle: "Living Rooms, Modular Kitchens, Master Bedrooms & Studies",
      summary:
        "Complete home interior design tailored to how your family lives. We turn empty flats into warm, stylish, and highly practical homes with smart storage and beautiful lighting.",
      scopes: [
        "Smart space planning that makes your rooms feel bigger, brighter, and clutter-free",
        "Lifelike 3D visual previews so you see exactly how every room will look before work starts",
        "Custom living & dining rooms with stunning TV media walls and hidden wire management",
        "Modular kitchens designed for cooking comfort, with wipe-clean surfaces and soft-close cabinets",
        "Master bedroom suites with luxury wardrobes, cozy headboards, and soothing ambient lighting",
        "Simple smart home controls for lights, AC cooling, and motorized curtains from your phone",
      ],
      highlights: ["Free 3D Visual Plan", "Turnkey Delivery", "Written Warranty"],
    },
    {
      id: "commercial",
      icon: Briefcase,
      title: "Office & Commercial Interiors",
      subtitle: "Modern Workspaces, Boardrooms, Retail Shops & Cafés",
      summary:
        "Inspiring workspaces that elevate your brand and help your team do their best work. Built on time and within budget, with zero disruption to your daily operations.",
      scopes: [
        "Open-plan office desks, private executive cabins, and ergonomic seating for all-day comfort",
        "Soundproof glass meeting rooms and private phone pods for quiet, confidential calls",
        "Eye-catching reception desks and corporate logo walls that impress every visiting client",
        "Retail shop, showroom, and café fit-outs designed to attract customers and drive sales",
        "Safe, organized wiring under floors and ceilings—no messy cables or power strip clutter",
        "Flexible weekend and after-hours execution so your business never stops running",
      ],
      highlights: ["Soundproof Meeting Rooms", "Brand Wall & Signage", "Fast Turnaround"],
    },
    {
      id: "fitout",
      icon: Hammer,
      title: "Custom Cabinets & Modular Kitchens",
      subtitle: "Factory-Built Kitchens, Wardrobes, TV Consoles & Storage",
      summary:
        "Precision-crafted cabinetry built in our high-tech factory—not on your floor. Built with 100% waterproof materials and smooth German hardware that lasts for decades.",
      scopes: [
        "100% waterproof marine boards that never bend, swell, or rot from kitchen steam or water",
        "Scratch-resistant, anti-fingerprint surfaces that stay spotless with a simple wipe",
        "Machine-sealed protective edge strips that block humidity, termites, and pests permanently",
        "Stain-proof quartz and granite countertops that handle hot pans and daily cooking easily",
        "Smooth, silent soft-close hinges and drawer slides tested for over 20 years of daily use",
        "Custom TV units, shoe cabinets, display vitrines, and full-height pantry storage",
      ],
      highlights: ["100% Waterproof Boards", "German Soft-Close Hinges", "Factory-Built Precision"],
    },
    {
      id: "renovation",
      icon: Ruler,
      title: "Home Renovation & Remodeling",
      subtitle: "Wall Changes, Modern Bathrooms, Kitchen Makeovers & Damp Repair",
      summary:
        "Give your older property a fresh, modern second life. We open up dark spaces, modernize old bathrooms, fix stubborn damp walls, and deliver a fixed-price guarantee.",
      scopes: [
        "Laser room check to remove awkward walls, letting in more natural sunlight and fresh air",
        "Complete bathroom remodeling: new leak-proof plumbing, modern tiles, and stylish rain showers",
        "Kitchen modernization: modern layouts, better ventilation, and heavy-duty grease exhaust hoods",
        "Permanent damp-proofing treatment on problem walls before applying smooth, premium paint",
        "Full pre-move renovation and rental refresh for property owners and overseas landlords",
        "Clear, fixed-price itemized estimate—you never get hit with surprise bills or hidden fees",
      ],
      highlights: ["Fixed Price Guarantee", "Zero Hidden Costs", "Bathroom Waterproofing"],
    },
    {
      id: "styling",
      icon: Sparkles,
      title: "Furniture, Curtains & Home Styling",
      subtitle: "Handcrafted Solid Wood Furniture, Luxury Curtains & Room Decor",
      summary:
        "The finishing touches that make a space feel like home. We custom-build solid wood furniture, tailor luxury curtains, and style your home so it's ready to move into.",
      scopes: [
        "Handcrafted dining tables, chairs, and beds made from premium solid teak, oak, and walnut",
        "Stain-resistant, easy-to-clean fabrics perfect for families with kids and pets",
        "Custom-stitched blackout and sheer curtains with silent smooth-gliding tracks",
        "Curated wall art, modern rugs, decorative lighting, and indoor plants picked just for your space",
        "Stress-free shopping: we source, inspect, and negotiate direct factory rates on your behalf",
        "White-glove delivery: our team unboxes, cleans, places, and styles every piece perfectly",
      ],
      highlights: ["Solid Hardwood", "Stain-Proof Fabrics", "White-Glove Setup"],
    },
    {
      id: "fitness",
      icon: Activity,
      title: "Private Home & Office Gyms",
      subtitle: "Workout Rooms, Yoga Corners & Commercial Fitness Studios",
      summary:
        "Stay healthy in the comfort of your own home or office. We design safe, motivating fitness spaces with shock-absorbing floors, full-wall mirrors, and fresh airflow.",
      scopes: [
        "Heavy-duty shock-absorbing rubber flooring that protects your tiles from heavy dumbbells",
        "Smart equipment layout with plenty of open floor space so you can exercise safely",
        "Fresh airflow and humidity control so the room stays cool, fresh, and odor-free",
        "Full-height shatter-proof mirrors with flattering LED lighting to check your workout form",
        "Neat wall racks for dumbbells, resistance bands, kettlebells, and yoga mats",
        "Sound-insulated walls so heavy music or dropped weights won't disturb the rest of the house",
      ],
      highlights: ["Tile-Protecting Floors", "Fresh Airflow", "Shatter-Proof Mirrors"],
    },
    {
      id: "prayer",
      icon: Moon,
      title: "Dedicated Prayer Rooms (Musallah)",
      subtitle: "Peaceful Family Prayer Sanctuaries & Corporate Musallahs",
      summary:
        "A quiet, reverent sanctuary for your daily prayers. Designed with verified Qibla direction, plush prayer carpeting, warm Quran shelves, and integrated Wudu ablution facilities.",
      scopes: [
        "Exact Qibla direction verified with calibrated laser compass tools for total peace of mind",
        "Spacious prayer rows with ample room for comfortable standing, bowing, and prostrating",
        "Separate, dignified prayer spaces for men and women with discrete privacy dividers",
        "Adjoining clean Wudu (ablution) station with anti-slip waterproof floors and splash guards",
        "Extra-soft, high-density prayer carpets with subtle row guidelines for clean alignment",
        "Solid oak Quran storage shelves, prayer mat holders, and soft ambient ceiling lighting",
      ],
      highlights: ["Verified Qibla Direction", "Adjoining Wudu Station", "Plush Prayer Carpeting"],
    },
  ];

  // The 4 Seventh Sky Promises: Plain, benefit-driven standards that matter to customers
  const technicalPillars = [
    {
      icon: Ruler,
      title: "Smart Space & Effortless Living",
      tagline: "Every square foot planned for light, comfort, and easy movement.",
      points: [
        {
          heading: "Wide, Clear Walkways",
          detail: "Generous 3-foot pathways between furniture so your home feels open and everyone moves around freely.",
        },
        {
          heading: "Bright Natural Sunlight",
          detail: "Smart room layouts that draw natural daylight deep into living, dining, and cooking spaces.",
        },
        {
          heading: "Right-Sized Furniture",
          detail: "Furniture scaled precisely to your ceiling height and room size—no cramped or oversized pieces.",
        },
        {
          heading: "Quiet, Peaceful Rooms",
          detail: "Acoustic wall paneling and door seals that block hallway noise and room echoes.",
        },
      ],
    },
    {
      icon: Layers,
      title: "100% Moisture-Proof Materials",
      tagline: "Built to survive humidity, water spills, and heavy daily use.",
      points: [
        {
          heading: "100% Waterproof Marine Boards",
          detail: "Genuine boiling-water-resistant plywood that will never swell, soften, or rot from humidity or spills.",
        },
        {
          heading: "Stain & Scratch-Proof Surfaces",
          detail: "Matte surface finishes that resist oily fingers, knife scratches, and daily kitchen wear.",
        },
        {
          heading: "Factory Machine Edge-Sealing",
          detail: "Computer-sealed edges with hot-melt glue to create an airtight seal against dampness and pests.",
        },
        {
          heading: "Safe, Odor-Free Paints",
          detail: "Eco-friendly, zero-VOC paints and lacquers—move in immediately without harsh chemical fumes.",
        },
      ],
    },
    {
      icon: Lightbulb,
      title: "3-Layer Mood Lighting",
      tagline: "The right light for relaxing, working, and entertaining.",
      points: [
        {
          heading: "Soft Ambient Glow",
          detail: "Warm hidden ceiling cove lights that fill the room with a cozy, relaxing glow without glaring bulbs.",
        },
        {
          heading: "Bright Task Lights",
          detail: "Clear, crisp LED lights focused over kitchen counters, study desks, and vanity mirrors.",
        },
        {
          heading: "Art & Wall Spotlights",
          detail: "Small, angled spotlights that make your favorite wall paintings and textures pop.",
        },
        {
          heading: "One-Touch Scene Modes",
          detail: "Switch between 'Bright Day', 'Dinner Party', and 'Movie Night' with a simple tap on your phone.",
        },
      ],
    },
    {
      icon: Hammer,
      title: "Smooth Hardware Built for 20+ Years",
      tagline: "Genuine Austrian and German fittings for silent daily operation.",
      points: [
        {
          heading: "Silent Soft-Close Everywhere",
          detail: "German and Austrian hinges and slides tested for over 200,000 opens and closes without squeaking.",
        },
        {
          heading: "Natural Wood Grain Matching",
          detail: "Real oak and walnut veneers hand-aligned so wood grains flow seamlessly across all cabinet doors.",
        },
        {
          heading: "Hidden Screws & Clean Edges",
          detail: "All fasteners and screws hidden inside the joinery—leaving clean, beautiful outer surfaces.",
        },
        {
          heading: "Built-In Smart Organizers",
          detail: "Pull-out pantry racks, cutlery dividers, deep pot drawers, and hidden trash bins that keep counters clear.",
        },
      ],
    },
  ];

  // The 4-step delivery process: Simple, transparent, and reassuring
  const processPhases = [
    {
      phase: "01",
      title: "Free Consultation & 3D Plan",
      timeline: "Week 1 to 2",
      points: [
        "We visit your property for accurate laser measurements and space evaluation",
        "We sit down to understand your family's daily lifestyle, tastes, and budget",
        "You receive realistic 3D pictures showing how your finished space will look",
        "We provide a clear, itemized price quote with guaranteed zero hidden costs",
      ],
    },
    {
      phase: "02",
      title: "Material Choice & Agreement",
      timeline: "Week 3 to 4",
      points: [
        "Touch and feel real samples: wood veneers, quartz stones, fabrics, and handles",
        "Review final 2D drawings showing every plug point, light switch, and cabinet shelf",
        "Sign a transparent service contract with fixed payment milestones",
        "Lock in guaranteed delivery dates before manufacturing begins",
      ],
    },
    {
      phase: "03",
      title: "Dust-Free Factory Fabrication",
      timeline: "Week 5 to 8",
      points: [
        "80% of your cabinets are pre-built in our dust-free computerized factory",
        "Zero sawing noise, wood dust, or chaos inside your home or apartment",
        "Our site engineer supervises electrical, ceiling, and painting prep on site",
        "Weekly photo and video progress updates sent straight to your WhatsApp",
      ],
    },
    {
      phase: "04",
      title: "Fast Setup & Key Handover",
      timeline: "Week 9 to 10",
      points: [
        "Quick on-site assembly and installation completed cleanly in 10-14 days",
        "Full room styling: curtains hung, furniture placed, and decorative lighting tested",
        "Deep vacuum cleaning and thorough joint walkthrough to check every single detail",
        "Final key handover with your written warranty certificate and care guide",
      ],
    },
  ];

  const packages = [
    {
      name: "Essential Home Fit-Out",
      price: "From ৳1,200 / sft",
      desc: "Smart, modern interior setup ideal for rental apartments, new homeowners, and budget-conscious investments.",
      popular: false,
      features: [
        "Modern false ceiling with warm hidden LED strip lights",
        "Complete modular kitchen base and top cabinets with soft-close hinges",
        "Living room TV console with stylish fluted accent wall paneling",
        "Full home wall painting in easy-to-clean, scrub-resistant paint",
        "Built-in master bedroom wardrobe with smooth sliding or hinged doors",
        "1-Year full warranty covering all hardware and woodwork",
      ],
    },
    {
      name: "Executive Luxury Living",
      price: "From ৳1,850 / sft",
      desc: "Our most popular complete home package featuring custom woodwork, quartz stone, and multi-tier lighting.",
      popular: true,
      features: [
        "Full home makeover: living room, dining salon, chef kitchen & master suite",
        "Stain-proof quartz kitchen island with waterfall edges and matching backsplash",
        "Authentic Austrian Blum soft-close hinges and heavy-duty drawer slides",
        "Walk-in dressing room with tinted glass wardrobes and sensor LED lighting",
        "Real natural wood veneer wall cladding in living and dining areas",
        "3-Layer mood lighting (warm cove glow + directional track spotlights)",
        "Safe, zero-VOC paints that are completely safe for babies and pets",
        "3-Year written warranty with free hardware checkups twice a year",
      ],
    },
    {
      name: "Signature Bespoke & Commercial",
      price: "Custom Itemized Quote",
      desc: "Full interior remodeling, luxury duplexes, corporate offices, home gyms, or dedicated prayer rooms.",
      popular: false,
      features: [
        "Complete room remodeling, wall repositioning, and open-plan reconfigurations",
        "Specialized designs for corporate offices, home gyms, or prayer rooms (musallah)",
        "Imported Italian marble flooring and custom vanity countertops",
        "Handcrafted solid timber furniture in natural teak, oak, or walnut",
        "Smart home controls for lighting, air conditioning, and motorized curtains",
        "Dedicated senior interior architect and full-time on-site supervising engineer",
        "5-Year premium warranty with priority concierge customer support",
      ],
    },
  ];

  return (
    <div className="bg-white text-[#012a4e] min-h-screen">
      
      {/* ── FULL-WIDTH MINIMALIST HERO SECTION ──────────────────────── */}
      <section className="relative w-full h-screen min-h-screen flex items-center justify-center overflow-hidden">
        {/* Full-width minimalist architectural interior image */}
        <img
          src="/assets/services/interior-hero.png"
          alt="Refined Interior Architecture"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {/* Subtle ambient gradient overlay for optimal text contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/25" />

        {/* Hero Content: Short headline only & request button */}
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-8">
          <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight text-white leading-tight">
            Refined Spaces. <br />
            <span className="text-[#00AEEF]">Crafted for Living.</span>
          </h1>

          <div className="pt-2">
            <a
              href="#book-service"
              className="inline-flex items-center gap-2.5 rounded-full bg-[#00AEEF] px-9 py-4 text-sm sm:text-base font-bold text-white shadow-xl shadow-[#00AEEF]/30 hover:bg-[#0096ce] transition active:scale-95"
            >
              <span>Request Interior Consultation</span>
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
            <span className="text-[#00AEEF] font-bold">Interior Design & Fit-Out</span>
          </div>

          <div className="hidden md:flex items-center gap-6 text-slate-600">
            <a href="#solutions" className="hover:text-[#012a4e] transition">What We Deliver</a>
            <a href="#portfolio" className="hover:text-[#012a4e] transition">Our Work</a>
            <a href="#engineering" className="hover:text-[#012a4e] transition">Why Choose Us</a>
            <a href="#process" className="hover:text-[#012a4e] transition">How It Works</a>
            <a href="#packages" className="hover:text-[#012a4e] transition">Pricing Plans</a>
            <a
              href="#book-service"
              className="rounded-full bg-[#00AEEF] px-4 py-1.5 text-white font-bold hover:bg-[#0096ce] transition shadow-xs"
            >
              Book Free Consult
            </a>
          </div>
        </div>
      </div>

      {/* ── 7 SPECIALIZED INTERIOR DISCIPLINES ─────────────────────── */}
      <section id="solutions" className="py-20 sm:py-28 bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-[#00AEEF]">
              What We Deliver
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#012a4e]">
              Complete Interior Solutions for Home & Office
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
              From modular kitchens to complete home renovations, we design, build, and deliver move-in ready spaces with zero hassle and fixed transparent pricing.
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
                  <span>{disc.title.replace(" Solutions", "").replace(" Interior Design", "")}</span>
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

                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {cur.subtitle}
                    </p>

                    <p className="text-sm text-slate-600 leading-relaxed font-normal">
                      {cur.summary}
                    </p>

                    <div className="flex flex-wrap gap-2 pt-2">
                      {cur.highlights.map((badge, bIdx) => (
                        <span
                          key={bIdx}
                          className="rounded-full bg-white border border-slate-200 px-3 py-1 text-[11px] font-bold text-[#012a4e] shadow-xs"
                        >
                          {badge}
                        </span>
                      ))}
                    </div>

                    <div className="pt-4">
                      <a
                        href="#book-service"
                        className="inline-flex items-center gap-2 rounded-full bg-[#00AEEF] px-6 py-3 text-xs font-bold text-white shadow-md shadow-[#00AEEF]/20 hover:bg-[#0096ce] transition"
                      >
                        <span>Inquire About This Service</span>
                        <ArrowRight size={14} />
                      </a>
                    </div>
                  </div>

                  <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        What We Include & Deliver
                      </h4>
                      <span className="text-[10px] font-bold text-[#00AEEF] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                        Guaranteed Quality
                      </span>
                    </div>

                    <div className="space-y-3 pt-2">
                      {cur.scopes.map((scope, sIdx) => (
                        <div key={sIdx} className="flex items-start gap-3 text-xs text-slate-600 leading-relaxed">
                          <CheckCircle2 size={15} className="text-[#00AEEF] shrink-0 mt-0.5" />
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

      {/* ── SPATIAL PORTFOLIO & GALLERY ────────────────────────────── */}
      <section id="portfolio" className="py-20 sm:py-28 bg-slate-50/70 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-[#00AEEF]">
                Our Recent Projects
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-[#012a4e]">
                Beautiful Spaces, Built for Real Life
              </h2>
              <p className="text-sm text-slate-500 max-w-xl font-normal">
                Take a look at our completed living rooms, modular kitchens, corporate offices, home gyms, and peaceful prayer sanctuaries.
              </p>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    activeCategory === cat.key
                      ? "bg-[#012a4e] text-white shadow-xs"
                      : "bg-white border border-slate-200 text-slate-600 hover:text-[#012a4e] hover:bg-slate-100"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Spatial Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredGallery.map((item) => (
              <div
                key={item.id}
                className="group rounded-3xl border border-slate-200/90 bg-white overflow-hidden hover:border-slate-300 hover:shadow-xl transition-all duration-300 flex flex-col"
              >
                <div className="relative h-60 overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="rounded-full bg-white/90 backdrop-blur-md border border-slate-200 px-3 py-1 text-[10px] font-bold text-[#012a4e] uppercase tracking-wider shadow-xs">
                      {item.subtitle}
                    </span>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-[#012a4e] group-hover:text-[#00AEEF] transition-colors">
                      {item.title}
                    </h3>

                    {/* Bullet List of Depth Specifications */}
                    <ul className="mt-3 space-y-2 text-xs text-slate-600">
                      {item.specs.map((spec, sIdx) => (
                        <li key={sIdx} className="flex items-start gap-2">
                          <CheckCircle2 size={13} className="text-[#00AEEF] shrink-0 mt-0.5" />
                          <span className="leading-snug">{spec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <a
                    href="#book-service"
                    className="pt-3 border-t border-slate-100 text-xs font-bold text-[#00AEEF] flex items-center justify-between hover:text-[#012a4e] transition"
                  >
                    <span>Request Similar Design</span>
                    <ArrowRight size={13} />
                  </a>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── WHY CHOOSE US / SEVENTH SKY PROMISES ───────────────────── */}
      <section id="engineering" className="py-20 sm:py-28 bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1 text-xs font-bold uppercase tracking-widest text-[#00AEEF]">
              <Compass size={13} />
              <span>The Seventh Sky Difference</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-[#012a4e]">
              Quality You Can See. Materials You Can Trust.
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
              Great interior design isn't just about looking good in photos. It's about waterproof materials, whisper-quiet drawers, and comfortable living for decades to come.
            </p>
          </div>

          {/* Pillars Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {technicalPillars.map((pillar, idx) => (
              <div
                key={idx}
                className="rounded-3xl border border-slate-200/90 bg-slate-50/40 p-8 space-y-6 hover:shadow-lg hover:border-slate-300 transition"
              >
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-blue-50 text-[#00AEEF] flex items-center justify-center shrink-0 border border-blue-100">
                    <pillar.icon size={22} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[#012a4e]">{pillar.title}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{pillar.tagline}</p>
                  </div>
                </div>

                {/* Highly structured bullet insights with depth */}
                <div className="space-y-3.5 pt-2 border-t border-slate-200/80">
                  {pillar.points.map((pt, pIdx) => (
                    <div key={pIdx} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#00AEEF]" />
                        <h4 className="text-xs font-bold text-[#012a4e]">{pt.heading}</h4>
                      </div>
                      <p className="text-xs text-slate-600 pl-3.5 leading-relaxed">
                        {pt.detail}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── 4-STAGE TURNKEY DELIVERY PROCESS ───────────────────────── */}
      <section id="process" className="py-20 sm:py-28 bg-slate-50/70 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-[#00AEEF]">
              Simple & Stress-Free
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#012a4e]">
              Your Dream Space in 4 Easy Steps
            </h2>
            <p className="text-sm text-slate-500 font-normal">
              No guesswork, no unexpected delays, and no hidden surprises. We keep you updated at every step from 3D plan to key handover.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {processPhases.map((phase, idx) => (
              <div
                key={idx}
                className="relative rounded-3xl border border-slate-200 bg-white p-6 flex flex-col justify-between space-y-4 hover:border-slate-300 hover:shadow-lg transition"
              >
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <span className="text-2xl font-black text-[#00AEEF]">{phase.phase}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-full shadow-xs">
                      {phase.timeline}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-[#012a4e] mt-3 mb-3">
                    {phase.title}
                  </h3>

                  <ul className="space-y-2 text-xs text-slate-600">
                    {phase.points.map((pt, pIdx) => (
                      <li key={pIdx} className="flex items-start gap-2">
                        <Check size={12} className="text-[#00AEEF] shrink-0 mt-0.5" />
                        <span className="leading-snug">{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Clear Milestone
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── PACKAGES & PRICING GUIDE ──────────────────────────────── */}
      <section id="packages" className="py-20 sm:py-28 bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-[#00AEEF]">
              Transparent Pricing
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#012a4e]">
              Tailored Interior Design Packages
            </h2>
            <p className="text-sm text-slate-500 font-normal">
              Clear square-foot pricing with fully itemized Bills of Quantities and zero hidden add-on costs.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {packages.map((pkg, idx) => (
              <div
                key={idx}
                className={`rounded-3xl p-8 flex flex-col justify-between space-y-6 transition-all relative ${
                  pkg.popular
                    ? "border-2 border-[#00AEEF] bg-white shadow-xl shadow-blue-500/10"
                    : "border border-slate-200 bg-slate-50/40 hover:bg-white hover:border-slate-300 hover:shadow-md"
                }`}
              >
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-[#00AEEF] text-white text-[10px] font-black uppercase tracking-widest px-3.5 py-1 rounded-full shadow-md">
                      Most Popular
                    </span>
                  </div>
                )}

                <div>
                  <h3 className="text-xl font-black text-[#012a4e]">{pkg.name}</h3>
                  <div className="text-2xl font-extrabold text-[#00AEEF] mt-1">{pkg.price}</div>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">{pkg.desc}</p>

                  <div className="pt-6 mt-6 border-t border-slate-200/70 space-y-2.5">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                      Package Inclusions:
                    </span>
                    {pkg.features.map((feat, fIdx) => (
                      <div key={fIdx} className="flex items-start gap-2 text-xs text-slate-600">
                        <CheckCircle2 size={13} className="text-[#00AEEF] shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <a
                  href="#book-service"
                  className={`w-full py-3.5 rounded-full text-xs font-bold text-center transition block ${
                    pkg.popular
                      ? "bg-[#00AEEF] text-white hover:bg-[#0096ce] shadow-md shadow-[#00AEEF]/20"
                      : "border border-slate-300 text-slate-700 hover:bg-slate-100 bg-white"
                  }`}
                >
                  Select This Package
                </a>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── INTERACTIVE CONSULTATION & BOOKING FORM ─────────────────── */}
      <section id="book-service" className="scroll-mt-20 py-20 sm:py-28 bg-slate-50/70">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          <div className="text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-[#00AEEF]">
              Get Started
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#012a4e]">
              Book Your Free Interior Consultation
            </h2>
            <p className="text-sm text-slate-500 max-w-lg mx-auto font-normal">
              Talk to our friendly interior team today. We'll discuss your floor plan, give you ballpark costs, and show you what's possible for your space.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 shadow-lg">
            <ServiceStepForm service={service} />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-2xl border border-slate-200 bg-white text-xs text-slate-600 shadow-xs">
            <div className="flex items-center gap-3">
              <ShieldCheck size={18} className="text-emerald-500" />
              <span>Complimentary initial site audit & preliminary 3D design consultation with zero obligations.</span>
            </div>
            <a
              href="tel:+8801913373581"
              className="flex items-center gap-2 font-bold text-[#012a4e] hover:text-[#00AEEF] transition"
            >
              <Phone size={14} className="text-[#00AEEF]" />
              <span>Customer Support: +880 1913-373581</span>
            </a>
          </div>

        </div>
      </section>

    </div>
  );
}
