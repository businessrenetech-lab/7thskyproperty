import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowUpRight, 
  ArrowRight,
  ShieldCheck, 
  Globe, 
  Key, 
  Sparkles, 
  Building2, 
  CheckCircle2, 
  MapPin, 
  Droplets, 
  Paintbrush, 
  FileCheck2, 
  Star,
  Layers,
  ChevronRight
} from 'lucide-react';
import Hero from '../components/Hero';
import SolutionsOverview from '../components/SolutionsOverview';
import WhyChooseUs from '../components/WhyChooseUs';
import Testimonials from '../components/Testimonials';
import FaqSection from '../components/FaqSection';
import { mockApi } from '../services/mockApi';
import { websiteApi } from '../services/api';
import { MOCK_PROPERTIES } from '../data/mockProperties';

export default function HomePage({ onOpenAppraisal, onBookInspection }) {
  const [allProps, setAllProps] = useState([]);
  const [activeTab, setActiveTab] = useState('Buy');
  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      try {
        const res = await websiteApi.getProperties();
        if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
          setAllProps(res.data);
          return;
        }
      } catch (err) {
        console.warn('Backend properties fetch failed, falling back to mockApi:', err.message);
      }
      const res = await mockApi.getProperties();
      if (res && res.success && Array.isArray(res.data)) {
        setAllProps(res.data);
      } else {
        setAllProps(MOCK_PROPERTIES);
      }
    }
    loadData();
  }, []);

  const handleHeroSearch = (filters) => {
    const params = new URLSearchParams();
    if (filters.purpose && filters.purpose !== 'all') params.set('purpose', filters.purpose);
    if (filters.category && filters.category !== 'all') params.set('category', filters.category);
    if (filters.status && filters.status !== 'all') params.set('status', filters.status);
    if (filters.query) params.set('query', filters.query);
    if (filters.bedrooms && filters.bedrooms !== 'any') params.set('bedrooms', filters.bedrooms);
    if (filters.bathrooms && filters.bathrooms !== 'any') params.set('bathrooms', filters.bathrooms);
    if (filters.balconies && filters.balconies !== 'any') params.set('balconies', filters.balconies);
    if (filters.min_price) params.set('min_price', filters.min_price);
    if (filters.max_price) params.set('max_price', filters.max_price);
    if (filters.min_size) params.set('min_size', filters.min_size);
    if (filters.max_size) params.set('max_size', filters.max_size);
    if (filters.guests && filters.guests !== 'any') params.set('guests', filters.guests);
    if (filters.furnishing && filters.furnishing !== 'any') params.set('furnishing', filters.furnishing);
    if (filters.amenities) params.set('amenities', filters.amenities);
    navigate(`/properties?${params.toString()}`);
  };

  // Filter tabs config
  const filterTabs = [
    { id: 'Buy', label: 'Buy', targetUrl: '/properties?purpose=Sale', linkText: 'Explore All Buy Properties' },
    { id: 'Rent', label: 'Rent', targetUrl: '/properties?purpose=Rent', linkText: 'Explore All Rental Properties' },
    { id: 'Short Term Stay', label: 'Short Term Stay', targetUrl: '/properties?purpose=Short+Term+Stay', linkText: 'Explore All Short Stays' },
    { id: 'Business', label: 'Business', targetUrl: '/properties?category=Business', linkText: 'Explore All Business Ventures' }
  ];

  // Dynamic featured properties per selected tab
  const displayedProperties = useMemo(() => {
    const sourcePool = allProps.length > 0 ? allProps : MOCK_PROPERTIES;
    
    let filtered = [];
    if (activeTab === 'Buy') {
      filtered = sourcePool.filter(p => 
        (p.purpose === 'Sale' || p.purpose === 'Buy') && p.category !== 'Business'
      );
    } else if (activeTab === 'Rent') {
      filtered = sourcePool.filter(p => p.purpose === 'Rent');
    } else if (activeTab === 'Short Term Stay') {
      filtered = sourcePool.filter(p => 
        p.isShortStay || 
        p.purpose === 'Short Term Stay' || 
        p.purpose === 'Guest House / Short Term Stay' || 
        p.category === 'Short Term Stay'
      );
    } else if (activeTab === 'Business') {
      filtered = sourcePool.filter(p => 
        p.category === 'Business' || 
        p.purpose === 'Business Buy' || 
        p.purpose === 'Business' || 
        (p.propertyType && p.propertyType.toLowerCase().includes('business'))
      );
    }

    // Prioritize featured ones
    const featuredOnly = filtered.filter(p => p.featured);
    const result = featuredOnly.length >= 3 ? featuredOnly.slice(0, 3) : filtered.slice(0, 3);

    // If still less than 3, fallback to matching MOCK_PROPERTIES
    if (result.length < 3) {
      const mockMatches = MOCK_PROPERTIES.filter(p => {
        if (activeTab === 'Buy') return (p.purpose === 'Sale' || p.purpose === 'Buy') && p.category !== 'Business';
        if (activeTab === 'Rent') return p.purpose === 'Rent';
        if (activeTab === 'Short Term Stay') return p.isShortStay || p.purpose === 'Guest House / Short Term Stay';
        if (activeTab === 'Business') return p.category === 'Business';
        return true;
      });
      return mockMatches.slice(0, 3);
    }

    return result;
  }, [allProps, activeTab]);

  const activeTabMeta = filterTabs.find(t => t.id === activeTab) || filterTabs[0];

  return (
    <div className="space-y-16 sm:space-y-24">
      
      {/* 1. Full-Width Immersive Hero (Untouched) */}
      <Hero 
        onSearchSubmit={handleHeroSearch}
        onQuickFilter={(type) => {
          if (type === 'care') navigate('/services');
        }}
      />

      {/* 2. 360° Property Solutions Feature Card (Untouched) */}
      <SolutionsOverview />

      {/* 3. Featured Properties Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 sm:mb-10 gap-6">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#00AEEF] mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00AEEF]"></span>
              Handpicked For You
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#012a4e] tracking-tight">
              Featured Properties
            </h2>
          </div>

          {/* Dynamic Category Link */}
          <Link
            to={activeTabMeta.targetUrl}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00AEEF] hover:text-[#0096ce] transition-colors group self-start md:self-end"
          >
            <span>{activeTabMeta.linkText}</span>
            <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Link>
        </div>

        {/* Filter Tabs: Exactly 2 rows on mobile, flex row on sm+ */}
        <div className="mb-8">
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 p-1.5 bg-slate-100/80 rounded-2xl sm:rounded-full border border-slate-200/70 w-full sm:w-fit">
            {filterTabs.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 sm:px-5 py-2.5 sm:py-2 rounded-xl sm:rounded-full text-xs font-bold transition-all text-center flex items-center justify-center gap-2 ${
                    isActive
                      ? 'bg-[#012a4e] text-white shadow-sm'
                      : 'text-slate-600 hover:text-[#012a4e] hover:bg-white/80'
                  }`}
                >
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3 Featured Property Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {displayedProperties.map(prop => {
            const isShort = prop.isShortStay || prop.purpose === 'Guest House / Short Term Stay';
            const isBiz = prop.category === 'Business';

            return (
              <Link
                key={prop.id || prop.code}
                to={`/properties/${prop.code}`}
                className="group bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-[0_4px_25px_-5px_rgba(1,42,78,0.06)] hover:shadow-[0_20px_45px_-10px_rgba(1,42,78,0.14)] hover:-translate-y-1 transition-all duration-300 flex flex-col"
              >
                {/* Image Section */}
                <div className="relative aspect-4/3 w-full overflow-hidden bg-slate-100">
                  <img 
                    src={prop.heroImage || (prop.gallery && prop.gallery[0])} 
                    alt={prop.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-white/95 text-[#012a4e] shadow-xs backdrop-blur-xs">
                      {isShort ? 'Short Stay' : isBiz ? 'Business' : prop.purpose}
                    </span>
                    {prop.status && prop.status !== 'Available' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-500 text-white shadow-xs">
                        {prop.status}
                      </span>
                    ) : prop.badge ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-[#00AEEF] text-white shadow-xs">
                        {prop.badge}
                      </span>
                    ) : null}
                  </div>
                  <div className="absolute top-3 right-3 font-mono text-[10px] font-bold px-2 py-0.5 bg-[#012a4e]/85 text-white rounded">
                    {prop.code}
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="text-xl sm:text-2xl font-black text-[#012a4e] mb-1">
                      {prop.priceDisplay}
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-[#012a4e] group-hover:text-[#00AEEF] transition-colors line-clamp-1">
                      {prop.title}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1.5 line-clamp-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{prop.location}</span>
                    </div>
                  </div>

                  {/* Dynamic Spec Footer */}
                  <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-semibold">
                    {isShort ? (
                      <>
                        <span className="flex items-center gap-1 text-amber-500 font-bold">
                          <Star className="w-3.5 h-3.5 fill-amber-400 stroke-none" />
                          <span>{prop.shortStayData?.rating || '4.98'}</span>
                        </span>
                        <span>{prop.shortStayData?.stars ? `${prop.shortStayData.stars}-Star Suite` : 'Serviced'}</span>
                        <span>{prop.bedrooms > 0 ? `${prop.bedrooms} Bed` : `${prop.sizeSqft} sqft`}</span>
                      </>
                    ) : isBiz ? (
                      <>
                        <span>{prop.propertyType || 'Commercial'}</span>
                        <span>{prop.sizeSqft} sqft</span>
                        <span className="text-[#00AEEF]">Turnkey Asset</span>
                      </>
                    ) : (
                      <>
                        <span>{prop.bedrooms > 0 ? `${prop.bedrooms} Bed` : prop.propertyType}</span>
                        <span>{prop.bathrooms > 0 ? `${prop.bathrooms} Bath` : 'Verified'}</span>
                        <span>{prop.sizeSqft} sqft</span>
                      </>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 4. What We Actually Provide (Problem Solver Grid) */}
      <section className="bg-slate-50/70 py-16 sm:py-24 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#00AEEF] mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00AEEF]"></span>
              What We Do For You
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#012a4e] tracking-tight">
              We Solve Your Property Headaches
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-2 max-w-xl mx-auto">
              No middleman fraud. No rent delay. No running after local caretakers. We handle everything from papers to repairs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {[
              {
                title: "Guaranteed Rent Collection",
                tag: "For Landlords",
                points: [
                  "Rent deposited straight to your bank on the 1st",
                  "Police verification & strict NID screening",
                  "We fix plumbing, electrical & caretaker issues"
                ],
                badge: "99% On-Time Rent",
                icon: Key,
                link: "/services?category=leasing-tenancy-management",
                bgImage: "/assets/services/rent-collection-bg.png"
              },
              {
                title: "Buy & Sell Verified Properties",
                tag: "For Buyers & Sellers",
                points: [
                  "100% legal title & deed check before listing",
                  "Zero fake paper fraud or middleman harassment",
                  "Fair market price with biometric legal agreements"
                ],
                badge: "Zero Legal Risk",
                icon: Building2,
                link: "/properties?purpose=Sale",
                bgImage: "/assets/services/verified-property-bg.png"
              },
              {
                title: "Furnished Short-Term Suites",
                tag: "For NRBs & Guests",
                points: [
                  "Move-in ready with fast WiFi, AC & full kitchen",
                  "5-star hotel grade linen & daily housekeeping",
                  "24/7 security & power backup in prime zones"
                ],
                badge: "Turnkey Ready",
                icon: Sparkles,
                link: "/properties?purpose=Short+Term+Stay",
                bgImage: "/assets/services/short-stay-bg.png"
              },
              {
                title: "Land Deed & Mutation Verification",
                tag: "Legal Security",
                points: [
                  "Complete CS, SA, RS, BS records audit",
                  "AC Land mutation check & updated tax receipts",
                  "RAJUK layout & boundary dispute verification"
                ],
                badge: "100% Dispute Free",
                icon: FileCheck2,
                link: "/services",
                bgImage: "/assets/services/legal-deed-bg.svg"
              },
              {
                title: "Scientific Water Tank Cleaning",
                tag: "Safe Drinking Water",
                points: [
                  "Heavy sludge evacuation & 7-stage jet washing",
                  "Certified biological disinfection",
                  "Safe lab-tested pure water for your whole family"
                ],
                badge: "Pure & Safe Water",
                icon: Droplets,
                link: "/services/water-tank-cleaning",
                bgImage: "/assets/services/water-tank-bg.svg"
              },
              {
                title: "Turnkey Interior Design",
                tag: "Renovation & Fit-Out",
                points: [
                  "Custom modular kitchens, woodwork & lighting",
                  "Beautiful dedicated Muslim prayer rooms",
                  "Fixed price, 3D visualization & on-time handover"
                ],
                badge: "Fixed Price & Date",
                icon: Paintbrush,
                link: "/services/interior-design",
                bgImage: "/assets/services/interior-design-bg.svg"
              }
            ].map((service, idx) => {
              const Icon = service.icon;
              return (
                <Link
                  key={idx}
                  to={service.link}
                  className="relative overflow-hidden p-6 sm:p-7 rounded-3xl bg-white border border-slate-100 hover:border-[#00AEEF]/40 hover:shadow-[0_15px_35px_-10px_rgba(1,42,78,0.08)] transition-all flex flex-col justify-between space-y-4 group"
                >
                  {/* Transparent Background Visual Illustration / Watermark */}
                  <div className="absolute right-0 bottom-0 w-36 h-36 sm:w-44 sm:h-44 opacity-15 group-hover:opacity-25 group-hover:scale-105 transition-all duration-500 pointer-events-none select-none z-0">
                    <img 
                      src={service.bgImage} 
                      alt="" 
                      className="w-full h-full object-contain object-bottom-right" 
                    />
                  </div>

                  <div className="relative z-10 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div className="w-11 h-11 rounded-xl bg-[#e8f7fd] flex items-center justify-center text-[#00AEEF] group-hover:scale-110 transition-transform">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[10.5px] font-bold text-[#00AEEF] bg-[#e8f7fd] px-2.5 py-1 rounded-full">
                        {service.badge}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        {service.tag}
                      </span>
                      <h3 className="text-base font-bold text-[#012a4e] group-hover:text-[#00AEEF] transition-colors mt-0.5">
                        {service.title}
                      </h3>
                    </div>

                    {/* Scannable Bullet Points */}
                    <ul className="space-y-1.5 pt-1">
                      {service.points.map((pt, pIdx) => (
                        <li key={pIdx} className="flex items-start gap-2 text-xs text-slate-600 leading-snug">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#00AEEF] shrink-0 mt-0.5" />
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="relative z-10 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#00AEEF]">
                    <span>See How It Works</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="text-center mt-12">
            <Link
              to="/services"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-xs font-bold text-white bg-[#012a4e] hover:bg-[#002244] shadow-sm transition-all"
            >
              <span>See All Services & Fixed Price Packages</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 5. Simple 3-Step Journey (How We Protect Your Property) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#00AEEF] mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00AEEF]"></span>
            Simple 3 Steps
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#012a4e] tracking-tight">
            How We Protect Your Property
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-2">
            Start in 24 hours. No hidden charges. No running after local caretakers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {[
            {
              step: "01",
              title: "Free Property Visit & Paper Check",
              desc: "Our senior officer visits your flat, verifies land registry deeds, and gives you an honest rent and sale valuation."
            },
            {
              step: "02",
              title: "Police-Verified Tenants or Buyers",
              desc: "We screen national ID, police records, and job profiles. Biometric legal agreement signed before handover."
            },
            {
              step: "03",
              title: "Receive Rent in Bank & Relax",
              desc: "Rent goes straight to your bank account every month. We fix leaks, manage repairs, and send updates on WhatsApp."
            }
          ].map((item, idx) => (
            <div 
              key={idx}
              className="p-8 rounded-3xl bg-[#fbfdff] border border-slate-100 hover:border-[#00AEEF]/30 transition-all space-y-3"
            >
              <div className="text-3xl font-black text-[#00AEEF]/40">
                {item.step}
              </div>
              <h3 className="text-base font-bold text-[#012a4e]">
                {item.title}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Why Choose Us (Stats & Values) */}
      <WhyChooseUs />

      {/* 7. Client Testimonials */}
      <Testimonials />

      {/* 8. FAQ Section */}
      <FaqSection />

      {/* 9. Minimalist Corporate Advisory Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="relative rounded-3xl bg-linear-to-br from-[#012a4e] via-[#013564] to-[#012240] p-8 sm:p-12 lg:p-16 text-white overflow-hidden shadow-xl shadow-[#012a4e]/10">
          <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-[#00AEEF]/10 blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-2xl space-y-4">
            <span className="text-xs font-bold uppercase tracking-widest text-[#00AEEF]">
              Direct Property Help
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight">
              Have a Flat, Plot, or Building in Bangladesh?
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              Whether you live in Dhaka or abroad, our dedicated team gives you guaranteed on-time rent, airtight legal safety, and complete peace of mind.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={() => onOpenAppraisal && onOpenAppraisal()}
                className="px-6 py-3 rounded-full text-xs font-bold bg-[#00AEEF] hover:bg-[#0096ce] text-white shadow-md transition-all cursor-pointer"
              >
                Get Free Property Consultation
              </button>
              <Link
                to="/properties"
                className="px-6 py-3 rounded-full text-xs font-bold bg-white/10 hover:bg-white/15 text-white border border-white/20 transition-all inline-flex items-center gap-1.5"
              >
                <span>See Available Properties</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
