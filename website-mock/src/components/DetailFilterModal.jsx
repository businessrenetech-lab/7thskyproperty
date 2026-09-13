import React, { useState } from 'react';
import { 
  X, 
  RotateCcw, 
  Check, 
  SlidersHorizontal, 
  Bed, 
  Bath, 
  Maximize2, 
  DollarSign, 
  Building2, 
  Home, 
  Key, 
  Hotel, 
  Briefcase,
  Layers,
  Sparkles,
  Wifi,
  Wind,
  Coffee,
  ShieldCheck
} from 'lucide-react';

export default function DetailFilterModal({ isOpen, onClose, onApply, initialFilters = {} }) {
  if (!isOpen) return null;

  // Primary Filters
  const [purpose, setPurpose] = useState(initialFilters.purpose || 'all'); // 'all' | 'Sale' | 'Rent' | 'Guest House / Short Term Stay' | 'Business Buy'
  const [category, setCategory] = useState(initialFilters.category || 'all'); // 'all' | 'residential' | 'commercial' | 'rural' | 'business'
  const [status, setStatus] = useState(initialFilters.status || 'all'); // 'all' | 'available' | 'under_offer' | 'sold' | 'under_application' | 'leased'
  
  // Specs
  const [bedrooms, setBedrooms] = useState(initialFilters.bedrooms || 'any');
  const [bathrooms, setBathrooms] = useState(initialFilters.bathrooms || 'any');
  const [balconies, setBalconies] = useState(initialFilters.balconies || 'any');
  const [minPrice, setMinPrice] = useState(initialFilters.min_price || '');
  const [maxPrice, setMaxPrice] = useState(initialFilters.max_price || '');
  const [minSize, setMinSize] = useState(initialFilters.min_size || '');
  const [maxSize, setMaxSize] = useState(initialFilters.max_size || '');

  // Short Term Stay specific criteria
  const [guests, setGuests] = useState(initialFilters.guests || 'any');
  const [furnishing, setFurnishing] = useState(initialFilters.furnishing || 'any');
  const [amenities, setAmenities] = useState(initialFilters.amenities || []);

  const isShortStay = purpose === 'Guest House / Short Term Stay' || purpose.toLowerCase().includes('short');
  const isRent = purpose === 'Rent';
  const isSale = purpose === 'Sale' || purpose === 'Business Buy';

  const handlePurposeSelect = (val) => {
    setPurpose(val);
    if (val === 'Business Buy') {
      setCategory('business');
    }
    // Auto reset status if incompatible
    setStatus('all');
  };

  const toggleAmenity = (amenity) => {
    setAmenities(prev => 
      prev.includes(amenity) ? prev.filter(a => a !== amenity) : [...prev, amenity]
    );
  };

  const handleReset = () => {
    setPurpose('all');
    setCategory('all');
    setStatus('all');
    setBedrooms('any');
    setBathrooms('any');
    setBalconies('any');
    setMinPrice('');
    setMaxPrice('');
    setMinSize('');
    setMaxSize('');
    setGuests('any');
    setFurnishing('any');
    setAmenities([]);
  };

  const handleApply = () => {
    let resolvedPurpose = purpose;
    let resolvedCategory = category;

    if (purpose === 'Business Buy') {
      resolvedPurpose = 'Sale';
      resolvedCategory = 'business';
    }

    onApply({
      purpose: resolvedPurpose,
      category: resolvedCategory,
      status,
      bedrooms: bedrooms !== 'any' ? bedrooms : '',
      bathrooms: bathrooms !== 'any' ? bathrooms : '',
      balconies: balconies !== 'any' ? balconies : '',
      min_price: minPrice,
      max_price: maxPrice,
      min_size: minSize,
      max_size: maxSize,
      guests: guests !== 'any' ? guests : '',
      furnishing: furnishing !== 'any' ? furnishing : '',
      amenities: amenities.length > 0 ? amenities.join(',') : '',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-100 animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#e8f7fd] text-[#00AEEF]">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-[#012a4e] tracking-tight">
                Filter Portfolio
              </h2>
              <p className="text-[11px] text-slate-400">
                Precision property search across all categories & criteria
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body (Scrollable & Minimalist) */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs divide-y divide-slate-100">
          
          {/* 1. Transaction Type / Purpose */}
          <div className="space-y-2.5">
            <label className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 block">
              Transaction Mode
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: 'Buy (Sale)', val: 'Sale', icon: Home },
                { label: 'Rent', val: 'Rent', icon: Key },
                { label: 'Short Stay', val: 'Guest House / Short Term Stay', icon: Hotel },
                { label: 'Business Buy', val: 'Business Buy', icon: Briefcase },
              ].map(item => {
                const Icon = item.icon;
                const active = purpose === item.val;
                return (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => handlePurposeSelect(item.val)}
                    className={`px-3 py-2.5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all border ${
                      active
                        ? 'bg-[#012a4e] text-white border-[#012a4e] shadow-xs'
                        : 'bg-slate-50/70 text-slate-600 border-slate-200/70 hover:bg-slate-100 hover:text-[#012a4e]'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${active ? 'text-[#00AEEF]' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Sector / Category */}
          <div className="space-y-2.5 pt-5">
            <label className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 block">
              Property Sector
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'All Sectors', val: 'all' },
                { label: 'Residential', val: 'residential' },
                { label: 'Commercial', val: 'commercial' },
                { label: 'Rural Estates', val: 'rural' },
                { label: 'Business', val: 'business' },
              ].map(item => {
                const active = category.toLowerCase() === item.val.toLowerCase();
                return (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => setCategory(item.val)}
                    className={`px-3.5 py-2 rounded-full font-semibold transition-all border ${
                      active
                        ? 'bg-[#00AEEF] text-white border-[#00AEEF] shadow-xs font-bold'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-[#012a4e]'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Status & Availability */}
          <div className="space-y-2.5 pt-5">
            <label className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 block">
              Availability & Lifecycle Status
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'All Statuses', val: 'all' },
                { label: 'Available', val: 'available' },
                ...(isRent ? [
                  { label: 'Under Application', val: 'under_application' },
                  { label: 'Leased', val: 'leased' },
                ] : [
                  { label: 'Under Offer', val: 'under_offer' },
                  { label: 'Sold', val: 'sold' },
                ]),
              ].map(item => {
                const active = status === item.val;
                return (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => setStatus(item.val)}
                    className={`px-3.5 py-2 rounded-full font-semibold transition-all border text-xs ${
                      active
                        ? 'bg-[#012a4e] text-white border-[#012a4e] shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-[#012a4e]'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Beds, Baths, Balconies */}
          {!isShortStay && category !== 'rural' && category !== 'business' && (
            <div className="space-y-4 pt-5">
              <label className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 block">
                Rooms & Layout
              </label>
              
              {/* Beds */}
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-600 font-semibold flex items-center gap-1.5 min-w-[70px]">
                  <Bed className="w-3.5 h-3.5 text-[#00AEEF]" />
                  Bedrooms
                </span>
                <div className="flex items-center gap-1.5">
                  {['any', '1', '2', '3', '4', '5+'].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setBedrooms(val)}
                      className={`w-9 h-8 rounded-xl font-bold transition-all border ${
                        bedrooms === val
                          ? 'bg-[#012a4e] text-white border-[#012a4e]'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {val === 'any' ? 'Any' : val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Baths */}
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-600 font-semibold flex items-center gap-1.5 min-w-[70px]">
                  <Bath className="w-3.5 h-3.5 text-[#00AEEF]" />
                  Bathrooms
                </span>
                <div className="flex items-center gap-1.5">
                  {['any', '1', '2', '3', '4+'].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setBathrooms(val)}
                      className={`w-9 h-8 rounded-xl font-bold transition-all border ${
                        bathrooms === val
                          ? 'bg-[#012a4e] text-white border-[#012a4e]'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {val === 'any' ? 'Any' : val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Balconies */}
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-600 font-semibold flex items-center gap-1.5 min-w-[70px]">
                  <Layers className="w-3.5 h-3.5 text-[#00AEEF]" />
                  Balconies
                </span>
                <div className="flex items-center gap-1.5">
                  {['any', '1', '2', '3+'].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setBalconies(val)}
                      className={`w-9 h-8 rounded-xl font-bold transition-all border ${
                        balconies === val
                          ? 'bg-[#012a4e] text-white border-[#012a4e]'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {val === 'any' ? 'Any' : val}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 5. Size (sq.ft) Range */}
          <div className="space-y-2.5 pt-5">
            <label className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 block">
              Floor Size (sq.ft)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input
                  type="number"
                  placeholder="Min sq.ft (e.g. 1,500)"
                  value={minSize}
                  onChange={e => setMinSize(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-[#012a4e] placeholder:text-slate-400 focus:outline-hidden focus:border-[#00AEEF] focus:bg-white"
                />
              </div>
              <div>
                <input
                  type="number"
                  placeholder="Max sq.ft (e.g. 4,500)"
                  value={maxSize}
                  onChange={e => setMaxSize(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-[#012a4e] placeholder:text-slate-400 focus:outline-hidden focus:border-[#00AEEF] focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* 6. Price Range (৳ BDT) */}
          <div className="space-y-2.5 pt-5">
            <label className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 block">
              Price Range (৳ BDT)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input
                  type="number"
                  placeholder={isRent ? "Min Rent (e.g. 50,000)" : "Min Price (৳)"}
                  value={minPrice}
                  onChange={e => setMinPrice(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-[#012a4e] placeholder:text-slate-400 focus:outline-hidden focus:border-[#00AEEF] focus:bg-white"
                />
              </div>
              <div>
                <input
                  type="number"
                  placeholder={isRent ? "Max Rent (e.g. 200,000)" : "Max Price (৳)"}
                  value={maxPrice}
                  onChange={e => setMaxPrice(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-[#012a4e] placeholder:text-slate-400 focus:outline-hidden focus:border-[#00AEEF] focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* 7. Short Term Stay Specific Criteria (Visible when Short Stay or All is selected) */}
          {(isShortStay || purpose === 'all') && (
            <div className="space-y-4 pt-5 bg-sky-50/40 p-4 rounded-2xl border border-sky-100">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-[#00AEEF] flex items-center gap-1.5">
                  <Hotel className="w-3.5 h-3.5" />
                  Short Stay Criteria
                </span>
                <span className="text-[10px] text-slate-400">Serviced living options</span>
              </div>

              {/* Guest Capacity */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-600 font-semibold text-xs">Guest Capacity</span>
                <div className="flex gap-1.5">
                  {['any', '1-2', '3-4', '5+'].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setGuests(val)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border ${
                        guests === val
                          ? 'bg-[#00AEEF] text-white border-[#00AEEF]'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {val === 'any' ? 'Any' : `${val} Guests`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Furnishing Tier */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-600 font-semibold text-xs">Furnishing</span>
                <div className="flex gap-1.5">
                  {[
                    { label: 'Any', val: 'any' },
                    { label: 'Furnished', val: 'furnished' },
                    { label: 'Executive Serviced', val: 'serviced' },
                  ].map(val => (
                    <button
                      key={val.val}
                      type="button"
                      onClick={() => setFurnishing(val.val)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all border ${
                        furnishing === val.val
                          ? 'bg-[#012a4e] text-white border-[#012a4e] font-bold'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {val.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Key Amenities Multi-Select */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  Included Amenities
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'High-Speed WiFi',
                    'Full Power Backup',
                    'Air Conditioning',
                    'Modular Kitchen',
                    'Daily Housekeeping',
                    'Airport Pickup'
                  ].map(amenity => {
                    const active = amenities.includes(amenity);
                    return (
                      <button
                        key={amenity}
                        type="button"
                        onClick={() => toggleAmenity(amenity)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border flex items-center gap-1 ${
                          active
                            ? 'bg-[#00AEEF] text-white border-[#00AEEF] font-bold'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {active && <Check className="w-2.5 h-2.5" />}
                        {amenity}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer (Sticky Bottom Action Bar) */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={handleReset}
            className="text-xs font-bold text-slate-500 hover:text-rose-600 transition-colors flex items-center gap-1.5 py-2 px-3 rounded-full hover:bg-white"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset all
          </button>

          <button
            type="button"
            onClick={handleApply}
            className="px-6 sm:px-8 py-2.5 rounded-full text-xs sm:text-sm font-bold text-white bg-[#00AEEF] hover:bg-[#0096ce] shadow-md shadow-[#00AEEF]/30 hover:shadow-lg transition-all active:scale-97 cursor-pointer"
          >
            Apply Filters
          </button>
        </div>

      </div>
    </div>
  );
}
