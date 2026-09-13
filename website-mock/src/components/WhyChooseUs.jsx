import React from 'react';
import { ShieldCheck, Clock, Award, Users } from 'lucide-react';
import { COMPANY_INFO } from '../data/mockData';

export default function WhyChooseUs() {
  const highlights = [
    {
      icon: ShieldCheck,
      title: "Guaranteed On-Time Rent",
      tag: "Direct Bank Deposit",
      desc: "We collect rent on the 1st of every month and deposit it straight to your account. No chasing tenants."
    },
    {
      icon: Users,
      title: "Police-Verified Tenants",
      tag: "100% Background Check",
      desc: "We verify NID cards, police verification forms, and job IDs so your property stays completely secure."
    },
    {
      icon: Award,
      title: "Total Care for NRB Expats",
      tag: "Living Overseas",
      desc: "Living abroad? We pay your bills, manage tenants, and send monthly HD video inspection reports on WhatsApp."
    },
    {
      icon: Clock,
      title: "Rapid Emergency Repairs",
      tag: "Certified Technicians",
      desc: "Leaking pipe, power fault, or AC failure? Our certified in-house technicians arrive fast to fix the problem."
    }
  ];

  return (
    <section id="about" className="py-20 sm:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Metric Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 pb-16 border-b border-slate-100">
          {COMPANY_INFO.stats.map((stat, idx) => (
            <div key={idx} className="text-center sm:text-left space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold text-[#012a4e] tracking-tight">
                {stat.value}
              </div>
              <div className="text-sm font-bold text-[#00AEEF]">
                {stat.label}
              </div>
              <div className="text-xs text-slate-400">
                {stat.sub}
              </div>
            </div>
          ))}
        </div>

        {/* Value Proposition Header */}
        <div className="mt-16 text-center max-w-2xl mx-auto space-y-2.5">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#00AEEF]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00AEEF]"></span>
            Why Choose Seventh Sky
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-[#012a4e] tracking-tight">
            Why Property Owners Trust Us
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm max-w-lg mx-auto">
            Guaranteed on-time rent, police-verified tenants, and complete remote care for local and overseas owners.
          </p>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 mt-12">
          {highlights.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div 
                key={idx}
                className="p-6 rounded-3xl bg-[#fbfdff] border border-slate-100 hover:border-[#00AEEF]/40 shadow-[0_4px_20px_-5px_rgba(1,42,78,0.05)] hover:shadow-[0_12px_30px_-5px_rgba(1,42,78,0.1)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-11 h-11 rounded-xl bg-[#e8f7fd] flex items-center justify-center text-[#00AEEF]">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold text-[#00AEEF] bg-[#e8f7fd] px-2.5 py-0.5 rounded-full">
                      {item.tag}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-[#012a4e]">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
