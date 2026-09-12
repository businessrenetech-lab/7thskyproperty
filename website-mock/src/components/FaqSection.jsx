import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { MOCK_FAQS } from '../data/mockData';

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section className="py-24 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#00AEEF] mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00AEEF]"></span>
            Common Inquiries
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-[#012a4e] tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-slate-500 text-sm sm:text-base mt-2">
            Clear answers on service SLAs, NRB remote onboarding, tenant screening, and appraisal protocols.
          </p>
        </div>

        <div className="space-y-4">
          {MOCK_FAQS.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div 
                key={idx}
                className="rounded-2xl border border-slate-100 overflow-hidden transition-all duration-200"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? -1 : idx)}
                  className="w-full text-left p-5 sm:p-6 bg-slate-50/50 hover:bg-slate-50 flex items-center justify-between gap-4 transition-colors"
                >
                  <span className="text-base font-bold text-[#012a4e]">
                    {faq.question}
                  </span>
                  <div className={`p-1 rounded-full text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#00AEEF]' : ''}`}>
                    <ChevronDown className="w-5 h-5" />
                  </div>
                </button>

                {isOpen && (
                  <div className="p-5 sm:p-6 bg-white border-t border-slate-100 animate-fade-in">
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Support Box */}
        <div className="mt-12 p-6 rounded-2xl bg-[#e8f7fd]/60 border border-[#00AEEF]/20 text-center sm:flex sm:items-center sm:justify-between gap-4">
          <div className="text-left">
            <h4 className="text-sm font-bold text-[#012a4e]">Have a specific query about your asset?</h4>
            <p className="text-xs text-slate-600 mt-0.5">Our senior property management team is on standby 7 days a week.</p>
          </div>
          <a
            href="#contact"
            className="mt-4 sm:mt-0 inline-block px-5 py-2.5 rounded-full text-xs font-bold text-white bg-[#00AEEF] hover:bg-[#0096ce] transition-colors"
          >
            Speak with an Advisor
          </a>
        </div>

      </div>
    </section>
  );
}
