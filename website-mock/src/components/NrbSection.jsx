import React from 'react';
import { Globe, Video, ShieldCheck, FileSpreadsheet, ArrowRight, CheckCircle2, MessageCircle } from 'lucide-react';

export default function NrbSection({ onOpenAppraisal }) {
  const pillars = [
    {
      title: "Periodic 4K Video Inspections",
      desc: "Unedited high-definition video walkthroughs and drone perimeter checks uploaded to your private owner vault.",
      icon: Video
    },
    {
      title: "Overseas Financial Ledgers",
      desc: "Transparent monthly statements showing rent collected, maintenance deductions, and direct FX wires to international accounts.",
      icon: FileSpreadsheet
    },
    {
      title: "Squatter & Boundary Protection",
      desc: "Scheduled on-site visits with biometric logs and boundary integrity reports protecting vacant lands and apartments.",
      icon: ShieldCheck
    },
    {
      title: "Developer & Utility Handovers",
      desc: "Our legal and engineering staff represent you in Dhaka and Sylhet to snag, inspect, and claim developer keys.",
      icon: Globe
    }
  ];

  return (
    <section id="nrb" className="py-24 bg-[#012a4e] text-white relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#00AEEF]/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#12b6f3]/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Heading & Trust */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-[#12b6f3] text-xs font-bold uppercase tracking-wider">
              <Globe className="w-3.5 h-3.5" />
              NRB Dedicated Services
            </div>

            <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-[1.15]">
              Overseas Property Care.<br />
              <span className="text-[#00AEEF]">Absolute Transparency.</span>
            </h2>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Managing properties in Dhaka or Sylhet from the UK, USA, Canada, or the Gulf shouldn’t require constant stress or frequent flights. Seventh Sky acts as your licensed on-ground custodian.
            </p>

            {/* Quick Benefits Bullet List */}
            <div className="space-y-3 pt-2">
              {[
                "Dedicated bilingual WhatsApp relationship manager",
                "Direct electronic bank transfers into Bangladeshi or offshore accounts",
                "Full municipal tax, holding tax & utility bill reconciliation",
                "Legal conveyance and mutation assistance by supreme court advocates"
              ].map((point, idx) => (
                <div key={idx} className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-[#00AEEF] shrink-0" />
                  <span>{point}</span>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="pt-4 flex flex-wrap items-center gap-4">
              <button
                onClick={() => onOpenAppraisal && onOpenAppraisal('NRB Care')}
                className="px-6 py-3.5 rounded-full text-xs sm:text-sm font-bold text-white bg-[#00AEEF] hover:bg-[#0096ce] shadow-[0_6px_20px_rgba(0,174,239,0.4)] transition-all"
              >
                Onboard Your Property Remotely
              </button>
              <a
                href="https://wa.me/8801711000777"
                target="_blank"
                rel="noreferrer"
                className="px-5 py-3.5 rounded-full text-xs sm:text-sm font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 flex items-center gap-2 transition-all"
              >
                <MessageCircle className="w-4 h-4 text-[#10b981]" />
                WhatsApp Concierge
              </a>
            </div>
          </div>

          {/* Right Column: 4 Strategic Pillars */}
          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {pillars.map((pillar, idx) => {
              const Icon = pillar.icon;
              return (
                <div 
                  key={idx}
                  className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-[#00AEEF]/50 hover:bg-white/10 transition-all duration-300 space-y-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#00AEEF]/20 flex items-center justify-center text-[#00AEEF]">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white">
                    {pillar.title}
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {pillar.desc}
                  </p>
                </div>
              );
            })}
          </div>

        </div>

      </div>
    </section>
  );
}
