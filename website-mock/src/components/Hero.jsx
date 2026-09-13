import React, { useState } from 'react';
import { Search, MapPin, ChevronDown, SlidersHorizontal } from 'lucide-react';
import DetailFilterModal from './DetailFilterModal';

export default function Hero({ onSearchSubmit, onQuickFilter }) {
  const [purpose, setPurpose] = useState('buy'); // 'buy' | 'rent' | 'short stay' | 'business buy'
  const [query, setQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [detailFilters, setDetailFilters] = useState({});

  const purposeOptions = [
    { label: 'buy', value: 'buy', filterVal: 'Sale' },
    { label: 'rent', value: 'rent', filterVal: 'Rent' },
    { label: 'short stay', value: 'short stay', filterVal: 'Guest House / Short Term Stay' },
    { label: 'business buy', value: 'business buy', filterVal: 'Business Buy' },
  ];

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    if (onSearchSubmit) {
      const selected = purposeOptions.find(o => o.value === purpose);
      const resolvedPurpose = selected ? selected.filterVal : 'all';
      
      onSearchSubmit({
        purpose: detailFilters.purpose || (resolvedPurpose === 'Business Buy' ? 'Sale' : resolvedPurpose),
        category: detailFilters.category || (resolvedPurpose === 'Business Buy' ? 'business' : 'all'),
        status: detailFilters.status || 'all',
        query,
        bedrooms: detailFilters.bedrooms || '',
        bathrooms: detailFilters.bathrooms || '',
        balconies: detailFilters.balconies || '',
        min_price: detailFilters.min_price || '',
        max_price: detailFilters.max_price || '',
        min_size: detailFilters.min_size || '',
        max_size: detailFilters.max_size || '',
        guests: detailFilters.guests || '',
        furnishing: detailFilters.furnishing || '',
        amenities: detailFilters.amenities || '',
      });
    }
  };

  const handleSelectPurpose = (opt) => {
    setPurpose(opt.value);
    setDropdownOpen(false);
  };

  const handleApplyDetailFilters = (filters) => {
    setDetailFilters(filters);
    if (filters.purpose) {
      if (filters.purpose.toLowerCase().includes('short')) setPurpose('short stay');
      else if (filters.purpose.toLowerCase().includes('rent')) setPurpose('rent');
      else if (filters.category === 'business') setPurpose('business buy');
      else if (filters.purpose.toLowerCase().includes('sale')) setPurpose('buy');
    }
    if (onSearchSubmit) {
      onSearchSubmit({
        ...filters,
        query,
      });
    }
  };

  const activeFilterCount = Object.entries(detailFilters).filter(
    ([k, v]) => v && v !== 'all' && v !== 'any' && (!Array.isArray(v) || v.length > 0)
  ).length;

  return (
    <section className="relative w-full h-screen min-h-[620px] flex items-center justify-center overflow-hidden">
      {/* Full-width bright luxury architectural property background image */}
      <img
        src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=85&w=2400&auto=format&fit=crop"
        alt="Seventh Sky Property Experts"
        className="absolute inset-0 w-full h-full object-cover object-center"
      />

      {/* Subtle ambient gradient overlay for optimal text contrast while preserving luminous brightness */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/25" />

      {/* Hero Content: Bold Headline & Sleek Search Button Bar */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-8 sm:space-y-10 mt-12 sm:mt-16">
        
        {/* Bold Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight text-white leading-tight drop-shadow-md">
          The Property <br className="hidden sm:inline" />
          <span className="text-[#00AEEF]">Experts.</span>
        </h1>

        {/* Floating Pill Search Bar with Detail Popup Filter Button & Existing Search Button */}
        <div className="max-w-2xl mx-auto w-full pt-2">
          <form 
            onSubmit={handleSearch}
            className="relative flex items-center bg-white/95 backdrop-blur-md rounded-full p-2 pl-4 sm:pl-6 pr-2 shadow-[0_16px_50px_rgba(0,0,0,0.3)] border border-white/80 transition-all hover:border-[#00AEEF] hover:shadow-[0_20px_60px_rgba(0,174,239,0.35)]"
          >
            {/* Category / Purpose Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-[15px] font-semibold text-[#00AEEF] hover:text-[#0096ce] transition-colors py-1.5 focus:outline-hidden whitespace-nowrap"
              >
                <span>{purpose}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {dropdownOpen && (
                <div className="absolute top-full left-0 mt-3 w-44 bg-white rounded-2xl shadow-[0_15px_35px_rgba(0,0,0,0.18)] border border-slate-100 p-2 z-50 text-left animate-fade-in">
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

            {/* Hairline Divider */}
            <div className="h-6 w-[1px] bg-slate-200 mx-2.5 sm:mx-4"></div>

            {/* Location / Search Input */}
            <div className="flex-1 flex items-center gap-2 min-w-0">
              <MapPin className="w-4 h-4 text-[#00AEEF] shrink-0 hidden sm:block" />
              <input 
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="search suburb or property..."
                className="w-full bg-transparent text-sm sm:text-[15px] text-[#012a4e] placeholder:text-slate-400 focus:outline-hidden font-medium"
              />
            </div>

            {/* Detail Popup Filter Button */}
            <button
              type="button"
              onClick={() => setIsFilterModalOpen(true)}
              className="px-2.5 sm:px-3 py-2 rounded-full text-slate-500 hover:text-[#00AEEF] hover:bg-slate-100/80 transition-colors flex items-center gap-1.5 text-xs font-bold shrink-0 cursor-pointer"
              title="Open Detailed Filters"
            >
              <SlidersHorizontal className="w-4 h-4 text-[#00AEEF]" />
              <span className="hidden md:inline text-slate-600">Filters</span>
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#00AEEF] text-white text-[10px] font-black flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Existing Cyan Pill Search Button (Design Strictly Kept) */}
            <button
              type="submit"
              className="ml-1 sm:ml-2 px-6 sm:px-8 py-3 rounded-full text-xs sm:text-[14px] font-bold text-white bg-[#00AEEF] hover:bg-[#0096ce] shadow-[0_4px_16px_rgba(0,174,239,0.4)] hover:shadow-[0_6px_22px_rgba(0,174,239,0.55)] transition-all active:scale-97 cursor-pointer shrink-0"
            >
              search
            </button>
          </form>
        </div>

      </div>

      {/* Detail Filter Modal */}
      <DetailFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        onApply={handleApplyDetailFilters}
        initialFilters={{
          purpose: purpose === 'buy' ? 'Sale' : purpose === 'rent' ? 'Rent' : purpose === 'short stay' ? 'Guest House / Short Term Stay' : purpose === 'business buy' ? 'Business Buy' : 'all',
          ...detailFilters
        }}
      />
    </section>
  );
}
