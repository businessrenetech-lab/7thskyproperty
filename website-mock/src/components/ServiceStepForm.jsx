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

    // Compile notes
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
    <div className="w-full rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 lg:p-10 shadow-[0_15px_40px_-10px_rgba(1,42,78,0.1)]">
      {/* Wizard Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          <span className={step >= 1 ? "text-[#00AEEF]" : ""}>1. Scope & Specs</span>
          <span className={step >= 2 ? "text-[#00AEEF]" : ""}>2. Location & Date</span>
          <span className={step >= 3 ? "text-[#00AEEF]" : ""}>3. Contact & NRB</span>
          <span className={step >= 4 ? "text-emerald-600" : ""}>4. Confirmation</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#00AEEF] to-[#012a4e] transition-all duration-500"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
      </div>

      {submitError && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{submitError}</span>
        </div>
      )}

      {/* ── STEP 1: SCOPE & SPECS ─────────────────────────────────── */}
      {step === 1 && (
        <form onSubmit={handleStep1Next} className="space-y-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#00AEEF]">Step 1 of 3</span>
            <h3 className="text-xl sm:text-2xl font-black text-[#012a4e] mt-1">
              Configure Your {service?.formConfig?.equipmentTypeLabel || "Service Scope"}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Specify your property details so our engineering crew prepares the exact tools and materials.
            </p>
          </div>

          {/* Primary Option Pills */}
          {service?.formConfig?.equipmentOptions && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                {service.formConfig.equipmentTypeLabel || "Type"}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {service.formConfig.equipmentOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setPrimaryOption(opt)}
                    className={`flex items-center justify-between rounded-xl border p-3.5 text-left text-xs font-semibold transition ${
                      primaryOption === opt
                        ? "border-[#00AEEF] bg-[#00AEEF]/10 text-[#012a4e] shadow-sm font-bold"
                        : "border-slate-200 bg-slate-50/70 text-slate-600 hover:border-slate-300 hover:text-slate-900"
                    }`}
                  >
                    <span>{opt}</span>
                    {primaryOption === opt && <Check size={15} className="text-[#00AEEF] shrink-0 ml-2" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Capacity / Floor Area */}
          {service?.formConfig?.capacityLabel && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                {service.formConfig.capacityLabel}
              </label>
              <input
                type="text"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder={service.formConfig.capacityPlaceholder || "e.g. 2,200 Sq.Ft / 3-Bed Unit"}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#012a4e] placeholder:text-slate-400 focus:border-[#00AEEF] focus:outline-none focus:ring-2 focus:ring-[#00AEEF]/20"
              />
            </div>
          )}

          {/* Sub-Services Checkboxes */}
          {service?.formConfig?.specificOptions && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
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
                          ? "border-[#00AEEF] bg-[#00AEEF]/5 text-[#012a4e] font-semibold"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="mt-0.5 rounded border-slate-300 text-[#00AEEF] focus:ring-0"
                      />
                      <span className="leading-snug">{item}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Packages */}
          {service?.serviceOptions && service.serviceOptions.length > 0 && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Preferred Tier / Engagement Model
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {service.serviceOptions.map((tier) => (
                  <div
                    key={tier.name}
                    onClick={() => setSelectedTier(tier.name)}
                    className={`cursor-pointer rounded-xl border p-3.5 transition ${
                      selectedTier === tier.name
                        ? "border-[#00AEEF] bg-[#00AEEF]/10 text-[#012a4e]"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-[#012a4e]">{tier.name}</span>
                      {tier.tag && (
                        <span className="rounded bg-[#00AEEF]/15 px-1.5 py-0.5 text-[10px] font-bold text-[#00AEEF]">
                          {tier.tag}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">{tier.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full bg-[#00AEEF] hover:bg-[#0096ce] px-7 py-3.5 text-xs font-bold text-white shadow-lg shadow-[#00AEEF]/25 transition active:scale-[0.98] cursor-pointer"
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
            <span className="text-xs font-bold uppercase tracking-widest text-[#00AEEF]">Step 2 of 3</span>
            <h3 className="text-xl sm:text-2xl font-black text-[#012a4e] mt-1">
              Property Location & Preferred Timing
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Seventh Sky engineering teams operate rapid field dispatch across all managed sectors and service zones.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Region / Territory
              </label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs sm:text-sm text-[#012a4e] focus:border-[#00AEEF] focus:outline-none"
              >
                <option value="Metropolitan Region">Metropolitan Region</option>
                <option value="Central Sector">Central Sector</option>
                <option value="Northern Territory">Northern Territory</option>
                <option value="Southern Zone">Southern Zone</option>
                <option value="Eastern Territory">Eastern Territory</option>
                <option value="Suburban & Extended">Suburban & Extended Region</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Service Sector / Neighborhood
              </label>
              <select
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs sm:text-sm text-[#012a4e] focus:border-[#00AEEF] focus:outline-none"
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
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Specify Area Name
              </label>
              <input
                type="text"
                value={customArea}
                onChange={(e) => setCustomArea(e.target.value)}
                placeholder="e.g. Sector 5, Phase 2, Highland Enclave"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#012a4e] placeholder:text-slate-400 focus:border-[#00AEEF] focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Building Name / Road / Holding Number <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Flat 4B, Building 12, Road 5"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#012a4e] placeholder:text-slate-400 focus:border-[#00AEEF] focus:outline-none focus:ring-2 focus:ring-[#00AEEF]/20"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                <Calendar size={13} className="text-[#00AEEF]" /> Preferred Date
              </label>
              <input
                type="date"
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#012a4e] focus:border-[#00AEEF] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                <Clock size={13} className="text-[#00AEEF]" /> Time Slot
              </label>
              <select
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs sm:text-sm text-[#012a4e] focus:border-[#00AEEF] focus:outline-none"
              >
                {TIME_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Special Instructions or Access Notes
            </label>
            <textarea
              rows={2}
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="e.g. Caretaker contact, rooftop ladder access available, key with security guard, urgent inspection requested..."
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs sm:text-sm text-[#012a4e] placeholder:text-slate-400 focus:border-[#00AEEF] focus:outline-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-5 py-3 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-[#012a4e] transition cursor-pointer"
            >
              <ArrowLeft size={14} /> Back
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full bg-[#00AEEF] hover:bg-[#0096ce] px-7 py-3.5 text-xs font-bold text-white shadow-lg shadow-[#00AEEF]/25 transition active:scale-[0.98] cursor-pointer"
            >
              Continue to Contact Details <ArrowRight size={15} />
            </button>
          </div>
        </form>
      )}

      {/* ── STEP 3: CONTACT & NRB DETAILS ────────────────────────── */}
      {step === 3 && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#00AEEF]">Step 3 of 3</span>
            <h3 className="text-xl sm:text-2xl font-black text-[#012a4e] mt-1">
              Client & NRB Details
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              We will log your official reference number and dispatch the assignment to our field operations desk.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
              <User size={13} className="text-[#00AEEF]" /> Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Barrister Tareq Ahmed / Engr. Tanvir Hasan"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#012a4e] placeholder:text-slate-400 focus:border-[#00AEEF] focus:outline-none focus:ring-2 focus:ring-[#00AEEF]/20"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                <Phone size={13} className="text-[#00AEEF]" /> Phone Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+880 1712-XXXXXX"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#012a4e] placeholder:text-slate-400 focus:border-[#00AEEF] focus:outline-none focus:ring-2 focus:ring-[#00AEEF]/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                <Mail size={13} className="text-[#00AEEF]" /> Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@domain.com"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#012a4e] placeholder:text-slate-400 focus:border-[#00AEEF] focus:outline-none"
              />
            </div>
          </div>

          {/* NRB Toggle */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isNrb}
                onChange={(e) => setIsNrb(e.target.checked)}
                className="mt-1 rounded border-slate-300 text-[#00AEEF] focus:ring-0"
              />
              <div>
                <div className="flex items-center gap-2">
                  <Globe size={16} className="text-[#00AEEF]" />
                  <span className="text-xs sm:text-sm font-bold text-[#012a4e]">
                    I am an Expatriate / Non-Resident Bangladeshi (NRB)
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Overseas landlords receive dedicated digital video audits, photographic logs, and executive WhatsApp coordination.
                </p>
              </div>
            </label>

            {isNrb && (
              <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
                    Country of Residence
                  </label>
                  <select
                    value={nrbCountry}
                    onChange={(e) => setNrbCountry(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-[#012a4e] focus:border-[#00AEEF] focus:outline-none"
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
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
                    Overseas WhatsApp Number
                  </label>
                  <input
                    type="tel"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="+44 / +1 / +971..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-[#012a4e] placeholder:text-slate-400 focus:border-[#00AEEF] focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Preferred Contact Method
            </label>
            <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
              {["WhatsApp", "Direct Call", "Email"].map((ch) => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => setCommChannel(ch)}
                  className={`rounded-xl border p-2.5 text-xs font-semibold transition cursor-pointer ${
                    commChannel === ch
                      ? "border-[#00AEEF] bg-[#00AEEF]/10 text-[#012a4e] font-bold"
                      : "border-slate-200 bg-white text-slate-600 hover:text-[#012a4e]"
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
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-5 py-3 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-[#012a4e] transition cursor-pointer disabled:opacity-50"
            >
              <ArrowLeft size={14} /> Back
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-full bg-[#00AEEF] hover:bg-[#0096ce] px-8 py-3.5 text-xs font-bold text-white shadow-lg shadow-[#00AEEF]/30 transition active:scale-[0.98] cursor-pointer disabled:opacity-50"
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

      {/* ── STEP 4: CONFIRMATION ──────────────────────────────────── */}
      {step === 4 && submissionResult && (
        <div className="py-4 text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <ShieldCheck size={34} />
          </div>

          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700">
              <Sparkles size={12} /> Service Request Registered
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-[#012a4e] mt-3">
              Thank You, {submissionResult.name}!
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-2 leading-relaxed">
              Your service request for <span className="font-bold text-[#012a4e]">{submissionResult.serviceTitle}</span> in{" "}
              <span className="font-bold text-[#012a4e]">{submissionResult.area}</span> has been routed to our Property Operations Desk.
            </p>
          </div>

          <div className="mx-auto max-w-sm rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
              Reference Code
            </span>
            <div className="text-xl font-mono font-black text-[#00AEEF] mt-1 tracking-wider">
              {submissionResult.enquiryCode}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Please quote this reference in any communication.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <a
              href={`https://wa.me/8801913373581?text=${encodeURIComponent(
                `Hello Seventh Sky Care, I just submitted a service request (${submissionResult.enquiryCode}) for ${submissionResult.serviceTitle} in ${submissionResult.area}. My name is ${submissionResult.name}. Could you please confirm technician schedule?`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 py-3.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-500"
            >
              <MessageSquare size={16} /> Chat on WhatsApp Now
            </a>

            <a
              href="tel:+8801913373581"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3.5 text-xs font-semibold text-[#012a4e] hover:bg-slate-50 transition"
            >
              <Phone size={15} className="text-[#00AEEF]" /> Call Desk (+880 1913-373581)
            </a>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <button
              onClick={resetForm}
              className="text-xs text-slate-500 hover:text-[#012a4e] underline underline-offset-4 cursor-pointer"
            >
              Submit another request or modify specifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
