import React from "react";
import { Home as HomeIcon, ShieldCheck, Hammer, Sparkles, Phone, Mail, MapPin, KeyRound, Receipt } from "lucide-react";

export default function Home() {
  const services = [
    {
      icon: KeyRound,
      title: "Folio & Rental Management",
      desc: "Hassle-free tenancy management, rent collection, automated invoicing, arrears tracking, and direct disbursements to owners via DBBL/bKash/Nagad."
    },
    {
      icon: Hammer,
      title: "Property Maintenance & Care",
      desc: "On-demand facility repairs, plumbing, electrical checks, paint touch-ups, utility bill settlements, and complete property health checks."
    },
    {
      icon: ShieldCheck,
      title: "Tenant KYC & Placement",
      desc: "Comprehensive tenant background checks (NID & TIN registry), legally compliant tenancy agreements, and advance/security money management."
    },
    {
      icon: Sparkles,
      title: "Interior & Renovations",
      desc: "Complete interior design, fits-out, painting, remodeling, and post-tenancy renovation services managed by our expert teams."
    }
  ];

  return (
    <div className="flex-1 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 text-slate-100 flex flex-col justify-center items-center py-16 px-6">
      
      {/* Hero Banner Section */}
      <div className="max-w-4xl w-full text-center mb-16">
        <span className="inline-flex items-center rounded-full bg-blue-500/10 border border-blue-500/20 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-blue-400 mb-6">
          Premium Real Estate Care
        </span>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-none tracking-tight text-white mb-6">
          Property Management <br/>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">Made Actionable.</span>
        </h1>
        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Seventh Sky Properties offers comprehensive care, rental ledgers, landlord auditing, and facility repairs for properties in Dhaka, Bangladesh. Enjoy hassle-free real estate folios.
        </p>
      </div>

      {/* Services Grid */}
      <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-6 mb-20">
        {services.map((item, index) => (
          <div key={index} className="group relative rounded-3xl border border-slate-800 bg-slate-900/50 p-8 hover:bg-slate-900/80 hover:border-slate-700 transition duration-300">
            <div className="h-12 w-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition duration-300">
              <item.icon size={22} />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
            <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>

      {/* Contact Panel Card */}
      <div className="max-w-3xl w-full rounded-[32px] border border-slate-800 bg-slate-950 p-8 sm:p-12 text-center relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-4">Contact Our Offices</h2>
        <p className="text-slate-400 text-sm sm:text-base max-w-lg mx-auto mb-8">
          Get in touch with our team for leasing inquiries, property onboarding, or facility management solutions in Dhaka.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left max-w-2xl mx-auto">
          <div className="flex gap-3">
            <MapPin size={20} className="text-blue-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-white text-sm">Address</h4>
              <p className="text-xs text-slate-500 leading-normal mt-1">
                SEL Sufi Square, Unit: 1104, Level: 11, Dhanmondi R/A, Dhaka 1209
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Phone size={20} className="text-blue-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-white text-sm">Phone</h4>
              <p className="text-xs text-slate-500 leading-normal mt-1">
                +880 1913-373581
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Mail size={20} className="text-blue-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-white text-sm">Email</h4>
              <p className="text-xs text-slate-500 leading-normal mt-1">
                info@seventhskybd.com
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
