"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Mail, Phone, MapPin, Send, Loader2, CheckCircle2, Clock, MessageCircle, ChevronDown, ArrowRight } from "lucide-react";

const faqs = [
  ["How quickly will you respond?", "Our team typically responds within 2-4 hours during business hours. For urgent queries, call us directly or message us on WhatsApp."],
  ["Can I visit the campus before enrolling?", "Absolutely! We encourage campus visits. Book a consultation and we'll give you a full tour of our facilities."],
  ["Do you offer online consultations?", "Yes. We offer both in-person and online consultations via Zoom. Choose whichever is convenient for you."],
  ["What documents do I need for enrollment?", "Just a valid ID (NID or passport), a recent photo, and your previous test scores (if any). We'll guide you through everything."],
];

export default function ContactPage() {
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [status, setStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [openFaq, setOpenFaq] = useState(null);

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
    <div className="pb-24">
      {/* Hero */}
      <section className="pb-12 pt-6 md:pb-16 md:pt-8">
        <div className="container-shell">
          <div className="bg-gradient-to-br from-primary to-accent overflow-hidden rounded-[36px] px-8 py-12 text-white md:px-12 md:py-16 text-center relative shadow-xl shadow-primary/20">
            <div className="absolute inset-0 opacity-10 fine-grid mix-blend-overlay"></div>
            <div className="relative z-10">
              <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] shadow-sm">Get in Touch</span>
              <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-extrabold leading-tight md:text-6xl">
                We&apos;re here to help you get started
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-white/90">
                Have questions about our courses or need help with enrollment? Our academic advisors are ready to guide you.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="container-shell">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
            {/* Left Column — Info Cards */}
            <div className="space-y-5">
              <div className="premium-panel p-7 flex items-start gap-4 hover:border-primary/30 transition-colors">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><MapPin size={22} /></div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">Head Office</h3>
                  <p className="text-sm text-slate-600">SEL SUFI SQUARE, Unit: 1104, Level: 11<br/>Plot: 58, Road: 16 (New) / 27 (Old)<br/>Dhanmondi R/A, Dhaka 1209, Bangladesh</p>
                </div>
              </div>

              <div className="premium-panel p-7 flex items-start gap-4 hover:border-accent/30 transition-colors">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent"><Phone size={22} /></div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">Phone</h3>
                  <p className="text-sm text-slate-600">+880 1913-373581</p>
                </div>
              </div>

              <div className="premium-panel p-7 flex items-start gap-4 bg-slate-950 text-white border-slate-800">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white"><Mail size={22} /></div>
                <div>
                  <h3 className="font-bold mb-1">Email</h3>
                  <p className="text-sm text-slate-300">hello@languageacademy.com.bd<br/>support@languageacademy.com.bd</p>
                </div>
              </div>

              <div className="premium-panel p-7 flex items-start gap-4 hover:border-primary/30 transition-colors">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Clock size={22} /></div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">Office Hours</h3>
                  <p className="text-sm text-slate-600">Saturday – Thursday: 9:00 AM – 8:00 PM<br/>Friday: Closed</p>
                </div>
              </div>

              {/* WhatsApp CTA */}
              <a
                href="https://wa.me/8801913373581?text=Hi%2C%20I%27m%20interested%20in%20your%20English%20language%20courses."
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 rounded-2xl bg-[#25D366] p-5 text-white transition hover:bg-[#20bd5a] shadow-lg"
              >
                <MessageCircle size={28} />
                <div>
                  <p className="text-base font-bold">Chat on WhatsApp</p>
                  <p className="text-sm text-white/80">Get instant responses from our team</p>
                </div>
                <ArrowRight size={20} className="ml-auto" />
              </a>

              {/* Map Embed */}
              <div className="premium-panel overflow-hidden">
                <iframe
                  src="https://www.google.com/maps?q=23.7522751,90.3679702&z=19&output=embed"
                  width="100%"
                  height="220"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="rounded-[28px]"
                  title="Language Academy Location"
                />
              </div>
            </div>

            {/* Right Column — Form */}
            <div>
              <div className="premium-panel p-8 md:p-10">
                <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Send us a message</h2>
                <p className="text-sm text-slate-500 mb-8">Fill out the form and our team will get back to you within 24 hours.</p>

                {status === "success" ? (
                  <div className="rounded-2xl bg-primary/5 p-8 border border-primary/20 text-center">
                    <CheckCircle2 className="mx-auto text-primary w-16 h-16 mb-4" />
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Message Sent!</h3>
                    <p className="text-slate-600 mb-6">Thank you for reaching out. We will get back to you within 24 hours.</p>
                    <button onClick={() => setStatus("idle")} className="primary-btn">Send Another Message</button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {status === "error" && (
                      <div className="rounded-xl bg-red-50 text-red-600 p-4 text-sm font-medium border border-red-100">{errorMessage}</div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Your Name</label>
                        <input type="text" name="name" value={formData.name} onChange={handleChange} required className="form-input-premium" placeholder="John Doe" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
                        <input type="email" name="email" value={formData.email} onChange={handleChange} required className="form-input-premium" placeholder="john@email.com" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Phone Number</label>
                        <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="form-input-premium" placeholder="01XXXXXXXXX" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Subject</label>
                        <select name="subject" value={formData.subject} onChange={handleChange} required className="form-input-premium">
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
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Message</label>
                      <textarea name="message" value={formData.message} onChange={handleChange} required rows={4} className="form-input-premium resize-none" placeholder="Tell us how we can help you..." />
                    </div>
                    <button type="submit" disabled={status === "loading"} className="primary-btn w-full py-4 text-base">
                      {status === "loading" ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                      Send Message
                    </button>
                  </form>
                )}
              </div>

              {/* FAQ */}
              <div className="mt-8">
                <h3 className="text-xl font-extrabold text-slate-900 mb-5">Frequently Asked Questions</h3>
                <div className="space-y-3">
                  {faqs.map(([q, a], i) => (
                    <details
                      key={q}
                      className="faq-item premium-panel overflow-hidden"
                      open={openFaq === i}
                      onClick={(e) => { e.preventDefault(); setOpenFaq(openFaq === i ? null : i); }}
                    >
                      <summary className="flex cursor-pointer items-center justify-between gap-4 p-5">
                        <h4 className="text-sm font-bold text-slate-900">{q}</h4>
                        <ChevronDown size={18} className="faq-chevron shrink-0 text-slate-400" />
                      </summary>
                      {openFaq === i && (
                        <div className="border-t border-slate-100 px-5 pb-5 pt-3">
                          <p className="text-sm leading-7 text-slate-600">{a}</p>
                        </div>
                      )}
                    </details>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
