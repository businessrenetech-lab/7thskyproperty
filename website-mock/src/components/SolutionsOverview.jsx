import React from 'react';
import { Link } from 'react-router-dom';

export default function SolutionsOverview() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 sm:-mt-14 relative z-20">
      <div className="relative rounded-3xl overflow-hidden bg-white border border-slate-100 shadow-[0_20px_60px_-15px_rgba(1,42,78,0.08)] p-8 sm:p-12 lg:p-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          
          {/* Left Column: Introduces Seventh Sky Property Care & 360° Solutions */}
          <div className="lg:col-span-7 space-y-6 text-left">
            
            {/* Kicker Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#e8f7fd] border border-[#00AEEF]/20 text-[#00AEEF] text-xs font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00AEEF] animate-pulse"></span>
              Seventh Sky Property Care
            </div>

            {/* Main Headline */}
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#012a4e] tracking-tight leading-[1.12]">
              <span className="text-[#00AEEF]">360°</span> Property Solutions.
            </h2>

            {/* Impressive Wording */}
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
              Institutional-grade property custodianship designed for discerning homeowners and overseas investors. From vetted tenant placement and deed verification to 24/7 on-demand caretaker dispatch and remote NRB video audits — we eliminate fragmented brokers with total legal accountability, automated ledgers, and on-ground care under one trusted roof.
            </p>

            {/* Minimalist Micro-Pill Benefits */}
            <div className="flex flex-wrap gap-2.5 pt-1 text-xs font-semibold text-slate-700">
              <span className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00AEEF]"></span>
                Legal Deed & Mutation Vetting
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00AEEF]"></span>
                Automated Rent Ledgers & FX
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00AEEF]"></span>
                24/7 Emergency Care Dispatch
              </span>
            </div>

            {/* CTA Action */}
            <div className="pt-3 flex flex-wrap items-center gap-4">
              <Link
                to="/services"
                className="px-6 py-3 rounded-full text-xs font-bold text-white bg-[#012a4e] hover:bg-[#002244] shadow-md shadow-[#012a4e]/15 transition-all inline-flex items-center gap-2 group"
              >
                <span>Explore 360° Care Suite</span>
                <span className="text-[#00AEEF] group-hover:translate-x-0.5 transition-transform">→</span>
              </Link>
              <span className="text-xs text-slate-400 font-medium">
                Operating across Prime Metropolitan & Regional Divisions
              </span>
            </div>

          </div>

          {/* Right Column: Meaningful Architectural / Living Image */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-2xl overflow-hidden aspect-4/3 sm:aspect-5/4 lg:aspect-4/3 shadow-xl group">
              <img 
                src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=85" 
                alt="Modern Luxury Living & Architectural Property Care"
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#012a4e]/60 via-transparent to-transparent"></div>

              {/* Floating Micro Badge Over Image */}
              <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md p-3.5 rounded-xl border border-white/80 shadow-md flex items-center justify-between text-[#012a4e]">
                <div>
                  <div className="text-sm font-black text-[#012a4e]">98.4%</div>
                  <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Client Retention</div>
                </div>
                <div className="h-6 w-px bg-slate-200"></div>
                <div>
                  <div className="text-sm font-black text-[#00AEEF]">24/7</div>
                  <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Emergency Dispatch</div>
                </div>
                <div className="h-6 w-px bg-slate-200"></div>
                <div>
                  <div className="text-sm font-black text-[#012a4e]">৳850+ Cr</div>
                  <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Assets Under Care</div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
