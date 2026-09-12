import React from 'react';
import { Globe, Video, FileSpreadsheet, ShieldCheck, CheckCircle2, MessageCircle, ArrowRight } from 'lucide-react';

export default function NrbPage({ onOpenAppraisal }) {
  const steps = [
    {
      step: "01",
      title: "Remote Property Audit & Biometric Lockbox",
      desc: "Our field team conducts an initial 50-point condition report, installs digital key vaults, and establishes verified perimeter security."
    },
    {
      step: "02",
      title: "Quarterly 4K Video Walkthroughs",
      desc: "Receive unedited 4K walk-through videos and roof drone scans time-stamped and stored in your private owner portal."
    },
    {
      step: "03",
      title: "Municipal, WASA & Tax Clearances",
      desc: "We coordinate with municipal authorities, AC Land offices, and utility providers so no arrears or penalties accumulate."
    },
    {
      step: "04",
      title: "Direct FX Rent Remittance",
      desc: "Rental yields collected from vetted tenants are credited directly to your local or offshore international accounts with itemized ledgers."
    }
  ];

  return (
    <div className="pt-28 pb-20 space-y-20">
      
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
        <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#00AEEF]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00AEEF]"></span>
          Non-Resident Bangladeshi Services
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-[#012a4e] tracking-tight max-w-3xl mx-auto">
          Your Trusted Eyes and Hands on the Ground in Bangladesh
        </h1>
        <p className="text-sm sm:text-base text-slate-500 max-w-2xl mx-auto leading-relaxed">
          Overseas Bangladeshi owners in the UK, USA, Australia, and the Middle East rely on Seventh Sky for complete transparency, squatter prevention, and legal asset protection.
        </p>
        <div className="pt-2 flex justify-center gap-3">
          <button
            onClick={() => onOpenAppraisal && onOpenAppraisal('NRB Onboarding')}
            className="px-6 py-3 rounded-full text-xs font-bold text-white bg-[#00AEEF] hover:bg-[#0096ce] shadow-md shadow-[#00AEEF]/20"
          >
            Onboard Your Property Remotely
          </button>
          <a
            href="https://wa.me/8801711000777"
            target="_blank"
            rel="noreferrer"
            className="px-6 py-3 rounded-full text-xs font-bold text-[#012a4e] bg-slate-100 hover:bg-slate-200 flex items-center gap-2"
          >
            <MessageCircle className="w-4 h-4 text-[#10b981]" />
            WhatsApp NRB Desk
          </a>
        </div>
      </section>

      {/* 4 Steps Roadmap */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#012a4e]">
            How Remote Custodianship Works
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Zero travel required. Everything is documented, digitized, and accessible 24/7.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s, idx) => (
            <div key={idx} className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-3 relative">
              <div className="text-2xl font-black text-[#00AEEF]/40 font-mono">
                {s.step}
              </div>
              <h3 className="text-base font-bold text-[#012a4e]">
                {s.title}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Video Inspection Feature Highlight */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#012a4e] rounded-3xl p-8 sm:p-12 text-white grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[#12b6f3] text-xs font-bold">
              <Video className="w-3.5 h-3.5" />
              Unedited 4K Video Reporting
            </div>
            <h2 className="text-2xl sm:text-4xl font-bold leading-tight">
              See Every Corner of Your Property as if You Were There
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              No static curated snapshots. Our officers walk every room, test taps, inspect electrical boards, scan rooftops with drones, and explain condition status directly on camera.
            </p>
            <div className="space-y-2 pt-2">
              {[
                "Time-stamped GPS verified entry logs",
                "Exterior boundary wall and gate latch checks",
                "Tenant occupancy verification with police documentation",
                "Direct cloud video access shareable with family members"
              ].map((pt, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-slate-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#00AEEF]" />
                  <span>{pt}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="relative aspect-16/10 rounded-2xl overflow-hidden shadow-2xl bg-black flex items-center justify-center">
              <img 
                src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1000&q=80" 
                alt="Property Walkthrough Preview"
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-[#00AEEF] flex items-center justify-center text-white shadow-xl">
                  <Video className="w-8 h-8" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
