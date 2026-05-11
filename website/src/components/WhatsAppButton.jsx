"use client";

import { useState } from "react";
import { X, Send, Loader2, CheckCircle2 } from "lucide-react";
import { getFbHeaders } from "./FacebookPixel";

export default function WhatsAppButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("idle"); // 'idle' | 'loading' | 'success' | 'error'

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim() || !name.trim() || !phone.trim()) return;
    setStatus("loading");
    
    // Get FB tracking cookies for server-side deduplication
    const fbHeaders = getFbHeaders();

    try {
      const url = "/api/public/contact";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...fbHeaders },
        body: JSON.stringify({
          name,
          phone,
          subject: "Website Live Chat Enquiry",
          message
        })
      });

      if (res.ok) {
        setStatus("success");
        setTimeout(() => {
          setIsOpen(false);
          setStatus("idle");
          setMessage("");
          setName("");
          setPhone("");
        }, 3000);
      } else {
        setStatus("error");
      }
    } catch (err) {
      console.error(err);
      // Fallback try with relative proxy url if absolute fails
      try {
        const fallbackRes = await fetch("/api/public/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, phone, subject: "Website Live Chat Enquiry", message })
        });
        if (fallbackRes.ok) {
          setStatus("success");
          setTimeout(() => {
            setIsOpen(false);
            setStatus("idle");
            setMessage("");
            setName("");
            setPhone("");
          }, 3000);
        } else {
          setStatus("error");
        }
      } catch (fallbackErr) {
        setStatus("error");
      }
    }
  };

  return (
    <>
      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-80 overflow-hidden rounded-2xl bg-white shadow-2xl transition-all duration-300">
          {/* Header */}
          <div className="flex items-center justify-between bg-[#128C7E] p-4 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Live Support</h3>
                <p className="text-xs text-white/80">Language Academy Team</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white hover:text-white/70">
              <X size={20} />
            </button>
          </div>

          {/* Chat Body */}
          <div className="bg-[#efe6dd] p-4" style={{ backgroundImage: 'radial-gradient(circle at 0 0, rgba(18,140,126,0.12) 0 2px, transparent 2px), radial-gradient(circle at 16px 16px, rgba(255,255,255,0.45) 0 2px, transparent 2px)', backgroundSize: '32px 32px' }}>
            <div className="mb-4 flex w-fit max-w-[90%] flex-col rounded-b-lg rounded-tr-lg bg-white p-3 text-sm shadow-sm">
              <span className="mb-1 text-[11px] font-bold text-[#128C7E]">System Message</span>
              <span className="text-gray-800 tracking-tight leading-tight">Hi there! 👋 How can we help you? Please leave your details and query below and our team will get right back to you!</span>
              <span className="mt-1 self-end text-[10px] text-gray-400">Automated</span>
            </div>

            {status === "success" ? (
              <div className="flex flex-col items-center justify-center p-6 bg-white/90 backdrop-blur-sm rounded-xl text-center">
                <CheckCircle2 color="#128C7E" size={40} className="mb-2" />
                <h4 className="font-bold text-gray-800">Message Sent!</h4>
                <p className="text-xs text-gray-600 mt-1">We will contact you shortly.</p>
              </div>
            ) : (
              <form onSubmit={handleSend} className="flex flex-col gap-3 rounded-xl bg-white/90 backdrop-blur-sm p-4 shadow-sm relative border border-white/50">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Name *"
                  required
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-xs text-gray-800 focus:border-[#128C7E] focus:outline-none focus:ring-1 focus:ring-[#128C7E]"
                />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="WhatsApp Number *"
                  required
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-xs text-gray-800 focus:border-[#128C7E] focus:outline-none focus:ring-1 focus:ring-[#128C7E]"
                />
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="How can we help you? *"
                  required
                  rows={3}
                  className="w-full resize-none rounded-md border border-gray-200 bg-white px-3 py-2 text-xs text-gray-800 focus:border-[#128C7E] focus:outline-none focus:ring-1 focus:ring-[#128C7E]"
                />
                {status === "error" && <p className="text-xs text-red-500 font-medium">Failed to send message. Please try again.</p>}
                <button
                  type="submit"
                  disabled={!name.trim() || !phone.trim() || !message.trim() || status === "loading"}
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-[#128C7E] py-2 text-xs font-bold text-white transition-all hover:bg-[#075E54] disabled:opacity-50"
                >
                  {status === "loading" ? <Loader2 size={14} className="animate-spin" /> : <><Send size={14} /> Send Message </>}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="whatsapp-float bg-[#25D366] hover:bg-[#128c7e]"
        aria-label="Toggle Live Chat"
        title="Live Support"
      >
        {isOpen ? (
           <X size={28} color="white" />
        ) : (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" color="white">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        )}
      </button>
    </>
  );
}
