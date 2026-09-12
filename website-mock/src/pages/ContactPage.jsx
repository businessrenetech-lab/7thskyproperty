import React, { useState } from 'react';
import { Phone, Mail, MapPin, Clock, MessageSquare, ShieldCheck, MessageCircle } from 'lucide-react';
import { COMPANY_INFO } from '../data/mockData';
import { mockApi } from '../services/mockApi';
import { websiteApi } from '../services/api';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: 'General Property Care', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ticketRef, setTicketRef] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await websiteApi.submitContactMessage({
        name: form.name,
        email: form.email,
        phone: form.phone,
        subject: form.subject,
        message: form.message,
      });
      const ticket = res?.ticket_number || res?.data?.ticket_number || res?.ticket || 'SSPC-MSG-RECEIVED';
      setTicketRef(ticket);
      setSubmitted(true);
      setForm({ name: '', email: '', phone: '', subject: 'General Property Care', message: '' });
    } catch (err) {
      console.warn('Backend contact failed, using mock fallback:', err.message);
      const res = await mockApi.submitContact(form);
      setTicketRef(res?.ticketNumber || 'SSPC-TKT-001');
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pt-28 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
      
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#00AEEF]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00AEEF]"></span>
          Direct Inquiries & Hubs
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-[#012a4e] tracking-tight">
          Contact Seventh Sky
        </h1>
        <p className="text-sm sm:text-base text-slate-500">
          Our property advisors, legal vetting specialists, and caretaker dispatchers are available 7 days a week.
        </p>
      </div>

      {/* Main Grid: Info + Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        
        {/* Left 5 Cols: Office Hubs & Hotline */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* Dhaka Hub */}
          <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-3">
            <div className="text-xs font-bold uppercase tracking-widest text-[#00AEEF]">Dhaka Headquarters</div>
            <h3 className="text-lg font-bold text-[#012a4e]">Sky View Landmark Hub</h3>
            <p className="text-xs text-slate-500 flex items-start gap-2">
              <MapPin className="w-4 h-4 text-[#00AEEF] shrink-0 mt-0.5" />
              <span>{COMPANY_INFO.address}</span>
            </p>
            <div className="text-xs text-slate-600 pt-2 space-y-1">
              <div>Phone: <strong>{COMPANY_INFO.phone}</strong></div>
              <div>Email: <strong>{COMPANY_INFO.email}</strong></div>
            </div>
          </div>

          {/* Sylhet Hub */}
          <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-3">
            <div className="text-xs font-bold uppercase tracking-widest text-[#00AEEF]">Sylhet Regional Office</div>
            <h3 className="text-lg font-bold text-[#012a4e]">Al-Hamra Regional Care Hub</h3>
            <p className="text-xs text-slate-500 flex items-start gap-2">
              <MapPin className="w-4 h-4 text-[#00AEEF] shrink-0 mt-0.5" />
              <span>{COMPANY_INFO.sylhetBranch}</span>
            </p>
            <div className="text-xs text-slate-600 pt-2 space-y-1">
              <div>Hotline: <strong>+880 1800 777 999</strong></div>
              <div>NRB Desk: <strong>nrb@seventhskyproperty.com</strong></div>
            </div>
          </div>

          {/* WhatsApp Direct Concierge */}
          <div className="p-6 rounded-3xl bg-[#012a4e] text-white space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#12b6f3] uppercase tracking-wider">
              <MessageCircle className="w-4 h-4 text-[#10b981]" />
              WhatsApp VIP Concierge
            </div>
            <h4 className="text-base font-bold">Instant Chat with a Senior Advisor</h4>
            <p className="text-xs text-slate-300">
              Ideal for overseas owners seeking quick status updates or photo walkthroughs.
            </p>
            <a
              href="https://wa.me/8801711000777"
              target="_blank"
              rel="noreferrer"
              className="inline-block px-5 py-2 rounded-full text-xs font-bold text-[#012a4e] bg-[#12b6f3] hover:bg-[#0ea5e9] transition-colors"
            >
              Open WhatsApp Chat →
            </a>
          </div>

        </div>

        {/* Right 7 Cols: Contact Form */}
        <div className="lg:col-span-7 bg-white p-8 sm:p-10 rounded-3xl border border-slate-100 shadow-sm">
          {submitted ? (
            <div className="text-center py-12 space-y-4 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-[#e8f7fd] text-[#00AEEF] flex items-center justify-center mx-auto">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-[#012a4e]">Inquiry Received</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Thank you for reaching out. Ticket Reference: <strong className="text-[#00AEEF] font-mono">{ticketRef}</strong>. A designated asset manager from Seventh Sky will review your request and reply shortly.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="mt-4 px-6 py-2.5 rounded-full text-xs font-bold text-white bg-[#00AEEF] hover:bg-[#0096ce] cursor-pointer"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="mb-4">
                <h3 className="text-xl font-black text-[#012a4e]">Send a Direct Message</h3>
                <p className="text-xs text-slate-500 mt-0.5">Fill out your requirements and we will connect you to the right department.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Your Name</label>
                  <input 
                    type="text"
                    required
                    placeholder="Full name"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:border-[#00AEEF]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Phone / WhatsApp</label>
                  <input 
                    type="tel"
                    required
                    placeholder="+880 17..."
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:border-[#00AEEF]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Email Address</label>
                <input 
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:border-[#00AEEF]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Division of Interest</label>
                <select
                  value={form.subject}
                  onChange={e => setForm({ ...form, subject: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-hidden"
                >
                  <option>Property Care & Concierge</option>
                  <option>NRB Dedicated Overseas Services</option>
                  <option>Leasing & Tenancy Management</option>
                  <option>Property Documentation & Deed Vetting</option>
                  <option>Residential Property Sale / Acquisition</option>
                  <option>Commercial Leasing & Office Fit-Out</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Inquiry / Property Context</label>
                <textarea 
                  rows="4"
                  required
                  placeholder="Please describe your property, location, and specific goals..."
                  value={form.message}
                  onChange={e => setForm({ ...form, message: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:border-[#00AEEF]"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-full text-xs font-bold text-white bg-[#00AEEF] hover:bg-[#0096ce] shadow-[0_4px_14px_rgba(0,174,239,0.35)] transition-all cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Transmitting...' : 'Submit Inquiry'}
              </button>
            </form>
          )}
        </div>

      </div>

    </div>
  );
}
