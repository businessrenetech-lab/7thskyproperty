"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, Plus, Trash2 } from "lucide-react";

const emptyEducation = { exam_name: "", institution_name: "", passing_year: "", result: "" };

const pteReasonOptions = [
  { value: "study_abroad", label: "Study abroad" },
  { value: "work", label: "Work" },
  { value: "migration_visa", label: "Migration and visa applications" },
  { value: "professional_registration", label: "Professional registration" },
  { value: "build_confidence", label: "Build confidence in English" },
  { value: "others", label: "Others" },
];

const reasonsRequiringCountry = new Set(["study_abroad", "work", "migration_visa"]);

function StudentBookingForm() {
  const searchParams = useSearchParams();
  const branchId = searchParams.get("branch") || searchParams.get("branch_id") || "";
  const channel = searchParams.get("channel") === "kiosk" ? "kiosk" : "manual";

  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    course_id: "",
    batch_id: "",
    first_name: "",
    middle_name: "",
    last_name: "",
    mobile_no: "",
    email: "",
    date_of_birth: "",
    father_name: "",
    mother_name: "",
    nid_birth_cert: "",
    current_address: "",
    permanent_address: "",
    course_reason: "",
    preferred_country: "",
    other_reason: "",
    english_level: "",
    profession: "",
    message: "",
    educational_details: [
      { exam_name: "SSC", institution_name: "", passing_year: "", result: "" },
      { exam_name: "HSC", institution_name: "", passing_year: "", result: "" },
    ],
    employment_details: "",
  });

  const selectedCourse = useMemo(
    () => courses.find((course) => String(course.id) === String(formData.course_id)),
    [courses, formData.course_id]
  );

  useEffect(() => {
    if (!branchId) {
      setLoadingCourses(false);
      return;
    }
    setLoadingCourses(true);
    fetch(`/api/public/courses?branch_id=${encodeURIComponent(branchId)}&booking=true`)
      .then((res) => res.json())
      .then((data) => setCourses(Array.isArray(data) ? data : []))
      .catch(() => setCourses([]))
      .finally(() => setLoadingCourses(false));
  }, [branchId]);

  useEffect(() => {
    if (!branchId || !formData.course_id) {
      setBatches([]);
      return;
    }

    fetch(`/api/public/courses/${formData.course_id}/batches?branch_id=${encodeURIComponent(branchId)}&booking=true`)
      .then((res) => res.json())
      .then((data) => setBatches(Array.isArray(data) ? data : []))
      .catch(() => setBatches([]));
  }, [branchId, formData.course_id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "course_id" ? { batch_id: "" } : {}),
      ...(name === "course_reason" && !reasonsRequiringCountry.has(value) ? { preferred_country: "" } : {}),
      ...(name === "course_reason" && value !== "others" ? { other_reason: "" } : {}),
    }));
  };

  const selectedReason = pteReasonOptions.find((option) => option.value === formData.course_reason);
  const shouldAskCountry = reasonsRequiringCountry.has(formData.course_reason);

  const handleEducationChange = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      educational_details: prev.educational_details.map((row, rowIndex) => (
        rowIndex === index ? { ...row, [field]: value } : row
      )),
    }));
  };

  const addEducationRow = () => {
    setFormData((prev) => ({
      ...prev,
      educational_details: [...prev.educational_details, { ...emptyEducation }],
    }));
  };

  const removeEducationRow = (index) => {
    setFormData((prev) => ({
      ...prev,
      educational_details: prev.educational_details.filter((_, rowIndex) => rowIndex !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!branchId) {
      setError("This booking link is missing its branch. Please ask staff for the correct QR/link.");
      return;
    }

    setStatus("loading");
    setError("");

    try {
      const name = `${formData.first_name} ${formData.last_name}`.trim();
      const response = await fetch("/api/public/student-bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          name,
          branch_id: branchId,
          channel,
          source: "walk_in",
          phone: formData.mobile_no,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Failed to submit booking");
      setStatus("success");
    } catch (err) {
      setError(err.message || "Failed to submit booking. Please try again.");
      setStatus("error");
    }
  };

  if (!branchId) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-20">
        <div className="mx-auto max-w-xl rounded-3xl border border-red-100 bg-white p-8 text-center shadow-xl">
          <h1 className="text-2xl font-extrabold text-slate-900">Invalid Booking Link</h1>
          <p className="mt-3 text-slate-600">This QR/link must include a branch ID. Please ask the branch team for the correct student booking link.</p>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-20">
        <div className="mx-auto max-w-xl rounded-3xl border border-emerald-100 bg-white p-8 text-center shadow-xl">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 size={40} />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">Booking Submitted</h1>
          <p className="mt-3 text-slate-600">Thank you. Our advisor will review your information and contact you shortly.</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-8 w-full rounded-2xl bg-slate-900 px-6 py-4 font-bold text-white">
            Submit Another Student
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 md:py-12">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 overflow-hidden rounded-[32px] bg-slate-950 p-7 text-white shadow-2xl md:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">Branch Student Booking</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight md:text-5xl">Complete your student information</h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-300 md:text-base">Fill in all available details. This will go directly to our CRM as an interested walk-in lead.</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-xl md:p-8">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">Course Interest</label>
              <select name="course_id" value={formData.course_id} onChange={handleChange} className="form-input-premium" disabled={loadingCourses}>
                <option value="">{loadingCourses ? "Loading courses..." : courses.length === 0 ? "No courses offered by this branch" : "Select course"}</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>{course.title}</option>
                ))}
              </select>
              {!loadingCourses && courses.length === 0 && (
                <p className="mt-2 text-xs font-semibold text-amber-600">This branch has no published courses available for booking yet.</p>
              )}
            </div>
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">Preferred Batch</label>
              <select name="batch_id" value={formData.batch_id} onChange={handleChange} className="form-input-premium" disabled={!selectedCourse || batches.length === 0}>
                <option value="">{selectedCourse ? "Select batch if known" : "Select course first"}</option>
                {batches.map((batch) => (
                  <option key={batch.id} value={batch.id}>{batch.name} {batch.start_date ? `- starts ${batch.start_date}` : ""}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="mb-4 text-lg font-extrabold text-slate-900">Personal Information</h2>
            <div className="grid gap-5 md:grid-cols-3">
              <input required name="first_name" value={formData.first_name} onChange={handleChange} placeholder="First name *" className="form-input-premium" />
              <input name="middle_name" value={formData.middle_name} onChange={handleChange} placeholder="Middle name" className="form-input-premium" />
              <input required name="last_name" value={formData.last_name} onChange={handleChange} placeholder="Last name *" className="form-input-premium" />
              <input required type="tel" name="mobile_no" value={formData.mobile_no} onChange={handleChange} placeholder="Phone number *" className="form-input-premium" />
              <input required type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Email address *" className="form-input-premium" />
              <input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} className="form-input-premium" />
              <input name="father_name" value={formData.father_name} onChange={handleChange} placeholder="Father's name" className="form-input-premium" />
              <input name="mother_name" value={formData.mother_name} onChange={handleChange} placeholder="Mother's name" className="form-input-premium" />
              <input name="nid_birth_cert" value={formData.nid_birth_cert} onChange={handleChange} placeholder="NID / Birth certificate" className="form-input-premium" />
              <input name="profession" value={formData.profession} onChange={handleChange} placeholder="Profession" className="form-input-premium" />
              <select required name="english_level" value={formData.english_level} onChange={handleChange} className="form-input-premium">
                <option value="">English level</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="expert">Expert</option>
              </select>
              <select required name="course_reason" value={formData.course_reason} onChange={handleChange} className="form-input-premium">
                <option value="">Reason for PTE course</option>
                {pteReasonOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              {shouldAskCountry && (
                <input
                  required
                  name="preferred_country"
                  value={formData.preferred_country}
                  onChange={handleChange}
                  placeholder={formData.course_reason === "study_abroad" ? "Desired country" : "Preferred country"}
                  className="form-input-premium md:col-span-3"
                />
              )}
              {formData.course_reason === "others" && (
                <input
                  required
                  name="other_reason"
                  value={formData.other_reason}
                  onChange={handleChange}
                  placeholder="Please tell us your reason"
                  className="form-input-premium md:col-span-3"
                />
              )}
            </div>
            {selectedReason && (
              <p className="mt-3 rounded-2xl bg-cyan-50 px-4 py-3 text-sm font-semibold text-cyan-900">
                Selected reason: {selectedReason.label}
              </p>
            )}
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <textarea name="current_address" value={formData.current_address} onChange={handleChange} placeholder="Current address" className="form-input-premium min-h-[96px]" />
            <textarea name="permanent_address" value={formData.permanent_address} onChange={handleChange} placeholder="Permanent address" className="form-input-premium min-h-[96px]" />
          </div>

          <div className="mt-8">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-extrabold text-slate-900">Education Details</h2>
              <button type="button" onClick={addEducationRow} className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">
                <Plus size={14} /> Add Row
              </button>
            </div>
            <div className="space-y-3">
              {formData.educational_details.map((row, index) => (
                <div key={`${row.exam_name}-${index}`} className="grid gap-3 rounded-2xl bg-slate-50 p-3 md:grid-cols-[1fr_2fr_1fr_1fr_auto]">
                  <input value={row.exam_name} onChange={(e) => handleEducationChange(index, "exam_name", e.target.value)} placeholder="Exam" className="form-input-premium" />
                  <input value={row.institution_name} onChange={(e) => handleEducationChange(index, "institution_name", e.target.value)} placeholder="Institution" className="form-input-premium" />
                  <input value={row.passing_year} onChange={(e) => handleEducationChange(index, "passing_year", e.target.value)} placeholder="Year" className="form-input-premium" />
                  <input value={row.result} onChange={(e) => handleEducationChange(index, "result", e.target.value)} placeholder="Result" className="form-input-premium" />
                  <button type="button" onClick={() => removeEducationRow(index)} disabled={formData.educational_details.length === 1} className="flex items-center justify-center rounded-xl border border-red-100 px-3 text-red-500 disabled:opacity-40">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <textarea name="employment_details" value={formData.employment_details} onChange={handleChange} placeholder="Employment details" className="form-input-premium min-h-[96px]" />
            <textarea name="message" value={formData.message} onChange={handleChange} placeholder="Any note for our advisor" className="form-input-premium min-h-[96px]" />
          </div>

          {error && <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-600">{error}</div>}

          <button type="submit" disabled={status === "loading"} className="mt-8 flex w-full items-center justify-center rounded-2xl bg-slate-950 px-6 py-4 text-base font-extrabold text-white disabled:opacity-60">
            {status === "loading" ? <><Loader2 size={20} className="mr-2 animate-spin" /> Submitting...</> : "Submit Student Booking"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function StudentBookingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={32} /></div>}>
      <StudentBookingForm />
    </Suspense>
  );
}
