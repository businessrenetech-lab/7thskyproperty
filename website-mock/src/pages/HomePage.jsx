import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight, ShieldCheck, Globe, Key, Sparkles, Building2, CheckCircle2 } from 'lucide-react';
import Hero from '../components/Hero';
import WhyChooseUs from '../components/WhyChooseUs';
import Testimonials from '../components/Testimonials';
import FaqSection from '../components/FaqSection';
import { mockApi } from '../services/mockApi';
import { websiteApi } from '../services/api';

export default function HomePage({ onOpenAppraisal, onBookInspection }) {
  const [featuredProps, setFeaturedProps] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      try {
        const res = await websiteApi.getProperties({ featured: true });
        if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
          setFeaturedProps(res.data.slice(0, 3));
          return;
        }
      } catch (err) {
        console.warn('Backend featured properties fetch failed, falling back:', err.message);
      }
      const res = await mockApi.getProperties({ featured: true });
      if (res.success) {
        setFeaturedProps(res.data.slice(0, 3));
      }
    }
    loadData();
  }, []);

  const handleHeroSearch = (filters) => {
    navigate(`/properties?purpose=${filters.purpose}&query=${encodeURIComponent(filters.query)}`);
  };

  return (
    <div className="space-y-16 sm:space-y-24">
      
      {/* 1. Landing Hero (1:1 with image.png) */}
      <Hero 
        onSearchSubmit={handleHeroSearch}
        onQuickFilter={(type) => {
          if (type === 'care') navigate('/services');
        }}
      />

      {/* 2. Curated Properties Showcase (Neat & Clean) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#00AEEF]">
              Curated Portfolio
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-[#012a4e] tracking-tight mt-1">
              Prime Properties & Short Stays
            </h2>
          </div>
          <Link
            to="/properties"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00AEEF] hover:text-[#0096ce] hover:underline"
          >
            <span>View All Available Properties</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        {/* 3 Upstate-Style Property Teasers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {featuredProps.map(prop => (
            <Link
              key={prop.id}
              to={`/properties/${prop.code}`}
              className="group bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-[0_4px_25px_-5px_rgba(1,42,78,0.06)] hover:shadow-[0_20px_45px_-10px_rgba(1,42,78,0.14)] hover:-translate-y-1 transition-all duration-300 flex flex-col"
            >
              <div className="relative aspect-4/3 w-full overflow-hidden bg-slate-100">
                <img 
                  src={prop.heroImage} 
                  alt={prop.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                <div className="absolute top-3 left-3 flex gap-1.5">
                  <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-white/95 text-[#012a4e] shadow-xs">
                    {prop.purpose}
                  </span>
                  {prop.badge && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-[#00AEEF] text-white shadow-xs">
                      {prop.badge}
                    </span>
                  )}
                </div>
                <div className="absolute top-3 right-3 font-mono text-[10px] font-bold px-2 py-0.5 bg-[#012a4e]/85 text-white rounded">
                  {prop.code}
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="text-xl font-black text-[#012a4e] mb-1">
                    {prop.priceDisplay}
                  </div>
                  <h3 className="text-sm font-bold text-[#012a4e] group-hover:text-[#00AEEF] transition-colors line-clamp-1">
                    {prop.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                    {prop.location}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-semibold">
                  <span>{prop.bedrooms > 0 ? `${prop.bedrooms} Bed` : prop.propertyType}</span>
                  <span>{prop.bathrooms > 0 ? `${prop.bathrooms} Bath` : ''}</span>
                  <span>{prop.sizeSqft} sqft</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. Property Care Divisions Strip (Tidy & Minimalist) */}
      <section className="bg-slate-50/70 py-16 sm:py-20 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#00AEEF]">
              Comprehensive Asset Care
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-[#012a4e] tracking-tight mt-1">
              End-to-End Care & Concierge
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-2">
              From continuous caretaker coordination to legally vetted tenancies and NRB remote monitoring.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: "Property Care & Concierge",
                desc: "Cleaning, repairs, caretaker supervision, and 24/7 emergency response protocols.",
                icon: ShieldCheck,
                link: "/services?category=property-care-concierge"
              },
              {
                title: "NRB Dedicated Services",
                desc: "4K video inspections, overseas monthly statements, and developer key handovers.",
                icon: Globe,
                link: "/nrb"
              },
              {
                title: "Leasing & Tenancy Management",
                desc: "Rigorous tenant vetting, biometric ID authentication, and automated rent disbursements.",
                icon: Key,
                link: "/services?category=leasing-tenancy-management"
              }
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <Link
                  key={idx}
                  to={item.link}
                  className="p-6 rounded-3xl bg-white border border-slate-100 hover:border-[#00AEEF]/40 hover:shadow-[0_15px_35px_-10px_rgba(1,42,78,0.08)] transition-all space-y-3 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#e8f7fd] flex items-center justify-center text-[#00AEEF] group-hover:scale-110 transition-transform">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-[#012a4e] group-hover:text-[#00AEEF] transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {item.desc}
                  </p>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#00AEEF] pt-2">
                    Explore Division →
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="text-center mt-10">
            <Link
              to="/services"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-xs font-bold text-white bg-[#012a4e] hover:bg-[#002244] shadow-sm transition-all"
            >
              <span>Explore All 6 Service Lines & 10–15 Word Scopes</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 4. Why Choose Us (Stats & Values) */}
      <WhyChooseUs />

      {/* 5. Client Testimonials */}
      <Testimonials />

      {/* 6. FAQ Section */}
      <FaqSection />

    </div>
  );
}
