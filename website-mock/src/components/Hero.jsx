import React, { useState } from 'react';
import { Search, MapPin, ChevronDown, Sparkles, Building, Key, Shield } from 'lucide-react';

export default function Hero({ onSearchSubmit, onQuickFilter }) {
  const [purpose, setPurpose] = useState('buy'); // 'buy' | 'rent' | 'care' | 'short stay'
  const [query, setQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const purposeOptions = [
    { label: 'buy', value: 'buy', filterVal: 'Sale' },
    { label: 'rent', value: 'rent', filterVal: 'Rent' },
    { label: 'short stay', value: 'short stay', filterVal: 'Guest House / Short Term Stay' },
    { label: 'property care', value: 'care', filterVal: 'Care' }
  ];

  const handleSearch = (e) => {
    e.preventDefault();
    if (onSearchSubmit) {
      const selected = purposeOptions.find(o => o.value === purpose);
      onSearchSubmit({
        purpose: selected ? selected.filterVal : 'all',
        query
      });
    }
  };

  const handleSelectPurpose = (opt) => {
    setPurpose(opt.value);
    setDropdownOpen(false);
    if (opt.value === 'care' && onQuickFilter) {
      onQuickFilter('care');
    }
  };

  return (
    <section className="relative min-h-[620px] lg:min-h-[740px] pt-32 pb-20 flex flex-col justify-between overflow-hidden bg-gradient-to-b from-[#fbfdff] via-[#f7faff] to-[#ffffff]">
      
      {/* Subtle architectural vertical wall panel background texture (matching image.png) */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: `repeating-linear-gradient(
            to right,
            transparent,
            transparent 48px,
            rgba(226, 232, 240, 0.45) 48px,
            rgba(226, 232, 240, 0.45) 50px
          )`
        }}
      />

      {/* Hero Centerpiece Typography & Search */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center mt-6 lg:mt-12">
        
        {/* Subtle pill tag */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-slate-200/70 shadow-xs mb-8">
          <span className="w-2 h-2 rounded-full bg-[#00AEEF] animate-pulse"></span>
          <span className="text-[12.5px] font-semibold text-[#012a4e] tracking-wide">
            Seventh Sky Property Care & Advisory
          </span>
        </div>

        {/* Verbatim bold headline matching image.png */}
        <h1 className="text-4xl sm:text-6xl lg:text-[68px] font-extrabold text-[#012a4e] tracking-tight leading-[1.08] mb-8 drop-shadow-xs">
          The Property Experts.
        </h1>

        {/* Minimalist Subtext */}
        <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-500 font-normal leading-relaxed mb-10">
          Institutional-grade property care, verified leasing, and premium real estate solutions for local and overseas owners.
        </p>

        {/* Floating Pill Search Bar (Faithful 1:1 translation of image.png) */}
        <div className="max-w-2xl mx-auto">
          <form 
            onSubmit={handleSearch}
            className="relative flex items-center bg-white rounded-full p-2 pl-6 pr-2 shadow-[0_12px_40px_-10px_rgba(1,42,78,0.12)] border border-slate-200/90 transition-all hover:border-[#00AEEF]/40 hover:shadow-[0_16px_48px_-10px_rgba(1,42,78,0.16)]"
          >
            {/* Category / Purpose Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 text-[15px] font-semibold text-[#00AEEF] hover:text-[#0096ce] transition-colors py-1.5 focus:outline-hidden"
              >
                <span>{purpose}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {dropdownOpen && (
                <div className="absolute top-full left-0 mt-3 w-40 bg-white rounded-2xl shadow-[0_15px_35px_rgba(0,0,0,0.12)] border border-slate-100 p-2 z-50 text-left animate-fade-in">
                  {purposeOptions.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleSelectPurpose(opt)}
                      className={`w-full text-left px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
                        purpose === opt.value 
                          ? 'bg-[#e8f7fd] text-[#00AEEF] font-semibold' 
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Subtle Vertical Hairline Divider (like in image.png) */}
            <div className="h-6 w-[1px] bg-slate-200 mx-5"></div>

            {/* Location / Search Input */}
            <div className="flex-1 flex items-center gap-2.5">
              <MapPin className="w-4 h-4 text-[#00AEEF] shrink-0" />
              <input 
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="search by suburb or property..."
                className="w-full bg-transparent text-[15px] text-[#012a4e] placeholder:text-slate-400 placeholder:font-normal focus:outline-hidden"
              />
            </div>

            {/* Cyan Pill Search Button (Faithful 1:1 to image.png) */}
            <button
              type="submit"
              className="ml-2 px-7 py-3 rounded-full text-[14.5px] font-bold text-white bg-[#00AEEF] hover:bg-[#0096ce] shadow-[0_4px_14px_rgba(0,174,239,0.35)] transition-all active:scale-97 cursor-pointer shrink-0"
            >
              search
            </button>
          </form>

          {/* Quick Suburb Search Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-4 text-xs text-slate-500">
            <span className="font-medium">Trending Precincts:</span>
            {['Gulshan 2', 'Banani', 'Baridhara', 'Dhanmondi', 'Sylhet'].map(suburb => (
              <button
                key={suburb}
                type="button"
                onClick={() => { setQuery(suburb); onSearchSubmit && onSearchSubmit({ purpose: 'all', query: suburb }); }}
                className="px-2.5 py-1 rounded-full bg-white/70 hover:bg-white border border-slate-200/60 text-slate-600 hover:text-[#012a4e] hover:border-slate-300 transition-all"
              >
                {suburb}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 360° Property Solutions — Minimalist Split Introduction */}
      <div className="relative mt-14 lg:mt-20 w-full max-w-6xl mx-auto px-4 sm:px-6">
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

              {/* Impressive 2-3 Sentences Wording (All-in-One Solution in Bangladesh) */}
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
                Bangladesh’s first unified, institutional-grade property custodianship designed for discerning homeowners and overseas investors. From vetted tenant placement and AC Land deed mutations to 24/7 on-demand caretaker dispatch and remote NRB video audits — we eliminate fragmented brokers with total legal accountability, automated ledgers, and on-ground care under one trusted roof.
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
                <a
                  href="/services"
                  className="px-6 py-3 rounded-full text-xs font-bold text-white bg-[#012a4e] hover:bg-[#002244] shadow-md shadow-[#012a4e]/15 transition-all inline-flex items-center gap-2 group"
                >
                  <span>Explore 360° Care Suite</span>
                  <span className="text-[#00AEEF] group-hover:translate-x-0.5 transition-transform">→</span>
                </a>
                <span className="text-xs text-slate-400 font-medium">
                  Operating across Dhaka & Sylhet Divisions
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
      </div>

    </section>
  );
}
