"use client";

import React, { useState } from "react";
import {
  Check,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  Mail,
  Globe,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  Loader2,
} from "lucide-react";

const SERVICE_ZONES = [
  "Prime Residential Enclave",
  "Diplomatic & Executive Sector",
  "Central Metropolitan Hub",
  "Northern Residential Zone",
  "Southern Residential Zone",
  "Eastern Urban Sector",
  "Suburban Estate / Gated Community",
  "Corporate & Commercial District",
  "Other Area",
];

const TIME_SLOTS = [
  "Morning (9:00 AM - 12:00 PM)",
  "Afternoon (12:00 PM - 4:00 PM)",
  "Evening (4:00 PM - 7:00 PM)",
  "Flexible / Weekend Only",
];

export default function ServiceStepForm({ service }) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submissionResult, setSubmissionResult] = useState(null);

  // Form State
  const [primaryOption, setPrimaryOption] = useState(
    service?.formConfig?.equipmentOptions?.[0] || ""
  );
  const [capacity, setCapacity] = useState("");
  const [selectedScopes, setSelectedScopes] = useState([]);
  const [selectedTier, setSelectedTier] = useState(
    service?.serviceOptions?.[0]?.name || ""
  );

  // Location & Schedule
  const [district, setDistrict] = useState("Metropolitan Region");
  const [area, setArea] = useState(SERVICE_ZONES[0]);
  const [customArea, setCustomArea] = useState("");
  const [address, setAddress] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState(TIME_SLOTS[0]);
  const [additionalNotes, setAdditionalNotes] = useState("");

  // Contact & NRB Details
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+880 ");
  const [email, setEmail] = useState("");
  const [isNrb, setIsNrb] = useState(false);
  const [nrbCountry, setNrbCountry] = useState("United Kingdom (UK)");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [commChannel, setCommChannel] = useState("WhatsApp");

  const toggleScope = (scope) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  const handleStep1Next = (e) => {
    e.preventDefault();
    setStep(2);
  };

  const handleStep2Next = (e) => {
    e.preventDefault();
    if (!address.trim()) {
      setSubmitError("Please enter your property address or road number.");
      return;
    }
    setSubmitError("");
    setStep(3);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || phone.trim() === "+880") {
      setSubmitError("Please provide your full name and a valid phone number.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    const finalArea = area === "Other Area" && customArea ? customArea : area;
    const fullAddress = `${finalArea}, ${address}`.trim();

    // Compile comprehensive notes for backend dispatchers
    const notesArray = [
      `Service: ${service.title}`,
      primaryOption ? `Type/Unit: ${primaryOption}` : null,
      capacity ? `Specification/Size: ${capacity}` : null,
      selectedTier ? `Preferred Tier: ${selectedTier}` : null,
      selectedScopes.length > 0 ? `Selected Scopes: ${selectedScopes.join(", ")}` : null,
      preferredTime ? `Time Slot: ${preferredTime}` : null,
      isNrb ? `[NRB Client] Country: ${nrbCountry}, WhatsApp: ${whatsappNumber || phone}` : null,
      `Channel: ${commChannel}`,
      additionalNotes ? `Client Notes: ${additionalNotes}` : null,
    ].filter(Boolean);

    const payload = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || null,
      service_line: service.category || "property-care",
      service_name: service.title,
      address: fullAddress,
      district: district,
      preferred_date: preferredDate || null,
      description: notesArray.join(" | "),
    };

    try {
      const res = await fetch("/api/public-website/service-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to submit request. Please try again.");
      }

      setSubmissionResult({
        enquiryCode: data.enquiry_code || "SSPC-PENDING",
        message: data.message,
        name: name.trim(),
        phone: phone.trim(),
        serviceTitle: service.title,
        area: finalArea,
      });
      setStep(4);
    } catch (err) {
      setSubmitError(err.message || "Network error. Please call +880 1913-373581 directly.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setSubmissionResult(null);
    setSelectedScopes([]);
    setAddress("");
    setAdditionalNotes("");
    setSubmitError("");
  };

  return (
    <div className="w-full rounded-3xl border border-slate-800 bg-slate-950/90 p-6 sm:p-8 lg:p-10 shadow-2xl backdrop-blur-xl">
      {/* Wizard Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-xs font-semibold tracking-wider uppercase text-slate-400 mb-3">
          <span className={step >= 1 ? "text-blue-400" : ""}>1. Requirements</span>
          <span className={step >= 2 ? "text-blue-400" : ""}>2. Location & Date</span>
          <span className={step >= 3 ? "text-blue-400" : ""}>3. Contact / NRB</span>
          <span className={step >= 4 ? "text-emerald-400" : ""}>4. Confirmation</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
      </div>

      {submitError && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{submitError}</span>
        </div>
      )}

      {/* ── STEP 1: SCOPE & REQUIREMENTS ────────────────────────── */}
      {step === 1 && (
        <form onSubmit={handleStep1Next} className="space-y-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-blue-400">Step 1 of 3</span>
            <h3 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
              Select Your {service?.formConfig?.equipmentTypeLabel || "Service Scope"}
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Specify your property details so our team arrives with the precise equipment and technicians.
            </p>
          </div>

          {/* Equipment / Space Type Options */}
          {service?.formConfig?.equipmentOptions && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                {service.formConfig.equipmentTypeLabel || "Property / System Type"}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {service.formConfig.equipmentOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setPrimaryOption(opt)}
                    className={`flex items-center justify-between rounded-xl border p-3.5 text-left text-xs font-semibold transition ${
                      primaryOption === opt
                        ? "border-blue-500 bg-blue-600/15 text-white shadow-lg shadow-blue-500/10"
                        : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-white"
                    }`}
                  >
                    <span>{opt}</span>
                    {primaryOption === opt && <Check size={14} className="text-blue-400 shrink-0 ml-2" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Capacity / Size Input */}
          {service?.formConfig?.capacityLabel && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                {service.formConfig.capacityLabel}
              </label>
              <input
                type="text"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder={service.formConfig.capacityPlaceholder || "e.g. 2,000 Gallons / 1,500 Sq.Ft"}
                className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          )}

          {/* Specific Deliverables Checkboxes */}
          {service?.formConfig?.specificOptions && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Included Deliverables / Add-On Tasks
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {service.formConfig.specificOptions.map((item) => {
                  const isChecked = selectedScopes.includes(item);
                  return (
                    <label
                      key={item}
                      onClick={() => toggleScope(item)}
                      className={`flex items-start gap-2.5 rounded-xl border p-3 cursor-pointer text-xs transition ${
                        isChecked
                          ? "border-blue-500/60 bg-blue-600/10 text-white"
                          : "border-slate-800/80 bg-slate-900/40 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="mt-0.5 rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-0"
                      />
                      <span className="leading-snug">{item}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Service Tier Selection (if available) */}
          {service?.serviceOptions && service.serviceOptions.length > 0 && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Preferred Package / Engagement Model
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {service.serviceOptions.map((tier) => (
                  <div
                    key={tier.name}
                    onClick={() => setSelectedTier(tier.name)}
                    className={`cursor-pointer rounded-xl border p-3 transition ${
                      selectedTier === tier.name
                        ? "border-blue-500 bg-blue-600/10 text-white"
                        : "border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white">{tier.name}</span>
                      {tier.tag && (
                        <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-bold text-blue-400">
                          {tier.tag}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight">{tier.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-xs font-bold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-500 active:scale-[0.98]"
            >
              Continue to Location & Date <ArrowRight size={15} />
            </button>
          </div>
        </form>
      )}

      {/* ── STEP 2: LOCATION & SCHEDULE ─────────────────────────── */}
      {step === 2 && (
        <form onSubmit={handleStep2Next} className="space-y-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-blue-400">Step 2 of 3</span>
            <h3 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
              Property Location & Preferred Timing
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Our service engineers cover all major hubs across all managed sectors and service zones.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Region */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Region / Territory
              </label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-xs sm:text-sm text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="Metropolitan Region">Metropolitan Region</option>
                <option value="Central Sector">Central Sector</option>
                <option value="Northern Territory">Northern Territory</option>
                <option value="Southern Zone">Southern Zone</option>
                <option value="Eastern Territory">Eastern Territory</option>
                <option value="Suburban & Extended">Suburban & Extended Region</option>
              </select>
            </div>

            {/* Service Sector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Service Sector / Neighborhood
              </label>
              <select
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-xs sm:text-sm text-white focus:border-blue-500 focus:outline-none"
              >
                {SERVICE_ZONES.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {area === "Other Area" && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Specify Area Name
              </label>
              <input
                type="text"
                value={customArea}
                onChange={(e) => setCustomArea(e.target.value)}
                placeholder="e.g. Sector 5, Phase 2, Highland Enclave"
                className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
              />
            </div>
          )}

          {/* Full Address */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              Building Name / Road / Holding Number <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Flat 4B, Building 12, Road 5"
              className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Preferred Date */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
                <Calendar size={13} className="text-blue-400" /> Preferred Date
              </label>
              <input
                type="date"
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-sm text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Time Slot */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
                <Clock size={13} className="text-blue-400" /> Preferred Time Slot
              </label>
              <select
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-xs sm:text-sm text-white focus:border-blue-500 focus:outline-none"
              >
                {TIME_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              Special Instructions or Access Notes
            </label>
            <textarea
              rows={2}
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="e.g. Caretaker contact, rooftop ladder access available, key with security guard, urgent inspection requested..."
              className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 px-4 py-3 text-xs font-semibold text-slate-400 hover:bg-slate-900 hover:text-white transition"
            >
              <ArrowLeft size={14} /> Back
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-xs font-bold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-500 active:scale-[0.98]"
            >
              Continue to Contact Details <ArrowRight size={15} />
            </button>
          </div>
        </form>
      )}

      {/* ── STEP 3: CONTACT & NRB/EXPATRIATE ────────────────────── */}
      {step === 3 && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-blue-400">Step 3 of 3</span>
            <h3 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
              Contact & NRB Verification
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Provide your details so our Property Care Desk can confirm technician dispatch and issue your reference.
            </p>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
              <User size={13} className="text-blue-400" /> Full Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Barrister Tareq Ahmed / Dr. Nasrin Sultana"
              className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Phone */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
                <Phone size={13} className="text-blue-400" /> Phone Number <span className="text-rose-400">*</span>
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+880 1712-XXXXXX"
                className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
                <Mail size={13} className="text-blue-400" /> Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@domain.com"
                className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* NRB / Expatriate Toggle Card */}
          <div className="rounded-2xl border border-blue-500/20 bg-blue-950/20 p-4 sm:p-5">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isNrb}
                onChange={(e) => setIsNrb(e.target.checked)}
                className="mt-1 rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-0"
              />
              <div>
                <div className="flex items-center gap-2">
                  <Globe size={15} className="text-blue-400" />
                  <span className="text-xs sm:text-sm font-bold text-white">
                    I am an Expatriate / Non-Resident Bangladeshi (NRB)
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 leading-relaxed">
                  Overseas landlords receive dedicated digital reporting, video inspection walkthroughs, and direct WhatsApp executive liaison.
                </p>
              </div>
            </label>

            {isNrb && (
              <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                    Country of Residence
                  </label>
                  <select
                    value={nrbCountry}
                    onChange={(e) => setNrbCountry(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900/90 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="United Kingdom (UK)">United Kingdom (UK)</option>
                    <option value="United States (USA)">United States (USA)</option>
                    <option value="United Arab Emirates (UAE / Dubai)">United Arab Emirates (UAE / Dubai)</option>
                    <option value="Saudi Arabia (KSA)">Saudi Arabia (KSA)</option>
                    <option value="Canada">Canada</option>
                    <option value="Australia">Australia</option>
                    <option value="Qatar">Qatar</option>
                    <option value="Singapore / Malaysia">Singapore / Malaysia</option>
                    <option value="Other Country">Other Country</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                    Overseas WhatsApp Number
                  </label>
                  <input
                    type="tel"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="+44 / +1 / +971..."
                    className="w-full rounded-xl border border-slate-800 bg-slate-900/90 px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Preferred Communication Channel */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              Preferred Contact Method
            </label>
            <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
              {["WhatsApp", "Direct Call", "Email"].map((ch) => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => setCommChannel(ch)}
                  className={`rounded-xl border p-2.5 text-xs font-semibold transition ${
                    commChannel === ch
                      ? "border-blue-500 bg-blue-600/20 text-white"
                      : "border-slate-800 bg-slate-900/50 text-slate-400 hover:text-white"
                  }`}
                >
                  {ch}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 px-4 py-3 text-xs font-semibold text-slate-400 hover:bg-slate-900 hover:text-white transition disabled:opacity-50"
            >
              <ArrowLeft size={14} /> Back
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-7 py-3.5 text-xs font-bold text-white shadow-lg shadow-blue-600/30 transition hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Logging Request...
                </>
              ) : (
                <>
                  Submit Service Request <ShieldCheck size={16} />
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* ── STEP 4: CONFIRMATION & WHATSAPP DISPATCH ─────────────── */}
      {step === 4 && submissionResult && (
        <div className="py-4 text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck size={32} />
          </div>

          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400">
              <Sparkles size={12} /> Service Request Registered
            </span>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white mt-3">
              Thank You, {submissionResult.name}!
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mt-2 leading-relaxed">
              Your request for <span className="text-white font-semibold">{submissionResult.serviceTitle}</span> in{" "}
              <span className="text-white font-semibold">{submissionResult.area}</span> has been routed to our Property Care Operations team.
            </p>
          </div>

          {/* Reference Badge */}
          <div className="mx-auto max-w-sm rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
              Care Reference Code
            </span>
            <div className="text-xl font-mono font-extrabold text-blue-400 mt-1 tracking-wider">
              {submissionResult.enquiryCode}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Please quote this reference in all correspondence.
            </p>
          </div>

          {/* Instant Actions: WhatsApp & Phone */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <a
              href={`https://wa.me/8801913373581?text=${encodeURIComponent(
                `Hello Seventh Sky Care, I just submitted a service request (${submissionResult.enquiryCode}) for ${submissionResult.serviceTitle} in ${submissionResult.area}. My name is ${submissionResult.name}. Could you please confirm technician schedule?`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-500"
            >
              <MessageSquare size={16} /> Chat on WhatsApp Now
            </a>

            <a
              href="tel:+8801913373581"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-6 py-3.5 text-xs font-semibold text-white hover:border-slate-700 transition"
            >
              <Phone size={15} className="text-blue-400" /> Call Care Desk (+880 1913-373581)
            </a>
          </div>

          <div className="pt-4 border-t border-slate-900">
            <button
              onClick={resetForm}
              className="text-xs text-slate-400 hover:text-white underline underline-offset-4"
            >
              Submit another request or modify specifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
