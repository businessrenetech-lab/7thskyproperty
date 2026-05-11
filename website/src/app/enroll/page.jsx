"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CheckCircle2, Clock3, Loader2, ShieldCheck, Star, Users, X } from "lucide-react";

const BKASH_LOGO_URL = "/bkash-logo.webp";

function CheckoutForm() {
  const searchParams = useSearchParams();
  const initialCourseId = searchParams.get("course") || "";
  const initialBranchId = searchParams.get("branch") || searchParams.get("branch_id") || "";

  const [branches, setBranches] = useState([]);
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [formData, setFormData] = useState({
    branch_id: initialBranchId,
    course_id: initialCourseId,
    batch_id: "",
    name: "",
    email: "",
    phone: "",
    dob: "",
    method: "pay_at_branch",
    payer_bkash_number: "",
    bkash_transaction_id: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(searchParams.get("error"));
  const [simulating, setSimulating] = useState(false);
  const [step, setStep] = useState(1);
  const [showBkashModal, setShowBkashModal] = useState(false);
  const [bkashMerchantNo, setBkashMerchantNo] = useState("01913-373581");

  const formatSchedule = (scheduleStr) => {
    if (!scheduleStr) return "TBA";
    try {
      const sch = JSON.parse(scheduleStr);
      if (sch.days && Array.isArray(sch.days)) {
        const days = sch.days.map(d => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(", ");
        return `${days} • ${sch.start_time || ""} - ${sch.end_time || ""}`;
      }
    } catch (e) {
      return scheduleStr; // generic string fallback
    }
    return scheduleStr;
  };

  useEffect(() => {
    fetch("/api/public/branches")
      .then((res) => res.json())
      .then((data) => {
        const activeBranches = Array.isArray(data) ? data.filter((branch) => branch.is_active) : [];
        setBranches(activeBranches);
        if (initialBranchId) return;
        const headBranch = activeBranches.find((branch) => branch.type === "head");
        if (headBranch) setFormData((prev) => ({ ...prev, branch_id: String(headBranch.id) }));
      })
      .catch((err) => console.error("Failed to load branches", err));
  }, [initialBranchId]);

  useEffect(() => {
    fetch("/api/payment/config")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.bkash_merchant_no) setBkashMerchantNo(data.bkash_merchant_no);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!formData.branch_id) {
      setCourses([]);
      setBatches([]);
      setSelectedCourse(null);
      return;
    }

    fetch(`/api/public/courses?branch_id=${encodeURIComponent(formData.branch_id)}`)
      .then((res) => res.json())
      .then((data) => {
        const nextCourses = Array.isArray(data) ? data : [];
        setCourses(nextCourses);
        setBatches([]);
        setFormData((prev) => {
          const current = nextCourses.find((course) => String(course.id) === String(prev.course_id) || course.slug === prev.course_id);
          const initialMatch = nextCourses.find((course) => String(course.id) === String(initialCourseId) || course.slug === initialCourseId);
          return {
            ...prev,
            course_id: current ? String(current.id) : initialMatch ? String(initialMatch.id) : "",
            batch_id: "",
          };
        });
      })
      .catch((err) => {
        console.error("Failed to load branch courses", err);
        setCourses([]);
      });
  }, [formData.branch_id, initialCourseId]);

  useEffect(() => {
    if (!formData.course_id) { setBatches([]); setSelectedCourse(null); return; }
    const sc = courses.find((c) => c.id.toString() === formData.course_id.toString() || c.slug === formData.course_id);
    setSelectedCourse(sc || null);
    const slugToFetch = sc ? sc.slug : formData.course_id;
    if (slugToFetch && formData.branch_id) {
      fetch(`/api/public/courses/${slugToFetch}/batches?branch_id=${encodeURIComponent(formData.branch_id)}`)
        .then((res) => res.json())
        .then((data) => { if (Array.isArray(data)) setBatches(data); else setBatches([]); })
        .catch(() => setBatches([]));
    }
  }, [formData.branch_id, formData.course_id, courses]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
      ...(name === "branch_id" ? { course_id: "", batch_id: "" } : {}),
      ...(name === "course_id" ? { batch_id: "" } : {}),
    });
  };

  const submitCheckout = async () => {
    setLoading(true);
    setError("");
    let payloadCourseId = formData.course_id;
    const sc = courses.find((c) => c.slug === formData.course_id);
    if (sc) payloadCourseId = sc.id;
    try {
      const res = await fetch("/api/payment/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, branch_id: formData.branch_id, course_id: payloadCourseId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Payment initiation failed");
      setSimulating(true);
      setTimeout(() => { if (data.redirect_url) window.location.href = data.redirect_url; }, 2000);
    } catch (err) {
      setError(err.message);
      setLoading(false);
      setSimulating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.method === "bkash_manual" && (!formData.payer_bkash_number.trim() || !formData.bkash_transaction_id.trim())) {
      setError("");
      setShowBkashModal(true);
      return;
    }
    await submitCheckout();
  };

  if (simulating) {
    return (
      <div className="pt-32 pb-24 min-h-screen flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-primary mb-6" size={48} />
        <h2 className="text-2xl font-bold text-slate-900">Reserving your seat...</h2>
        <p className="mt-2 text-slate-500">Please do not refresh or close this page.</p>
        <div className="mt-8 flex items-center gap-3 bg-white px-6 py-4 rounded-full border border-slate-200 shadow-sm text-sm font-semibold text-slate-700">
          <ShieldCheck size={20} className="text-primary" /> Preparing enrollment confirmation
        </div>
      </div>
    );
  }

  const selectedBatch = batches.find((b) => b.id.toString() === formData.batch_id);

  return (
    <div className="pb-24">
      {/* Hero */}
      <section className="pb-10 pt-6 md:pb-12 md:pt-8">
        <div className="container-shell">
          <div className="gradient-hero fine-grid overflow-hidden rounded-[36px] px-8 py-10 text-center md:px-12 md:py-14">
            <span className="inline-flex rounded-full border border-primary/15 bg-primary/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">Secure Enrollment</span>
            <h1 className="mx-auto mt-5 max-w-2xl text-3xl font-extrabold md:text-5xl text-slate-900">Complete Your Enrollment</h1>
            <p className="mx-auto mt-4 max-w-xl text-base text-slate-600">Select your course, fill in your details, and proceed to secure checkout.</p>
          </div>
        </div>
      </section>

      {/* Stepper */}
      <section className="pb-8">
        <div className="container-shell max-w-3xl">
          <div className="flex items-center justify-center gap-3">
            {["Select Course", "Your Details", "Payment"].map((label, i) => (
              <React.Fragment key={label}>
                <div className={`flex items-center gap-2 ${step > i + 1 ? "text-accent" : step === i + 1 ? "text-primary" : "text-slate-400"}`}>
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${step > i + 1 ? "bg-accent text-white" : step === i + 1 ? "bg-primary text-white" : "bg-slate-200 text-slate-500"}`}>
                    {step > i + 1 ? <CheckCircle2 size={16} /> : i + 1}
                  </div>
                  <span className="hidden text-sm font-semibold sm:inline">{label}</span>
                </div>
                {i < 2 && <div className={`h-0.5 w-8 sm:w-16 ${step > i + 1 ? "bg-accent" : "bg-slate-200"}`} />}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="container-shell">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            {/* Form */}
            <div className="premium-panel p-6 md:p-10">
              {error && (
                <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 text-sm font-medium">
                  {error === "payment_failed" ? "Payment failed or was declined. Please try again." : error === "payment_cancelled" ? "You cancelled the payment. Resume below." : error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-4">1. Select Branch, Course & Batch</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Branch</label>
                      <select name="branch_id" value={formData.branch_id} onChange={(e) => { handleChange(e); setStep(1); }} required className="form-input-premium">
                        <option value="">-- Choose a branch --</option>
                        {branches.map((branch) => (<option key={branch.id} value={branch.id}>{branch.name}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Course</label>
                      <select name="course_id" value={formData.course_id} onChange={(e) => { handleChange(e); setStep(Math.max(step, 1)); }} required disabled={!formData.branch_id} className="form-input-premium disabled:opacity-50 disabled:cursor-not-allowed">
                        <option value="">{formData.branch_id ? "-- Choose a course --" : "-- Select branch first --"}</option>
                        {courses.map((c) => (<option key={c.id} value={c.id}>{c.title} - ৳{c.base_fee}</option>))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Preferred Batch</label>
                      <select name="batch_id" value={formData.batch_id} onChange={(e) => { handleChange(e); setStep(Math.max(step, 2)); }} required disabled={!formData.course_id || batches.length === 0} className="form-input-premium disabled:opacity-50 disabled:cursor-not-allowed">
                        <option value="">{formData.course_id ? (batches.length > 0 ? "-- Choose batch --" : "No batches available") : "-- Select course first --"}</option>
                        {batches.map((b) => (<option key={b.id} value={b.id}>{b.name} ({formatSchedule(b.schedule)})</option>))}
                      </select>
                    </div>
                  </div>
                </div>

                <hr className="border-slate-100" />

                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-4">2. Your Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Full Name</label>
                      <input type="text" name="name" value={formData.name} onChange={(e) => { handleChange(e); setStep(Math.max(step, 2)); }} required placeholder="e.g. John Doe" className="form-input-premium" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
                      <input type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="e.g. john@email.com" className="form-input-premium" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Phone Number</label>
                      <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required placeholder="01XXXXXXXXX" className="form-input-premium" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Payment Method</label>
                      <select name="method" value={formData.method} onChange={(e) => { handleChange(e); setStep(3); if (e.target.value === "bkash_manual") setShowBkashModal(true); }} required className="form-input-premium">
                        <option value="pay_at_branch">Pay at Branch (Cash/Counter)</option>
                        <option value="bkash_manual">bKash Payment</option>
                      </select>
                    </div>
                  </div>
                </div>

                <button type="submit" disabled={loading} className="accent-btn w-full py-4 text-base">
                  {loading ? <Loader2 className="animate-spin" size={20} /> : formData.method === "bkash_manual" ? "Submit Payment for Verification" : "Reserve Seat"}
                  {!loading && <ArrowRight size={20} />}
                </button>

                <div className="flex justify-center items-center gap-2 text-xs text-slate-400 font-medium">
                  <ShieldCheck size={14} className="text-accent" />
                  <span>{formData.method === "bkash_manual" ? "Your bKash payment will be verified by admin before access is activated." : "Your seat is reserved first. Complete payment at the branch counter."}</span>
                </div>
              </form>
            </div>

            {/* Order Summary Sidebar */}
            <div className="space-y-6 lg:sticky lg:top-28 lg:self-start">
              <div className="premium-panel p-7">
                <h3 className="text-lg font-extrabold text-slate-900 mb-5">Order Summary</h3>
                {selectedCourse ? (
                  <div>
                    <div className="subtle-panel p-4 mb-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Selected Branch</p>
                      <p className="font-bold text-slate-900">{branches.find((branch) => String(branch.id) === String(formData.branch_id))?.name || "Branch selected"}</p>
                    </div>
                    <div className="subtle-panel p-4 mb-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Selected Course</p>
                      <p className="font-bold text-slate-900">{selectedCourse.title}</p>
                      <p className="text-sm text-slate-500">{selectedCourse.category} • {selectedCourse.duration_weeks ? `${selectedCourse.duration_weeks} Weeks` : "Flexible"}</p>
                    </div>
                    {selectedBatch && (
                      <div className="subtle-panel p-4 mb-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Selected Batch</p>
                        <p className="font-bold text-slate-900">{selectedBatch.name}</p>
                        <p className="text-sm text-slate-500">{formatSchedule(selectedBatch.schedule)}</p>
                      </div>
                    )}
                    <div className="border-t border-slate-100 pt-4 mt-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">Course Fee</span>
                        <span className="text-2xl font-extrabold text-slate-900">৳{Number(selectedCourse.base_fee || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Select a course to see order details.</p>
                )}
              </div>

              <div className="premium-panel p-7">
                <h3 className="text-lg font-extrabold text-slate-900 mb-4">What&apos;s Included</h3>
                <div className="space-y-3">
                  {[
                    "Expert-led live classes",
                    "AI-scored mock tests",
                    "Premium study materials",
                    "Student portal access",
                    "WhatsApp support group",
                    "Certificate of completion",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-sm text-slate-600">
                      <CheckCircle2 size={16} className="text-accent shrink-0" />{item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {showBkashModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-8 backdrop-blur-sm">
          <div className="relative w-full max-w-lg overflow-hidden rounded-[28px] bg-white shadow-2xl">
            <div className="bg-[#e2136e] px-6 py-5 text-white">
              <button type="button" onClick={() => setShowBkashModal(false)} className="absolute right-4 top-4 rounded-full bg-white/15 p-2 text-white transition hover:bg-white/25" aria-label="Close bKash payment modal">
                <X size={18} />
              </button>
              <div className="flex items-center gap-4 pr-10">
                <div className="flex h-14 w-28 items-center justify-center rounded-2xl bg-white p-2">
                  <Image src={BKASH_LOGO_URL} alt="bKash" width={112} height={40} className="max-h-10 w-auto object-contain" unoptimized />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/75">Manual bKash Payment</p>
                  <h3 className="text-xl font-extrabold">Pay Language Academy</h3>
                </div>
              </div>
            </div>

            <form onSubmit={async (e) => { e.preventDefault(); setShowBkashModal(false); await submitCheckout(); }} className="space-y-5 bg-[#f3f3f3] p-6">
              <div className="rounded-2xl border border-[#e2136e]/15 bg-white p-5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Merchant Number</p>
                <p className="mt-2 text-3xl font-black tracking-tight text-[#e2136e]">{bkashMerchantNo}</p>
                <p className="mt-3 text-sm font-medium text-slate-600">Send the course fee to this Language Academy bKash merchant number, then enter your bKash number and transaction ID below.</p>
              </div>

              <div className="grid gap-4">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-800">Your bKash Number</label>
                  <input
                    type="tel"
                    required
                    value={formData.payer_bkash_number}
                    onChange={(e) => setFormData((prev) => ({ ...prev, payer_bkash_number: e.target.value }))}
                    placeholder="01XXXXXXXXX"
                    className="form-input-premium bg-white"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-800">Transaction ID</label>
                  <input
                    type="text"
                    required
                    value={formData.bkash_transaction_id}
                    onChange={(e) => setFormData((prev) => ({ ...prev, bkash_transaction_id: e.target.value.trim() }))}
                    placeholder="Enter bKash TrxID"
                    className="form-input-premium bg-white"
                  />
                </div>
              </div>

              <div className="rounded-2xl bg-white p-4 text-sm text-slate-600">
                <p className="font-bold text-slate-900">Guidelines</p>
                <p className="mt-2">1. Open bKash and pay to the merchant number above.</p>
                <p>2. Enter your own bKash number first.</p>
                <p>3. Enter the transaction ID from your bKash confirmation SMS.</p>
                <p>4. Admin will verify the payment from pending bills.</p>
              </div>

              <button type="submit" disabled={loading || !formData.payer_bkash_number.trim() || !formData.bkash_transaction_id.trim()} className="w-full rounded-2xl bg-[#e2136e] px-5 py-4 text-base font-extrabold text-white shadow-lg shadow-[#e2136e]/25 transition hover:bg-[#c80f60] disabled:cursor-not-allowed disabled:opacity-60">
                {loading ? "Submitting..." : "Submit bKash Details"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EnrollPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center pt-32"><Loader2 className="animate-spin text-primary" size={32} /></div>}>
      <CheckoutForm />
    </Suspense>
  );
}
