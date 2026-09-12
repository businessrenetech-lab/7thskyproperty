import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Globe, 
  Key, 
  Stamp, 
  Truck, 
  Palette, 
  Sparkles, 
  ArrowRight, 
  Info,
  CheckCircle2,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { SERVICE_CATEGORIES, TEMPORARILY_HIDDEN_SERVICES } from '../data/mockServices';

export default function ServicesSection({ onBookService }) {
  const [activeCategoryId, setActiveCategoryId] = useState(SERVICE_CATEGORIES[0].id);
  const [hoveredServiceId, setHoveredServiceId] = useState(null);

  const activeCategory = SERVICE_CATEGORIES.find(c => c.id === activeCategoryId) || SERVICE_CATEGORIES[0];

  const categoryIcons = {
    'property-care-concierge': ShieldCheck,
    'nrb-dedicated-services': Globe,
    'leasing-tenancy-management': Key,
    'property-documentation-support': Stamp,
    'removal-relocation': Truck,
    'interior-design': Palette
  };

  return (
    <section id="services" className="py-24 bg-[#fbfdff] border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#00AEEF] mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00AEEF]"></span>
            Complete Property Care Suite
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#012a4e] tracking-tight">
            Tailored Care & Advisory Services
          </h2>
          <p className="text-slate-500 text-sm sm:text-base mt-2">
            Explore our specialized divisions. Hover over any service item to view its precise 10–15 word operational scope.
          </p>
        </div>

        {/* Category Navigation Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
          {SERVICE_CATEGORIES.map(cat => {
            const Icon = categoryIcons[cat.id] || ShieldCheck;
            const isActive = activeCategoryId === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategoryId(cat.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-[#012a4e] text-white shadow-md shadow-[#012a4e]/20 scale-102'
                    : 'bg-white text-slate-600 hover:text-[#012a4e] hover:bg-slate-100 border border-slate-200/80'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#12b6f3]' : 'text-slate-400'}`} />
                <span>{cat.title}</span>
              </button>
            );
          })}
        </div>

        {/* Category Active Header */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-100 shadow-[0_10px_35px_-10px_rgba(1,42,78,0.07)] mb-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#00AEEF]">
                {activeCategory.category}
              </span>
              <h3 className="text-2xl font-bold text-[#012a4e] mt-1">
                {activeCategory.title}
              </h3>
              <p className="text-sm text-slate-500 mt-1 max-w-2xl">
                {activeCategory.shortDesc}
              </p>
            </div>

            <button
              onClick={() => onBookService && onBookService(activeCategory.title)}
              className="px-6 py-2.5 rounded-full text-xs font-bold text-white bg-[#00AEEF] hover:bg-[#0096ce] shadow-[0_4px_14px_rgba(0,174,239,0.3)] transition-all shrink-0 self-start md:self-auto"
            >
              Enquire For This Division
            </button>
          </div>

          {/* Interactive Service Grid with 10-15 Word Hover Requirement */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
            {activeCategory.services.map(service => {
              const isHovered = hoveredServiceId === service.id;
              return (
                <div
                  key={service.id}
                  onMouseEnter={() => setHoveredServiceId(service.id)}
                  onMouseLeave={() => setHoveredServiceId(null)}
                  className={`relative p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between group cursor-default ${
                    isHovered
                      ? 'bg-[#e8f7fd]/40 border-[#00AEEF]/60 shadow-[0_12px_30px_-5px_rgba(0,174,239,0.15)] -translate-y-1'
                      : 'bg-white border-slate-100 hover:border-slate-200 shadow-2xs'
                  }`}
                >
                  <div>
                    {/* Icon & Title */}
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                        isHovered ? 'bg-[#00AEEF] text-white' : 'bg-slate-100 text-[#012a4e]'
                      }`}>
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full transition-colors ${
                        isHovered ? 'bg-[#00AEEF]/20 text-[#00AEEF]' : 'bg-slate-100 text-slate-400'
                      }`}>
                        SOP Standard
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-[#012a4e] group-hover:text-[#00AEEF] transition-colors">
                      {service.name}
                    </h4>

                    {/* Verbatim 10-15 Word Explanation Display */}
                    <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-100/80">
                      <p className="text-xs text-[#012a4e] font-medium leading-relaxed italic">
                        "{service.explanation}"
                      </p>
                    </div>

                    {/* Sub-Items List */}
                    <div className="mt-4 space-y-1.5">
                      <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">
                        Included Workflows:
                      </span>
                      {service.subItems?.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-xs text-slate-600">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#00AEEF] shrink-0" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quick Action Button */}
                  <div className="mt-5 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => onBookService && onBookService(service.name)}
                      className="w-full text-center py-2 rounded-xl text-xs font-semibold text-[#00AEEF] hover:bg-white transition-all flex items-center justify-center gap-1.5"
                    >
                      <span>Request Scope</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Hidden Services Transparency Accordion / Pill (Per Spec) */}
        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/70 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2.5">
            <Info className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              <strong>Note on Advanced Utilities:</strong> Solar & Energy Solutions, Air Conditioning, and Water Tank Cleaning are operated through our enterprise console and temporarily gated on the public landing page.
            </span>
          </div>
          <a
            href="#contact"
            className="text-[#00AEEF] font-semibold hover:underline shrink-0"
          >
            Inquire about commercial facilities →
          </a>
        </div>

      </div>
    </section>
  );
}
