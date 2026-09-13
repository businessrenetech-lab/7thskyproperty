import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  Key, 
  Truck, 
  Palette, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight,
  ArrowUpRight,
  Droplets,
  Wind,
  FileCheck2,
  BadgeDollarSign,
  Phone,
  MessageSquare,
  Wrench,
  Building2,
  Layers
} from 'lucide-react';
import { SERVICES, SERVICE_CATEGORIES } from '../data/servicesData';
import { ServiceRequestModal } from '../components/Modals';

export default function ServicesPage({ onOpenAppraisal }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [selectedServiceLine, setSelectedServiceLine] = useState('');

  // Normalize category from URL params (including legacy taxonomy)
  useEffect(() => {
    const cat = searchParams.get('category');
    if (!cat || cat === 'all') {
      setSelectedCategory('all');
      return;
    }
    // Map legacy query parameters to current category IDs
    const legacyMap = {
      'property-care-concierge': 'care-maintenance',
      'nrb-dedicated-services': 'care-maintenance',
      'leasing-tenancy-management': 'rentals-sales',
      'property-documentation-support': 'legal-documentation',
      'removal-relocation': 'relocation-logistics',
      'interior-design': 'interior-design',
      'care-maintenance': 'care-maintenance',
      'rentals-sales': 'rentals-sales',
      'legal-documentation': 'legal-documentation',
      'financial-advisory': 'financial-advisory',
      'relocation-logistics': 'relocation-logistics'
    };
    setSelectedCategory(legacyMap[cat] || cat);
  }, [searchParams]);

  // Filtered services
  const displayedServices = useMemo(() => {
    if (selectedCategory === 'all') return SERVICES;
    return SERVICES.filter(s => s.category === selectedCategory);
  }, [selectedCategory]);

  const categoryIcons = {
    'all': Layers,
    'care-maintenance': Wrench,
    'rentals-sales': Key,
    'interior-design': Palette,
    'legal-documentation': FileCheck2,
    'financial-advisory': BadgeDollarSign,
    'relocation-logistics': Truck
  };

  const serviceBgMap = {
    'water-tank': '/assets/services/water-tank-bg.svg',
    'air-conditioning': '/assets/services/air-conditioning-bg.svg',
    'interior-design': '/assets/services/interior-design-bg.svg',
    'property-documentation-verification': '/assets/services/legal-deed-bg.svg',
    'land-property-assessment': '/assets/services/legal-deed-bg.svg',
    'property-will-succession': '/assets/services/legal-deed-bg.svg',
    'property-management': '/assets/services/rent-collection-bg.png',
    'residential-sales': '/assets/services/verified-property-bg.png',
    'short-stay': '/assets/services/short-stay-bg.png',
  };

  return (
    <div className="pt-28 pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 sm:space-y-16">
      
      {/* 1. Page Header (Problem Solver Tone) */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#00AEEF]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00AEEF]"></span>
          Verified Property Services in Bangladesh
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-[#012a4e] tracking-tight">
          Complete Property Care & Solutions
        </h1>
        <p className="text-sm sm:text-base text-slate-500 max-w-2xl mx-auto leading-relaxed">
          No brokers, no fake papers, no rent delays. Transparent pricing, verified in-house teams, and guaranteed peace of mind.
        </p>
      </div>

      {/* 2. Category Filter Bar (Guaranteed Exactly 1 Single Line) */}
      <div className="w-full overflow-x-auto no-scrollbar py-1">
        <div className="flex flex-nowrap items-center justify-start xl:justify-center gap-2 min-w-max mx-auto px-1">
          {SERVICE_CATEGORIES.map(cat => {
            const Icon = categoryIcons[cat.id] || ShieldCheck;
            const isActive = selectedCategory === cat.id;
            const count = cat.id === 'all' 
              ? SERVICES.length 
              : SERVICES.filter(s => s.category === cat.id).length;

            // Compact, professional labels so all fit on 1 single line
            const conciseLabels = {
              'all': 'All Services',
              'interior-design': 'Interior & Renovation',
              'care-maintenance': 'Care & Maintenance',
              'legal-documentation': 'Legal & Title',
              'financial-advisory': 'Home Loans',
              'relocation-logistics': 'Relocation',
              'rentals-sales': 'Rentals & Sales'
            };
            const label = conciseLabels[cat.id] || cat.label;

            return (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setSearchParams(cat.id === 'all' ? {} : { category: cat.id });
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-[#012a4e] text-white shadow-md shadow-[#012a4e]/20 scale-102'
                    : 'bg-white text-slate-600 hover:text-[#012a4e] hover:bg-slate-50 border border-slate-200/70'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#00AEEF]' : 'text-slate-400'}`} />
                <span>{label}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Services Grid with Relevant Photos & Visual Deliverables */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {displayedServices.map(service => {
          return (
            <div
              key={service.slug}
              className="group bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-[0_4px_25px_-5px_rgba(1,42,78,0.06)] hover:shadow-[0_20px_45px_-10px_rgba(1,42,78,0.12)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
            >
              {/* Top Photo: Identical Size for All Cards (Fixed Height h-52) & No Price Tag */}
              <div>
                <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-slate-100">
                  <img 
                    src={service.heroImage} 
                    alt={service.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
                  {/* Category & Feature Badge (No Price Badge on Cards) */}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 max-w-[85%]">
                    <span className="px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-white/95 text-[#012a4e] shadow-xs backdrop-blur-xs">
                      {service.categoryLabel}
                    </span>
                    {service.badge && (
                      <span className="px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-[#00AEEF] text-white shadow-xs">
                        {service.badge}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-6 relative overflow-hidden">
                  {/* Subtle Transparent Background Illustration Watermark */}
                  {serviceBgMap[service.slug] && (
                    <div className="absolute right-0 bottom-0 w-28 h-28 sm:w-32 sm:h-32 opacity-10 group-hover:opacity-20 group-hover:scale-105 transition-all duration-500 pointer-events-none select-none z-0">
                      <img 
                        src={serviceBgMap[service.slug]} 
                        alt="" 
                        className="w-full h-full object-contain object-bottom-right" 
                      />
                    </div>
                  )}

                  <div className="relative z-10">
                    {/* Title Fully Visible Across 2 Lines (No Clamping / Truncation) */}
                    <h3 className="text-base sm:text-lg font-bold text-[#012a4e] group-hover:text-[#00AEEF] transition-colors leading-snug min-h-[3rem] flex items-start">
                      {service.title}
                    </h3>
                    
                    {/* Short problem solver tagline */}
                    <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                      {service.tagline}
                    </p>

                    {/* Scannable "View Not Read" Key Deliverables */}
                    <div className="mt-4 pt-3.5 border-t border-slate-100 space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        What We Provide:
                      </span>
                      {service.keyHighlights.slice(0, 3).map((highlight, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-slate-600 leading-tight">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#00AEEF] shrink-0 mt-0.5" />
                          <span className="line-clamp-1">{highlight}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="p-6 pt-0 flex items-center justify-between gap-3 border-t border-slate-50 mt-2">
                {/* Professional replacement for [Dedicated Page & SOP] */}
                <Link
                  to={`/services/${service.slug}`}
                  className="text-xs font-bold text-[#00AEEF] hover:text-[#0096ce] flex items-center gap-1 group/link"
                >
                  <span>Complete Service Guide</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-1 transition-transform" />
                </Link>

                <button
                  onClick={() => {
                    setSelectedServiceLine(service.title);
                    setServiceModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-full text-xs font-bold text-white bg-[#012a4e] hover:bg-[#00AEEF] transition-all cursor-pointer shadow-xs shrink-0"
                >
                  Request Service
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {/* 4. Professional Advisory & Complex Support Banner */}
      <div className="p-8 sm:p-12 rounded-3xl bg-linear-to-br from-[#012a4e] via-[#013564] to-[#012240] text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-[#00AEEF]/10 blur-3xl pointer-events-none" />
        
        <div className="space-y-3 max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#00AEEF]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00AEEF]"></span>
            Multi-Building & Custom Contracts
          </div>
          <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
            Need an Annual Maintenance Contract (AMC) or Dedicated NRB Care?
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Whether managing a multi-unit apartment society in Dhaka, overseas NRB property portfolios, or needing fast legal land title checks—our senior managers are on standby 7 days a week.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 relative z-10 w-full md:w-auto">
          <button
            onClick={() => onOpenAppraisal && onOpenAppraisal()}
            className="w-full sm:w-auto px-6 py-3 rounded-full text-xs font-bold bg-[#00AEEF] hover:bg-[#0096ce] text-white shadow-md transition-all cursor-pointer text-center"
          >
            Request Free Consultation
          </button>
          <a
            href="tel:+8801800777999"
            className="w-full sm:w-auto px-6 py-3 rounded-full text-xs font-bold bg-white/10 hover:bg-white/15 text-white border border-white/20 transition-all text-center flex items-center justify-center gap-2"
          >
            <Phone className="w-3.5 h-3.5 text-[#00AEEF]" />
            <span>Hotline: +880 1800 777 999</span>
          </a>
        </div>
      </div>

      {/* Care Service Request Modal */}
      <ServiceRequestModal
        isOpen={serviceModalOpen}
        onClose={() => setServiceModalOpen(false)}
        initialService={selectedServiceLine}
      />

    </div>
  );
}
