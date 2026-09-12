import React from 'react';
import { Star, Quote } from 'lucide-react';
import { MOCK_TESTIMONIALS } from '../data/mockData';

export default function Testimonials() {
  return (
    <section className="py-24 bg-slate-50/60 border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#00AEEF] mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00AEEF]"></span>
            Client Testimonials
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-[#012a4e] tracking-tight">
            Trusted by Owners Globally
          </h2>
          <p className="text-slate-500 text-sm sm:text-base mt-2">
            Read verified experiences from expatriate landlords, institutional investors, and local homeowners.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {MOCK_TESTIMONIALS.map(t => (
            <div 
              key={t.id}
              className="p-8 rounded-3xl bg-white border border-slate-100 shadow-[0_6px_30px_-8px_rgba(1,42,78,0.06)] flex flex-col justify-between space-y-6 relative"
            >
              <div className="space-y-4">
                {/* Rating stars & Tag */}
                <div className="flex items-center justify-between">
                  <div className="flex text-amber-400 gap-0.5">
                    {[...Array(t.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 stroke-none" />
                    ))}
                  </div>
                  <span className="text-[11px] font-bold text-[#00AEEF] bg-[#e8f7fd] px-2.5 py-0.5 rounded-full">
                    {t.tag}
                  </span>
                </div>

                {/* Quote */}
                <p className="text-sm text-slate-600 leading-relaxed italic">
                  "{t.quote}"
                </p>
              </div>

              {/* Author */}
              <div className="flex items-center gap-3.5 pt-4 border-t border-slate-100">
                <img 
                  src={t.avatar} 
                  alt={t.clientName}
                  className="w-11 h-11 rounded-full object-cover border border-slate-100"
                />
                <div>
                  <h4 className="text-sm font-bold text-[#012a4e]">
                    {t.clientName}
                  </h4>
                  <p className="text-xs text-slate-400">
                    {t.clientRole} • {t.property}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
