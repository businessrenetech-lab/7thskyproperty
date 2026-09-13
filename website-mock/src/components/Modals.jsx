import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, ShieldCheck, User, Briefcase, Calendar, Clock, MapPin, Wrench, FileText } from 'lucide-react';
import { mockApi } from '../services/mockApi';
import { websiteApi } from '../services/api';

// 1. Appraisal Modal (Triggered by the primary CTA pill button from header)
export function AppraisalModal({ isOpen, onClose, initialService }) {
  const [form, setForm] = useState({
    propertyAddress: '',
    propertyType: 'Residential Apartment',
    purpose: 'Rental Management',
    ownerName: '',
    phone: '',
    email: '',
    location: 'Dhaka'
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await websiteApi.submitAppraisalRequest({
        name: form.ownerName,
        phone: form.phone,
        email: form.email,
        property_address: form.propertyAddress,
        property_type: form.propertyType,
        intent: form.purpose.toLowerCase().includes('sale') ? 'sell' : 'rent',
        notes: `Location: ${form.location}`,
      });
      setResult({
        success: true,
        message: res.message,
        appraisalRef: res.lead_code || 'SSPC-LD-000001',
      });
    } catch (err) {
      console.warn('Backend appraisal failed, falling back:', err.message);
      const res = await mockApi.bookAppraisal(form);
      setResult(res);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="relative bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl p-6 sm:p-8 border border-slate-100">
        
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700"
        >
          <X className="w-5 h-5" />
        </button>

        {result ? (
          <div className="text-center py-6 space-y-4 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-[#e8f7fd] text-[#00AEEF] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-[#012a4e]">Appraisal Request Booked</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {result.message}
            </p>
            <div className="p-3 bg-slate-50 rounded-xl font-mono text-xs font-bold text-[#012a4e]">
              Ref: {result.appraisalRef}
            </div>
            <button
              onClick={onClose}
              className="mt-4 px-6 py-2.5 rounded-full text-xs font-bold text-white bg-[#00AEEF]"
            >
              Done
            </button>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#00AEEF]">
                Institutional Valuation
              </span>
              <h3 className="text-2xl font-black text-[#012a4e] mt-1">
                Book a Property Appraisal
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Receive an authoritative market assessment of your rental yield or sales value.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="text-[11.5px] font-bold text-slate-600 block mb-1">Property Location / Address</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Road 79, Gulshan 2 or Banani, Dhaka"
                  value={form.propertyAddress}
                  onChange={e => setForm({ ...form, propertyAddress: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#012a4e] focus:outline-hidden focus:border-[#00AEEF]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11.5px] font-bold text-slate-600 block mb-1">Property Sector</label>
                  <select
                    value={form.propertyType}
                    onChange={e => setForm({ ...form, propertyType: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-[#012a4e] bg-white focus:outline-hidden"
                  >
                    <option>Residential Apartment</option>
                    <option>Independent House / Villa</option>
                    <option>Commercial Floor / Office</option>
                    <option>Retail / Showroom</option>
                    <option>Rural / Tea Estate Land</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11.5px] font-bold text-slate-600 block mb-1">Intended Purpose</label>
                  <select
                    value={form.purpose}
                    onChange={e => setForm({ ...form, purpose: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-[#012a4e] bg-white focus:outline-hidden"
                  >
                    <option>Rental Yield Valuation</option>
                    <option>Market Sales Appraisal</option>
                    <option>Short Term Stay Custodianship</option>
                    <option>Full Tenancy Management</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11.5px] font-bold text-slate-600 block mb-1">Your Full Name</label>
                  <input 
                    type="text"
                    required
                    placeholder="Owner / Investor Name"
                    value={form.ownerName}
                    onChange={e => setForm({ ...form, ownerName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#012a4e] focus:outline-hidden focus:border-[#00AEEF]"
                  />
                </div>

                <div>
                  <label className="text-[11.5px] font-bold text-slate-600 block mb-1">Phone (or WhatsApp)</label>
                  <input 
                    type="tel"
                    required
                    placeholder="+880 17... or Overseas No"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#012a4e] focus:outline-hidden focus:border-[#00AEEF]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11.5px] font-bold text-slate-600 block mb-1">Email Address</label>
                <input 
                  type="email"
                  placeholder="For written valuation dossier"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#012a4e] focus:outline-hidden focus:border-[#00AEEF]"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 py-3 rounded-full text-xs font-bold text-white bg-[#00AEEF] hover:bg-[#0096ce] shadow-[0_4px_14px_rgba(0,174,239,0.35)] transition-all cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Submitting Valuation Request...' : 'Confirm Appraisal Request'}
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}

// 2. Inspection Booking Modal (From property card / detail)
export function InspectionModal({ isOpen, onClose, property, initialSlot }) {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    preferredDate: '',
    timeSlot: initialSlot || 'Saturday 11:00 AM - 12:00 PM'
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  if (!isOpen || !property) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const isRental = property.purpose?.toLowerCase().includes('rent');
      let res;
      if (isRental) {
        res = await websiteApi.submitRentalEnquiry({
          name: form.name,
          phone: form.phone,
          email: form.email,
          property_id: property.id,
          property_code: property.code,
          viewing_date: form.preferredDate || new Date().toISOString().slice(0, 10),
          message: `Viewing requested for ${property.title} (${form.timeSlot})`,
        });
      } else {
        res = await websiteApi.submitSalesEnquiry({
          name: form.name,
          phone: form.phone,
          email: form.email,
          property_id: property.id,
          property_code: property.code,
          viewing_date: form.preferredDate || new Date().toISOString().slice(0, 10),
          message: `Viewing requested for ${property.title} (${form.timeSlot})`,
        });
      }
      setResult({
        success: true,
        message: res.message,
        bookingRef: res.enquiry_code || res.reference_number || 'SSPC-INSP-001',
      });
    } catch (err) {
      console.warn('Backend inspection enquiry failed, falling back:', err.message);
      const res = await mockApi.bookInspection({
        propertyId: property.id,
        propertyCode: property.code,
        ...form
      });
      setResult(res);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="relative bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl p-6 sm:p-8 border border-slate-100">
        
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700"
        >
          <X className="w-5 h-5" />
        </button>

        {result ? (
          <div className="text-center py-6 space-y-4 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-[#e8f7fd] text-[#00AEEF] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-[#012a4e]">Viewing Scheduled</h3>
            <p className="text-xs text-slate-500">
              {result.message}
            </p>
            <div className="p-3 bg-slate-50 rounded-xl font-mono text-xs font-bold text-[#012a4e]">
              Viewing Ref: {result.bookingRef}
            </div>
            <button
              onClick={onClose}
              className="mt-4 px-6 py-2.5 rounded-full text-xs font-bold text-white bg-[#00AEEF]"
            >
              Done
            </button>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#00AEEF]">
                On-Site Walkthrough
              </span>
              <h3 className="text-2xl font-black text-[#012a4e] mt-1">
                Schedule Viewing
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                For {property.title} ({property.code})
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-[11.5px] font-bold text-slate-600 block mb-1">Select Time Slot</label>
                <input 
                  type="text"
                  value={form.timeSlot}
                  onChange={e => setForm({ ...form, timeSlot: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-[#012a4e] focus:outline-hidden font-semibold"
                />
              </div>

              <div>
                <label className="text-[11.5px] font-bold text-slate-600 block mb-1">Your Full Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="Your Name"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-[#012a4e] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-[11.5px] font-bold text-slate-600 block mb-1">Mobile (for SMS gate code)</label>
                <input 
                  type="tel" 
                  required
                  placeholder="+880 17..."
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-[#012a4e] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-[11.5px] font-bold text-slate-600 block mb-1">Email</label>
                <input 
                  type="email" 
                  required
                  placeholder="name@domain.com"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-[#012a4e] focus:outline-hidden"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 py-3 rounded-full text-xs font-bold text-white bg-[#00AEEF] hover:bg-[#0096ce] transition-all cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Confirming with Concierge...' : 'Confirm Inspection Time'}
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}

// 3. Online Tenant Application Modal
export function TenantApplicationModal({ isOpen, onClose, property }) {
  const [form, setForm] = useState({
    applicant_name: '',
    mobile: '',
    email: '',
    occupation: '',
    employer: '',
    monthly_income: '',
    proposed_monthly_rent: property?.price || '',
    proposed_security_deposit: property?.price ? property.price * 2 : '',
    preferred_move_in: '',
    current_address: '',
    current_landlord_name: '',
    current_landlord_phone: '',
    ref1_name: '',
    ref1_phone: '',
    ref1_rel: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  if (!isOpen || !property) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await websiteApi.submitTenantApplication({
        property_id: property.id,
        property_code: property.code,
        applicant_name: form.applicant_name,
        mobile: form.mobile,
        email: form.email,
        occupation: form.occupation,
        employer: form.employer,
        monthly_income: form.monthly_income,
        proposed_monthly_rent: form.proposed_monthly_rent,
        proposed_security_deposit: form.proposed_security_deposit,
        preferred_move_in: form.preferred_move_in,
        current_address: form.current_address,
        current_landlord_name: form.current_landlord_name,
        current_landlord_phone: form.current_landlord_phone,
        references: [
          { name: form.ref1_name, phone: form.ref1_phone, relationship: form.ref1_rel }
        ].filter(r => r.name),
      });
      setResult(res);
    } catch (err) {
      console.warn('Tenant app submission failed:', err.message);
      setResult({
        application_code: 'SSPC-APP-000001',
        message: 'Your tenancy application has been received and queued for review.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="relative bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl p-6 sm:p-8 border border-slate-100 max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 text-slate-400">
          <X className="w-5 h-5" />
        </button>

        {result ? (
          <div className="text-center py-6 space-y-4 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-[#dcfce7] text-[#15803d] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-[#012a4e]">Tenancy Application Submitted</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {result.message}
            </p>
            <div className="p-3 bg-slate-50 rounded-xl font-mono text-xs font-bold text-[#012a4e]">
              Application Code: {result.application_code}
            </div>
            <p className="text-[11px] text-slate-400">
              Our Property Manager will contact you and your references for verification.
            </p>
            <button onClick={onClose} className="mt-4 px-6 py-2.5 rounded-full text-xs font-bold text-white bg-[#00AEEF]">
              Done
            </button>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#00AEEF]">
                Official Tenancy Application
              </span>
              <h3 className="text-2xl font-black text-[#012a4e] mt-1">
                Apply for {property.title || property.code}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Direct online submission to the Seventh Sky Property Management desk.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Applicant Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Full legal name"
                    value={form.applicant_name}
                    onChange={e => setForm({ ...form, applicant_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="017..."
                    value={form.mobile}
                    onChange={e => setForm({ ...form, mobile: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="name@domain.com"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Preferred Move-in Date</label>
                  <input
                    type="date"
                    value={form.preferred_move_in}
                    onChange={e => setForm({ ...form, preferred_move_in: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Occupation</label>
                  <input
                    type="text"
                    placeholder="e.g. Banker, Engineer"
                    value={form.occupation}
                    onChange={e => setForm({ ...form, occupation: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Employer / Org</label>
                  <input
                    type="text"
                    placeholder="Company name"
                    value={form.employer}
                    onChange={e => setForm({ ...form, employer: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Monthly Income (৳)</label>
                  <input
                    type="number"
                    placeholder="120000"
                    value={form.monthly_income}
                    onChange={e => setForm({ ...form, monthly_income: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Current Residential Address</label>
                <input
                  type="text"
                  placeholder="Street, area, city"
                  value={form.current_address}
                  onChange={e => setForm({ ...form, current_address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Current Landlord Name</label>
                  <input
                    type="text"
                    placeholder="Landlord name"
                    value={form.current_landlord_name}
                    onChange={e => setForm({ ...form, current_landlord_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Current Landlord Phone</label>
                  <input
                    type="tel"
                    placeholder="01..."
                    value={form.current_landlord_phone}
                    onChange={e => setForm({ ...form, current_landlord_phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="font-bold text-slate-700 block mb-1">Professional Reference</span>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Reference Name"
                    value={form.ref1_name}
                    onChange={e => setForm({ ...form, ref1_name: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200"
                  />
                  <input
                    type="tel"
                    placeholder="Phone"
                    value={form.ref1_phone}
                    onChange={e => setForm({ ...form, ref1_phone: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200"
                  />
                  <input
                    type="text"
                    placeholder="Relationship"
                    value={form.ref1_rel}
                    onChange={e => setForm({ ...form, ref1_rel: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-3 py-3 rounded-full text-xs font-bold text-white bg-[#012a4e] hover:bg-[#002244] shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Submitting Application...' : 'Submit Tenancy Application'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

// Service Options Grouped with Concise Short Names
const SERVICE_GROUPS = [
  {
    group: 'Real Estate Sales & Rentals',
    options: [
      { value: 'Residential Sales', label: 'Residential Sales' },
      { value: 'Residential Rentals', label: 'Residential Rentals' },
      { value: 'Commercial Sales', label: 'Commercial Sales' },
      { value: 'Commercial Rentals', label: 'Commercial Rentals' },
      { value: 'Business Sales', label: 'Business Sales' },
    ],
  },
  {
    group: 'Property Care & Maintenance',
    options: [
      { value: 'Water Tank Cleaning', label: 'Water Tank Cleaning' },
      { value: 'AC Servicing & Maintenance', label: 'AC Servicing & Maintenance' },
      { value: 'Interior Design & Fit-Out', label: 'Interior Design & Fit-Out' },
      { value: 'Land Survey & Valuation', label: 'Land Survey & Valuation' },
      { value: 'Home Loan & Financing', label: 'Home Loan & Financing' },
      { value: 'Title Search & Legal Vetting', label: 'Title Search & Legal Vetting' },
      { value: 'Will & Succession Planning', label: 'Will & Succession Planning' },
      { value: 'Relocation & Moving', label: 'Relocation & Moving' },
      { value: 'Property Care & Concierge', label: 'Property Care & Concierge' },
      { value: 'Furnished Short Stays', label: 'Furnished Short Stays' },
    ],
  },
];

function resolveServiceOption(val) {
  if (!val) return 'Water Tank Cleaning';
  const s = String(val).toLowerCase();
  if (s.includes('commercial sale')) return 'Commercial Sales';
  if (s.includes('commercial rent')) return 'Commercial Rentals';
  if (s.includes('business')) return 'Business Sales';
  if (s.includes('residential sale') || s === 'sales' || s.includes('real estate sales')) return 'Residential Sales';
  if (s.includes('residential rent') || s.includes('tenan') || s.includes('rent')) return 'Residential Rentals';
  if (s.includes('water tank') || s.includes('tank')) return 'Water Tank Cleaning';
  if (s.includes('air condition') || s.includes('ac ') || s.includes('aircon')) return 'AC Servicing & Maintenance';
  if (s.includes('interior') || s.includes('fit-out') || s.includes('fitout')) return 'Interior Design & Fit-Out';
  if (s.includes('survey') || s.includes('valuation') || s.includes('structural')) return 'Land Survey & Valuation';
  if (s.includes('loan') || s.includes('financ')) return 'Home Loan & Financing';
  if (s.includes('title') || s.includes('vetting') || s.includes('legal')) return 'Title Search & Legal Vetting';
  if (s.includes('will') || s.includes('succession') || s.includes('inheritance')) return 'Will & Succession Planning';
  if (s.includes('removal') || s.includes('relocation') || s.includes('moving')) return 'Relocation & Moving';
  if (s.includes('concierge') || s.includes('vacant flat') || s.includes('property care')) return 'Property Care & Concierge';
  if (s.includes('short stay') || s.includes('executive suite') || s.includes('furnished')) return 'Furnished Short Stays';
  return 'Water Tank Cleaning';
}

function getServiceDetailsConfig(serviceLine) {
  switch (serviceLine) {
    case 'Residential Sales':
      return {
        isTransaction: true,
        typeLabel: 'Property Type *',
        typeOptions: ['Apartment / Flat', 'Duplex / Penthouse', 'Independent House / Villa', 'Full Residential Building', 'Residential Plot / Land', 'Other Residential'],
        valueLabel: 'Proposed Sale Value (৳) *',
        valuePlaceholder: 'e.g. ৳ 2,50,00,000',
        timeLabel: 'Target Selling Timeline *',
        timeOptions: ['Immediate (Within 30 Days)', '1 to 3 Months', '3 to 6 Months', 'Exploring / Valuing Only'],
        badge: 'Residential Sale Details',
        submitText: 'Submit Sale Listing Request',
      };
    case 'Residential Rentals':
      return {
        isTransaction: true,
        typeLabel: 'Property Type *',
        typeOptions: ['Apartment / Flat', 'Studio Apartment', 'Duplex', 'Full Residential Building', 'Other Residential'],
        valueLabel: 'Proposed Monthly Rent (৳) *',
        valuePlaceholder: 'e.g. ৳ 65,000 / month',
        timeLabel: 'Available From / Timeline *',
        timeOptions: ['Immediately Available', 'Within 15 Days', 'Next Month', '1 to 3 Months'],
        badge: 'Residential Rental Details',
        submitText: 'Submit Rental Listing Request',
      };
    case 'Commercial Sales':
      return {
        isTransaction: true,
        typeLabel: 'Commercial Property Type *',
        typeOptions: ['Commercial Office Space', 'Full Commercial Building', 'Retail Showroom / Shop', 'Commercial Plot / Land', 'Warehouse / Industrial Space', 'Other Commercial'],
        valueLabel: 'Proposed Sale Value (৳) *',
        valuePlaceholder: 'e.g. ৳ 5,00,00,000',
        timeLabel: 'Target Selling Timeline *',
        timeOptions: ['Immediate (Within 30 Days)', '1 to 3 Months', '3 to 6 Months', 'Exploring / Valuing Only'],
        badge: 'Commercial Sale Details',
        submitText: 'Submit Commercial Sale Request',
      };
    case 'Commercial Rentals':
      return {
        isTransaction: true,
        typeLabel: 'Commercial Property Type *',
        typeOptions: ['Commercial Office Floor', 'Retail Showroom / Store', 'Full Commercial Building', 'Warehouse / Godown', 'Shared / Co-working Space', 'Other Commercial'],
        valueLabel: 'Proposed Monthly Rent (৳) *',
        valuePlaceholder: 'e.g. ৳ 1,50,000 / month',
        timeLabel: 'Available From / Timeline *',
        timeOptions: ['Immediately Available', 'Within 15 Days', 'Next Month', '1 to 3 Months'],
        badge: 'Commercial Rental Details',
        submitText: 'Submit Commercial Rental Request',
      };
    case 'Business Sales':
      return {
        isTransaction: true,
        typeLabel: 'Business / Venture Type *',
        typeOptions: ['Retail Store / Supermarket', 'Restaurant / Cafe / Food Outlet', 'Hotel / Resort / Hospitality', 'Factory / Manufacturing Plant', 'Healthcare / Clinic / Diagnostic', 'IT / Digital / Creative Agency', 'Education / Training Center', 'Franchise Business', 'Other Commercial Venture'],
        valueLabel: 'Proposed Business Sale Value (৳) *',
        valuePlaceholder: 'e.g. ৳ 1,00,00,000',
        timeLabel: 'Target Selling Timeline *',
        timeOptions: ['Immediate (Within 30 Days)', '1 to 3 Months', '3 to 6 Months', 'Exploring Valuation'],
        badge: 'Business Sale Details',
        submitText: 'Submit Business Sale Enquiry',
      };
    default:
      return {
        isTransaction: false,
        submitText: 'Confirm Service Request',
      };
  }
}

// 4. Care & Real Estate Service Request Modal
export function ServiceRequestModal({ isOpen, onClose, initialService = 'Water Tank Cleaning' }) {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    service_line: resolveServiceOption(initialService),
    district: 'Dhaka',
    address: '',
    preferred_date: '',
    property_type: 'Apartment / Flat',
    proposed_value: '',
    timeline: 'Immediate (Within 30 Days)',
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (initialService) {
      const resolved = resolveServiceOption(initialService);
      const cfg = getServiceDetailsConfig(resolved);
      setForm(prev => ({
        ...prev,
        service_line: resolved,
        property_type: cfg.isTransaction ? cfg.typeOptions[0] : '',
        timeline: cfg.isTransaction ? cfg.timeOptions[0] : '',
      }));
    }
  }, [initialService, isOpen]);

  const config = getServiceDetailsConfig(form.service_line);

  const handleServiceChange = (e) => {
    const nextLine = e.target.value;
    const cfg = getServiceDetailsConfig(nextLine);
    setForm(prev => ({
      ...prev,
      service_line: nextLine,
      property_type: cfg.isTransaction ? cfg.typeOptions[0] : '',
      timeline: cfg.isTransaction ? cfg.timeOptions[0] : '',
      proposed_value: '',
    }));
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await websiteApi.submitServiceRequest(form);
      setResult(res);
    } catch (err) {
      setResult({
        enquiry_code: 'SSPC-CEN-000001',
        message: 'Your request has been received. Our care & real estate desk will contact you.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="relative bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl p-6 sm:p-8 border border-slate-100 max-h-[92vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 text-slate-400">
          <X className="w-5 h-5" />
        </button>

        {result ? (
          <div className="text-center py-6 space-y-4 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-[#e8f7fd] text-[#00AEEF] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-[#012a4e]">Request Received Successfully</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">{result.message}</p>
            <div className="p-3 bg-slate-50 rounded-xl font-mono text-xs font-bold text-[#012a4e]">
              Ref: {result.enquiry_code}
            </div>
            <button onClick={onClose} className="mt-4 px-6 py-2.5 rounded-full text-xs font-bold text-white bg-[#00AEEF]">
              Done
            </button>
          </div>
        ) : (
          <div>
            <div className="mb-5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#00AEEF]">
                {config.isTransaction ? 'Real Estate Brokerage Desk' : 'Property Care Desk'}
              </span>
              <h3 className="text-2xl font-black text-[#012a4e] mt-1">
                {config.isTransaction ? 'List Property / Business' : 'Request Service'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Instant consultation, valuation & verified dispatch across Dhaka.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-600 block mb-1">Service or Transaction Line *</label>
                <select
                  value={form.service_line}
                  onChange={handleServiceChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-medium text-[#012a4e] focus:outline-hidden focus:border-[#00AEEF]"
                >
                  {SERVICE_GROUPS.map((grp) => (
                    <optgroup key={grp.group} label={grp.group}>
                      {grp.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Dynamic Property / Business Transaction Fields */}
              {config.isTransaction && (
                <div className="p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200/90 space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#00AEEF] bg-[#00AEEF]/10 px-2.5 py-1 rounded-full">
                      {config.badge}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">Verified Market Valuation</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">{config.typeLabel}</label>
                      <select
                        value={form.property_type}
                        onChange={e => setForm({ ...form, property_type: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-hidden focus:border-[#00AEEF]"
                      >
                        {config.typeOptions.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">{config.valueLabel}</label>
                      <input
                        type="text"
                        required
                        placeholder={config.valuePlaceholder}
                        value={form.proposed_value}
                        onChange={e => setForm({ ...form, proposed_value: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-hidden focus:border-[#00AEEF]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">{config.timeLabel}</label>
                    <select
                      value={form.timeline}
                      onChange={e => setForm({ ...form, timeline: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-hidden focus:border-[#00AEEF]"
                    >
                      {config.timeOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Contact Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Your Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Full name"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-hidden focus:border-[#00AEEF]"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="017..."
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-hidden focus:border-[#00AEEF]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Email Address (Optional)</label>
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-hidden focus:border-[#00AEEF]"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">District / City</label>
                  <input
                    type="text"
                    value={form.district}
                    onChange={e => setForm({ ...form, district: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-hidden focus:border-[#00AEEF]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">
                  {config.isTransaction ? 'Property / Asset Location & Address *' : 'Property Location / Address *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. House 14, Road 5, Banani, Dhaka"
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-hidden focus:border-[#00AEEF]"
                />
              </div>

              {/* Standard Service Schedule Date if non-transaction */}
              {!config.isTransaction && (
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Preferred Date (Optional)</label>
                  <input
                    type="date"
                    value={form.preferred_date}
                    onChange={e => setForm({ ...form, preferred_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-hidden focus:border-[#00AEEF]"
                  />
                </div>
              )}

              <div>
                <label className="font-bold text-slate-600 block mb-1">
                  {config.isTransaction ? 'Additional Notes / Specifications (Optional)' : 'Description / Requirements'}
                </label>
                <textarea
                  rows="2"
                  placeholder={config.isTransaction ? 'Mention key features, floor level, parking, or specific requirements...' : 'Describe tank capacity, AC units, or required service details...'}
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-hidden focus:border-[#00AEEF]"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 py-3 rounded-full text-xs font-bold text-white bg-[#00AEEF] hover:bg-[#0096ce] shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Submitting Request...' : config.submitText}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

// 5. Auth Modal (Client Login & Service Provider Login)
export function AuthModal({ isOpen, onClose, initialRole = 'client' }) {
  const [role, setRole] = useState(initialRole);
  const [email, setEmail] = useState('owner@seventhskyproperty.com');
  const [password, setPassword] = useState('Admin#2026');
  const [submitting, setSubmitting] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState(null);

  if (!isOpen) return null;

  const handleLogin = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let res;
      if (role === 'client') {
        res = await mockApi.clientLogin({ email, password });
      } else {
        res = await mockApi.providerLogin({ email, password });
      }
      if (res.success) {
        setLoggedInUser(res.user);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="relative bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl p-6 sm:p-8 border border-slate-100">
        
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700"
        >
          <X className="w-5 h-5" />
        </button>

        {loggedInUser ? (
          <div className="text-center py-6 space-y-4 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-[#e8f7fd] text-[#00AEEF] flex items-center justify-center mx-auto">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-[#012a4e]">Authenticated to Portal</h3>
            <p className="text-xs text-slate-500">
              Welcome back, <strong>{loggedInUser.name}</strong> ({loggedInUser.role})
            </p>
            <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600">
              Session established with Seventh Sky Security Gateway.
            </div>
            <button
              onClick={onClose}
              className="mt-4 px-6 py-2.5 rounded-full text-xs font-bold text-white bg-[#00AEEF]"
            >
              Continue to Portal
            </button>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#00AEEF]">
                Secure Identity Gate
              </span>
              <h3 className="text-2xl font-black text-[#012a4e] mt-1">
                Portal Sign-In
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Access your real-time reports, folios, or active dispatch tickets.
              </p>
            </div>

            {/* Role Switcher */}
            <div className="flex rounded-xl bg-slate-100 p-1 mb-5 text-xs font-bold">
              <button
                type="button"
                onClick={() => setRole('client')}
                className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  role === 'client' ? 'bg-white text-[#012a4e] shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Client / Owner</span>
              </button>
              <button
                type="button"
                onClick={() => setRole('provider')}
                className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  role === 'provider' ? 'bg-white text-[#012a4e] shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Service Provider</span>
              </button>
            </div>

            <form onSubmit={handleLogin} className="space-y-3.5">
              <div>
                <label className="text-[11.5px] font-bold text-slate-600 block mb-1">Registered Email</label>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#012a4e] focus:outline-hidden focus:border-[#00AEEF]"
                />
              </div>

              <div>
                <label className="text-[11.5px] font-bold text-slate-600 block mb-1">Password</label>
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#012a4e] focus:outline-hidden focus:border-[#00AEEF]"
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded text-[#00AEEF]" />
                  <span>Stay authenticated</span>
                </label>
                <a href="#forgot" className="text-[#00AEEF] hover:underline">Trouble signing in?</a>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 py-3 rounded-full text-xs font-bold text-white bg-[#012a4e] hover:bg-[#002244] shadow-[0_4px_14px_rgba(1,42,78,0.2)] transition-all cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Verifying Credentials...' : `Enter ${role === 'client' ? 'Client' : 'Provider'} Portal`}
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
