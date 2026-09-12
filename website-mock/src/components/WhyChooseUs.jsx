import React from 'react';
import { ShieldCheck, Clock, Award, Users } from 'lucide-react';
import { COMPANY_INFO } from '../data/mockData';

export default function WhyChooseUs() {
  const highlights = [
    {
      icon: ShieldCheck,
      title: "Legally Protected SOPs",
      desc: "Every tenancy and caretaker engagement operates under vetted legal frameworks, police registrations, and digital escrow accounts."
    },
    {
      icon: Clock,
      title: "Rapid Emergency Response",
      desc: "Our on-demand technical team resolves electrical, plumbing, and structural issues with real-time photographic progress logs."
    },
    {
      icon: Award,
      title: "Institutional Quality Standards",
      desc: "We bring professional Australian and European facility management protocols to residential and commercial real estate."
    },
    {
      icon: Users,
      title: "Dedicated Account Officers",
      desc: "Direct single-point contact for landlords and tenants with monthly video reporting and automated financial reconciliations."
    }
  ];

  return (
    <section id="about" className="py-24 bg-white">
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
        <div className="mt-16 text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#00AEEF]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00AEEF]"></span>
            Why Choose Us
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-[#012a4e] tracking-tight">
            Designed for Peace of Mind
          </h2>
          <p className="text-slate-500 text-sm sm:text-base">
            Eliminating property headaches through rigorous workflows, transparent reporting, and dependable caretaker coordination.
          </p>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-12">
          {highlights.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div 
                key={idx}
                className="p-6 rounded-2xl bg-[#fbfdff] border border-slate-100 shadow-[0_4px_20px_-5px_rgba(1,42,78,0.05)] hover:shadow-[0_12px_30px_-5px_rgba(1,42,78,0.1)] hover:-translate-y-1 transition-all duration-300 space-y-3"
              >
                <div className="w-12 h-12 rounded-xl bg-[#e8f7fd] flex items-center justify-center text-[#00AEEF]">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-[#012a4e]">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
