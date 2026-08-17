"use client";

import { useState } from "react";
import { CalendarCheck, CheckCircle2, LoaderCircle, Send } from "lucide-react";
import { getClientApiUrl } from "@/lib/api";
import { formatMoney } from "@/lib/shortStay";

const fieldClass = "mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

async function requestJson(path, options) {
  const response = await fetch(getClientApiUrl(path), options);
  const text = await response.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { message: text };
    }
  }
  if (!response.ok) {
    throw new Error(body?.error || body?.message || `Request failed (${response.status})`);
  }
  return body || {};
}

function dateNights(checkIn, checkOut) {
  const start = new Date(`${checkIn}T00:00:00`);
  const end = new Date(`${checkOut}T00:00:00`);
  return Math.round((end - start) / 86400000);
}

export default function BookingRequestForm({ listing, initialValues = {} }) {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    check_in_date: initialValues.checkIn || "",
    check_out_date: initialValues.checkOut || "",
    adults_count: String(initialValues.adults || 1),
    children_count: String(initialValues.children || 0),
    message: "",
  });
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [reference, setReference] = useState("");
  const [quote, setQuote] = useState(null);

  const update = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    if (status === "error") {
      setStatus("idle");
      setMessage("");
    }
  };

  const validate = () => {
    const adults = Number(form.adults_count);
    const children = Number(form.children_count);
    if (!form.full_name.trim()) return "Enter your full name.";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return "Enter a valid email address.";
    if (!form.phone.trim()) return "Enter a phone number so our team can contact you.";
    if (!Number.isInteger(adults) || adults < 1) return "At least one adult guest is required.";
    if (!Number.isInteger(children) || children < 0) return "Children must be zero or more.";
    if (listing.maxGuests && adults + children > listing.maxGuests) {
      return `This stay accommodates up to ${listing.maxGuests} guests.`;
    }
    if (!form.check_in_date || !form.check_out_date) return "Select both check-in and check-out dates.";
    if (form.check_in_date && form.check_out_date && dateNights(form.check_in_date, form.check_out_date) < 1) {
      return "Check-out must be after check-in.";
    }
    return "";
  };

  const submit = async (event) => {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setStatus("error");
      setMessage(validationError);
      return;
    }

    setStatus("submitting");
    setMessage("");
    setReference("");
    setQuote(null);

    try {
      if (form.check_in_date && form.check_out_date) {
        const query = new URLSearchParams({
          check_in: form.check_in_date,
          check_out: form.check_out_date,
        });
        const availabilityResponse = await requestJson(
          `/api/public/short-stay/listings/${encodeURIComponent(listing.slug)}/availability?${query}`
        );
        const availability = availabilityResponse?.data || availabilityResponse;
        const minimumNights = Number(availability?.min_nights || 0);
        if (minimumNights && dateNights(form.check_in_date, form.check_out_date) < minimumNights) {
          throw new Error(`This property requires a minimum stay of ${minimumNights} nights.`);
        }
        if (availability?.available === false) {
          throw new Error("Those dates are not available. Please choose another stay period.");
        }
        if (availability?.quote) setQuote(availability.quote);
      }

      const payload = {
        public_slug: listing.slug,
        guest_name: form.full_name.trim(),
        guest_email: form.email.trim(),
        guest_phone: form.phone.trim(),
        check_in_date: form.check_in_date,
        check_out_date: form.check_out_date,
        adults_count: Number(form.adults_count),
        children_count: Number(form.children_count),
        message: form.message.trim(),
      };
      const enquiryResponse = await requestJson("/api/public/short-stay/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = enquiryResponse?.data || enquiryResponse;
      setReference(String(
        result?.reference || result?.enquiry_reference || result?.enquiry_code || result?.code || result?.id || ""
      ));
      setStatus("success");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "We could not send your request. Please try again.");
    }
  };

  if (status === "success") {
    const quoteTotal = Number(quote?.total || quote?.total_amount || quote?.grand_total);
    return (
      <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-6" role="status">
        <CheckCircle2 className="mb-4 text-emerald-400" size={34} aria-hidden="true" />
        <h2 className="text-xl font-bold text-white">Request received</h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Our short-stay team will confirm availability and contact you. No payment has been taken.
        </p>
        {reference && <p className="mt-4 text-sm font-semibold text-emerald-300">Reference: {reference}</p>}
        {Number.isFinite(quoteTotal) && (
          <p className="mt-2 text-xs text-slate-400">Indicative quote: {formatMoney(quoteTotal, listing.currency)}</p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="mb-6 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
          <CalendarCheck size={20} aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-xl font-bold text-white">Request this stay</h2>
          <p className="mt-1 text-xs leading-5 text-slate-400">Send a request to book. We will confirm before any payment is due.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-semibold text-slate-300 sm:col-span-2">
          Full name <span className="text-blue-400">*</span>
          <input className={fieldClass} name="full_name" autoComplete="name" value={form.full_name} onChange={update} required />
        </label>
        <label className="text-xs font-semibold text-slate-300">
          Email <span className="text-blue-400">*</span>
          <input className={fieldClass} name="email" type="email" autoComplete="email" value={form.email} onChange={update} required />
        </label>
        <label className="text-xs font-semibold text-slate-300">
          Phone <span className="text-blue-400">*</span>
          <input className={fieldClass} name="phone" type="tel" autoComplete="tel" value={form.phone} onChange={update} required />
        </label>
        <label className="text-xs font-semibold text-slate-300">
          Check-in <span className="text-blue-400">*</span>
          <input className={fieldClass} name="check_in_date" type="date" value={form.check_in_date} onChange={update} required />
        </label>
        <label className="text-xs font-semibold text-slate-300">
          Check-out <span className="text-blue-400">*</span>
          <input className={fieldClass} name="check_out_date" type="date" min={form.check_in_date || undefined} value={form.check_out_date} onChange={update} required />
        </label>
        <label className="text-xs font-semibold text-slate-300">
          Adults <span className="text-blue-400">*</span>
          <input className={fieldClass} name="adults_count" type="number" min="1" max={listing.maxGuests || undefined} value={form.adults_count} onChange={update} required />
        </label>
        <label className="text-xs font-semibold text-slate-300">
          Children
          <input className={fieldClass} name="children_count" type="number" min="0" max={listing.maxGuests || undefined} value={form.children_count} onChange={update} />
        </label>
        <label className="text-xs font-semibold text-slate-300 sm:col-span-2">
          Message
          <textarea className={`${fieldClass} min-h-24 resize-y`} name="message" placeholder="Arrival time, purpose of stay, or anything we should know" value={form.message} onChange={update} />
        </label>
      </div>

      <div className="mt-4 min-h-6 text-sm" aria-live="polite">
        {status === "error" && <p className="text-rose-300">{message}</p>}
      </div>

      <button
        type="submit"
        disabled={status === "submitting"}
        className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-wait disabled:opacity-70"
      >
        {status === "submitting" ? (
          <><LoaderCircle className="animate-spin" size={18} aria-hidden="true" /> Checking and sending...</>
        ) : (
          <><Send size={17} aria-hidden="true" /> Send booking request</>
        )}
      </button>
    </form>
  );
}
