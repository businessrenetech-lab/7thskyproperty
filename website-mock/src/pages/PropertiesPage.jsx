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
  SlidersHorizontal
} from 'lucide-react';
import { websiteApi } from '../services/api';

export default function PropertiesPage({ onBookInspection }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  const currentPurpose = searchParams.get('purpose') || 'all';
  const currentCategory = searchParams.get('category') || 'all';
  const currentQuery = searchParams.get('query') || '';

  const [searchInput, setSearchInput] = useState(currentQuery);

  useEffect(() => {
    async function fetchProps() {
      setLoading(true);
      const res = await websiteApi.getProperties({
        purpose: currentPurpose,
        category: currentCategory,
        query: currentQuery
      });
      if (res.success) {
        setProperties(res.data);
      }
      setLoading(false);
    }
    fetchProps();
  }, [currentPurpose, currentCategory, currentQuery]);

  const handleFilter = (key, val) => {
    const next = new URLSearchParams(searchParams);
    if (val === 'all') next.delete(key);
    else next.set(key, val);
    setSearchParams(next);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    handleFilter('query', searchInput);
  };

  // Separate properties into vertical (portrait) and landscape groups
  const verticalProps = properties.filter(p => p.orientation === 'vertical');
  const landscapeProps = properties.filter(p => p.orientation === 'landscape');

  return (
    <div className="pt-28 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
      
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
        <form onSubmit={handleSearch} className="flex items-center gap-2 max-w-md w-full">
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
            type="submit"
            className="px-5 py-2 rounded-full text-xs font-bold text-white bg-[#00AEEF] hover:bg-[#0096ce] transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {/* 2. Sleek Filter Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 p-1.5 rounded-full border border-slate-200/60">
          {[
            { label: 'All', key: 'purpose', val: 'all' },
            { label: 'For Sale', key: 'purpose', val: 'Sale' },
            { label: 'For Rent', key: 'purpose', val: 'Rent' },
            { label: 'Short Term Stay', key: 'purpose', val: 'Guest House / Short Term Stay' },
            { label: 'Commercial', key: 'category', val: 'Commercial' },
            { label: 'Rural Estates', key: 'category', val: 'Rural' }
          ].map((btn, i) => {
            const active = btn.key === 'purpose' ? currentPurpose === btn.val : currentCategory === btn.val;
            return (
              <button
                key={i}
                onClick={() => handleFilter(btn.key, btn.val)}
                className={`px-3.5 py-1 rounded-full font-semibold transition-all ${
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

        <div className="text-slate-400 text-xs font-medium">
          {properties.length} Verified Properties
        </div>
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
                  4 Featured Portraits
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
                      <div className="absolute top-3 left-3 flex flex-col gap-1 items-start">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/95 text-[#012a4e] shadow-xs backdrop-blur-xs uppercase">
                          {prop.purpose === 'Guest House / Short Term Stay' ? 'Short Stay' : prop.purpose}
                        </span>
                        {prop.badge && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#00AEEF] text-white shadow-xs">
                            {prop.badge}
                          </span>
                        )}
                      </div>

                      {/* Booking.com Rating Badge (if Short Stay) */}
                      {prop.isShortStay && prop.shortStayData && (
                        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-[#003580] text-white px-2 py-0.5 rounded-lg shadow-sm text-[11px] font-bold">
                          <span>{prop.shortStayData.rating}</span>
                          <span className="text-[9px] uppercase font-normal opacity-90">{prop.shortStayData.ratingText}</span>
                        </div>
                      )}

                      {/* Micro Property Code */}
                      {!prop.isShortStay && (
                        <div className="absolute top-3 right-3">
                          <span className="px-2 py-0.5 rounded font-mono text-[9.5px] font-bold bg-[#012a4e]/85 text-white">
                            {prop.code}
                          </span>
                        </div>
                      )}

                      {/* Bottom Gradient Overlay with Price */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 text-white">
                        <div className="text-xl font-black tracking-tight text-white drop-shadow-sm">
                          {prop.priceDisplay}
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
                  Landscape Collection
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
                      <div className="absolute top-3 left-3 flex gap-1.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/95 text-[#012a4e] shadow-xs uppercase">
                          {prop.purpose === 'Guest House / Short Term Stay' ? 'Short Stay' : prop.purpose}
                        </span>
                        {prop.badge && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#00AEEF] text-white shadow-xs">
                            {prop.badge}
                          </span>
                        )}
                      </div>

                      {/* Booking.com Rating Badge */}
                      {prop.isShortStay && prop.shortStayData && (
                        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-[#003580] text-white px-2 py-0.5 rounded-lg shadow-sm text-[11px] font-bold">
                          <span>{prop.shortStayData.rating}</span>
                          <span className="text-[9px] uppercase font-normal opacity-90">{prop.shortStayData.ratingText}</span>
                        </div>
                      )}

                      {!prop.isShortStay && (
                        <div className="absolute top-3 right-3">
                          <span className="px-2 py-0.5 rounded font-mono text-[9.5px] font-bold bg-[#012a4e]/85 text-white">
                            {prop.code}
                          </span>
                        </div>
                      )}

                      {/* Inspection pill if exists */}
                      {prop.inspectionTimes && prop.inspectionTimes.length > 0 && !prop.isShortStay && (
                        <div className="absolute bottom-3 left-3 right-3 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-lg text-[10.5px] font-medium text-[#012a4e] flex items-center justify-between shadow-2xs">
                          <span className="truncate">{prop.inspectionTimes[0]}</span>
                          <span className="text-[#00AEEF] font-bold">View →</span>
                        </div>
                      )}
                    </div>

                    {/* Card Body */}
                    <div className="p-4 space-y-2">
                      <div className="flex items-baseline justify-between">
                        <div className="text-xl font-black text-[#012a4e]">
                          {prop.priceDisplay}
                        </div>
                        <span className="text-[11px] text-slate-400 font-semibold">
                          {prop.propertyType}
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

    </div>
  );
}
