import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Menu, 
  X, 
  ArrowRight, 
  Sparkles, 
  ChevronRight, 
  PhoneCall, 
  Globe, 
  ShieldCheck, 
  Building2, 
  Key,
  Home,
  Briefcase
} from 'lucide-react';
import { SERVICE_CATEGORIES } from '../data/mockServices';

export default function Navbar({ onOpenAppraisal }) {
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null); // 'properties' | 'services'
  const location = useLocation();

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <header 
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          scrolled 
            ? 'bg-white/95 backdrop-blur-md shadow-[0_4px_20px_-4px_rgba(1,42,78,0.06)] border-b border-slate-100 py-3.5' 
            : 'bg-white/80 backdrop-blur-sm border-b border-slate-100/60 py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#012a4e] via-[#012a4e] to-[#12b6f3] flex items-center justify-center text-white font-black text-xl shadow-sm group-hover:scale-105 transition-transform duration-200">
              7
            </div>
            <div className="flex flex-col">
              <span className="text-[19px] font-extrabold tracking-tight text-[#012a4e] leading-none">
                SEVENTH SKY
              </span>
              <span className="text-[10px] tracking-[0.2em] font-bold text-[#12b6f3] uppercase mt-0.5">
                Property Management
              </span>
            </div>
          </Link>

          {/* Top Right Actions (1:1 with image.png: Pill CTA button + Clean Minimalist Hamburger) */}
          <div className="flex items-center gap-3 sm:gap-4">
            
            {/* Primary Action Button (Matching image.png "book an appraisal") */}
            <button 
              onClick={() => onOpenAppraisal && onOpenAppraisal()}
              className="px-5 sm:px-6 py-2.5 rounded-full text-[13px] sm:text-[13.5px] font-bold text-white bg-[#00AEEF] hover:bg-[#0096ce] shadow-[0_4px_14px_rgba(0,174,239,0.35)] hover:shadow-[0_6px_20px_rgba(0,174,239,0.45)] transition-all transform active:scale-98 cursor-pointer"
            >
              book an appraisal
            </button>

            {/* Minimalist Hamburger Icon (matching image.png) */}
            <button 
              onClick={() => setDrawerOpen(true)}
              aria-label="Toggle navigation menu"
              className="p-2 sm:p-2.5 rounded-full text-[#012a4e] hover:bg-slate-100 hover:text-[#00AEEF] transition-all cursor-pointer flex items-center justify-center border border-slate-200/80 shadow-2xs"
            >
              <Menu className="w-6 h-6 stroke-[2.2]" />
            </button>
          </div>

        </div>
      </header>

      {/* Full Luxury Navigation Drawer Overlay (Opened by Hamburger) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex justify-end animate-fade-in">
          <div className="relative w-full max-w-md sm:max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between p-6 sm:p-10 overflow-y-auto">
            
            {/* Drawer Header */}
            <div>
              <div className="flex items-center justify-between pb-6 border-b border-slate-100">
                <Link to="/" onClick={() => setDrawerOpen(false)} className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#012a4e] text-white font-bold flex items-center justify-center text-sm">
                    7
                  </div>
                  <span className="font-extrabold text-base tracking-tight text-[#012a4e]">
                    SEVENTH SKY
                  </span>
                </Link>

                <button 
                  onClick={() => setDrawerOpen(false)}
                  className="p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-[#012a4e] transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Main Navigation Links */}
              <nav className="mt-8 space-y-2">
                
                {/* Home */}
                <Link
                  to="/"
                  className={`flex items-center justify-between p-3.5 rounded-2xl text-base font-bold transition-all ${
                    location.pathname === '/' ? 'bg-[#e8f7fd] text-[#00AEEF]' : 'text-[#012a4e] hover:bg-slate-50'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Home className="w-4 h-4 text-slate-400" />
                    Home
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </Link>

                {/* Properties */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Link
                      to="/properties"
                      className={`flex-1 flex items-center gap-3 p-3.5 rounded-2xl text-base font-bold transition-all ${
                        location.pathname.startsWith('/properties') ? 'bg-[#e8f7fd] text-[#00AEEF]' : 'text-[#012a4e] hover:bg-slate-50'
                      }`}
                    >
                      <Building2 className="w-4 h-4 text-slate-400" />
                      Properties
                    </Link>
                    <button
                      onClick={() => setExpandedSection(expandedSection === 'properties' ? null : 'properties')}
                      className="p-3 text-slate-400 hover:text-[#012a4e]"
                    >
                      <ChevronRight className={`w-4 h-4 transition-transform ${expandedSection === 'properties' ? 'rotate-90' : ''}`} />
                    </button>
                  </div>

                  {expandedSection === 'properties' && (
                    <div className="pl-10 pr-4 py-2 space-y-2 text-xs font-medium text-slate-600 animate-fade-in">
                      <Link to="/properties?purpose=Sale" className="block py-1 hover:text-[#00AEEF]">Residential Sales</Link>
                      <Link to="/properties?purpose=Rent" className="block py-1 hover:text-[#00AEEF]">Residential Rentals</Link>
                      <Link to="/properties?purpose=ShortStay" className="block py-1 hover:text-[#00AEEF]">Guest House / Short Stay</Link>
                      <Link to="/properties?category=Commercial" className="block py-1 hover:text-[#00AEEF]">Commercial Leasing & Sales</Link>
                      <Link to="/properties?category=Rural" className="block py-1 hover:text-[#00AEEF]">Rural Estates & Land</Link>
                      <Link to="/properties?category=Business" className="block py-1 hover:text-[#00AEEF]">Business Assets & Registration</Link>
                    </div>
                  )}
                </div>

                {/* Property Care Services */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Link
                      to="/services"
                      className={`flex-1 flex items-center gap-3 p-3.5 rounded-2xl text-base font-bold transition-all ${
                        location.pathname === '/services' ? 'bg-[#e8f7fd] text-[#00AEEF]' : 'text-[#012a4e] hover:bg-slate-50'
                      }`}
                    >
                      <ShieldCheck className="w-4 h-4 text-slate-400" />
                      Property Care Services
                    </Link>
                    <button
                      onClick={() => setExpandedSection(expandedSection === 'services' ? null : 'services')}
                      className="p-3 text-slate-400 hover:text-[#012a4e]"
                    >
                      <ChevronRight className={`w-4 h-4 transition-transform ${expandedSection === 'services' ? 'rotate-90' : ''}`} />
                    </button>
                  </div>

                  {expandedSection === 'services' && (
                    <div className="pl-10 pr-4 py-2 space-y-2 text-xs font-medium text-slate-600 animate-fade-in">
                      {SERVICE_CATEGORIES.map(cat => (
                        <Link 
                          key={cat.id} 
                          to={`/services?category=${cat.id}`} 
                          className="block py-1 hover:text-[#00AEEF]"
                        >
                          {cat.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* NRB Dedicated Services */}
                <Link
                  to="/nrb"
                  className={`flex items-center justify-between p-3.5 rounded-2xl text-base font-bold transition-all ${
                    location.pathname === '/nrb' ? 'bg-[#e8f7fd] text-[#00AEEF]' : 'text-[#012a4e] hover:bg-slate-50'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Globe className="w-4 h-4 text-slate-400" />
                    NRB Dedicated Services
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </Link>

                {/* About Us */}
                <Link
                  to="/about"
                  className={`flex items-center justify-between p-3.5 rounded-2xl text-base font-bold transition-all ${
                    location.pathname === '/about' ? 'bg-[#e8f7fd] text-[#00AEEF]' : 'text-[#012a4e] hover:bg-slate-50'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Sparkles className="w-4 h-4 text-slate-400" />
                    About Us
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </Link>

                {/* Careers */}
                <Link
                  to="/careers"
                  className={`flex items-center justify-between p-3.5 rounded-2xl text-base font-bold transition-all ${
                    location.pathname === '/careers' ? 'bg-[#e8f7fd] text-[#00AEEF]' : 'text-[#012a4e] hover:bg-slate-50'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Briefcase className="w-4 h-4 text-slate-400" />
                    Careers
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </Link>

                {/* Contact Us */}
                <Link
                  to="/contact"
                  className={`flex items-center justify-between p-3.5 rounded-2xl text-base font-bold transition-all ${
                    location.pathname === '/contact' ? 'bg-[#e8f7fd] text-[#00AEEF]' : 'text-[#012a4e] hover:bg-slate-50'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <PhoneCall className="w-4 h-4 text-slate-400" />
                    Contact Us
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </Link>

              </nav>
            </div>

            {/* Drawer Bottom Direct Appraisal Action */}
            <div className="pt-6 border-t border-slate-100 space-y-3">
              <button
                onClick={() => { setDrawerOpen(false); onOpenAppraisal && onOpenAppraisal(); }}
                className="w-full py-3.5 rounded-full text-xs font-bold text-white bg-[#00AEEF] hover:bg-[#0096ce] transition-all shadow-md shadow-[#00AEEF]/20"
              >
                Book a Free Property Appraisal
              </button>
              <div className="text-center">
                <span className="text-[11px] text-slate-400">
                  Concierge Hotline: +880 1711 000 777
                </span>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
