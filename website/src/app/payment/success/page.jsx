"use client";

import React, { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2, XCircle, ArrowRight, Loader2, Download,
  BookOpen, Calendar, Clock3, User, Mail, Phone, CreditCard,
  GraduationCap, Shield, Receipt, Sparkles, Copy, Check
} from "lucide-react";
import { getFbHeaders } from "@/components/FacebookPixel";

/* ─── Confetti-like celebration dots (pure CSS) ──────────────── */
function CelebrationDots() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: `${4 + Math.random() * 8}px`,
            height: `${4 + Math.random() * 8}px`,
            left: `${Math.random() * 100}%`,
            top: `${-10 + Math.random() * 30}%`,
            background: ['#7bc62e', '#275fa7', '#f59e0b', '#06b6d4', '#ec4899'][Math.floor(Math.random() * 5)],
            opacity: 0.15 + Math.random() * 0.35,
            animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 3}s`,
          }}
        />
      ))}
    </div>
  );
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const paymentRef = searchParams.get("ref");
  const hasFiredPixel = useRef(false);
  const hasFetched = useRef(false);
  const [copied, setCopied] = useState(false);

  const [status, setStatus] = useState("processing"); // processing, success, error
  const [errorMessage, setErrorMessage] = useState("");
  const [details, setDetails] = useState(null);
  const [order, setOrder] = useState(null);

  const formatSchedule = (scheduleStr) => {
    if (!scheduleStr) return "TBA";
    try {
      const sch = JSON.parse(scheduleStr);
      if (sch.days && Array.isArray(sch.days)) {
        const days = sch.days.map(d => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(", ");
        return `${days} \u2022 ${sch.start_time || ""} - ${sch.end_time || ""}`;
      }
    } catch (e) {
      return scheduleStr;
    }
    return scheduleStr;
  };

  // Copy reference to clipboard
  const copyRef = () => {
    navigator.clipboard.writeText(paymentRef || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (!paymentRef) {
      setStatus("error");
      setErrorMessage("No payment reference found.");
      return;
    }
    if (hasFetched.current) return;
    hasFetched.current = true;

    const processPayment = async () => {
      const fbHeaders = getFbHeaders();

      try {
        const res = await fetch("/api/payment/success", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...fbHeaders },
          body: JSON.stringify({ payment_ref: paymentRef }),
        });

        const data = await res.json();

        if (res.ok || data.message === "Payment already processed successfully") {
          setStatus("success");
          setDetails(data);
          setOrder(data.order || null);

          // Fire client-side Purchase pixel event for deduplication
          const isVerifiedPayment = data.order && !['Pay at branch', 'bKash manual'].includes(data.order.payment_method);
          if (!hasFiredPixel.current && typeof window !== "undefined" && window.fbq && isVerifiedPayment) {
            window.fbq("track", "Purchase", {
              currency: data.order.currency || "BDT",
              value: data.order.amount || 0,
              content_name: data.order.course_name,
              content_type: "product",
              content_ids: [String(data.order.course_id || "")],
              num_items: 1,
            });
            hasFiredPixel.current = true;
          }
        } else {
          setStatus("error");
          setErrorMessage(data.error || "Failed to process payment.");
        }
      } catch (err) {
        setStatus("error");
        setErrorMessage("Network error occurred while verifying the payment.");
      }
    };

    processPayment();
  }, [paymentRef]);

  // ─── PROCESSING STATE ──────────────────────────────────────
  if (status === "processing") {
    return (
      <div className="flex flex-col items-center justify-center py-20 min-h-[60vh]">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" style={{ animationDuration: "1.5s" }} />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <Loader2 className="animate-spin text-primary" size={36} />
          </div>
        </div>
        <h2 className="mt-8 text-2xl font-extrabold text-slate-900 tracking-tight">Finalizing Your Enrollment...</h2>
        <p className="mt-3 text-slate-500 max-w-md text-center">
          Please wait while we verify your transaction and prepare your student account.
        </p>
        <div className="mt-8 flex items-center gap-3 bg-white px-6 py-3 rounded-full border border-slate-200 shadow-sm text-sm font-semibold text-slate-600">
          <Shield size={16} className="text-primary" /> Secure verification in progress
        </div>
      </div>
    );
  }

  // ─── ERROR STATE ───────────────────────────────────────────
  if (status === "error") {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center min-h-[60vh]">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-50 border-2 border-red-100 mb-6">
          <XCircle size={40} className="text-red-500" />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900">Verification Failed</h2>
        <p className="mt-4 text-lg text-slate-600 max-w-md mx-auto">{errorMessage}</p>
        <div className="mt-8 flex gap-4">
          <Link href="/contact" className="secondary-btn">Contact Support</Link>
          <Link href="/enroll" className="primary-btn">Try Again</Link>
        </div>
      </div>
    );
  }

  // ─── SUCCESS STATE — PREMIUM ORDER CONFIRMATION ────────────
  const formattedDate = order?.paid_at
    ? new Date(order.paid_at).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const formattedTime = order?.paid_at
    ? new Date(order.paid_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    : new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  const batchStart = order?.batch_start_date
    ? new Date(order.batch_start_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null;

  const isPayAtBranch = order?.payment_method === 'Pay at branch';
  const isManualBkash = order?.payment_method === 'bKash manual';
  const isPendingManual = isPayAtBranch || isManualBkash;

  return (
    <div className="animate-fade-in-up">
      {/* ── Success Hero ─────────────────────────────────────── */}
      <section className="text-center mb-10 relative">
        {!isPendingManual && <CelebrationDots />}

        {/* Animated icon */}
        <div className="relative inline-flex mb-6">
          <div className={`absolute inset-0 rounded-full ${isManualBkash ? 'bg-[#e2136e]/15' : isPayAtBranch ? 'bg-amber-400/15' : 'bg-primary/15'} animate-ping`} style={{ animationDuration: "2s" }} />
          <div className={`relative flex h-24 w-24 items-center justify-center rounded-full shadow-xl ${isManualBkash ? 'bg-gradient-to-br from-[#e2136e] to-[#f14a91] shadow-[#e2136e]/25' : isPayAtBranch ? 'bg-gradient-to-br from-amber-500 to-amber-400 shadow-amber-500/25' : 'bg-gradient-to-br from-primary to-primary/80 shadow-primary/25'}`}>
            {isPendingManual ? <Clock3 size={48} className="text-white" strokeWidth={2.5} /> : <CheckCircle2 size={48} className="text-white" strokeWidth={2.5} />}
          </div>
        </div>

        <h1 className="text-3xl font-extrabold text-slate-900 md:text-5xl tracking-tight">
          {isManualBkash ? 'Payment Submitted!' : isPayAtBranch ? 'Enrollment Reserved!' : 'Enrollment Confirmed!'}
        </h1>
        <p className="mt-4 text-lg text-slate-500 max-w-xl mx-auto leading-relaxed">
          {isManualBkash ? (
            <>Your bKash payment details were received. Admin will verify the transaction before activating portal access.</>
          ) : isPayAtBranch ? (
            <>Welcome to <span className="font-bold text-primary">Language Academy</span>. Your seat is reserved. Please visit our branch to complete the fee payment.</>
          ) : (
            <>Welcome to <span className="font-bold text-primary">Language Academy</span>. Your payment has been received and your batch seat is secured.</>
          )}
        </p>
      </section>

      {/* ── Order Confirmation Card ──────────────────────────── */}
      <div className="max-w-3xl mx-auto">
        <div className="premium-panel overflow-hidden mb-8">
          {/* Banner */}
          <div className={`px-8 py-5 flex items-center justify-between ${isManualBkash ? 'bg-gradient-to-r from-[#e2136e] to-[#f14a91]' : isPayAtBranch ? 'bg-gradient-to-r from-amber-500 to-amber-400' : 'bg-gradient-to-r from-primary to-primary/90'}`}>
            <div className="flex items-center gap-3">
              <Receipt size={20} className="text-white/80" />
              <span className="text-white font-bold text-sm uppercase tracking-wider">{isManualBkash ? 'Payment Verification Pending' : isPayAtBranch ? 'Reservation Confirmation' : 'Order Confirmation'}</span>
            </div>
            <span className="text-white/70 text-sm font-medium">{formattedDate}</span>
          </div>

          <div className="p-8 md:p-10">
            {/* ── Reference + Student Info ─────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="subtle-panel p-5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  <CreditCard size={14} /> Payment Reference
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-lg font-bold text-slate-900">{paymentRef}</span>
                  <button
                    onClick={copyRef}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
                    title="Copy reference"
                  >
                    {copied ? <Check size={14} className="text-primary" /> : <Copy size={14} className="text-slate-400" />}
                  </button>
                </div>
              </div>
              <div className="subtle-panel p-5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  <User size={14} /> Student
                </div>
                <p className="font-bold text-slate-900 text-lg">{order?.student_name || "Student"}</p>
                {order?.email && (
                  <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
                    <Mail size={12} /> {order.email}
                  </p>
                )}
              </div>
            </div>

            {/* ── Course Details ────────────────────────────── */}
            <div className="border border-slate-100 rounded-2xl overflow-hidden mb-8">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <GraduationCap size={18} className="text-primary" /> Course Details
                </h3>
              </div>
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                    <BookOpen size={24} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xl font-extrabold text-slate-900 tracking-tight">
                      {order?.course_name || "Course Enrollment"}
                    </h4>
                    <div className="flex flex-wrap gap-3 mt-2">
                      {order?.course_category && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                          {order.course_category}
                        </span>
                      )}
                      {order?.course_duration && (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-500 font-medium">
                          <Clock3 size={12} /> {order.course_duration}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Batch info */}
                {order?.batch_name && (
                  <div className="mt-5 rounded-xl bg-accent/5 border border-accent/10 p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Batch</span>
                        <span className="font-bold text-slate-900">{order.batch_name}</span>
                      </div>
                      {order.batch_schedule && (
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Schedule</span>
                          <span className="font-medium text-slate-700">{formatSchedule(order.batch_schedule)}</span>
                        </div>
                      )}
                      {batchStart && (
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Starts</span>
                          <span className="font-medium text-slate-700 flex items-center gap-1">
                            <Calendar size={12} className="text-accent" /> {batchStart}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Payment Summary ──────────────────────────── */}
            <div className="border border-slate-100 rounded-2xl overflow-hidden mb-8">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <Receipt size={18} className="text-primary" /> Payment Summary
                </h3>
              </div>
              <div className="p-6 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Course Fee</span>
                  <span className="font-medium text-slate-900">{'\u09F3'}{Number(order?.amount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Payment Method</span>
                  <span className="font-medium text-slate-700 capitalize">{order?.payment_method || "Card"}</span>
                </div>
                {isManualBkash && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Student bKash Number</span>
                      <span className="font-medium text-slate-700">{order?.payer_bkash_number || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">bKash Transaction ID</span>
                      <span className="font-mono font-medium text-slate-700">{order?.bkash_transaction_id || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Merchant Number</span>
                      <span className="font-medium text-[#e2136e]">{order?.bkash_merchant_no || 'N/A'}</span>
                    </div>
                  </>
                )}
                {!isPendingManual && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Transaction Time</span>
                    <span className="font-medium text-slate-700">{formattedTime}</span>
                  </div>
                )}
                {details?.enrollment_id && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Enrollment ID</span>
                    <span className="font-mono font-medium text-slate-700">#{details.enrollment_id}</span>
                  </div>
                )}
                <hr className="border-slate-100" />
                <div className="flex justify-between items-center pt-1">
                  <span className="font-bold text-slate-900">{isManualBkash ? 'Pending Verification' : isPayAtBranch ? 'Amount Due' : 'Total Paid'}</span>
                  <span className={`text-2xl font-extrabold ${isManualBkash ? 'text-[#e2136e]' : isPayAtBranch ? 'text-amber-500' : 'text-primary'}`}>
                    {'\u09F3'}{Number(order?.amount || 0).toLocaleString()}
                  </span>
                </div>
                <div className={`flex items-center justify-end gap-2 text-xs font-semibold ${isManualBkash ? 'text-[#e2136e]' : isPayAtBranch ? 'text-amber-500' : 'text-primary'}`}>
                  {isManualBkash ? <><Clock3 size={14} /> Payment Pending &mdash; bKash Verification</> : isPayAtBranch ? <><Clock3 size={14} /> Payment Pending &mdash; Pay at Branch</> : <><CheckCircle2 size={14} /> Payment Confirmed</>}
                </div>
              </div>
            </div>

            {/* ── What's Next ──────────────────────────────── */}
            <div className="rounded-2xl bg-gradient-to-br from-accent/5 to-primary/5 border border-accent/10 p-6">
              <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-4">
                <Sparkles size={18} className="text-accent" /> What Happens Next?
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(isManualBkash ? [
                  { icon: CreditCard, text: "Admin verifies your submitted bKash TrxID" },
                  { icon: BookOpen, text: "Student portal access after verification" },
                  { icon: Calendar, text: "Batch schedule notification coming soon" },
                  { icon: Phone, text: "Our team will reach out if anything needs correction" },
                ] : isPayAtBranch ? [
                  { icon: CreditCard, text: "Visit our branch to complete fee payment" },
                  { icon: BookOpen, text: "Student portal access after payment" },
                  { icon: Calendar, text: "Batch schedule notification coming soon" },
                  { icon: Phone, text: "Our team will reach out on WhatsApp" },
                ] : [
                  { icon: Mail, text: "Login credentials sent to your email" },
                  { icon: BookOpen, text: "Access the Student Portal immediately" },
                  { icon: Calendar, text: "Batch schedule notification coming soon" },
                  { icon: Phone, text: "Our team will reach out on WhatsApp" },
                ]).map(({ icon: Icon, text }, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white border border-slate-200 shadow-sm">
                      <Icon size={14} className="text-accent" />
                    </div>
                    <span className="text-sm text-slate-600 font-medium leading-snug pt-1">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Action Buttons ──────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-4">
          {isPendingManual ? (
            <Link href="/courses" className="accent-btn py-4 px-8 text-base shadow-xl shadow-accent/20">
              <BookOpen size={20} /> Browse More Courses
            </Link>
          ) : (
            <a href="/student" className="accent-btn py-4 px-8 text-base shadow-xl shadow-accent/20">
              <GraduationCap size={20} /> Go to Student Portal
            </a>
          )}
          <Link href="/" className="secondary-btn py-4 px-8 text-base">
            Back to Home <ArrowRight size={18} />
          </Link>
        </div>

        {/* ── Help Banner ─────────────────────────────────── */}
        <div className="text-center mt-6 mb-4">
          <p className="text-sm text-slate-400">
            Need help? Contact us at{" "}
            <a href="tel:+8801913373581" className="text-primary font-semibold hover:underline">
              +880 1913-373581
            </a>{" "}
            or{" "}
            <Link href="/contact" className="text-primary font-semibold hover:underline">
              submit a support request
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <div className="min-h-screen bg-slate-50 pt-32 pb-24">
      <div className="container-shell">
        <Suspense
          fallback={
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="animate-spin text-primary mb-4" size={40} />
              <p className="text-slate-500 font-medium">Loading confirmation...</p>
            </div>
          }
        >
          <SuccessContent />
        </Suspense>
      </div>
    </div>
  );
}
