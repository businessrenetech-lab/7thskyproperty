import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  Facebook, 
  Linkedin, 
  Instagram, 
  Youtube,
  User,
  Briefcase,
  Lock,
  ArrowRight
} from 'lucide-react';
import { COMPANY_INFO } from '../data/mockData';
import { mockApi } from '../services/mockApi';
import { websiteApi } from '../services/api';

export default function Footer({ onOpenAppraisal, onOpenAuth }) {
  const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setContactSubmitting(true);
    try {
      let res;
      try {
        res = await websiteApi.submitContactMessage({
          name: contactForm.name,
          email: contactForm.email,
          phone: contactForm.phone,
          message: contactForm.message,
          subject: 'Website Footer Concierge Inquiry',
        });
      } catch (apiErr) {
        console.warn('Backend contact submission failed, falling back to mock:', apiErr.message);
        res = await mockApi.submitContact(contactForm);
      }

      if (res && (res.success || res.lead_code || res.message)) {
        setContactSuccess(true);
        setContactForm({ name: '', email: '', phone: '', message: '' });
      }
    } catch (err) {
      console.error('Footer contact submit failed:', err);
    } finally {
      setContactSubmitting(false);
    }
  };

  return (
    <footer className="bg-[#001a33] text-white pt-20 pb-12 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        
        {/* Direct Inquiries & Quick Form Strip */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 sm:p-12 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          <div className="lg:col-span-5 space-y-4">
            <span className="text-xs font-bold uppercase tracking-widest text-[#00AEEF]">
              Direct Inquiries
            </span>
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Connect with Our Property Care Concierge
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Whether listing a luxury penthouse, onboarding remote NRB care, or requesting emergency repair, our licensed specialists respond promptly.
            </p>

            <div className="space-y-2.5 pt-2 text-xs sm:text-sm text-slate-300">
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-[#00AEEF] shrink-0" />
                <span>{COMPANY_INFO.phone}</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-[#00AEEF] shrink-0" />
                <span>{COMPANY_INFO.email}</span>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-[#00AEEF] shrink-0 mt-0.5" />
                <span>{COMPANY_INFO.address}</span>
              </div>
            </div>
          </div>

          {/* Quick Inquiry Form */}
          <div className="lg:col-span-7 bg-white rounded-2xl p-6 sm:p-8 text-[#012a4e]">
            {contactSuccess ? (
              <div className="text-center py-8 space-y-3 animate-fade-in">
                <div className="w-12 h-12 rounded-full bg-[#e8f7fd] text-[#00AEEF] flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold">Message Transmitted</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Thank you. An asset officer will contact you within 2 business hours.
                </p>
                <button
                  onClick={() => setContactSuccess(false)}
                  className="text-xs font-bold text-[#00AEEF] hover:underline"
                >
                  Send another inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Full Name</label>
                    <input 
                      type="text"
                      required
                      placeholder="Your name"
                      value={contactForm.name}
                      onChange={e => setContactForm({ ...contactForm, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:border-[#00AEEF]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Phone Number</label>
                    <input 
                      type="tel"
                      required
                      placeholder="+880 17..."
                      value={contactForm.phone}
                      onChange={e => setContactForm({ ...contactForm, phone: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:border-[#00AEEF]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Email Address</label>
                  <input 
                    type="email"
                    required
                    placeholder="email@example.com"
                    value={contactForm.email}
                    onChange={e => setContactForm({ ...contactForm, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:border-[#00AEEF]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Inquiry / Property Details</label>
                  <textarea 
                    rows="2"
                    required
                    placeholder="Tell us about your property requirements..."
                    value={contactForm.message}
                    onChange={e => setContactForm({ ...contactForm, message: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:border-[#00AEEF]"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={contactSubmitting}
                  className="w-full py-3 rounded-full text-xs font-bold text-white bg-[#00AEEF] hover:bg-[#0096ce] transition-all cursor-pointer disabled:opacity-50"
                >
                  {contactSubmitting ? 'Transmitting Details...' : 'Send Inquiry to Seventh Sky'}
                </button>
              </form>
            )}
          </div>

        </div>

        {/* Directory Links Grid + Dedicated Portals Column */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 text-xs">
          
          {/* Brand Info */}
          <div className="space-y-3 col-span-2 sm:col-span-1">
            <div className="text-sm font-bold text-white">Seventh Sky Properties</div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Institutional-grade property care, leasing, management, and real estate advisory.
            </p>
            <div className="flex gap-2.5 pt-2 text-slate-400">
              <a href="#" className="hover:text-white transition-colors"><Facebook className="w-4 h-4" /></a>
              <a href="#" className="hover:text-white transition-colors"><Linkedin className="w-4 h-4" /></a>
              <a href="#" className="hover:text-white transition-colors"><Instagram className="w-4 h-4" /></a>
              <a href="#" className="hover:text-white transition-colors"><Youtube className="w-4 h-4" /></a>
            </div>
          </div>

          {/* Properties Pages */}
          <div className="space-y-2">
            <div className="text-sm font-bold text-white">Properties</div>
            <ul className="space-y-1.5 text-slate-400">
              <li><Link to="/properties" className="hover:text-white transition-colors">All Listings</Link></li>
              <li><Link to="/properties?purpose=Sale" className="hover:text-white transition-colors">Residential Sales</Link></li>
              <li><Link to="/properties?purpose=Rent" className="hover:text-white transition-colors">Residential Rentals</Link></li>
              <li><Link to="/properties?purpose=ShortStay" className="hover:text-white transition-colors">Guest House / Short Stay</Link></li>
              <li><Link to="/properties?category=Commercial" className="hover:text-white transition-colors">Commercial Leasing</Link></li>
              <li><Link to="/properties?category=Rural" className="hover:text-white transition-colors">Rural Estates</Link></li>
            </ul>
          </div>

          {/* Care Services Pages */}
          <div className="space-y-2">
            <div className="text-sm font-bold text-white">Property Care</div>
            <ul className="space-y-1.5 text-slate-400">
              <li><Link to="/services" className="hover:text-white transition-colors">Services Overview</Link></li>
              <li><Link to="/services?category=property-care-concierge" className="hover:text-white transition-colors">Care & Concierge</Link></li>
              <li><Link to="/nrb" className="hover:text-white transition-colors">NRB Dedicated Services</Link></li>
              <li><Link to="/services?category=leasing-tenancy-management" className="hover:text-white transition-colors">Tenancy Management</Link></li>
              <li><Link to="/services?category=property-documentation-support" className="hover:text-white transition-colors">Deed Verification & Legal</Link></li>
              <li><Link to="/services?category=removal-relocation" className="hover:text-white transition-colors">Removal & Moving</Link></li>
            </ul>
          </div>

          {/* Company Pages */}
          <div className="space-y-2">
            <div className="text-sm font-bold text-white">Company</div>
            <ul className="space-y-1.5 text-slate-400">
              <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link to="/about" className="hover:text-white transition-colors">Our Leadership</Link></li>
              <li><Link to="/careers" className="hover:text-white transition-colors">Careers</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Dhaka & Sylhet Hubs</Link></li>
            </ul>
          </div>

          {/* Portals & Logins (Exclusive to Footer, Admin strictly omitted) */}
          <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/10">
            <div className="text-xs font-bold uppercase tracking-wider text-[#00AEEF] flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              Secure Portals
            </div>
            <p className="text-[11px] text-slate-400">
              Authorized access for onboarded owners, tenants, and verified service providers.
            </p>
            <div className="space-y-2 pt-1">
              <button
                onClick={() => onOpenAuth && onOpenAuth('client')}
                className="w-full text-left px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white flex items-center justify-between transition-colors"
              >
                <span className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-[#00AEEF]" />
                  Client Login
                </span>
                <ArrowRight className="w-3 h-3 text-slate-400" />
              </button>
              <button
                onClick={() => onOpenAuth && onOpenAuth('provider')}
                className="w-full text-left px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white flex items-center justify-between transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Briefcase className="w-3.5 h-3.5 text-[#00AEEF]" />
                  Provider Login
                </span>
                <ArrowRight className="w-3 h-3 text-slate-400" />
              </button>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} Seventh Sky Property Management. All rights reserved.</p>
          <div className="flex gap-6">
            <Link to="/about" className="hover:text-slate-300">Privacy Policy</Link>
            <Link to="/about" className="hover:text-slate-300">Terms of Management</Link>
            <Link to="/about" className="hover:text-slate-300">SOP Compliance</Link>
          </div>
        </div>

      </div>
    </footer>
  );
}
