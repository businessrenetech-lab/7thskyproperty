import React, { useState } from 'react';
import { Briefcase, CheckCircle2, ArrowRight, ShieldCheck } from 'lucide-react';

export default function CareersPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: 'Property Care Manager', linkedin: '', note: '' });
  const [submitted, setSubmitted] = useState(false);

  const openings = [
    {
      title: "Senior Property Care Manager",
      department: "Facility Operations",
      location: "Gulshan 2, Dhaka",
      type: "Full-Time",
      desc: "Supervise residential caretaker teams, coordinate emergency repair protocols, and maintain ISO-aligned condition checklists."
    },
    {
      title: "NRB Portfolio Relationship Officer",
      department: "Client Services",
      location: "Dhaka & Sylhet",
      type: "Full-Time",
      desc: "Liaise with overseas Bangladeshi homeowners across the UK, North America, and Gulf regions; deliver monthly video reports and financial ledgers."
    },
    {
      title: "Legal Conveyance & Land Officer",
      department: "Legal & Documentation",
      location: "Dhaka",
      type: "Full-Time",
      desc: "Handle AC Land e-mutations, title deed searching, CS/RS/BS verification, and tenancy agreement execution under Bangladesh property laws."
    }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="pt-28 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
      
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#00AEEF]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00AEEF]"></span>
          Join Seventh Sky
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-[#012a4e] tracking-tight">
          Shape the Future of Real Estate Custodianship
        </h1>
        <p className="text-sm sm:text-base text-slate-500">
          We are assembling Bangladesh's most disciplined property care and asset management team.
        </p>
      </div>

      {/* Open Positions */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-[#012a4e]">Current Opportunities</h2>
        <div className="space-y-4">
          {openings.map((job, idx) => (
            <div key={idx} className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:border-[#00AEEF]/40 transition-all">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>{job.department}</span>
                  <span>•</span>
                  <span>{job.location}</span>
                  <span>•</span>
                  <span className="text-[#00AEEF] font-semibold">{job.type}</span>
                </div>
                <h3 className="text-lg font-bold text-[#012a4e]">{job.title}</h3>
                <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">{job.desc}</p>
              </div>
              <a
                href="#apply"
                onClick={() => setForm({ ...form, role: job.title })}
                className="px-5 py-2.5 rounded-full text-xs font-bold text-white bg-[#012a4e] hover:bg-[#00AEEF] transition-colors shrink-0 text-center"
              >
                Apply Now
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Application Form */}
      <div id="apply" className="bg-slate-50 p-8 sm:p-12 rounded-3xl border border-slate-200/80 max-w-3xl mx-auto">
        {submitted ? (
          <div className="text-center py-8 space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#e8f7fd] text-[#00AEEF] flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-[#012a4e]">Application Received</h3>
            <p className="text-xs text-slate-500">Thank you for your interest. Our HR team reviews applications on a rolling basis.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-[#012a4e]">Quick Candidate Application</h3>
              <p className="text-xs text-slate-500">Selected role: <strong>{form.role}</strong></p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Full Name</label>
                <input 
                  type="text"
                  required
                  placeholder="Your name"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-hidden"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Phone Number</label>
                <input 
                  type="tel"
                  required
                  placeholder="+880 17..."
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Email</label>
                <input 
                  type="email"
                  required
                  placeholder="email@example.com"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-hidden"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">LinkedIn Profile or CV Link</label>
                <input 
                  type="url"
                  placeholder="https://linkedin.com/in/..."
                  value={form.linkedin}
                  onChange={e => setForm({ ...form, linkedin: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Brief Introduction & Experience</label>
              <textarea 
                rows="3"
                placeholder="Tell us about your background in property or customer operations..."
                value={form.note}
                onChange={e => setForm({ ...form, note: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-hidden"
              ></textarea>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-full text-xs font-bold text-white bg-[#00AEEF] hover:bg-[#0096ce] transition-colors"
            >
              Submit Candidate Application
            </button>
          </form>
        )}
      </div>

    </div>
  );
}
