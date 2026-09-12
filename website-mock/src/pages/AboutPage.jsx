import React from 'react';
import { ShieldCheck, Award, Users, CheckCircle2, ArrowRight } from 'lucide-react';
import { COMPANY_INFO, MOCK_TEAM } from '../data/mockData';
import WhyChooseUs from '../components/WhyChooseUs';

export default function AboutPage({ onOpenAppraisal }) {
  return (
    <div className="pt-28 pb-20 space-y-20">
      
      {/* Hero Header */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
        <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#00AEEF]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00AEEF]"></span>
          Company Profile
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-[#012a4e] tracking-tight max-w-3xl mx-auto">
          Elevating Property Management to an Institutional Standard
        </h1>
        <p className="text-sm sm:text-base text-slate-500 max-w-2xl mx-auto leading-relaxed">
          Founded to bridge the transparency gap for local homeowners and Non-Resident Bangladeshis worldwide through rigorous SOPs, verified legal vetting, and dedicated caretaker supervision.
        </p>
      </section>

      {/* Narrative & Photo Split */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-6 space-y-5">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#012a4e]">
              A Philosophy of Quiet Luxury & Absolute Accountability
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              In a fragmented real estate market dominated by informal brokers, Seventh Sky operates as a fully licensed asset custodian. Every lease, repair, and inspection follows ISO-aligned facility management procedures.
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
              We manage over <strong>৳850+ Crore</strong> in prime residential and commercial real estate across Gulshan, Banani, Baridhara, Dhanmondi, and Sylhet. Our team includes licensed property valuers, legal conveyancing advocates, and on-site facility engineers.
            </p>

            <div className="pt-2 space-y-2.5">
              {[
                "Vetted tenant background checks with police verification filing",
                "Periodic 4K video inspection reports for overseas owners",
                "Automated rent ledgers and direct FX wire disbursements",
                "24/7 on-demand maintenance and emergency response team"
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-[#00AEEF] shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl">
              <img 
                src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80" 
                alt="Modern Corporate Headquarters"
                className="w-full h-96 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#012a4e]/70 via-transparent to-transparent"></div>
              <div className="absolute bottom-6 left-6 right-6 text-white">
                <div className="text-xs uppercase tracking-widest text-[#12b6f3] font-bold">Dhaka & Sylhet Hubs</div>
                <h4 className="text-xl font-bold">Licensed Custodians for Bangladesh's Finest Real Estate</h4>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Metrics and Why Choose Us */}
      <WhyChooseUs />

      {/* Leadership Team */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#00AEEF]">
            Executive Leadership
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-[#012a4e] tracking-tight mt-1">
            The Advisors Behind Seventh Sky
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {MOCK_TEAM.map((member, idx) => (
            <div 
              key={idx}
              className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-4 text-center group hover:-translate-y-1 transition-all"
            >
              <img 
                src={member.image} 
                alt={member.name}
                className="w-24 h-24 rounded-full mx-auto object-cover border-2 border-slate-100 group-hover:border-[#00AEEF] transition-colors"
              />
              <div>
                <h3 className="text-base font-bold text-[#012a4e]">{member.name}</h3>
                <p className="text-xs font-semibold text-[#00AEEF]">{member.role}</p>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                {member.bio}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="max-w-5xl mx-auto px-4 text-center">
        <div className="bg-[#012a4e] rounded-3xl p-8 sm:p-12 text-white space-y-4">
          <h3 className="text-2xl sm:text-3xl font-black">
            Ready to experience effortless property ownership?
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto">
            Book a complimentary property appraisal or consultation with our executive team.
          </p>
          <button
            onClick={() => onOpenAppraisal && onOpenAppraisal()}
            className="mt-4 px-8 py-3 rounded-full text-xs font-bold text-white bg-[#00AEEF] hover:bg-[#0096ce] transition-all"
          >
            Book Free Property Appraisal
          </button>
        </div>
      </section>

    </div>
  );
}
