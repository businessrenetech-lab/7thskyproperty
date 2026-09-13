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
  Briefcase,
  Droplets,
  Wind,
  Palette,
  FileText,
  MapPin,
  Scroll,
  Landmark,
  Truck,
  Hotel
} from 'lucide-react';

const PROPERTY_SUBMENU = [
  {
    title: 'Residential Sales',
    desc: 'Luxury apartments, penthouses & family residences for sale',
    href: '/properties?purpose=Sale',
    icon: Home,
  },
  {
    title: 'Residential Rentals',
    desc: 'Vetted rental homes with institutional tenancy care',
    href: '/properties?purpose=Rent',
    icon: Key,
  },
  {
    title: 'Short Stays & Serviced Living',
    desc: 'Fully furnished luxury suites for business & leisure stays',
    href: '/services/short-stay',
    icon: Hotel,
    badge: 'LUXURY',
  },
  {
    title: 'Commercial Properties',
    desc: 'Corporate offices, commercial floors & retail showrooms',
    href: '/properties?category=Commercial',
    icon: Building2,
  },
  {
    title: 'Rural Estates & Land',
    desc: 'Developmental land, farm plots & riverfront acreage',
    href: '/properties?category=Rural',
    icon: MapPin,
  },
];

const SERVICE_GROUPS = [
  {
    title: 'Care & Maintenance',
    items: [
      {
        name: 'Water Tank Cleaning',
        desc: 'Mechanized 6-stage jet & hospital-grade sanitisation',
        slug: 'water-tank',
        icon: Droplets,
      },
      {
        name: 'Air Conditioning Care',
        desc: 'Master chemical coil washing, gas refill & PCB repairs',
        slug: 'air-conditioning',
        icon: Wind,
      },
      {
        name: 'Property Care & Concierge',
        desc: 'Keyholding, bi-weekly audits & caretaker oversight',
        slug: 'property-care-concierge',
        icon: ShieldCheck,
      },
    ],
  },
  {
    title: 'Design & Relocation',
    items: [
      {
        name: 'Interior Design & Fit-Out',
        desc: 'Turnkey 3D concept, modular kitchens & full renovation',
        slug: 'interior-design',
        icon: Palette,
        badge: 'POPULAR',
      },
      {
        name: 'Removal & Relocation',
        desc: 'White-glove moving with 5-layer protective wrapping',
        slug: 'removal-relocation',
        icon: Truck,
      },
      {
        name: 'Short Stay Serviced Flats',
        desc: 'Furnished luxury suites for airport transit & holidays',
        slug: 'short-stay',
        icon: Hotel,
      },
    ],
  },
  {
    title: 'Legal & Land Advisory',
    items: [
      {
        name: 'Title Search & Deed Vetting',
        desc: 'Sub-Registry BIA search & AC Land mutation vetting',
        slug: 'property-documentation-verification',
        icon: FileText,
      },
      {
        name: 'Land Survey & Valuation',
        desc: 'Digital total station survey & boundary demarcation',
        slug: 'land-property-assessment',
        icon: MapPin,
      },
      {
        name: 'Property Will & Succession',
        desc: 'Warishan certificates, gift deeds & probate assistance',
        slug: 'property-will-succession',
        icon: Scroll,
      },
    ],
  },
  {
    title: 'Tenancy & Management',
    items: [
      {
        name: 'Residential Management',
        desc: 'Tenant screening, automated rent ledgers & maintenance',
        slug: 'property-management',
        icon: Key,
      },
      {
        name: 'Property Loan Advisory',
        desc: 'Home loan pre-approvals with major commercial banks',
        slug: 'loan-financial-support',
        icon: Landmark,
      },
      {
        name: 'Residential Sales Brokerage',
        desc: 'High-net-worth buyer qualification & escrow closing',
        slug: 'residential-sales',
        icon: Building2,
      },
    ],
  },
];

const NRB_SUBMENU = [
  {
    title: 'Expatriate Property Monitoring',
    desc: 'Physical bi-weekly inspections protecting vacant ancestral assets',
    href: '/nrb',
    icon: ShieldCheck,
  },
  {
    title: '4K Video Walkthrough Audits',
    desc: 'Ultra-HD time-stamped video reports sent directly to WhatsApp',
    href: '/nrb',
    icon: Sparkles,
  },
  {
    title: 'Remote Authority & Society Liaison',
    desc: 'Handling developer handovers, municipal tax & society dues',
    href: '/nrb',
    icon: Building2,
  },
  {
    title: 'Overseas Financial Accounting',
    desc: 'Foreign currency rent accounting & cross-border disbursements',
    href: '/nrb',
    icon: Landmark,
  },
];

export default function Navbar({ onOpenAppraisal }) {
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('services'); // 'services' | 'properties' | 'nrb' | null
  const [mobileExpanded, setMobileExpanded] = useState('services'); // mobile accordion
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

  const handleClose = () => {
    setDrawerOpen(false);
  };

  return (
    <>
      {/* ── Top Header: Sleek, Minimalist (Logo + CTA + Hamburger Icon) ── */}
      <header 
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          scrolled 
            ? 'bg-white/95 backdrop-blur-md shadow-[0_4px_20px_-4px_rgba(1,42,78,0.06)] border-b border-slate-100 py-3.5' 
            : 'bg-white/80 backdrop-blur-sm border-b border-slate-100/60 py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          
          {/* Brand Logo */}
          <Link to="/" onClick={handleClose} className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#012a4e] via-[#012a4e] to-[#00AEEF] flex items-center justify-center text-white font-black text-xl shadow-sm group-hover:scale-105 transition-transform duration-200">
              7
            </div>
            <div className="flex flex-col">
              <span className="text-[19px] font-extrabold tracking-tight text-[#012a4e] leading-none">
                SEVENTH SKY
              </span>
              <span className="text-[10px] tracking-[0.2em] font-bold text-[#00AEEF] uppercase mt-0.5">
                Property Management
              </span>
            </div>
          </Link>

          {/* Top Right Actions (1:1 with original structure: Pill CTA + Hamburger Icon) */}
          <div className="flex items-center gap-3 sm:gap-4">
            
            {/* Primary Action Button */}
            <button 
              onClick={() => { handleClose(); onOpenAppraisal && onOpenAppraisal(); }}
              className="px-5 sm:px-6 py-2.5 rounded-full text-[13px] sm:text-[13.5px] font-bold text-white bg-[#00AEEF] hover:bg-[#0096ce] shadow-[0_4px_14px_rgba(0,174,239,0.35)] hover:shadow-[0_6px_20px_rgba(0,174,239,0.45)] transition-all transform active:scale-98 cursor-pointer shrink-0"
            >
              book an appraisal
            </button>

            {/* Minimalist Hamburger Icon Button */}
            <button 
              onClick={() => setDrawerOpen(true)}
              aria-label="Toggle navigation menu"
              className="p-2 sm:p-2.5 rounded-full text-[#012a4e] hover:bg-slate-100 hover:text-[#00AEEF] transition-all cursor-pointer flex items-center justify-center border border-slate-200/80 shadow-2xs group"
            >
              <Menu className="w-6 h-6 stroke-[2.2] group-hover:scale-105 transition-transform" />
            </button>
          </div>

        </div>
      </header>

      {/* ── Luxury Navigation Drawer Overlay (Opened by Hamburger Icon) ── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex justify-end animate-fade-in">
          <div className="relative w-full max-w-md lg:max-w-4xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden">
            
            {/* Drawer Header */}
            <div className="p-6 sm:p-8 pb-5 border-b border-slate-100 flex items-center justify-between">
              <Link to="/" onClick={handleClose} className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#012a4e] text-white font-bold flex items-center justify-center text-sm">
                  7
                </div>
                <div className="flex flex-col">
                  <span className="font-extrabold text-base tracking-tight text-[#012a4e] leading-none">
                    SEVENTH SKY
                  </span>
                  <span className="text-[9px] font-bold tracking-wider text-[#00AEEF] uppercase mt-0.5">
                    Property Management
                  </span>
                </div>
              </Link>

              <button 
                onClick={handleClose}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-[#012a4e] transition-colors cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* ── Drawer Body: Desktop 2-Pane (Hover on Navmenu reveals Submenus) ── */}
            <div className="flex-1 overflow-y-auto">
              
              {/* Desktop View (Split: Menu on left, Hovered Submenus on right) */}
              <div className="hidden lg:grid grid-cols-12 h-full min-h-[520px] divide-x divide-slate-100">
                
                {/* Left Column: Main Navigation Links */}
                <div className="col-span-5 p-6 sm:p-8 space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3 px-3">
                    Main Navigation
                  </div>

                  {/* Home */}
                  <Link
                    to="/"
                    onClick={handleClose}
                    className={`flex items-center justify-between p-3.5 rounded-2xl text-sm font-bold transition-all ${
                      location.pathname === '/' ? 'bg-[#e8f7fd] text-[#00AEEF]' : 'text-[#012a4e] hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Home className="w-4 h-4 text-slate-400" />
                      Home
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </Link>

                  {/* Properties (Hover shows Properties Submenu) */}
                  <div
                    onMouseEnter={() => setActiveSection('properties')}
                    className={`flex items-center justify-between p-3.5 rounded-2xl text-sm font-bold transition-all cursor-pointer ${
                      activeSection === 'properties' 
                        ? 'bg-[#e8f7fd] text-[#00AEEF] shadow-2xs' 
                        : 'text-[#012a4e] hover:bg-slate-50'
                    }`}
                  >
                    <Link to="/properties" onClick={handleClose} className="flex items-center gap-3 flex-1">
                      <Building2 className={`w-4 h-4 ${activeSection === 'properties' ? 'text-[#00AEEF]' : 'text-slate-400'}`} />
                      Properties
                    </Link>
                    <ChevronRight className={`w-4 h-4 transition-transform ${activeSection === 'properties' ? 'translate-x-1 text-[#00AEEF]' : 'text-slate-400'}`} />
                  </div>

                  {/* Property Care Services (Hover shows 12 Dedicated Pages Submenu) */}
                  <div
                    onMouseEnter={() => setActiveSection('services')}
                    className={`flex items-center justify-between p-3.5 rounded-2xl text-sm font-bold transition-all cursor-pointer ${
                      activeSection === 'services' 
                        ? 'bg-[#e8f7fd] text-[#00AEEF] shadow-2xs' 
                        : 'text-[#012a4e] hover:bg-slate-50'
                    }`}
                  >
                    <Link to="/services" onClick={handleClose} className="flex items-center gap-3 flex-1">
                      <Sparkles className={`w-4 h-4 ${activeSection === 'services' ? 'text-[#00AEEF]' : 'text-[#00AEEF]'}`} />
                      <span>Property Care Services</span>
                    </Link>
                    <ChevronRight className={`w-4 h-4 transition-transform ${activeSection === 'services' ? 'translate-x-1 text-[#00AEEF]' : 'text-slate-400'}`} />
                  </div>

                  {/* NRB Dedicated Services (Hover shows NRB Submenu) */}
                  <div
                    onMouseEnter={() => setActiveSection('nrb')}
                    className={`flex items-center justify-between p-3.5 rounded-2xl text-sm font-bold transition-all cursor-pointer ${
                      activeSection === 'nrb' 
                        ? 'bg-[#e8f7fd] text-[#00AEEF] shadow-2xs' 
                        : 'text-[#012a4e] hover:bg-slate-50'
                    }`}
                  >
                    <Link to="/nrb" onClick={handleClose} className="flex items-center gap-3 flex-1">
                      <Globe className={`w-4 h-4 ${activeSection === 'nrb' ? 'text-[#00AEEF]' : 'text-slate-400'}`} />
                      NRB Dedicated Services
                    </Link>
                    <ChevronRight className={`w-4 h-4 transition-transform ${activeSection === 'nrb' ? 'translate-x-1 text-[#00AEEF]' : 'text-slate-400'}`} />
                  </div>

                  {/* About Us */}
                  <Link
                    to="/about"
                    onClick={handleClose}
                    className={`flex items-center justify-between p-3.5 rounded-2xl text-sm font-bold transition-all ${
                      location.pathname === '/about' ? 'bg-[#e8f7fd] text-[#00AEEF]' : 'text-[#012a4e] hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <ShieldCheck className="w-4 h-4 text-slate-400" />
                      About Us
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </Link>

                  {/* Careers */}
                  <Link
                    to="/careers"
                    onClick={handleClose}
                    className={`flex items-center justify-between p-3.5 rounded-2xl text-sm font-bold transition-all ${
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
                    onClick={handleClose}
                    className={`flex items-center justify-between p-3.5 rounded-2xl text-sm font-bold transition-all ${
                      location.pathname === '/contact' ? 'bg-[#e8f7fd] text-[#00AEEF]' : 'text-[#012a4e] hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <PhoneCall className="w-4 h-4 text-slate-400" />
                      Contact Us
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </Link>

                </div>

                {/* Right Column: Submenus linked to dedicated pages */}
                <div className="col-span-7 p-6 sm:p-8 bg-slate-50/50 overflow-y-auto">
                  
                  {/* When Hovered on 'services': Displays all 12 Dedicated Pages */}
                  {activeSection === 'services' && (
                    <div className="space-y-5 animate-fade-in">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#00AEEF]">
                            Property Care Directory
                          </span>
                          <h4 className="text-base font-bold text-[#012a4e]">
                            Property Care Solutions
                          </h4>
                        </div>
                        <Link
                          to="/services"
                          onClick={handleClose}
                          className="text-xs font-bold text-[#00AEEF] hover:text-[#0096ce] flex items-center gap-1"
                        >
                          View All Services <ArrowRight size={13} />
                        </Link>
                      </div>

                      <div className="space-y-4">
                        {SERVICE_GROUPS.map((grp, gIdx) => (
                          <div key={gIdx} className="space-y-2">
                            <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 block">
                              {grp.title}
                            </span>
                            <div className="grid grid-cols-1 gap-2">
                              {grp.items.map((svc) => (
                                <Link
                                  key={svc.slug}
                                  to={`/services/${svc.slug}`}
                                  onClick={handleClose}
                                  className="group flex items-start gap-3 rounded-2xl p-2.5 bg-white border border-slate-200/70 hover:border-[#00AEEF] hover:shadow-2xs transition-all"
                                >
                                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[#012a4e] group-hover:bg-[#00AEEF] group-hover:text-white transition-colors">
                                    <svc.icon size={15} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="text-xs font-bold text-[#012a4e] group-hover:text-[#00AEEF] transition-colors truncate">
                                        {svc.name}
                                      </span>
                                      {svc.badge && (
                                        <span className="shrink-0 rounded bg-[#00AEEF]/15 px-1.5 py-0.5 text-[9px] font-black text-[#00AEEF]">
                                          {svc.badge}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-slate-500 leading-tight mt-0.5 line-clamp-1">
                                      {svc.desc}
                                    </p>
                                  </div>
                                </Link>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* When Hovered on 'properties': Displays Properties Submenus */}
                  {activeSection === 'properties' && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#00AEEF]">
                            Real Estate Channels
                          </span>
                          <h4 className="text-base font-bold text-[#012a4e]">
                            Properties Portfolio
                          </h4>
                        </div>
                        <Link
                          to="/properties"
                          onClick={handleClose}
                          className="text-xs font-bold text-[#00AEEF] hover:text-[#0096ce] flex items-center gap-1"
                        >
                          Explore All <ArrowRight size={13} />
                        </Link>
                      </div>

                      <div className="space-y-2.5">
                        {PROPERTY_SUBMENU.map((item, idx) => (
                          <Link
                            key={idx}
                            to={item.href}
                            onClick={handleClose}
                            className="group flex items-start gap-3 rounded-2xl p-3 bg-white border border-slate-200/70 hover:border-[#00AEEF] hover:shadow-2xs transition-all"
                          >
                            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[#012a4e] group-hover:bg-[#00AEEF] group-hover:text-white transition-colors">
                              <item.icon size={17} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-[#012a4e] group-hover:text-[#00AEEF] transition-colors">
                                  {item.title}
                                </span>
                                {item.badge && (
                                  <span className="rounded bg-[#00AEEF]/15 px-1.5 py-0.5 text-[9px] font-black text-[#00AEEF]">
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                                {item.desc}
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* When Hovered on 'nrb': Displays NRB Submenus */}
                  {activeSection === 'nrb' && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#00AEEF]">
                            Expatriate Asset Care
                          </span>
                          <h4 className="text-base font-bold text-[#012a4e]">
                            NRB Dedicated Solutions
                          </h4>
                        </div>
                        <Link
                          to="/nrb"
                          onClick={handleClose}
                          className="text-xs font-bold text-[#00AEEF] hover:text-[#0096ce] flex items-center gap-1"
                        >
                          NRB Hub <ArrowRight size={13} />
                        </Link>
                      </div>

                      <div className="space-y-2.5">
                        {NRB_SUBMENU.map((item, idx) => (
                          <Link
                            key={idx}
                            to={item.href}
                            onClick={handleClose}
                            className="group flex items-start gap-3 rounded-2xl p-3 bg-white border border-slate-200/70 hover:border-[#00AEEF] hover:shadow-2xs transition-all"
                          >
                            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[#012a4e] group-hover:bg-[#00AEEF] group-hover:text-white transition-colors">
                              <item.icon size={17} />
                            </div>
                            <div>
                              <span className="text-xs font-bold text-[#012a4e] group-hover:text-[#00AEEF] transition-colors block">
                                {item.title}
                              </span>
                              <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                                {item.desc}
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                </div>

              </div>

              {/* Mobile View (Accordions expanding directly to dedicated pages) */}
              <div className="lg:hidden p-6 space-y-2">
                
                {/* Home */}
                <Link
                  to="/"
                  onClick={handleClose}
                  className={`flex items-center justify-between p-3.5 rounded-2xl text-sm font-bold transition-all ${
                    location.pathname === '/' ? 'bg-[#e8f7fd] text-[#00AEEF]' : 'text-[#012a4e] hover:bg-slate-50'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Home className="w-4 h-4 text-slate-400" />
                    Home
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </Link>

                {/* Properties Accordion */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Link
                      to="/properties"
                      onClick={handleClose}
                      className={`flex-1 flex items-center gap-3 p-3.5 rounded-2xl text-sm font-bold transition-all ${
                        location.pathname.startsWith('/properties') ? 'bg-[#e8f7fd] text-[#00AEEF]' : 'text-[#012a4e] hover:bg-slate-50'
                      }`}
                    >
                      <Building2 className="w-4 h-4 text-slate-400" />
                      Properties
                    </Link>
                    <button
                      onClick={() => setMobileExpanded(mobileExpanded === 'properties' ? null : 'properties')}
                      className="p-3 text-slate-400 hover:text-[#012a4e]"
                    >
                      <ChevronRight className={`w-4 h-4 transition-transform ${mobileExpanded === 'properties' ? 'rotate-90' : ''}`} />
                    </button>
                  </div>

                  {mobileExpanded === 'properties' && (
                    <div className="pl-10 pr-4 py-2 space-y-2 text-xs font-medium text-slate-600 animate-fade-in">
                      {PROPERTY_SUBMENU.map((item, idx) => (
                        <Link
                          key={idx}
                          to={item.href}
                          onClick={handleClose}
                          className="block py-1 hover:text-[#00AEEF]"
                        >
                          {item.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* Property Care Services Accordion (Direct Dedicated Links) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Link
                      to="/services"
                      onClick={handleClose}
                      className={`flex-1 flex items-center gap-3 p-3.5 rounded-2xl text-sm font-bold transition-all ${
                        location.pathname.startsWith('/services') ? 'bg-[#e8f7fd] text-[#00AEEF]' : 'text-[#012a4e] hover:bg-slate-50'
                      }`}
                    >
                      <Sparkles className="w-4 h-4 text-[#00AEEF]" />
                      Property Care Services
                    </Link>
                    <button
                      onClick={() => setMobileExpanded(mobileExpanded === 'services' ? null : 'services')}
                      className="p-3 text-slate-400 hover:text-[#012a4e]"
                    >
                      <ChevronRight className={`w-4 h-4 transition-transform ${mobileExpanded === 'services' ? 'rotate-90' : ''}`} />
                    </button>
                  </div>

                  {mobileExpanded === 'services' && (
                    <div className="pl-6 pr-2 py-2 space-y-3 text-xs font-medium text-slate-600 animate-fade-in">
                      <Link
                        to="/services"
                        onClick={handleClose}
                        className="block font-bold text-[#00AEEF] pb-1 border-b border-slate-100"
                      >
                        View All Services →
                      </Link>

                      {SERVICE_GROUPS.map((grp, gIdx) => (
                        <div key={gIdx} className="space-y-1 pt-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            {grp.title}
                          </span>
                          {grp.items.map((svc) => (
                            <Link
                              key={svc.slug}
                              to={`/services/${svc.slug}`}
                              onClick={handleClose}
                              className="flex items-center justify-between py-1 text-slate-700 hover:text-[#00AEEF]"
                            >
                              <span>{svc.name}</span>
                              <ChevronRight size={12} className="text-slate-300" />
                            </Link>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* NRB Dedicated Services */}
                <Link
                  to="/nrb"
                  onClick={handleClose}
                  className={`flex items-center justify-between p-3.5 rounded-2xl text-sm font-bold transition-all ${
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
                  onClick={handleClose}
                  className={`flex items-center justify-between p-3.5 rounded-2xl text-sm font-bold transition-all ${
                    location.pathname === '/about' ? 'bg-[#e8f7fd] text-[#00AEEF]' : 'text-[#012a4e] hover:bg-slate-50'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <ShieldCheck className="w-4 h-4 text-slate-400" />
                    About Us
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </Link>

                {/* Careers */}
                <Link
                  to="/careers"
                  onClick={handleClose}
                  className={`flex items-center justify-between p-3.5 rounded-2xl text-sm font-bold transition-all ${
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
                  onClick={handleClose}
                  className={`flex items-center justify-between p-3.5 rounded-2xl text-sm font-bold transition-all ${
                    location.pathname === '/contact' ? 'bg-[#e8f7fd] text-[#00AEEF]' : 'text-[#012a4e] hover:bg-slate-50'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <PhoneCall className="w-4 h-4 text-slate-400" />
                    Contact Us
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </Link>

              </div>

            </div>

            {/* Drawer Bottom CTA */}
            <div className="p-6 sm:p-8 pt-4 border-t border-slate-100 space-y-3 bg-white">
              <button
                onClick={() => { handleClose(); onOpenAppraisal && onOpenAppraisal(); }}
                className="w-full py-3.5 rounded-full text-xs font-bold text-white bg-[#00AEEF] hover:bg-[#0096ce] transition-all shadow-md shadow-[#00AEEF]/20 cursor-pointer"
              >
                Book a Free Property Appraisal
              </button>
              <div className="text-center">
                <span className="text-[11px] text-slate-400">
                  Concierge Hotline: +880 1913-373581
                </span>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
