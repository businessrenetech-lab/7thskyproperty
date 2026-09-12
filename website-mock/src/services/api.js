/**
 * api.js — Public Website API service layer.
 * Communicates with the Seventh Sky backend at /api/public-website and /api/public/short-stay.
 * Falls back gracefully to curated portfolio data when backend has empty or unseeded tables.
 */
import { MOCK_PROPERTIES } from '../data/mockProperties';

const API_BASE = '/api';

/** Helper to make robust JSON requests */
async function request(url, options = {}) {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const res = await fetch(fullUrl, config);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || data.message || `Request failed with status ${res.status}`);
    }
    return data;
  } catch (err) {
    console.warn(`[Website API Warning] ${url}:`, err.message);
    throw err;
  }
}

export const websiteApi = {
  // ─── 1. PROPERTIES ────────────────────────────────────────────────────────
  async getProperties(params = {}) {
    try {
      const query = new URLSearchParams();
      if (params.category && params.category !== 'all') query.append('category', params.category);
      if (params.purpose && params.purpose !== 'all') {
        const purp = String(params.purpose).toLowerCase();
        if (purp.includes('sale')) query.append('listing_type', 'sale');
        if (purp.includes('rent')) query.append('listing_type', 'rent');
        if (purp.includes('short')) query.append('listing_type', 'short_term');
      }
      if (params.query) query.append('search', params.query);
      if (params.bedrooms) query.append('bedrooms', params.bedrooms);

      const res = await request(`/public-website/properties?${query.toString()}`);
      if (res.data && res.data.length > 0) {
        // Map backend properties to website display format
        const mapped = res.data.map(p => {
          const isShort = p.listing_type === 'short_term' || Boolean(p.short_stay_profile);
          const isRent = p.listing_type === 'rent';
          const numPrice = p.price ? Number(p.price) : (p.approved_monthly_rent ? Number(p.approved_monthly_rent) : 0);
          const displayPrice = p.price_display || (numPrice > 0 ? (isShort ? `৳${numPrice.toLocaleString()} / night` : isRent ? `৳${numPrice.toLocaleString()} / month` : `৳${numPrice.toLocaleString()}`) : 'Price on Enquiry');
          const heroImg = p.featured_image_url || p.media?.[0]?.file_url || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80';

          const mediaList = Array.isArray(p.media) ? p.media.map(m => m?.file_url).filter(Boolean) : [];
          const gallery = mediaList.length > 0 ? mediaList : [heroImg];

          let features = p.features;
          if (typeof features === 'string') {
            try { features = JSON.parse(features); } catch { features = []; }
          }
          if (!Array.isArray(features)) features = [];

          return {
            id: p.id,
            code: p.property_code || String(p.id),
            title: p.title || 'Executive Residence',
            slug: p.slug || p.property_code,
            listing_type: p.listing_type,
            purpose: p.listing_type === 'sale' ? 'For Sale' : isShort ? 'Short Term Stay' : 'For Rent',
            category: p.category || 'residential',
            propertyType: p.property_type || 'Apartment',
            price: numPrice,
            currency: p.currency || 'BDT',
            priceDisplay: displayPrice,
            priceUnit: p.price_unit || (p.listing_type === 'sale' ? 'Total' : isShort ? 'per night' : 'per month'),
            location: `${p.area || ''}, ${p.city || p.district || 'Dhaka'}`.replace(/^,\s*/, ''),
            suburb: p.area || 'Dhaka',
            beds: p.bedrooms || 3,
            baths: p.bathrooms || 2,
            bedrooms: p.bedrooms || 3,
            bathrooms: p.bathrooms || 2,
            balconies: p.balconies || 2,
            cars: p.parking || 1,
            carSpaces: p.parking || 1,
            sqft: p.building_size || '2,400',
            sizeSqft: p.building_size || '2,400',
            image: heroImg,
            heroImage: heroImg,
            gallery,
            orientation: p.orientation || 'landscape',
            status: p.listing_status || p.status || 'available',
            isShortStay: isShort,
            shortStayProfile: p.short_stay_profile || null,
            features,
            isLive: true,
          };
        });

        return {
          success: true,
          count: mapped.length,
          data: mapped,
          isBackendLive: true,
        };
      }
    } catch (e) {
      console.info('Falling back to local curated portfolio for full showcase display');
    }

    // Curated Fallback
    let fallback = [...MOCK_PROPERTIES];
    if (params.purpose && params.purpose !== 'all') {
      fallback = fallback.filter(p => p.purpose.toLowerCase().includes(params.purpose.toLowerCase()));
    }
    if (params.category && params.category !== 'all') {
      fallback = fallback.filter(p => p.category.toLowerCase() === params.category.toLowerCase());
    }
    if (params.query) {
      const q = params.query.toLowerCase();
      fallback = fallback.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q) ||
        p.suburb.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q)
      );
    }
    return {
      success: true,
      count: fallback.length,
      data: fallback,
      isBackendLive: false,
    };
  },

  async getPropertyById(idOrSlug) {
    try {
      const res = await request(`/public-website/properties/${idOrSlug}`);
      if (res.data) {
        const p = res.data;
        const isShort = p.listing_type === 'short_term' || Boolean(p.short_stay_profile);
        const isRent = p.listing_type === 'rent';
        const numPrice = p.price ? Number(p.price) : (p.approved_monthly_rent ? Number(p.approved_monthly_rent) : 0);
        const displayPrice = p.price_display || (numPrice > 0 ? (isShort ? `৳${numPrice.toLocaleString()} / night` : isRent ? `৳${numPrice.toLocaleString()} / month` : `৳${numPrice.toLocaleString()}`) : 'Price on Enquiry');
        const heroImg = p.featured_image_url || p.media?.[0]?.file_url || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80';

        // Defensively parse features
        let features = p.features;
        if (typeof features === 'string') {
          try { features = JSON.parse(features); } catch { features = []; }
        }
        if (!Array.isArray(features) || features.length === 0) {
          features = ['24/7 Security & CCTV', 'Backup Generator', 'Dedicated Parking', 'High-Speed Elevators'];
        }

        // Defensively parse nearbyPlaces
        let nearbyPlaces = p.nearby_places || p.nearbyPlaces;
        if (typeof nearbyPlaces === 'string') {
          try { nearbyPlaces = JSON.parse(nearbyPlaces); } catch { nearbyPlaces = []; }
        }
        if (!Array.isArray(nearbyPlaces)) nearbyPlaces = [];

        // Defensively build gallery
        const mediaList = Array.isArray(p.media) ? p.media.map(m => m?.file_url).filter(Boolean) : [];
        const gallery = mediaList.length > 0 ? mediaList : [heroImg];

        // Short Stay Data fallback for room types & review scores
        const shortStayData = p.short_stay_data || (isShort ? {
          rating: '4.9',
          ratingText: 'Exceptional',
          reviewCount: 36,
          maxGuests: p.short_stay_profile?.max_guests || (p.bedrooms ? p.bedrooms * 2 : 4),
          roomTypes: [
            {
              name: p.title || 'Executive Master Suite',
              beds: `${p.bedrooms || 1} King Bed`,
              maxGuests: p.short_stay_profile?.max_guests || 2,
              pricePerNight: numPrice || 5000,
              perks: ['Free 200 Mbps WiFi', 'Smart Keypad Self Check-In', 'Free Cancellation']
            }
          ]
        } : null);

        return {
          success: true,
          data: {
            id: p.id,
            code: p.property_code || String(p.id),
            title: p.title || 'Luxury Residence',
            slug: p.slug || p.property_code,
            listing_type: p.listing_type,
            purpose: p.listing_type === 'sale' ? 'For Sale' : isShort ? 'Short Term Stay' : 'For Rent',
            category: p.category || 'residential',
            propertyType: p.property_type || 'Apartment',
            price: numPrice,
            currency: p.currency || 'BDT',
            priceDisplay: displayPrice,
            priceUnit: p.price_unit || (p.listing_type === 'sale' ? 'Total' : isShort ? 'per night' : 'per month'),
            location: `${p.area || ''}, ${p.city || p.district || 'Dhaka'}`.replace(/^,\s*/, ''),
            suburb: p.area || 'Dhaka',
            beds: p.bedrooms || 3,
            baths: p.bathrooms || 2,
            bedrooms: p.bedrooms || 3,
            bathrooms: p.bathrooms || 2,
            balconies: p.balconies || 2,
            cars: p.parking || 1,
            carSpaces: p.parking || 1,
            sqft: p.building_size || '2,400',
            sizeSqft: p.building_size || '2,400',
            yearBuilt: p.year_built || '2024',
            description: p.description || 'Exclusive property under Seventh Sky Property Care management.',
            features,
            nearbyPlaces,
            image: heroImg,
            heroImage: heroImg,
            gallery,
            status: p.listing_status || p.status || 'available',
            isShortStay: isShort,
            shortStayProfile: p.short_stay_profile,
            shortStayData,
            isLive: true,
          }
        };
      }
    } catch (e) {
      console.info('Resolving property from mock dataset');
    }

    const prop = MOCK_PROPERTIES.find(p => String(p.id) === String(idOrSlug) || p.code.toLowerCase() === String(idOrSlug).toLowerCase());
    if (prop) {
      return { success: true, data: prop, isLive: false };
    }
    return { success: false, error: 'Property not found' };
  },

  // ─── 2. ENQUIRIES & SUBMISSIONS ───────────────────────────────────────────
  async submitSalesEnquiry(payload) {
    return request('/public-website/sales-enquiries', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async submitRentalEnquiry(payload) {
    return request('/public-website/rental-enquiries', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async submitTenantApplication(payload) {
    return request('/public-website/tenant-applications', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async submitServiceRequest(payload) {
    return request('/public-website/service-requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async submitAppraisalRequest(payload) {
    return request('/public-website/appraisals', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async submitContactMessage(payload) {
    return request('/public-website/contact', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Short Term Stay Public Reservation
  async submitShortStayBookingEnquiry(payload) {
    return request('/public/short-stay/enquiries', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
