"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Mail, Phone, MapPin, Send, Loader2, CheckCircle2, Clock, MessageCircle, ChevronDown, ArrowRight, AlertTriangle } from "lucide-react";

const faqs = [
  ["How quickly will you respond?", "Our team typically responds within 2-4 hours during business hours. For urgent queries, call us directly or message us on WhatsApp."],
  ["Can I visit the campus before enrolling?", "Absolutely! We encourage campus visits. Book a consultation and we will give you a full tour of our facilities."],
  ["Do you offer online consultations?", "Yes. We offer both in-person and online consultations via Zoom. Choose whichever is convenient for you."],
  ["What documents do I need for enrollment?", "Just a valid ID (NID or passport), a recent photo, and your previous test scores (if any). We will guide you through everything."],
];

export default function ContactPage() {
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [status, setStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [openFaq, setOpenFaq] = useState(0);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/public/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error("Failed to submit form");
      setStatus("success");
      setFormData({ name: "", email: "", phone: "", subject: "", message: "" });
    } catch (err) {
      console.error(err);
      setStatus("error");
      setErrorMessage("There was a problem sending your message. Please try calling us instead.");
    }
  };

  return (
    <div className="pb-0 overflow-hidden">
      {/* ─── DYNAMIC HERO OVERLAP ─── */}
      <section className="relative pt-20 pb-48 md:pt-28 md:pb-64 gradient-hero overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 opacity-10 fine-grid mix-blend-overlay"></div>
        
        {/* Floating Abstract Shapes */}
        <div className="absolute top-1/4 left-10 w-64 h-64 bg-primary/20 blur-[100px] rounded-full animate-float"></div>
        <div className="absolute bottom-1/4 right-10 w-80 h-80 bg-accent/30 blur-[120px] rounded-full animate-float delay-500"></div>

        <div className="container-shell relative z-10 text-center animate-fade-in-up">
          <span className="eyebrow bg-white/10 text-white border-white/20 shadow-lg backdrop-blur-md">
            We&apos;re Here For You
          </span>
          <h1 className="mx-auto mt-6 max-w-4xl text-5xl font-extrabold leading-tight tracking-tight text-white md:text-7xl">
            Let&apos;s start your <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4DFFA8] to-primary">journey</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-blue-100 font-medium">
            Have questions about our courses or need help with enrollment? Our expert academic advisors are ready to guide you every step of the way.
          </p>
        </div>
      </section>

      {/* ─── MAIN CONTENT (OVERLAPPING HERO) ─── */}
      <section className="relative z-20 -mt-32 md:-mt-48 pb-24">
        <div className="container-shell">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_1.4fr] items-start">
            
            {/* LEFT COLUMN: Contact Cards */}
            <div className="space-y-5 animate-slide-in-left delay-200">
              <div className="premium-panel p-7 flex items-center gap-5 hover:border-primary/40 group">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary group-hover:text-white shadow-sm">
                  <MapPin size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg mb-1">Head Office</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    SEL SUFI SQUARE, Unit: 1104, Level: 11<br/>
                    Plot: 58, Road: 16 (New) / 27 (Old)<br/>
                    Dhanmondi R/A, Dhaka 1209
                  </p>
                </div>
              </div>

              <div className="premium-panel p-7 flex items-center gap-5 hover:border-accent/40 group">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent transition-transform duration-300 group-hover:scale-110 group-hover:bg-accent group-hover:text-white shadow-sm">
                  <Phone size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg mb-1">Call Us Directly</h3>
                  <p className="text-lg font-semibold text-slate-700">+880 1913-373581</p>
                  <p className="text-xs text-slate-500 mt-1">Available Sat-Thu, 9 AM to 8 PM</p>
                </div>
              </div>

              <div className="premium-panel p-7 flex items-center gap-5 bg-slate-900 text-white border-slate-800 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-[50px] rounded-full group-hover:bg-primary/40 transition-colors duration-500"></div>
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white relative z-10 transition-transform duration-300 group-hover:scale-110">
                  <Mail size={24} />
                </div>
                <div className="relative z-10">
                  <h3 className="font-bold text-white text-lg mb-1">Email Support</h3>
                  <a href="mailto:hello@languageacademy.com.bd" className="text-sm text-slate-300 hover:text-white transition-colors block">hello@languageacademy.com.bd</a>
                  <a href="mailto:support@languageacademy.com.bd" className="text-sm text-slate-300 hover:text-white transition-colors block mt-1">support@languageacademy.com.bd</a>
                </div>
              </div>

              {/* WhatsApp CTA */}
              <a
                href="https://wa.me/8801913373581?text=Hi%2C%20I%27m%20interested%20in%20your%20English%20language%20courses."
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-5 rounded-[28px] bg-gradient-to-r from-[#25D366] to-[#1eb856] p-6 text-white transition-all hover:scale-[1.02] hover:shadow-[0_20px_40px_-15px_rgba(37,211,102,0.5)] shadow-xl group"
              >
                <div className="bg-white/20 p-3 rounded-full group-hover:animate-pulse">
                  <MessageCircle size={28} />
                </div>
                <div>
                  <p className="text-lg font-extrabold tracking-wide">Chat on WhatsApp</p>
                  <p className="text-sm text-white/90 font-medium mt-0.5">Instant responses from our team</p>
                </div>
                <ArrowRight size={22} className="ml-auto opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </a>
            </div>

            {/* RIGHT COLUMN: Contact Form Floating Panel */}
            <div className="premium-panel p-8 md:p-12 shadow-[0_30px_80px_-20px_rgba(15,23,42,0.2)] animate-fade-in-up delay-300 border-t-4 border-t-primary">
              <div className="mb-8 text-center">
                <h2 className="text-3xl font-extrabold text-slate-900 mb-3 tracking-tight">Send a Message</h2>
                <p className="text-slate-500 font-medium">We usually reply within 2 hours during business days.</p>
              </div>

              {status === "success" ? (
                <div className="rounded-[24px] bg-green-50/80 p-10 border border-green-100 text-center animate-scale-in">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="text-green-600 w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3">Message Sent!</h3>
                  <p className="text-slate-600 mb-8 leading-relaxed">Thank you for reaching out to Language Academy. One of our academic advisors will contact you shortly.</p>
                  <button onClick={() => setStatus("idle")} className="secondary-btn w-full">Send Another Message</button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {status === "error" && (
                    <div className="rounded-xl bg-red-50 text-red-600 p-4 text-sm font-medium border border-red-100 flex items-start gap-3 animate-fade-in-down">
                      <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                      <span>{errorMessage}</span>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-slate-700">Full Name <span className="text-primary">*</span></label>
                      <input type="text" name="name" value={formData.name} onChange={handleChange} required className="form-input-premium shadow-inner" placeholder="John Doe" />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-slate-700">Email Address <span className="text-primary">*</span></label>
                      <input type="email" name="email" value={formData.email} onChange={handleChange} required className="form-input-premium shadow-inner" placeholder="john@email.com" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-slate-700">Phone Number <span className="text-primary">*</span></label>
                      <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required className="form-input-premium shadow-inner" placeholder="01XXXXXXXXX" />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-slate-700">Subject <span className="text-primary">*</span></label>
                      <select name="subject" value={formData.subject} onChange={handleChange} required className="form-input-premium shadow-inner font-medium text-slate-700">
                        <option value="">Select a topic</option>
                        <option value="PTE Course Enquiry">PTE Course Enquiry</option>
                        <option value="IELTS Course Enquiry">IELTS Course Enquiry</option>
                        <option value="Spoken English Enquiry">Spoken English Enquiry</option>
                        <option value="Batch Schedule">Batch Schedule</option>
                        <option value="Fee & Payment">Fee & Payment</option>
                        <option value="Campus Visit">Campus Visit</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700">How can we help? <span className="text-primary">*</span></label>
                    <textarea name="message" value={formData.message} onChange={handleChange} required rows={4} className="form-input-premium shadow-inner resize-none" placeholder="Tell us about your goals or what you need help with..." />
                  </div>

                  <button type="submit" disabled={status === "loading"} className="primary-btn w-full py-4 text-base tracking-wide shadow-lg mt-2 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out rounded-full"></div>
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {status === "loading" ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                      {status === "loading" ? "Sending..." : "Send Message securely"}
                    </span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ─── FULL WIDTH MAP & FAQ SECTION ─── */}
      <section className="bg-slate-50 border-t border-slate-200">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          
          {/* FAQ Half */}
          <div className="px-6 py-20 lg:px-20 xl:px-32 flex flex-col justify-center">
            <span className="eyebrow mb-4">Support Center</span>
            <h3 className="text-3xl font-extrabold text-slate-900 mb-8 tracking-tight">Frequently Asked Questions</h3>
            <div className="space-y-4">
              {faqs.map(([q, a], i) => (
                <details
                  key={q}
                  className="faq-item premium-panel overflow-hidden border-transparent hover:border-primary/20 bg-white"
                  open={openFaq === i}
                  onClick={(e) => { e.preventDefault(); setOpenFaq(openFaq === i ? null : i); }}
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-4 p-6 transition-colors hover:bg-slate-50/50">
                    <h4 className="text-base font-bold text-slate-800">{q}</h4>
                    <div className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-full transition-colors ${openFaq === i ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'}`}>
                      <ChevronDown size={18} className="faq-chevron" />
                    </div>
                  </summary>
                  {openFaq === i && (
                    <div className="border-t border-slate-100 px-6 pb-6 pt-4 bg-slate-50/30 animate-fade-in-down">
                      <p className="text-sm leading-relaxed text-slate-600 font-medium">{a}</p>
                    </div>
                  )}
                </details>
              ))}
            </div>
          </div>

          {/* Map Half */}
          <div className="min-h-[400px] lg:min-h-full relative filter grayscale-[20%] hover:grayscale-0 transition-all duration-700">
            <iframe
              src="https://www.google.com/maps?q=23.7522751,90.3679702&z=17&output=embed"
              width="100%"
              height="100%"
              style={{ border: 0, position: "absolute", inset: 0 }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Language Academy Location"
            />
            {/* Inner shadow overlay for blending */}
            <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_40px_rgba(0,0,0,0.1)]"></div>
          </div>
        </div>
      </section>
    </div>
  );
}
