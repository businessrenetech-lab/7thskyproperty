import React, { useState } from 'react';
import { 
  Bed, 
  Bath, 
  Car, 
  Maximize2, 
  Calendar, 
  MapPin, 
  ArrowUpRight, 
  Eye, 
  CheckCircle2,
  Video
} from 'lucide-react';

export default function FeaturedProperties({ properties, onSelectProperty, onBookInspection }) {
  const [activeTab, setActiveTab] = useState('All');

  const tabs = ['All', 'Residential', 'Commercial', 'Guest House / Short Term Stay', 'Rural', 'Business'];

  const filteredProperties = properties.filter(prop => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Guest House / Short Term Stay') {
      return prop.purpose === 'Guest House / Short Term Stay';
    }
    return prop.category.toLowerCase() === activeTab.toLowerCase();
  });

  return (
    <section id="properties" className="py-24 bg-[#ffffff]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#00AEEF] mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00AEEF]"></span>
              Upstate-Inspired Listings
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#012a4e] tracking-tight">
              Featured Properties
            </h2>
            <p className="text-slate-500 text-sm sm:text-base mt-2 max-w-xl">
              Verified titles, high-resolution media galleries, floor plans, and scheduled inspection windows.
            </p>
          </div>

          {/* Minimalist Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/80 p-1.5 rounded-full border border-slate-200/70">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                  activeTab === tab 
                    ? 'bg-white text-[#012a4e] shadow-xs' 
                    : 'text-slate-600 hover:text-[#012a4e]'
                }`}
              >
                {tab === 'Guest House / Short Term Stay' ? 'Short Stay' : tab}
              </button>
            ))}
          </div>
        </div>

        {/* Property Grid (Upstate Style Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProperties.map(prop => (
            <div 
              key={prop.id}
              onClick={() => onSelectProperty && onSelectProperty(prop)}
              className="group bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-[0_4px_25px_-5px_rgba(1,42,78,0.06)] hover:shadow-[0_20px_45px_-10px_rgba(1,42,78,0.14)] hover:-translate-y-1 transition-all duration-300 flex flex-col cursor-pointer"
            >
              {/* Media Thumbnail Container */}
              <div className="relative aspect-4/3 w-full overflow-hidden bg-slate-100">
                <img 
                  src={prop.heroImage} 
                  alt={prop.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                />

                {/* Status / Feature Badges */}
                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase bg-white/95 text-[#012a4e] shadow-xs backdrop-blur-sm">
                    {prop.purpose}
                  </span>
                  {prop.badge && (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase bg-[#00AEEF] text-white shadow-xs">
                      {prop.badge}
                    </span>
                  )}
                </div>

                {/* Property Code */}
                <div className="absolute top-3 right-3">
                  <span className="px-2.5 py-1 rounded-md text-[10.5px] font-mono font-bold bg-[#012a4e]/85 text-white backdrop-blur-xs">
                    {prop.code}
                  </span>
                </div>

                {/* Quick inspection notice pill */}
                {prop.inspectionTimes && prop.inspectionTimes.length > 0 && (
                  <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg flex items-center justify-between text-xs text-[#012a4e] shadow-xs border border-white/60">
                    <span className="flex items-center gap-1.5 font-medium truncate">
                      <Calendar className="w-3.5 h-3.5 text-[#00AEEF] shrink-0" />
                      {prop.inspectionTimes[0]}
                    </span>
                    <span className="text-[11px] font-bold text-[#00AEEF] shrink-0 hover:underline">
                      Book →
                    </span>
                  </div>
                )}
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  {/* Price & Category */}
                  <div className="flex items-baseline justify-between mb-1.5">
                    <div className="text-2xl font-black text-[#012a4e] tracking-tight">
                      {prop.priceDisplay}
                    </div>
                    <span className="text-xs font-semibold text-slate-400">
                      {prop.propertyType}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-bold text-[#012a4e] group-hover:text-[#00AEEF] transition-colors line-clamp-1">
                    {prop.title}
                  </h3>

                  {/* Location with Pin */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1.5 line-clamp-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{prop.location}</span>
                  </div>
                </div>

                {/* Specs Strip (Beds, Baths, Cars, Sqft) */}
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-600">
                  {prop.bedrooms > 0 && (
                    <div className="flex items-center gap-1">
                      <Bed className="w-4 h-4 text-slate-400" />
                      <span>{prop.bedrooms} Bed</span>
                    </div>
                  )}
                  {prop.bathrooms > 0 && (
                    <div className="flex items-center gap-1">
                      <Bath className="w-4 h-4 text-slate-400" />
                      <span>{prop.bathrooms} Bath</span>
                    </div>
                  )}
                  {prop.carSpaces > 0 && (
                    <div className="flex items-center gap-1">
                      <Car className="w-4 h-4 text-slate-400" />
                      <span>{prop.carSpaces} Car</span>
                    </div>
                  )}
                  {prop.sizeSqft > 0 && (
                    <div className="flex items-center gap-1">
                      <Maximize2 className="w-4 h-4 text-slate-400" />
                      <span>{prop.sizeSqft} sqft</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Callout */}
        <div className="mt-14 text-center">
          <p className="text-sm text-slate-500 mb-4">
            Looking for something specific or an off-market private portfolio?
          </p>
          <a
            href="#contact"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-xs font-bold uppercase tracking-wider text-[#012a4e] bg-slate-100 hover:bg-[#e8f7fd] hover:text-[#00AEEF] transition-all"
          >
            <span>Request Bespoke Property Search</span>
            <ArrowUpRight className="w-4 h-4" />
          </a>
        </div>

      </div>
    </section>
  );
}
