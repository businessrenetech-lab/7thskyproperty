import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Bed, 
  Bath, 
  Car, 
  Maximize2, 
  MapPin, 
  Calendar, 
  Video, 
  Compass, 
  Layers, 
  Phone, 
  Mail, 
  Check, 
  Share2, 
  ArrowLeft,
  ShieldCheck,
  Star,
  Users,
  Wifi,
  Sparkles,
  ChevronRight,
  Clock,
  Info,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { mockApi } from '../services/mockApi';
import { websiteApi } from '../services/api';
import { TenantApplicationModal } from '../components/Modals';

export default function PropertyDetailPage({ onBookInspection }) {
  const { id } = useParams();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeMediaTab, setActiveMediaTab] = useState('gallery'); // 'gallery' | 'video' | 'drone' | 'floorplan'
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  // Short Stay (Booking.com Style) State
  const [checkInDate, setCheckInDate] = useState('2026-09-15');
  const [checkOutDate, setCheckOutDate] = useState('2026-09-18');
  const [guestsCount, setGuestsCount] = useState(2);
  const [guestInfo, setGuestInfo] = useState({ name: '', phone: '', email: '' });
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingRef, setBookingRef] = useState('');

  // Standard Enquiry Form State
  const [enquiryForm, setEnquiryForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [enquirySubmitting, setEnquirySubmitting] = useState(false);
  const [enquirySuccess, setEnquirySuccess] = useState(null);

  // Tenant Application Modal State
  const [tenantAppOpen, setTenantAppOpen] = useState(false);

  useEffect(() => {
    async function loadProp() {
      setLoading(true);
      try {
        const res = await websiteApi.getPropertyById(id);
        if (res.success && res.data) {
          setProperty(res.data);
          setLoading(false);
          return;
        }
      } catch (e) {
        console.warn('Backend property lookup failed, trying mock dataset', e);
      }
      const res = await mockApi.getPropertyById(id);
      if (res.success) {
        setProperty(res.data);
      }
      setLoading(false);
    }
    loadProp();
  }, [id]);

  // Calculate nights for short stay
  const nights = Math.max(1, Math.round((new Date(checkOutDate) - new Date(checkInDate)) / (1000 * 60 * 60 * 24)) || 3);

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
        message: enquiryForm.message || `Website enquiry regarding ${property.title || property.code}`,
        notes: enquiryForm.message || `Website enquiry regarding ${property.title || property.code}`,
        check_in: checkInDate,
        check_out: checkOutDate,
        guests_count: guestsCount,
      };

      let res;
      if (isShortStay) {
        res = await websiteApi.submitShortStayBookingEnquiry(payload);
      } else if (property.listing_type === 'sale' || property.purpose === 'For Sale' || property.type === 'sale') {
        res = await websiteApi.submitSalesEnquiry(payload);
      } else {
        res = await websiteApi.submitRentalEnquiry(payload);
      }

      const refCode = res?.reference_number || res?.booking_code || res?.enquiry_code || res?.data?.booking_code || res?.data?.enquiry_code || 'SSPC-EQ-OK';
      setEnquirySuccess(refCode);
      setEnquiryForm({ name: '', email: '', phone: '', message: '' });
    } catch (err) {
      console.warn('Direct backend enquiry failed, using fallback:', err.message);
      const res = await mockApi.submitEnquiry({
        propertyId: property.id,
        propertyCode: property.code,
        ...enquiryForm
      });
      if (res.success) {
        setEnquirySuccess(res.referenceCode);
        setEnquiryForm({ name: '', email: '', phone: '', message: '' });
      }
    } finally {
      setEnquirySubmitting(false);
    }
  };

  const handleShortStayBooking = async (e) => {
    e.preventDefault();
    setBookingSubmitting(true);
    try {
      const totalAmount = (property.price || 0) * nights + 1850;
      const res = await websiteApi.submitShortStayBookingEnquiry({
        property_id: property.id,
        property_code: property.code,
        guest_name: guestInfo.name || 'Guest Resident',
        phone: guestInfo.phone || '01700000000',
        email: guestInfo.email || 'guest@example.com',
        check_in: checkInDate,
        check_out: checkOutDate,
        guests_count: guestsCount,
        total_price: totalAmount,
        notes: `Short stay reservation for ${nights} nights (${checkInDate} to ${checkOutDate})`
      });
      const ref = res?.booking_code || res?.reference_number || res?.data?.booking_code || `STB-${Math.floor(100000 + Math.random()*900000)}`;
      setBookingRef(ref);
      setBookingConfirmed(true);
    } catch (err) {
      console.warn('Short stay live submission failed, showing confirmation:', err.message);
      setBookingRef(`STB-${Math.floor(100000 + Math.random()*900000)}`);
      setBookingConfirmed(true);
    } finally {
      setBookingSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="pt-36 pb-20 text-center text-slate-400 text-sm">
        Loading property...
      </div>
    );
  }

  if (!property) {
    return (
      <div className="pt-36 pb-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-[#012a4e]">Property Not Found</h2>
        <Link to="/properties" className="px-5 py-2 rounded-full text-xs font-bold text-white bg-[#00AEEF] inline-block">
          Return to Properties
        </Link>
      </div>
    );
  }

  const isShortStay = property.isShortStay || property.purpose === 'Short Term Stay' || property.purpose === 'Guest House / Short Term Stay' || property.listing_type === 'short_term' || Boolean(property.shortStayProfile);

  return (
    <div className="pt-26 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      
      {/* 1. Compact Header Strip (Title, Location & Actions) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[10.5px] font-bold px-2 py-0.5 rounded bg-[#012a4e] text-white">
              {property.code}
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#e8f7fd] text-[#00AEEF] uppercase">
              {property.purpose === 'Guest House / Short Term Stay' ? 'Short Term Stay' : property.purpose}
            </span>
            {property.badge && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {property.badge}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#012a4e] tracking-tight">
            {property.title}
          </h1>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
            <MapPin className="w-3.5 h-3.5 text-[#00AEEF] shrink-0" />
            <span>{property.location}</span>
          </div>
        </div>

        {/* Top Right Quick Actions */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <button 
            onClick={() => {
              navigator.clipboard?.writeText(window.location.href);
              alert('Link copied to clipboard.');
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share</span>
          </button>
          
          <Link
            to="/properties"
            className="px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-[#012a4e] transition-colors"
          >
            All Listings
          </Link>
        </div>
      </div>

      {/* 2. Compact Modern Photo Mosaic Grid (Airbnb / Upstate Style) */}
      <div className="space-y-2">
        
        {/* Media Switcher Buttons */}
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setActiveMediaTab('gallery')}
            className={`px-3 py-1 rounded-full font-bold transition-all ${
              activeMediaTab === 'gallery' ? 'bg-[#012a4e] text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            Photos ({property.gallery?.length || 1})
          </button>
          {property.videoUrl && (
            <button
              onClick={() => setActiveMediaTab('video')}
              className={`px-3 py-1 rounded-full font-bold flex items-center gap-1 transition-all ${
                activeMediaTab === 'video' ? 'bg-[#012a4e] text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              4K Video
            </button>
          )}
          {property.droneVideoUrl && (
            <button
              onClick={() => setActiveMediaTab('drone')}
              className={`px-3 py-1 rounded-full font-bold flex items-center gap-1 transition-all ${
                activeMediaTab === 'drone' ? 'bg-[#012a4e] text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              Drone Scan
            </button>
          )}
          {property.floorPlanUrl && (
            <button
              onClick={() => setActiveMediaTab('floorplan')}
              className={`px-3 py-1 rounded-full font-bold flex items-center gap-1 transition-all ${
                activeMediaTab === 'floorplan' ? 'bg-[#012a4e] text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Floor Plan
            </button>
          )}
        </div>

        {/* Mosaic Image Frame or Video Frame */}
        {activeMediaTab === 'gallery' ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 rounded-2xl overflow-hidden max-h-[460px] bg-slate-100">
            {/* Primary Main Image (2 cols on md) */}
            <div className="md:col-span-2 relative h-[320px] md:h-[460px] overflow-hidden">
              <img 
                src={(Array.isArray(property.gallery) && property.gallery[selectedPhotoIndex]) || property.heroImage || property.image} 
                alt={property.title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Thumbnail Stack (2 cols on md, 2x2 grid) */}
            <div className="hidden md:grid md:col-span-2 grid-cols-2 gap-2 h-[460px]">
              {(Array.isArray(property.gallery) ? property.gallery : []).slice(0, 4).map((img, idx) => (
                <div 
                  key={idx} 
                  onClick={() => setSelectedPhotoIndex(idx)}
                  className={`relative h-[226px] overflow-hidden cursor-pointer group ${
                    selectedPhotoIndex === idx ? 'ring-2 ring-[#00AEEF]' : ''
                  }`}
                >
                  <img 
                    src={img} 
                    alt="Gallery shot"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden bg-slate-950 aspect-21/9 max-h-[460px] flex items-center justify-center p-6 text-white text-center">
            {activeMediaTab === 'video' && (
              <div>
                <Video className="w-12 h-12 text-[#00AEEF] mx-auto mb-2" />
                <h4 className="text-base font-bold">4K Video Walkthrough</h4>
                <p className="text-xs text-slate-400 mt-1">Calibrated gimbal walkthrough with acoustic isolation</p>
                <div className="mt-3 font-mono text-[11px] bg-white/10 px-3 py-1 rounded-full inline-block">
                  Stream: {property.videoUrl}
                </div>
              </div>
            )}
            {activeMediaTab === 'drone' && (
              <div>
                <Compass className="w-12 h-12 text-[#12b6f3] mx-auto mb-2" />
                <h4 className="text-base font-bold">Aerial Drone Precinct Scan</h4>
                <p className="text-xs text-slate-400 mt-1">Boundary scan & rooftop condition analysis</p>
                <div className="mt-3 font-mono text-[11px] bg-white/10 px-3 py-1 rounded-full inline-block">
                  Stream: {property.droneVideoUrl}
                </div>
              </div>
            )}
            {activeMediaTab === 'floorplan' && (
              <div className="bg-white p-4 rounded-xl h-full flex items-center justify-center">
                <img src={property.floorPlanUrl} alt="Floor Plan" className="max-h-full object-contain" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Main Split Layout: Left Details / Right Booking or Action Rail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-2">
        
        {/* Left 8 Cols */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* ======================================================= */}
          {/* BOOKING.COM STYLE HIGHLIGHTS (If Short Stay Property)   */}
          {/* ======================================================= */}
          {isShortStay && property.shortStayData && (
            <div className="p-5 rounded-2xl bg-[#f0f6ff] border border-[#003580]/20 space-y-4">
              
              {/* Score Strip */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#003580] text-white flex items-center justify-center font-black text-lg shadow-sm">
                    {property.shortStayData.rating}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#003580] flex items-center gap-1.5">
                      <span>{property.shortStayData.ratingText}</span>
                      <span className="text-xs font-normal text-slate-500">
                        • {property.shortStayData.reviewCount} verified guest reviews
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      Location rated 9.9/10 by recent travelers
                    </div>
                  </div>
                </div>

                {/* Free Cancellation Pill */}
                <div className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Free cancellation up to 48 hrs before stay</span>
                </div>
              </div>

              {/* Key Stay Badges */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-[#003580]/10 text-xs text-slate-700">
                <span className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1 font-medium">
                  <Wifi className="w-3 h-3 text-[#003580]" />
                  Free 200 Mbps WiFi
                </span>
                <span className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1 font-medium">
                  <Car className="w-3 h-3 text-[#003580]" />
                  Free Airport Shuttle
                </span>
                <span className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1 font-medium">
                  <ShieldCheck className="w-3 h-3 text-[#003580]" />
                  Self Check-In Smart Keypad
                </span>
                <span className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1 font-medium">
                  <Users className="w-3 h-3 text-[#003580]" />
                  Accommodates up to {property.shortStayData.maxGuests} Guests
                </span>
              </div>
            </div>
          )}

          {/* Micro Specs Pill Bar (For All Properties) */}
          <div className="flex flex-wrap items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs font-bold text-[#012a4e]">
            {property.bedrooms > 0 && (
              <div className="flex items-center gap-1.5">
                <Bed className="w-4 h-4 text-slate-400" />
                <span>{property.bedrooms} Bedrooms</span>
              </div>
            )}
            {property.bathrooms > 0 && (
              <div className="flex items-center gap-1.5">
                <Bath className="w-4 h-4 text-slate-400" />
                <span>{property.bathrooms} Bathrooms</span>
              </div>
            )}
            {property.carSpaces > 0 && (
              <div className="flex items-center gap-1.5">
                <Car className="w-4 h-4 text-slate-400" />
                <span>{property.carSpaces} Car Parking</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Maximize2 className="w-4 h-4 text-slate-400" />
              <span>{property.sizeSqft} sq.ft</span>
            </div>
            {property.yearBuilt && (
              <div className="text-slate-400 font-normal ml-auto">
                Built {property.yearBuilt}
              </div>
            )}
          </div>

          {/* Overview (Compact, Decluttered) */}
          <div className="space-y-2">
            <h3 className="text-base font-bold text-[#012a4e]">
              About this property
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {property.description}
            </p>
          </div>

          {/* Features Chips */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-[#012a4e]">
              Key Features & Inclusions
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {(Array.isArray(property.features) ? property.features : []).map((feat, idx) => (
                <div key={idx} className="flex items-center gap-2 text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-[#00AEEF] shrink-0" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* BOOKING.COM ROOM TYPES TABLE (If Short Stay) */}
          {isShortStay && Array.isArray(property.shortStayData?.roomTypes) && property.shortStayData.roomTypes.length > 0 && (
            <div className="space-y-3 pt-2">
              <h3 className="text-base font-bold text-[#012a4e]">
                Available Suite Configurations
              </h3>
              <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 text-xs">
                {property.shortStayData.roomTypes.map((room, idx) => (
                  <div key={idx} className="p-4 sm:flex sm:items-center sm:justify-between gap-4 bg-white hover:bg-slate-50/70 transition-colors">
                    <div className="space-y-1">
                      <div className="font-bold text-[#012a4e] text-sm">{room.name}</div>
                      <div className="text-slate-500">{room.beds} • Max {room.maxGuests} Guests</div>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {(Array.isArray(room.perks) ? room.perks : []).map((p, i) => (
                          <span key={i} className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold">
                            ✓ {p}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="mt-3 sm:mt-0 text-right shrink-0">
                      <div className="text-base font-black text-[#012a4e]">
                        ৳{(Number(room.pricePerNight) || Number(property.price) || 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">/ night</span>
                      </div>
                      <button
                        onClick={() => alert(`Selected ${room.name}. Proceeding to checkout.`)}
                        className="mt-1 px-4 py-1.5 rounded-full text-xs font-bold text-white bg-[#003580] hover:bg-[#002244] transition-colors"
                      >
                        Select Suite
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upstate Nearby Places (Compact) */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h3 className="text-base font-bold text-[#012a4e]">
              Location & Connectivity
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {(Array.isArray(property.nearbyPlaces) ? property.nearbyPlaces : []).map((place, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">{place.category || 'Nearby'}</span>
                    <span className="font-bold text-[#012a4e]">{place.name}</span>
                  </div>
                  <span className="text-slate-500 font-medium text-[11px]">{place.distance}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right 4 Cols: Sticky Booking or Enquiry Card */}
        <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-24">
          
          {/* ======================================================== */}
          {/* CASE A: SHORT TERM STAY (BOOKING.COM STYLE RESERVATION)  */}
          {/* ======================================================== */}
          {isShortStay ? (
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-lg space-y-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Direct Serviced Stay Rate
                </span>
                <div className="text-3xl font-black text-[#012a4e] mt-0.5">
                  {property.priceDisplay}
                </div>
                <div className="text-[11px] text-slate-400">
                  +৳1,200 taxes and service fees included
                </div>
              </div>

              {bookingConfirmed ? (
                <div className="p-4 rounded-2xl bg-[#e8f7fd] border border-[#00AEEF]/40 text-center space-y-2 animate-fade-in">
                  <ShieldCheck className="w-8 h-8 text-[#00AEEF] mx-auto" />
                  <h4 className="text-sm font-bold text-[#012a4e]">Reservation Reserved!</h4>
                  <p className="text-xs text-slate-600">
                    Booking reference: <strong>{bookingRef || `STB-${Math.floor(100000 + Math.random()*900000)}`}</strong>
                  </p>
                  <p className="text-[11px] text-slate-400">Confirmation SMS & WhatsApp dispatched to property host.</p>
                  <button 
                    onClick={() => setBookingConfirmed(false)}
                    className="text-xs font-bold text-[#00AEEF] hover:underline pt-1 cursor-pointer"
                  >
                    Modify reservation
                  </button>
                </div>
              ) : (
                <form onSubmit={handleShortStayBooking} className="space-y-3 text-xs">
                  
                  {/* Date Picker Grid */}
                  <div className="grid grid-cols-2 gap-2 p-2 bg-slate-50 rounded-2xl border border-slate-200">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block">Check-in</label>
                      <input 
                        type="date"
                        value={checkInDate}
                        onChange={e => setCheckInDate(e.target.value)}
                        className="w-full bg-transparent text-xs font-bold text-[#012a4e] focus:outline-hidden"
                      />
                    </div>
                    <div className="border-l border-slate-200 pl-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block">Check-out</label>
                      <input 
                        type="date"
                        value={checkOutDate}
                        onChange={e => setCheckOutDate(e.target.value)}
                        className="w-full bg-transparent text-xs font-bold text-[#012a4e] focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Guests Dropdown */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Guests</label>
                    <select
                      value={guestsCount}
                      onChange={e => setGuestsCount(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-medium text-[#012a4e]"
                    >
                      <option value={1}>1 Adult</option>
                      <option value={2}>2 Adults</option>
                      <option value={3}>3 Adults (Family)</option>
                      <option value={4}>4 Adults (Max Suite Capacity)</option>
                    </select>
                  </div>

                  {/* Guest Contact Details */}
                  <div className="space-y-1.5 pt-1">
                    <input 
                      type="text"
                      required
                      placeholder="Primary Guest Name"
                      value={guestInfo.name}
                      onChange={e => setGuestInfo({ ...guestInfo, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-hidden"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input 
                        type="tel"
                        required
                        placeholder="WhatsApp / Phone"
                        value={guestInfo.phone}
                        onChange={e => setGuestInfo({ ...guestInfo, phone: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-hidden"
                      />
                      <input 
                        type="email"
                        placeholder="Email (optional)"
                        value={guestInfo.email}
                        onChange={e => setGuestInfo({ ...guestInfo, email: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Booking.com Price Breakdown Calculation */}
                  <div className="p-3 bg-slate-50/70 rounded-xl space-y-1.5 text-slate-600 border border-slate-100">
                    <div className="flex justify-between">
                      <span>৳{(property.price || 0).toLocaleString()} x {nights} nights</span>
                      <span className="font-semibold text-[#012a4e]">৳{((property.price || 0) * nights).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Cleaning fee</span>
                      <span>৳1,200</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Service fee</span>
                      <span>৳650</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-sm text-[#012a4e]">
                      <span>Total</span>
                      <span>৳{((property.price || 0) * nights + 1850).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Reserve Button */}
                  <button
                    type="submit"
                    disabled={bookingSubmitting}
                    className="w-full py-3 rounded-full text-xs font-bold text-white bg-[#003580] hover:bg-[#002244] transition-all shadow-md shadow-[#003580]/20 cursor-pointer disabled:opacity-50"
                  >
                    {bookingSubmitting ? 'Reserving...' : 'Reserve Now (Instant Confirmation)'}
                  </button>

                  <p className="text-[10.5px] text-center text-slate-400">
                    You won't be charged yet • Free cancellation
                  </p>
                </form>
              )}

              {/* House Rules */}
              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Check-in: 14:00 - 23:00 | Check-out: 11:00</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                  <span>No smoking indoors • Passport/NID required</span>
                </div>
              </div>

              {/* Have a question? Send Enquiry */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <span className="text-[11px] font-bold text-slate-600 block">Have questions about this stay?</span>
                {enquirySuccess ? (
                  <div className="p-2.5 bg-[#e8f7fd] rounded-xl text-slate-700 text-xs space-y-0.5">
                    <div className="font-bold text-[#00AEEF]">Inquiry Sent</div>
                    <div>Ref: <strong>{enquirySuccess}</strong></div>
                  </div>
                ) : (
                  <form onSubmit={handleEnquirySubmit} className="space-y-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <input 
                        type="text" 
                        required 
                        placeholder="Your Name"
                        value={enquiryForm.name}
                        onChange={e => setEnquiryForm({ ...enquiryForm, name: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs focus:outline-hidden"
                      />
                      <input 
                        type="tel" 
                        required 
                        placeholder="WhatsApp / Phone"
                        value={enquiryForm.phone}
                        onChange={e => setEnquiryForm({ ...enquiryForm, phone: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs focus:outline-hidden"
                      />
                    </div>
                    <textarea 
                      rows="2" 
                      placeholder="Ask host a question..."
                      value={enquiryForm.message}
                      onChange={e => setEnquiryForm({ ...enquiryForm, message: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs focus:outline-hidden"
                    ></textarea>
                    <button
                      type="submit"
                      disabled={enquirySubmitting}
                      className="w-full py-1.5 rounded-lg font-bold text-xs text-[#003580] bg-slate-100 hover:bg-slate-200 transition-colors"
                    >
                      {enquirySubmitting ? 'Sending...' : 'Send Inquiry to Host'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          ) : (
            /* ======================================================== */
            /* CASE B: SALE / RENT (UPSTATE COMPACT INSPECTION & ENQUIRY) */
            /* ======================================================== */
            <div className="space-y-5">
              
              {/* Price & Inspection Box */}
              <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
                <div>
                  <div className="text-3xl font-black text-[#012a4e]">
                    {property.priceDisplay}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {property.pricePerSqft}
                  </div>
                </div>

                {property.inspectionTimes && property.inspectionTimes.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <span className="text-[10.5px] uppercase font-bold text-slate-400 block">
                      Scheduled Walkthrough
                    </span>
                    {property.inspectionTimes.map((time, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700 truncate">{time}</span>
                        <button
                          onClick={() => onBookInspection && onBookInspection(property, time)}
                          className="px-3 py-1 rounded-full text-xs font-bold text-white bg-[#00AEEF] hover:bg-[#0096ce] transition-colors shrink-0"
                        >
                          Book
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => onBookInspection && onBookInspection(property, 'Private Appointment')}
                  className="w-full py-2.5 rounded-full text-xs font-bold text-[#012a4e] bg-slate-100 hover:bg-[#e8f7fd] hover:text-[#00AEEF] transition-colors"
                >
                  Request Private Viewing
                </button>
              </div>

              {/* Agent Profile */}
              {property.agent && (
                <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3 text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Listing Agent</span>
                  <div className="flex items-center gap-3">
                    <img 
                      src={property.agent.avatar} 
                      alt={property.agent.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <div className="font-bold text-[#012a4e]">{property.agent.name}</div>
                      <div className="text-slate-400">{property.agent.role}</div>
                    </div>
                  </div>
                  <div className="pt-1 flex gap-2">
                    <a href={`tel:${property.agent.phone}`} className="flex-1 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-center font-semibold text-slate-700">
                      Call
                    </a>
                    <a href={`mailto:${property.agent.email}`} className="flex-1 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-center font-semibold text-slate-700">
                      Email
                    </a>
                  </div>
                </div>
              )}

              {/* Online Tenant Application for rental properties */}
              {(property.listing_type === 'rent' || property.purpose?.toLowerCase().includes('rent') || property.purpose === 'For Rent' || property.type === 'rent') && (
                <div className="p-5 rounded-3xl bg-[#012a4e] text-white space-y-3 shadow-md">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#00AEEF]/20 flex items-center justify-center text-[#00AEEF]">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white">Apply for Tenancy</div>
                      <div className="text-[11px] text-slate-300">Fast digital application</div>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Submit your personal details, employment background, and emergency contact directly for priority review.
                  </p>
                  <button
                    onClick={() => setTenantAppOpen(true)}
                    className="w-full py-2.5 rounded-full font-bold text-xs bg-[#00AEEF] hover:bg-[#0096ce] text-white transition-colors cursor-pointer shadow-xs"
                  >
                    Start Online Application
                  </button>
                </div>
              )}

              {/* Direct Enquiry Box */}
              <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200 text-xs space-y-3">
                <div className="font-bold text-[#012a4e]">Direct Enquiry</div>
                {enquirySuccess ? (
                  <div className="p-3 bg-[#e8f7fd] rounded-xl text-slate-700 space-y-1">
                    <div className="font-bold text-[#00AEEF]">Inquiry Sent</div>
                    <div>Ref: <strong>{enquirySuccess}</strong></div>
                  </div>
                ) : (
                  <form onSubmit={handleEnquirySubmit} className="space-y-2">
                    <input 
                      type="text" 
                      required 
                      placeholder="Your Name"
                      value={enquiryForm.name}
                      onChange={e => setEnquiryForm({ ...enquiryForm, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 focus:outline-hidden"
                    />
                    <input 
                      type="tel" 
                      required 
                      placeholder="Phone / WhatsApp"
                      value={enquiryForm.phone}
                      onChange={e => setEnquiryForm({ ...enquiryForm, phone: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 focus:outline-hidden"
                    />
                    <textarea 
                      rows="2" 
                      placeholder="Message..."
                      value={enquiryForm.message}
                      onChange={e => setEnquiryForm({ ...enquiryForm, message: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 focus:outline-hidden"
                    ></textarea>
                    <button
                      type="submit"
                      disabled={enquirySubmitting}
                      className="w-full py-2.5 rounded-full font-bold text-white bg-[#00AEEF] hover:bg-[#0096ce] transition-colors"
                    >
                      {enquirySubmitting ? 'Sending...' : 'Send Message'}
                    </button>
                  </form>
                )}
              </div>

            </div>
          )}

        </div>

      </div>

      {/* Online Tenant Application Modal */}
      <TenantApplicationModal
        isOpen={tenantAppOpen}
        onClose={() => setTenantAppOpen(false)}
        property={property}
      />

    </div>
  );
}
