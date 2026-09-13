import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  Search, 
  MapPin, 
  Bed, 
  Bath, 
  Car, 
  Maximize2, 
  Calendar, 
  Filter,
  Star,
  Sparkles,
  ArrowRight,
  SlidersHorizontal,
  RotateCcw,
  X,
  Hotel,
  Layers,
  Check
} from 'lucide-react';
import { websiteApi } from '../services/api';
import DetailFilterModal from '../components/DetailFilterModal';

export default function PropertiesPage({ onBookInspection }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const currentPurpose = searchParams.get('purpose') || 'all';
  const currentCategory = searchParams.get('category') || 'all';
  const currentStatus = searchParams.get('status') || 'all';
  const currentQuery = searchParams.get('query') || '';
  const currentBedrooms = searchParams.get('bedrooms') || '';
  const currentBathrooms = searchParams.get('bathrooms') || '';
  const currentBalconies = searchParams.get('balconies') || '';
  const currentMinPrice = searchParams.get('min_price') || '';
  const currentMaxPrice = searchParams.get('max_price') || '';
  const currentMinSize = searchParams.get('min_size') || '';
  const currentMaxSize = searchParams.get('max_size') || '';
  const currentGuests = searchParams.get('guests') || '';
  const currentFurnishing = searchParams.get('furnishing') || '';
  const currentAmenities = searchParams.get('amenities') || '';

  const [searchInput, setSearchInput] = useState(currentQuery);

  useEffect(() => {
    setSearchInput(currentQuery);
  }, [currentQuery]);

  useEffect(() => {
    async function fetchProps() {
      setLoading(true);
      const res = await websiteApi.getProperties({
        purpose: currentPurpose,
        category: currentCategory,
        status: currentStatus,
        query: currentQuery,
        bedrooms: currentBedrooms,
        bathrooms: currentBathrooms,
        balconies: currentBalconies,
        min_price: currentMinPrice,
        max_price: currentMaxPrice,
        min_size: currentMinSize,
        max_size: currentMaxSize,
        guests: currentGuests,
        furnishing: currentFurnishing,
        amenities: currentAmenities,
      });
      if (res.success) {
        setProperties(res.data);
      }
      setLoading(false);
    }
    fetchProps();
  }, [
    currentPurpose, 
    currentCategory, 
    currentStatus, 
    currentQuery, 
    currentBedrooms, 
    currentBathrooms, 
    currentBalconies, 
    currentMinPrice, 
    currentMaxPrice, 
    currentMinSize, 
    currentMaxSize, 
    currentGuests, 
    currentFurnishing, 
    currentAmenities
  ]);

  const detailedFilterKeys = [
    'bedrooms', 'bathrooms', 'balconies', 
    'min_price', 'max_price', 'min_size', 'max_size', 
    'guests', 'furnishing', 'amenities'
  ];

  const activeDetailedFilterCount = detailedFilterKeys.filter(k => Boolean(searchParams.get(k))).length;

  const handlePurposeChange = (val) => {
    const next = new URLSearchParams(searchParams);
    if (val === 'all') next.delete('purpose');
    else next.set('purpose', val);
    // Reset status when switching purpose to prevent incompatible filters
    next.delete('status');
    setSearchParams(next);
  };

  const handleFilter = (key, val) => {
    const next = new URLSearchParams(searchParams);
    if (val === 'all' || !val) next.delete(key);
    else next.set(key, val);
    setSearchParams(next);
  };

  const handleRemoveFilter = (key) => {
    const next = new URLSearchParams(searchParams);
    next.delete(key);
    setSearchParams(next);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    handleFilter('query', searchInput);
  };

  const handleResetFilters = () => {
    const next = new URLSearchParams();
    if (currentPurpose !== 'all') next.set('purpose', currentPurpose);
    setSearchParams(next);
    setSearchInput('');
  };

  const handleApplyDetailFilters = (filters) => {
    const next = new URLSearchParams(searchParams);

    if (filters.purpose && filters.purpose !== 'all') next.set('purpose', filters.purpose);
    else next.delete('purpose');

    if (filters.category && filters.category !== 'all') next.set('category', filters.category);
    else next.delete('category');

    if (filters.status && filters.status !== 'all') next.set('status', filters.status);
    else next.delete('status');

    detailedFilterKeys.forEach(k => {
      if (filters[k]) next.set(k, filters[k]);
      else next.delete(k);
    });

    setSearchParams(next);
  };

  // Determine active purpose mode for context-aware status tabs
  const isSale = currentPurpose.toLowerCase().includes('sale');
  const isRent = currentPurpose.toLowerCase().includes('rent');
  const isShortStay = currentPurpose.toLowerCase().includes('short') || currentPurpose.toLowerCase().includes('guest');

  // Context-aware status tabs configuration on the right side
  let statusTabs = [];
  if (isSale) {
    statusTabs = [
      { label: 'All Sales', val: 'all' },
      { label: 'Under Offer', val: 'under_offer' },
      { label: 'Sold Properties', val: 'sold' },
    ];
  } else if (isRent) {
    statusTabs = [
      { label: 'All Rentals', val: 'all' },
      { label: 'Under Application', val: 'under_application' },
      { label: 'Leased', val: 'leased' },
    ];
  } else if (isShortStay) {
    statusTabs = [
      { label: 'All Stays', val: 'all' },
      { label: 'Available', val: 'available' },
    ];
  } else {
    statusTabs = [
      { label: 'All Status', val: 'all' },
      { label: 'Under Offer', val: 'under_offer' },
      { label: 'Sold', val: 'sold' },
      { label: 'Under Application', val: 'under_application' },
      { label: 'Leased', val: 'leased' },
    ];
  }

  // Separate properties into vertical (portrait) and landscape groups
  const verticalProps = properties.filter(p => p.orientation === 'vertical');
  const landscapeProps = properties.filter(p => p.orientation === 'landscape');

  const hasAnyActiveFilters = 
    currentCategory !== 'all' || 
    currentStatus !== 'all' || 
    Boolean(currentQuery) || 
    activeDetailedFilterCount > 0;

  return (
    <div className="pt-28 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
      
      {/* 1. Header (Clean & Minimalist) */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-slate-100">
        <div>
          <span className="text-[10.5px] font-extrabold uppercase tracking-widest text-[#00AEEF]">
            Seventh Sky Portfolio
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#012a4e] tracking-tight mt-1">
            Properties
          </h1>
        </div>

        {/* Search & Filter Bar (Decluttered & Production-Grade) */}
        <form onSubmit={handleSearch} className="flex items-center gap-2 max-w-lg w-full">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Search suburb, property code, keyword..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-full bg-slate-50 border border-slate-200/80 text-xs text-[#012a4e] placeholder:text-slate-400 focus:outline-hidden focus:border-[#00AEEF] focus:bg-white transition-colors"
            />
          </div>
          <button
            type="button"
            onClick={() => setIsFilterModalOpen(true)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-xs font-bold transition-all shrink-0 ${
              activeDetailedFilterCount > 0 
                ? 'bg-[#00AEEF] text-white border-[#00AEEF] shadow-xs' 
                : 'bg-white text-[#012a4e] border-slate-200 hover:bg-slate-50'
            }`}
            title="Open Detail Filters"
          >
            <SlidersHorizontal className={`w-3.5 h-3.5 ${activeDetailedFilterCount > 0 ? 'text-white' : 'text-[#00AEEF]'}`} />
            <span className="hidden sm:inline">Filters</span>
            {activeDetailedFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-white text-[#00AEEF] text-[10px] font-black flex items-center justify-center">
                {activeDetailedFilterCount}
              </span>
            )}
          </button>
          <button
            type="submit"
            className="px-5 py-2 rounded-full text-xs font-bold text-white bg-[#00AEEF] hover:bg-[#0096ce] transition-colors shrink-0"
          >
            Search
          </button>
        </form>
      </div>

      {/* 2. Sleek Filter System: Purpose Tabs + Right-Side Status Tabs + Category Filter Strip */}
      <div className="space-y-4">
        {/* Row 1: Primary Purpose Tabs (Left) & Dynamic Status Tabs (Right) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
          {/* Left: Purpose Selector */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 p-1.5 rounded-full border border-slate-200/60 shadow-2xs">
            {[
              { label: 'All Portfolio', val: 'all' },
              { label: 'For Sale', val: 'Sale' },
              { label: 'For Rent', val: 'Rent' },
              { label: 'Short Term Stay', val: 'Guest House / Short Term Stay' },
            ].map((btn) => {
              const active = (btn.val === 'all' && currentPurpose === 'all') || 
                             (btn.val !== 'all' && currentPurpose.toLowerCase() === btn.val.toLowerCase());
              return (
                <button
                  key={btn.val}
                  type="button"
                  onClick={() => handlePurposeChange(btn.val)}
                  className={`px-4 py-1.5 rounded-full font-semibold transition-all ${
                    active 
                      ? 'bg-[#012a4e] text-white shadow-xs' 
                      : 'text-slate-600 hover:text-[#012a4e]'
                  }`}
                >
                  {btn.label}
                </button>
              );
            })}
          </div>

          {/* Right: Dynamic Lifecycle Status Tabs */}
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Status:
            </span>
            <div className="flex flex-wrap items-center gap-1 bg-slate-100/90 p-1 rounded-full border border-slate-200/70 shadow-2xs">
              {statusTabs.map((tab) => {
                const active = (tab.val === 'all' && currentStatus === 'all') || (currentStatus === tab.val);
                
                let activeClass = 'bg-[#012a4e] text-white shadow-xs';
                if (active && tab.val === 'sold') activeClass = 'bg-rose-600 text-white shadow-xs';
                if (active && tab.val === 'under_offer') activeClass = 'bg-amber-500 text-white shadow-xs';
                if (active && tab.val === 'under_application') activeClass = 'bg-blue-600 text-white shadow-xs';
                if (active && tab.val === 'leased') activeClass = 'bg-emerald-600 text-white shadow-xs';

                return (
                  <button
                    key={tab.val}
                    type="button"
                    onClick={() => handleFilter('status', tab.val)}
                    className={`px-3 py-1 rounded-full font-semibold transition-all text-xs flex items-center gap-1.5 ${
                      active
                        ? activeClass
                        : 'text-slate-600 hover:text-[#012a4e] hover:bg-white/60'
                    }`}
                  >
                    {tab.val === 'sold' && <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>}
                    {tab.val === 'under_offer' && <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>}
                    {tab.val === 'under_application' && <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>}
                    {tab.val === 'leased' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Row 2: Category / Sector Sub-Filter Strip & Property Count */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
              <SlidersHorizontal className="w-3 h-3 text-[#00AEEF]" />
              Sector:
            </span>
            {[
              { label: 'All Sectors', val: 'all' },
              { label: 'Residential', val: 'residential' },
              { label: 'Commercial', val: 'commercial' },
              { label: 'Rural Estates', val: 'rural' },
              { label: 'Business', val: 'business' },
            ].map((cat) => {
              const active = (cat.val === 'all' && currentCategory === 'all') || 
                             (currentCategory.toLowerCase() === cat.val.toLowerCase());
              return (
                <button
                  key={cat.val}
                  type="button"
                  onClick={() => handleFilter('category', cat.val)}
                  className={`px-3 py-1 rounded-full transition-all text-[11.5px] border ${
                    active
                      ? 'bg-[#00AEEF] text-white border-[#00AEEF] shadow-2xs font-bold'
                      : 'bg-white text-slate-600 border-slate-200/80 hover:border-slate-300 hover:text-[#012a4e]'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}

            {/* Clear Filters Reset Link */}
            {hasAnyActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-[11px] text-slate-400 hover:text-rose-600 font-semibold underline underline-offset-2 ml-2 transition-colors flex items-center gap-1"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                Reset filters
              </button>
            )}
          </div>

          <div className="text-slate-500 text-xs font-semibold flex items-center gap-1.5 shrink-0">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[#012a4e] font-bold">{properties.length}</span>
            <span className="text-slate-400">Verified Properties</span>
          </div>
        </div>

        {/* Row 3: Active Filters Tag Strip (if any are active) */}
        {hasAnyActiveFilters && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
              Active:
            </span>

            {currentQuery && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-[#012a4e] font-semibold text-[11px] border border-slate-200">
                <span>"{currentQuery}"</span>
                <button type="button" onClick={() => { handleFilter('query', ''); setSearchInput(''); }} className="text-slate-400 hover:text-rose-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {currentCategory !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#00AEEF]/10 text-[#00AEEF] font-bold text-[11px] border border-[#00AEEF]/30 capitalize">
                <span>Sector: {currentCategory}</span>
                <button type="button" onClick={() => handleFilter('category', 'all')} className="text-[#00AEEF] hover:text-rose-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {currentStatus !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#012a4e]/10 text-[#012a4e] font-bold text-[11px] border border-[#012a4e]/20 capitalize">
                <span>Status: {currentStatus.replace(/_/g, ' ')}</span>
                <button type="button" onClick={() => handleFilter('status', 'all')} className="text-[#012a4e] hover:text-rose-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {currentBedrooms && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium text-[11px] border border-slate-200">
                <Bed className="w-3 h-3 text-[#00AEEF]" />
                <span>{currentBedrooms}+ Beds</span>
                <button type="button" onClick={() => handleRemoveFilter('bedrooms')} className="text-slate-400 hover:text-rose-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {currentBathrooms && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium text-[11px] border border-slate-200">
                <Bath className="w-3 h-3 text-[#00AEEF]" />
                <span>{currentBathrooms}+ Baths</span>
                <button type="button" onClick={() => handleRemoveFilter('bathrooms')} className="text-slate-400 hover:text-rose-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {currentBalconies && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium text-[11px] border border-slate-200">
                <span>{currentBalconies}+ Balconies</span>
                <button type="button" onClick={() => handleRemoveFilter('balconies')} className="text-slate-400 hover:text-rose-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {(currentMinPrice || currentMaxPrice) && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium text-[11px] border border-slate-200">
                <span>
                  ৳{currentMinPrice ? Number(currentMinPrice).toLocaleString() : '0'}
                  {currentMaxPrice ? ` - ৳${Number(currentMaxPrice).toLocaleString()}` : '+'}
                </span>
                <button type="button" onClick={() => { handleRemoveFilter('min_price'); handleRemoveFilter('max_price'); }} className="text-slate-400 hover:text-rose-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {(currentMinSize || currentMaxSize) && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium text-[11px] border border-slate-200">
                <Maximize2 className="w-3 h-3 text-[#00AEEF]" />
                <span>
                  {currentMinSize ? `${currentMinSize} sqft` : '0 sqft'}
                  {currentMaxSize ? ` - ${currentMaxSize} sqft` : '+'}
                </span>
                <button type="button" onClick={() => { handleRemoveFilter('min_size'); handleRemoveFilter('max_size'); }} className="text-slate-400 hover:text-rose-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {currentGuests && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium text-[11px] border border-slate-200">
                <Hotel className="w-3 h-3 text-[#00AEEF]" />
                <span>{currentGuests} Guests</span>
                <button type="button" onClick={() => handleRemoveFilter('guests')} className="text-slate-400 hover:text-rose-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {currentFurnishing && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium text-[11px] border border-slate-200 capitalize">
                <span>{currentFurnishing}</span>
                <button type="button" onClick={() => handleRemoveFilter('furnishing')} className="text-slate-400 hover:text-rose-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {currentAmenities && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium text-[11px] border border-slate-200">
                <span>Amenities ({currentAmenities.split(',').length})</span>
                <button type="button" onClick={() => handleRemoveFilter('amenities')} className="text-slate-400 hover:text-rose-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={handleResetFilters}
              className="text-[11px] text-rose-600 hover:text-rose-700 font-bold ml-1 transition-colors flex items-center gap-1"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              Reset all
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400 text-sm">
          Loading portfolio...
        </div>
      ) : properties.length === 0 ? (
        <div className="py-20 text-center space-y-3 bg-slate-50 rounded-3xl border border-slate-100">
          <Sparkles className="w-8 h-8 mx-auto text-slate-300" />
          <h3 className="text-base font-bold text-[#012a4e]">No matching properties</h3>
          <p className="text-xs text-slate-500">Try adjusting your filters or keyword query.</p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="mt-2 px-4 py-1.5 rounded-full text-xs font-bold bg-[#012a4e] text-white hover:bg-[#00AEEF] transition-colors"
          >
            Show All Properties
          </button>
        </div>
      ) : (
        <div className="space-y-16">
          
          {/* ========================================== */}
          {/* VERTICAL (PORTRAIT) 4-CARD SHOWCASE        */}
          {/* ========================================== */}
          {verticalProps.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-[#012a4e] tracking-tight">
                    Architectural & Vertical Collection
                  </h2>
                  <p className="text-xs text-slate-400">
                    Tall interior volumes, duplex villas, and high-floor penthouses.
                  </p>
                </div>
                <span className="text-[11px] font-bold text-[#00AEEF] uppercase tracking-wider">
                  {verticalProps.length} Featured Portraits
                </span>
              </div>

              {/* 4 Vertical Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {verticalProps.map(prop => (
                  <Link 
                    key={prop.id}
                    to={`/properties/${prop.code}`}
                    className="group bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-[0_4px_20px_-6px_rgba(1,42,78,0.06)] hover:shadow-[0_16px_40px_-8px_rgba(1,42,78,0.14)] hover:-translate-y-1 transition-all duration-300 flex flex-col"
                  >
                    {/* Portrait Image Container (Aspect 3:4) */}
                    <div className="relative aspect-3/4 w-full overflow-hidden bg-slate-100">
                      <img 
                        src={prop.heroImage} 
                        alt={prop.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                      />

                      {/* Top Badges */}
                      <div className="absolute top-3 left-3 flex flex-col gap-1 items-start z-10">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/95 text-[#012a4e] shadow-xs backdrop-blur-xs uppercase">
                          {prop.purpose === 'Guest House / Short Term Stay' ? 'Short Stay' : prop.purpose}
                        </span>

                        {/* Lifecycle Status Badges */}
                        {prop.isSold ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white shadow-md uppercase tracking-wider flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                            Sold
                          </span>
                        ) : prop.isUnderOffer ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white shadow-md uppercase tracking-wider">
                            Under Offer
                          </span>
                        ) : prop.isUnderApplication ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-600 text-white shadow-md uppercase tracking-wider">
                            Under Application
                          </span>
                        ) : prop.isLeased ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white shadow-md uppercase tracking-wider">
                            Leased
                          </span>
                        ) : prop.badge ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#00AEEF] text-white shadow-xs">
                            {prop.badge}
                          </span>
                        ) : null}
                      </div>

                      {/* Booking.com Rating Badge (if Short Stay) */}
                      {prop.isShortStay && prop.shortStayData && (
                        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-[#003580] text-white px-2 py-0.5 rounded-lg shadow-sm text-[11px] font-bold z-10">
                          <span>{prop.shortStayData.rating}</span>
                          <span className="text-[9px] uppercase font-normal opacity-90">{prop.shortStayData.ratingText}</span>
                        </div>
                      )}

                      {/* Micro Property Code */}
                      {!prop.isShortStay && (
                        <div className="absolute top-3 right-3 z-10">
                          <span className="px-2 py-0.5 rounded font-mono text-[9.5px] font-bold bg-[#012a4e]/85 text-white">
                            {prop.code}
                          </span>
                        </div>
                      )}

                      {/* Bottom Gradient Overlay with Price */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-4 text-white">
                        <div className="flex items-baseline justify-between gap-2">
                          <div className="text-xl font-black tracking-tight text-white drop-shadow-sm">
                            {prop.priceDisplay}
                          </div>
                          {prop.category && (
                            <span className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded backdrop-blur-xs">
                              {prop.category}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-200 truncate mt-0.5">
                          {prop.suburb} • {prop.propertyType}
                        </div>
                      </div>
                    </div>

                    {/* Minimalist Card Footer (Clean, Decluttered) */}
                    <div className="p-4 space-y-2">
                      <h3 className="text-xs font-bold text-[#012a4e] group-hover:text-[#00AEEF] transition-colors truncate">
                        {prop.title}
                      </h3>

                      {/* Micro Specs Strip */}
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold border-t border-slate-100 pt-2">
                        {prop.bedrooms > 0 && <span>{prop.bedrooms} Bed</span>}
                        {prop.bathrooms > 0 && <span>{prop.bathrooms} Bath</span>}
                        <span>{prop.sizeSqft} sqft</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* LANDSCAPE CARDS SHOWCASE                   */}
          {/* ========================================== */}
          {landscapeProps.length > 0 && (
            <div className="space-y-6 pt-6 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-[#012a4e] tracking-tight">
                    Estates, Penthouses & Commercial Horizons
                  </h2>
                  <p className="text-xs text-slate-400">
                    Expansive panoramic views, floorplates, and countryside grounds.
                  </p>
                </div>
                <span className="text-[11px] font-bold text-[#00AEEF] uppercase tracking-wider">
                  {landscapeProps.length} Properties
                </span>
              </div>

              {/* Landscape Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {landscapeProps.map(prop => (
                  <Link 
                    key={prop.id}
                    to={`/properties/${prop.code}`}
                    className="group bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-[0_4px_20px_-6px_rgba(1,42,78,0.06)] hover:shadow-[0_16px_40px_-8px_rgba(1,42,78,0.14)] hover:-translate-y-1 transition-all duration-300 flex flex-col"
                  >
                    {/* Landscape 16:10 Image Container */}
                    <div className="relative aspect-16/10 w-full overflow-hidden bg-slate-100">
                      <img 
                        src={prop.heroImage} 
                        alt={prop.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                      />

                      {/* Top Badges */}
                      <div className="absolute top-3 left-3 flex gap-1.5 z-10">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/95 text-[#012a4e] shadow-xs uppercase">
                          {prop.purpose === 'Guest House / Short Term Stay' ? 'Short Stay' : prop.purpose}
                        </span>

                        {prop.isSold ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white shadow-md uppercase tracking-wider flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                            Sold
                          </span>
                        ) : prop.isUnderOffer ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white shadow-md uppercase tracking-wider">
                            Under Offer
                          </span>
                        ) : prop.isUnderApplication ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-600 text-white shadow-md uppercase tracking-wider">
                            Under Application
                          </span>
                        ) : prop.isLeased ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white shadow-md uppercase tracking-wider">
                            Leased
                          </span>
                        ) : prop.badge ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#00AEEF] text-white shadow-xs">
                            {prop.badge}
                          </span>
                        ) : null}
                      </div>

                      {/* Booking.com Rating Badge */}
                      {prop.isShortStay && prop.shortStayData && (
                        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-[#003580] text-white px-2 py-0.5 rounded-lg shadow-sm text-[11px] font-bold z-10">
                          <span>{prop.shortStayData.rating}</span>
                          <span className="text-[9px] uppercase font-normal opacity-90">{prop.shortStayData.ratingText}</span>
                        </div>
                      )}

                      {!prop.isShortStay && (
                        <div className="absolute top-3 right-3 z-10">
                          <span className="px-2 py-0.5 rounded font-mono text-[9.5px] font-bold bg-[#012a4e]/85 text-white">
                            {prop.code}
                          </span>
                        </div>
                      )}

                      {/* Inspection pill if exists */}
                      {prop.inspectionTimes && prop.inspectionTimes.length > 0 && !prop.isShortStay && !prop.isSold && !prop.isLeased && (
                        <div className="absolute bottom-3 left-3 right-3 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-lg text-[10.5px] font-medium text-[#012a4e] flex items-center justify-between shadow-2xs">
                          <span className="truncate">{prop.inspectionTimes[0]}</span>
                          <span className="text-[#00AEEF] font-bold">View →</span>
                        </div>
                      )}
                    </div>

                    {/* Card Body */}
                    <div className="p-4 space-y-2">
                      <div className="flex items-baseline justify-between">
                        <div className="text-xl font-black text-[#012a4e] flex items-center gap-2">
                          <span>{prop.priceDisplay}</span>
                          {prop.isSold && (
                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-200">
                              Sold
                            </span>
                          )}
                          {prop.isUnderOffer && (
                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                              Under Offer
                            </span>
                          )}
                          {prop.isUnderApplication && (
                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                              Under Application
                            </span>
                          )}
                          {prop.isLeased && (
                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Leased
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 font-semibold capitalize">
                          {prop.category || prop.propertyType}
                        </span>
                      </div>

                      <h3 className="text-xs font-bold text-[#012a4e] group-hover:text-[#00AEEF] transition-colors truncate">
                        {prop.title}
                      </h3>

                      <div className="flex items-center gap-1 text-[11px] text-slate-400 truncate">
                        <MapPin className="w-3 h-3 text-[#00AEEF] shrink-0" />
                        <span>{prop.location}</span>
                      </div>

                      {/* Micro Specs */}
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold border-t border-slate-100 pt-2 mt-2">
                        {prop.bedrooms > 0 && <span>{prop.bedrooms} Bed</span>}
                        {prop.bathrooms > 0 && <span>{prop.bathrooms} Bath</span>}
                        {prop.carSpaces > 0 && <span>{prop.carSpaces} Car</span>}
                        <span>{prop.sizeSqft} sqft</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* Precision Detail Filter Modal */}
      <DetailFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        onApply={handleApplyDetailFilters}
        initialFilters={{
          purpose: currentPurpose,
          category: currentCategory,
          status: currentStatus,
          bedrooms: currentBedrooms,
          bathrooms: currentBathrooms,
          balconies: currentBalconies,
          min_price: currentMinPrice,
          max_price: currentMaxPrice,
          min_size: currentMinSize,
          max_size: currentMaxSize,
          guests: currentGuests,
          furnishing: currentFurnishing,
          amenities: currentAmenities ? currentAmenities.split(',') : [],
        }}
      />

    </div>
  );
}
