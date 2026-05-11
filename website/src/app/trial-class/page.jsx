"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, BookOpen, CheckCircle2, Globe2, Loader2, Mail, Phone, Send, UserRound } from "lucide-react";
import { getFbHeaders } from "@/components/FacebookPixel";

const destinationOptions = ["Australia", "United Kingdom", "USA", "Canada", "New Zealand", "Europe", "Others"];
const normalizeChannel = (value) => (value === "kiosk" ? "kiosk" : "manual");

export default function TrialClassPage() {
  const [branchId, setBranchId] = useState("");
  const [branchName, setBranchName] = useState("");
  const [channel, setChannel] = useState("manual");
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState({ name: "", phone: "", email: "", course_id: "", destination_country: "" });
  const [loadingBranch, setLoadingBranch] = useState(true);
  const [loadingCourses, setLoadingCourses] = useState(false);
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

  useEffect(() => {
    if (!branchId) {
      setCourses([]);
      return;
    }

    let cancelled = false;
    setLoadingCourses(true);
    fetch(`/api/public/courses?branch_id=${encodeURIComponent(branchId)}&booking=true`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setCourses(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setCourses([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingCourses(false);
      });

    return () => { cancelled = true; };
  }, [branchId]);

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
    if (!form.course_id) {
      setStatus("error");
      setErrorMessage("Please select a course for your trial class.");
      return;
    }

    const selectedCourse = courses.find((course) => String(course.id) === String(form.course_id));

    setStatus("loading");
    setErrorMessage("");
    try {
      const res = await fetch("/api/public/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getFbHeaders() },
        body: JSON.stringify({
          ...form,
          branch_id: branchId,
          channel,
          subject: "Trial Class Booking",
          lead_type: "trial_class",
          source: "Trial Class Booking",
          course_interest: selectedCourse?.title || "",
          message: `Trial class requested for ${selectedCourse?.title || "selected course"} from ${channel} branch link`,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to book trial class");
      setStatus("success");
      setForm({ name: "", phone: "", email: "", course_id: "", destination_country: "" });
    } catch (err) {
      setStatus("error");
      setErrorMessage(err.message || "There was a problem booking your trial class. Please call us instead.");
    }
  };

  const invalidLink = !loadingBranch && !branchId;

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50 px-6 py-14 md:py-20">
        <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="container-shell relative z-10">
          <div className="mx-auto max-w-3xl text-center">
            <span className="eyebrow bg-white text-primary shadow-sm">
              Free Trial Class
            </span>
            <h1 className="mt-6 text-4xl font-black tracking-tight text-slate-950 md:text-6xl">
              Book your trial class
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base font-medium leading-7 text-slate-600 md:text-lg">
              Choose your course and destination. Our advisor will confirm your schedule from the selected branch.
            </p>
          </div>
        </div>
      </section>

      <section className="relative -mt-8 px-6 pb-20">
        <div className="mx-auto max-w-2xl">
          <div className="premium-panel border-t-4 border-t-primary p-6 shadow-[0_24px_70px_-32px_rgba(15,23,42,0.35)] md:p-9">
            {loadingBranch ? (
              <div className="flex min-h-[320px] items-center justify-center text-slate-500">
                <Loader2 className="mr-2 animate-spin" size={20} /> Loading trial link...
              </div>
            ) : invalidLink ? (
              <div className="rounded-[24px] border border-red-100 bg-red-50 p-8 text-center">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600">
                  <AlertTriangle size={28} />
                </div>
                <h2 className="mb-3 text-2xl font-black text-slate-950">Invalid Trial Link</h2>
                <p className="mb-6 text-sm leading-6 text-red-700">
                  This trial class link is missing valid branch information. Please ask an advisor for the correct branch-specific link.
                </p>
                <Link href="/contact" className="primary-btn inline-flex items-center justify-center gap-2 px-5 py-3 text-sm">
                  Contact advisor <ArrowRight size={16} />
                </Link>
              </div>
            ) : status === "success" ? (
              <div className="rounded-[24px] border border-emerald-100 bg-emerald-50 p-8 text-center">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                  <CheckCircle2 size={34} />
                </div>
                <h2 className="mb-3 text-2xl font-black text-slate-950">Trial Request Received</h2>
                <p className="mb-7 text-sm leading-6 text-emerald-800">
                  Thank you. Our {branchName} advisor will call you shortly to confirm your trial class.
                </p>
                <button type="button" onClick={() => setStatus("idle")} className="secondary-btn w-full py-3">
                  Book another trial
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="text-center">
                  <p className="mb-2 text-xs font-black uppercase tracking-[0.22em] text-primary">{branchName}</p>
                  <h2 className="text-3xl font-black tracking-tight text-slate-950">Reserve a Trial Class</h2>
                  <p className="mt-3 text-sm leading-6 text-slate-500">Branch is locked from your booking link.</p>
                </div>

                {status === "error" && (
                  <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">
                    <AlertTriangle className="mt-0.5 shrink-0" size={18} />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="grid gap-5 md:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="text-sm font-extrabold text-slate-700">Student Name <span className="text-primary">*</span></span>
                    <div className="relative">
                      <UserRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={19} />
                      <input name="name" value={form.name} onChange={handleChange} required className="form-input-premium pl-12 shadow-inner" placeholder="Student full name" />
                    </div>
                  </label>

                  <label className="block space-y-2">
                    <span className="text-sm font-extrabold text-slate-700">Phone Number <span className="text-primary">*</span></span>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={19} />
                      <input type="tel" name="phone" value={form.phone} onChange={handleChange} required className="form-input-premium pl-12 shadow-inner" placeholder="01XXXXXXXXX" />
                    </div>
                  </label>
                </div>

                <label className="block space-y-2">
                  <span className="text-sm font-extrabold text-slate-700">Email Address <span className="text-primary">*</span></span>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={19} />
                    <input type="email" name="email" value={form.email} onChange={handleChange} required className="form-input-premium pl-12 shadow-inner" placeholder="student@email.com" />
                  </div>
                </label>

                <div className="grid gap-5 md:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="text-sm font-extrabold text-slate-700">Interested Course <span className="text-primary">*</span></span>
                    <div className="relative">
                      <BookOpen className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={19} />
                      <select name="course_id" value={form.course_id} onChange={handleChange} required disabled={loadingCourses} className="form-input-premium pl-12 font-medium text-slate-700 shadow-inner disabled:opacity-60">
                        <option value="">{loadingCourses ? "Loading courses..." : courses.length ? "Select course" : "No courses available"}</option>
                        {courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
                      </select>
                    </div>
                  </label>

                  <label className="block space-y-2">
                    <span className="text-sm font-extrabold text-slate-700">Interested Country To Go <span className="text-primary">*</span></span>
                    <div className="relative">
                      <Globe2 className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={19} />
                      <select name="destination_country" value={form.destination_country} onChange={handleChange} required className="form-input-premium pl-12 font-medium text-slate-700 shadow-inner">
                        <option value="">Select country</option>
                        {destinationOptions.map((country) => <option key={country} value={country}>{country}</option>)}
                      </select>
                    </div>
                  </label>
                </div>

                <button type="submit" disabled={status === "loading" || loadingCourses} className="primary-btn w-full py-4 text-base tracking-wide shadow-lg disabled:opacity-70">
                  <span className="flex items-center justify-center gap-2">
                    {status === "loading" ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                    {status === "loading" ? "Booking..." : "Book Trial Class"}
                  </span>
                </button>

                <p className="text-center text-xs font-semibold leading-5 text-slate-500">
                  No payment is required. Our advisor will call to confirm your trial schedule.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
