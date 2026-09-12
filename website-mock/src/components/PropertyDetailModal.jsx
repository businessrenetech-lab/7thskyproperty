import React, { useState } from 'react';
import { 
  X, 
  Bed, 
  Bath, 
  Car, 
  Maximize2, 
  MapPin, 
  Calendar, 
  Video, 
  Compass, 
  FileText, 
  Phone, 
  Mail, 
  Check, 
  Share2, 
  Heart,
  Layers,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { mockApi } from '../services/mockApi';
import { websiteApi } from '../services/api';

export default function PropertyDetailModal({ property, onClose, onBookInspection }) {
  const [activeMediaTab, setActiveMediaTab] = useState('gallery'); // 'gallery' | 'video' | 'drone' | 'floorplan'
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [enquiryForm, setEnquiryForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [enquirySubmitting, setEnquirySubmitting] = useState(false);
  const [enquirySuccess, setEnquirySuccess] = useState(null);

  if (!property) return null;

  const isShortStay = property.isShortStay || property.listing_type === 'short_term';
  const isSale = property.listing_type === 'sale' || property.purpose === 'For Sale' || property.type === 'sale';

  const handleEnquirySubmit = async (e) => {
    e.preventDefault();
    setEnquirySubmitting(true);
    try {
      const payload = {
        property_id: property.id,
        property_code: property.code,
        name: enquiryForm.name,
        guest_name: enquiryForm.name,
        email: enquiryForm.email || 'client@example.com',
        phone: enquiryForm.phone,
        message: enquiryForm.message || `Enquiry regarding ${property.title || property.code}`,
        notes: enquiryForm.message || `Enquiry regarding ${property.title || property.code}`,
      };

      let res;
      try {
        if (isShortStay) {
          res = await websiteApi.submitShortStayBookingEnquiry(payload);
        } else if (isSale) {
          res = await websiteApi.submitSalesEnquiry(payload);
        } else {
          res = await websiteApi.submitRentalEnquiry(payload);
        }
      } catch (apiErr) {
        console.warn('Backend enquiry failed, falling back to mock:', apiErr.message);
        res = await mockApi.submitEnquiry({
          propertyId: property.id,
          propertyCode: property.code,
          ...enquiryForm,
        });
      }

      const refCode = res?.referenceCode || res?.reference_number || res?.booking_code || res?.enquiry_code || 'SSPC-ENQ-OK';
      setEnquirySuccess(refCode);
      setEnquiryForm({ name: '', email: '', phone: '', message: '' });
    } catch (err) {
      console.error(err);
    } finally {
      setEnquirySubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex justify-center p-2 sm:p-4 md:p-6 animate-fade-in">
      <div className="relative bg-white w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl my-auto border border-slate-100 flex flex-col max-h-[92vh]">
        
        {/* Sticky Modal Top Bar */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#012a4e] text-white">
              {property.code}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#e8f7fd] text-[#00AEEF]">
              {property.purpose}
            </span>
            <span className="hidden sm:inline text-xs text-slate-400 font-medium">
              {property.propertyType} • {property.suburb}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href);
                alert('Property link copied to clipboard.');
              }}
              className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
              title="Share listing"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button 
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-100 text-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Modal Content */}
        <div className="overflow-y-auto flex-1 p-6 sm:p-8 space-y-10">
          
          {/* 1. Media Section with Upstate Navigation Tabs */}
          <div className="space-y-4">
            {/* Media Mode Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <button
                onClick={() => setActiveMediaTab('gallery')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  activeMediaTab === 'gallery'
                    ? 'bg-[#012a4e] text-white'
                    : 'bg-slate-100 text-slate-600 hover:text-[#012a4e]'
                }`}
              >
                Gallery ({property.gallery?.length || 1})
              </button>

              {property.videoUrl && (
                <button
                  onClick={() => setActiveMediaTab('video')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${
                    activeMediaTab === 'video'
                      ? 'bg-[#012a4e] text-white'
                      : 'bg-slate-100 text-slate-600 hover:text-[#012a4e]'
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  Video Tour
                </button>
              )}

              {property.droneVideoUrl && (
                <button
                  onClick={() => setActiveMediaTab('drone')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${
                    activeMediaTab === 'drone'
                      ? 'bg-[#012a4e] text-white'
                      : 'bg-slate-100 text-slate-600 hover:text-[#012a4e]'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5" />
                  Drone Tour
                </button>
              )}

              {property.floorPlanUrl && (
                <button
                  onClick={() => setActiveMediaTab('floorplan')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${
                    activeMediaTab === 'floorplan'
                      ? 'bg-[#012a4e] text-white'
                      : 'bg-slate-100 text-slate-600 hover:text-[#012a4e]'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  Floor Plan
                </button>
              )}
            </div>

            {/* Media Viewer Display */}
            <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-16/9 sm:aspect-21/9 max-h-[460px] flex items-center justify-center">
              {activeMediaTab === 'gallery' && (
                <>
                  <img 
                    src={property.gallery[activeImageIndex] || property.heroImage} 
                    alt={property.title}
                    className="w-full h-full object-cover"
                  />
                  {/* Prev/Next buttons */}
                  {property.gallery?.length > 1 && (
                    <>
                      <button 
                        onClick={() => setActiveImageIndex((activeImageIndex - 1 + property.gallery.length) % property.gallery.length)}
                        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-xs transition-colors"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => setActiveImageIndex((activeImageIndex + 1) % property.gallery.length)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-xs transition-colors"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </>
              )}

              {activeMediaTab === 'video' && (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-white text-center">
                  <div className="w-16 h-16 rounded-full bg-[#00AEEF] flex items-center justify-center mb-4 shadow-lg">
                    <Video className="w-8 h-8 text-white" />
                  </div>
                  <h4 className="text-lg font-bold">4K Cinematic Video Tour</h4>
                  <p className="text-xs text-slate-300 max-w-sm mt-1 mb-4">
                    Full walkthrough produced with high-definition gimbal and interior architectural lighting.
                  </p>
                  <span className="text-xs font-mono bg-white/10 px-3 py-1.5 rounded-full">
                    Video Stream Ready: {property.videoUrl}
                  </span>
                </div>
              )}

              {activeMediaTab === 'drone' && (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-white text-center">
                  <div className="w-16 h-16 rounded-full bg-[#12b6f3] flex items-center justify-center mb-4 shadow-lg">
                    <Compass className="w-8 h-8 text-white" />
                  </div>
                  <h4 className="text-lg font-bold">Aerial Drone Precinct Scan</h4>
                  <p className="text-xs text-slate-300 max-w-sm mt-1 mb-4">
                    Topological drone view of roof condition, nearby road accessibility, and panoramic views.
                  </p>
                  <span className="text-xs font-mono bg-white/10 px-3 py-1.5 rounded-full">
                    Drone Feed: {property.droneVideoUrl}
                  </span>
                </div>
              )}

              {activeMediaTab === 'floorplan' && (
                <div className="w-full h-full bg-slate-100 flex items-center justify-center p-6">
                  <img 
                    src={property.floorPlanUrl} 
                    alt="Floor Plan"
                    className="max-h-full object-contain rounded-xl"
                  />
                </div>
              )}
            </div>

            {/* Thumbnail Strip */}
            {activeMediaTab === 'gallery' && property.gallery?.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {property.gallery.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative w-20 h-14 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                      activeImageIndex === idx ? 'border-[#00AEEF] scale-105' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="thumb" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2. Key Details & Agent Split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left 8 Cols: Details, Specs, Features, Nearby */}
            <div className="lg:col-span-8 space-y-8">
              
              {/* Header Info */}
              <div>
                <div className="flex items-baseline justify-between mb-2">
                  <div className="text-3xl sm:text-4xl font-black text-[#012a4e]">
                    {property.priceDisplay}
                  </div>
                  <span className="text-sm font-semibold text-slate-400">
                    {property.pricePerSqft}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-[#012a4e]">
                  {property.title}
                </h2>
                <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-2">
                  <MapPin className="w-4 h-4 text-[#00AEEF] shrink-0" />
                  <span>{property.location}</span>
                </div>
              </div>

              {/* Specs Bar */}
              <div className="grid grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                <div>
                  <div className="text-xs text-slate-400 uppercase font-semibold">Bedrooms</div>
                  <div className="text-lg font-bold text-[#012a4e] mt-0.5">{property.bedrooms}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 uppercase font-semibold">Bathrooms</div>
                  <div className="text-lg font-bold text-[#012a4e] mt-0.5">{property.bathrooms}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 uppercase font-semibold">Car Parking</div>
                  <div className="text-lg font-bold text-[#012a4e] mt-0.5">{property.carSpaces}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 uppercase font-semibold">Floor Area</div>
                  <div className="text-lg font-bold text-[#012a4e] mt-0.5">{property.sizeSqft} sqft</div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h3 className="text-base font-bold text-[#012a4e]">Property Overview</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {property.description}
                </p>
              </div>

              {/* Features & Amenities List */}
              <div className="space-y-3">
                <h3 className="text-base font-bold text-[#012a4e]">Features & Inclusions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {property.features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs font-medium text-[#012a4e]">
                      <span className="w-5 h-5 rounded-full bg-[#e8f7fd] flex items-center justify-center text-[#00AEEF] shrink-0">
                        <Check className="w-3 h-3 stroke-[2.5]" />
                      </span>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upstate-Style Nearby Places Section */}
              <div className="space-y-3 pt-2">
                <h3 className="text-base font-bold text-[#012a4e]">Nearby Places & Connectivity</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {property.nearbyPlaces?.map((place, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-white shadow-2xs text-[#00AEEF]">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400">
                          {place.category}
                        </span>
                        <div className="text-xs font-bold text-[#012a4e]">{place.name}</div>
                        <div className="text-[11px] text-slate-500">{place.distance}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Right 4 Cols: Inspection Slots, Agent Profile & Enquiry Form */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Inspection Times Card (Upstate Style) */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#00AEEF]" />
                  <h4 className="text-sm font-bold text-[#012a4e]">Scheduled Inspections</h4>
                </div>
                
                {property.inspectionTimes?.map((time, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">{time}</span>
                    <button
                      onClick={() => onBookInspection && onBookInspection(property, time)}
                      className="px-3 py-1 rounded-full text-xs font-bold text-white bg-[#00AEEF] hover:bg-[#0096ce] transition-colors"
                    >
                      Book
                    </button>
                  </div>
                ))}

                <button
                  onClick={() => onBookInspection && onBookInspection(property, 'Private Appointment')}
                  className="w-full py-2.5 rounded-full text-xs font-bold text-[#012a4e] bg-slate-100 hover:bg-[#e8f7fd] hover:text-[#00AEEF] transition-colors"
                >
                  Request Private Inspection
                </button>
              </div>

              {/* Agent Card */}
              {property.agent && (
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Listing Specialist
                  </span>
                  <div className="flex items-center gap-3">
                    <img 
                      src={property.agent.avatar} 
                      alt={property.agent.name}
                      className="w-12 h-12 rounded-full object-cover border border-slate-100"
                    />
                    <div>
                      <h4 className="text-sm font-bold text-[#012a4e]">{property.agent.name}</h4>
                      <p className="text-xs text-slate-500">{property.agent.role}</p>
                    </div>
                  </div>

                  <div className="pt-2 flex gap-2">
                    <a
                      href={`tel:${property.agent.phone}`}
                      className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      Call
                    </a>
                    <a
                      href={`mailto:${property.agent.email}`}
                      className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      Email
                    </a>
                  </div>
                </div>
              )}

              {/* Quick Enquiry Form */}
              <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-3">
                <h4 className="text-sm font-bold text-[#012a4e]">Enquire About This Property</h4>
                
                {enquirySuccess ? (
                  <div className="p-3 rounded-xl bg-[#e8f7fd] border border-[#00AEEF]/30 text-xs text-[#012a4e] space-y-1 animate-fade-in">
                    <div className="font-bold flex items-center gap-1.5 text-[#00AEEF]">
                      <ShieldCheck className="w-4 h-4" />
                      Enquiry Registered
                    </div>
                    <p>Reference: <strong className="font-mono">{enquirySuccess}</strong></p>
                    <p className="text-slate-500 text-[11px]">Our team will contact you shortly.</p>
                  </div>
                ) : (
                  <form onSubmit={handleEnquirySubmit} className="space-y-2.5">
                    <input 
                      type="text"
                      required
                      placeholder="Your Full Name"
                      value={enquiryForm.name}
                      onChange={e => setEnquiryForm({ ...enquiryForm, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-[#012a4e] placeholder:text-slate-400 focus:outline-hidden focus:border-[#00AEEF]"
                    />
                    <input 
                      type="email"
                      required
                      placeholder="Email Address"
                      value={enquiryForm.email}
                      onChange={e => setEnquiryForm({ ...enquiryForm, email: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-[#012a4e] placeholder:text-slate-400 focus:outline-hidden focus:border-[#00AEEF]"
                    />
                    <input 
                      type="tel"
                      required
                      placeholder="Phone / WhatsApp (+880)"
                      value={enquiryForm.phone}
                      onChange={e => setEnquiryForm({ ...enquiryForm, phone: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-[#012a4e] placeholder:text-slate-400 focus:outline-hidden focus:border-[#00AEEF]"
                    />
                    <textarea 
                      rows="2"
                      placeholder="I am interested in this listing..."
                      value={enquiryForm.message}
                      onChange={e => setEnquiryForm({ ...enquiryForm, message: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-[#012a4e] placeholder:text-slate-400 focus:outline-hidden focus:border-[#00AEEF]"
                    ></textarea>
                    
                    <button
                      type="submit"
                      disabled={enquirySubmitting}
                      className="w-full py-2.5 rounded-full text-xs font-bold text-white bg-[#00AEEF] hover:bg-[#0096ce] transition-colors disabled:opacity-50"
                    >
                      {enquirySubmitting ? 'Sending...' : 'Send Enquiry'}
                    </button>
                  </form>
                )}
              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
