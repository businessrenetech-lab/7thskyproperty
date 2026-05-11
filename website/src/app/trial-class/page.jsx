"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Loader2, Phone, Sparkles, UserRound } from "lucide-react";
import { getFbHeaders } from "@/components/FacebookPixel";

const normalizeChannel = (value) => (value === "kiosk" ? "kiosk" : "manual");

export default function TrialClassPage() {
  const [branchId, setBranchId] = useState("");
  const [branchName, setBranchName] = useState("");
  const [channel, setChannel] = useState("manual");
  const [form, setForm] = useState({ name: "", phone: "" });
  const [loadingBranch, setLoadingBranch] = useState(true);
  const [status, setStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(window.location.search);
    const urlBranchId = params.get("branch") || params.get("branch_id") || "";
    const urlChannel = normalizeChannel(params.get("channel"));

    setBranchId(urlBranchId);
    setChannel(urlChannel);

    if (!urlBranchId) {
      setLoadingBranch(false);
      return () => { cancelled = true; };
    }

    fetch("/api/public/branches")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const branches = Array.isArray(data) ? data : [];
        const branch = branches.find((item) => String(item.id) === String(urlBranchId) && item.is_active !== false);
        setBranchName(branch ? branch.public_title || branch.name || `Branch ${urlBranchId}` : `Branch ${urlBranchId}`);
      })
      .catch(() => {
        if (!cancelled) setBranchName(`Branch ${urlBranchId}`);
      })
      .finally(() => {
        if (!cancelled) setLoadingBranch(false);
      });

    return () => { cancelled = true; };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!branchId) {
      setStatus("error");
      setErrorMessage("This trial class link is missing branch information. Please ask an advisor for the correct link.");
      return;
    }

    setStatus("loading");
    setErrorMessage("");
    try {
      const res = await fetch("/api/public/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getFbHeaders() },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          branch_id: branchId,
          channel,
          subject: "Trial Class Booking",
          lead_type: "trial_class",
          source: "Trial Class Booking",
          message: `Trial class requested from ${channel} branch link`,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to book trial class");
      setStatus("success");
      setForm({ name: "", phone: "" });
    } catch (err) {
      setStatus("error");
      setErrorMessage(err.message || "There was a problem booking your trial class. Please call us instead.");
    }
  };

  const invalidLink = !loadingBranch && !branchId;

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden">
      <section className="relative isolate px-6 py-16 md:py-24">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(77,255,168,0.22),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.22),transparent_34%)]" />
        <div className="absolute left-1/2 top-10 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/20 blur-[110px]" />

        <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1fr_420px] lg:items-center">
          <div className="space-y-7">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-blue-100 backdrop-blur">
              <Sparkles size={16} /> Free trial class
            </span>
            <div className="space-y-5">
              <h1 className="text-4xl font-black tracking-tight md:text-6xl">
                Book your trial class in under 30 seconds.
              </h1>
              <p className="max-w-2xl text-lg font-medium leading-8 text-slate-300">
                Leave your name and phone number. Our advisor will call you to confirm the schedule and guide you through the next step.
              </p>
            </div>
            <div className="grid max-w-xl gap-3 sm:grid-cols-3">
              {["No payment now", "Advisor callback", branchName || "Branch link"].map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-sm font-extrabold text-slate-200 backdrop-blur">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-white/15 bg-white/[0.08] p-6 shadow-2xl backdrop-blur-xl md:p-8">
            {loadingBranch ? (
              <div className="flex min-h-[320px] items-center justify-center text-slate-300">
                <Loader2 className="mr-2 animate-spin" size={20} /> Loading trial link...
              </div>
            ) : invalidLink ? (
              <div className="rounded-[24px] border border-red-400/30 bg-red-500/10 p-6 text-center">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/20 text-red-200">
                  <AlertTriangle size={28} />
                </div>
                <h2 className="mb-3 text-2xl font-black">Invalid Trial Link</h2>
                <p className="mb-6 text-sm leading-6 text-red-100/90">
                  This trial class link is missing valid branch information. Please ask an advisor for the correct branch-specific link.
                </p>
                <Link href="/contact" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-extrabold text-slate-950 transition hover:bg-slate-100">
                  Contact advisor <ArrowRight size={16} />
                </Link>
              </div>
            ) : status === "success" ? (
              <div className="rounded-[24px] border border-emerald-300/30 bg-emerald-400/10 p-7 text-center">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-400/20 text-emerald-200">
                  <CheckCircle2 size={34} />
                </div>
                <h2 className="mb-3 text-2xl font-black">Trial Request Received</h2>
                <p className="mb-7 text-sm leading-6 text-emerald-50/90">
                  Thank you. Our {branchName} advisor will call you shortly to confirm your trial class.
                </p>
                <button type="button" onClick={() => setStatus("idle")} className="w-full rounded-2xl bg-white px-5 py-3 text-sm font-extrabold text-slate-950 transition hover:bg-slate-100">
                  Book another trial
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <p className="mb-2 text-xs font-black uppercase tracking-[0.22em] text-primary">{branchName}</p>
                  <h2 className="text-3xl font-black tracking-tight">Reserve a Trial Class</h2>
                  <p className="mt-3 text-sm leading-6 text-slate-300">Only name and phone number are required.</p>
                </div>

                {status === "error" && (
                  <div className="flex items-start gap-3 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm font-semibold text-red-100">
                    <AlertTriangle className="mt-0.5 shrink-0" size={18} />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <label className="block space-y-2">
                  <span className="text-sm font-extrabold text-slate-100">Student Name <span className="text-primary">*</span></span>
                  <div className="relative">
                    <UserRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={19} />
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      className="w-full rounded-2xl border border-white/10 bg-white/10 px-12 py-4 font-bold text-white outline-none transition placeholder:text-slate-500 focus:border-primary/70 focus:bg-white/[0.14]"
                      placeholder="Student full name"
                    />
                  </div>
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-extrabold text-slate-100">Phone Number <span className="text-primary">*</span></span>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={19} />
                    <input
                      type="tel"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      required
                      className="w-full rounded-2xl border border-white/10 bg-white/10 px-12 py-4 font-bold text-white outline-none transition placeholder:text-slate-500 focus:border-primary/70 focus:bg-white/[0.14]"
                      placeholder="01XXXXXXXXX"
                    />
                  </div>
                </label>

                <button type="submit" disabled={status === "loading"} className="group relative w-full overflow-hidden rounded-2xl bg-primary px-5 py-4 text-base font-black text-slate-950 shadow-[0_18px_60px_-18px_rgba(77,255,168,0.8)] transition hover:scale-[1.01] disabled:cursor-wait disabled:opacity-70">
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {status === "loading" ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                    {status === "loading" ? "Booking..." : "Book Trial Class"}
                  </span>
                </button>

                <p className="text-center text-xs font-semibold leading-5 text-slate-400">
                  Branch is locked from your booking link. No payment is required for this request.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
