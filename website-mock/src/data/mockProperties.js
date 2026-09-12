// Upstate-Inspired Property Listings & Booking.com Short Term Stays
// Contains both vertical (portrait) and landscape orientation photography

export const MOCK_PROPERTIES = [
  // ==========================================
  // VERTICAL (PORTRAIT) ORIENTATION PROPERTIES (Group of 4)
  // ==========================================
  {
    id: "prop-v1",
    code: "SSP-GUL-701",
    title: "The Glass Atrium Residence",
    subtitle: "Triple-Height Ceilings with Scandinavian Timber & Panoramic Glazing",
    orientation: "vertical",
    category: "Residential",
    purpose: "Sale",
    propertyType: "Duplex Villa",
    price: 52000000,
    priceDisplay: "৳5.20 Cr",
    pricePerSqft: "৳11,800 / sq.ft",
    location: "Gulshan 2, Dhaka",
    suburb: "Gulshan 2",
    city: "Dhaka",
    coordinates: { lat: 23.7925, lng: 90.4178 },
    bedrooms: 4,
    bathrooms: 4.5,
    carSpaces: 3,
    sizeSqft: 4400,
    yearBuilt: 2024,
    status: "Available",
    badge: "Architectural",
    featured: true,
    inspectionTimes: ["Saturday 11:00 AM - 12:00 PM", "Tuesday 03:00 PM - 04:00 PM"],
    heroImage: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=85", // vertical interior
    gallery: [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=85",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?auto=format&fit=crop&w=1200&q=80"
    ],
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    droneVideoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    floorPlanUrl: "https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&w=1200&q=80",
    description: "A masterclass in modern minimalism. Triple-height vertical volume floods the interior with natural light while acoustic double glazing isolates the home from city noise.",
    features: [
      "Triple Height Glass Foyer",
      "Private Heated Plunge Pool",
      "Italian Bottochino Marble",
      "Full Solar & Battery Backup",
      "3 Covered Basement Parking",
      "Maid's Quarters with Ensuite"
    ],
    nearbyPlaces: [
      { category: "Transit", name: "Gulshan 2 Metro Link", distance: "400 m (5 mins walk)" },
      { category: "Schools", name: "American International School (AISD)", distance: "1.2 km (4 mins drive)" },
      { category: "Shopping", name: "Unimart Gulshan", distance: "500 m (6 mins walk)" },
      { category: "Healthcare", name: "United Hospital", distance: "1.6 km (6 mins drive)" }
    ],
    agent: {
      name: "Tariqul Islam",
      role: "Senior Property Advisor",
      phone: "+880 1711 002233",
      email: "tariqul@seventhskyproperty.com",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80"
    }
  },
  {
    id: "prop-v2",
    code: "SSP-BAR-302",
    title: "Nordic Diplomatic Suite",
    subtitle: "Floor-to-Ceiling Millwork with Minimalist Stone Fireplace & Private Lift",
    orientation: "vertical",
    category: "Residential",
    purpose: "Rent",
    propertyType: "Luxury Flat",
    price: 220000,
    priceDisplay: "৳2,20,000 / mo",
    pricePerSqft: "৳68 / sq.ft / mo",
    location: "Park Road, Baridhara, Dhaka",
    suburb: "Baridhara",
    city: "Dhaka",
    coordinates: { lat: 23.7995, lng: 90.4225 },
    bedrooms: 3,
    bathrooms: 3.5,
    carSpaces: 2,
    sizeSqft: 3250,
    yearBuilt: 2023,
    status: "Available",
    badge: "Diplomatic Zone",
    featured: true,
    inspectionTimes: ["Sunday 10:00 AM - 11:00 AM", "Thursday 04:00 PM - 05:00 PM"],
    heroImage: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1000&q=85",
    gallery: [
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1000&q=85",
      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=1200&q=80"
    ],
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    droneVideoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    floorPlanUrl: "https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&w=1200&q=80",
    description: "Located within the highest security cordon of Baridhara Diplomatic Zone. Solid white oak flooring, smart home HVAC, and dedicated 24/7 armed caretaker.",
    features: [
      "Direct Private Lift Access",
      "Diplomatic Perimeter Security",
      "Solid White Oak Hardwood",
      "Miele Built-In Kitchen",
      "Biannual Air & Water Care Included"
    ],
    nearbyPlaces: [
      { category: "Transit", name: "Baridhara Park Gate", distance: "150 m (2 mins walk)" },
      { category: "Healthcare", name: "Diplomatic Clinic", distance: "400 m (5 mins walk)" }
    ],
    agent: {
      name: "Sabrina Rahman",
      role: "Diplomatic Leasing Specialist",
      phone: "+880 1711 445566",
      email: "sabrina@seventhskyproperty.com",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80"
    }
  },
  {
    id: "prop-v3",
    code: "SSP-STS-01",
    title: "The Minimalist Sky Loft",
    subtitle: "Booking.com Certified Superb Serviced Residence with Rooftop Spa",
    orientation: "vertical",
    category: "Residential",
    purpose: "Guest House / Short Term Stay",
    propertyType: "Serviced Apartment",
    price: 14500,
    priceDisplay: "৳14,500 / night",
    pricePerSqft: "Serviced Stay",
    location: "Road 11, Banani, Dhaka",
    suburb: "Banani",
    city: "Dhaka",
    coordinates: { lat: 23.7937, lng: 90.4043 },
    bedrooms: 2,
    bathrooms: 2,
    carSpaces: 1,
    sizeSqft: 1850,
    yearBuilt: 2024,
    status: "Instant Book",
    badge: "Booking.com 9.8",
    featured: true,
    inspectionTimes: ["Daily 12:00 PM - 02:00 PM"],
    heroImage: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1000&q=85",
    gallery: [
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1000&q=85",
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80"
    ],
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    droneVideoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    floorPlanUrl: "https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&w=1200&q=80",
    description: "Designed strictly on Booking.com luxury criteria. Self check-in biometric lock, 200 Mbps fiber WiFi, daily housekeeping, organic bath amenities, and airport shuttle on request.",
    features: [
      "Self Check-In Smart Keypad",
      "Daily Linen Change & Housekeeping",
      "200 Mbps Dedicated WiFi",
      "Nespresso Coffee Bar & Pods",
      "Complimentary Airport Chauffeur",
      "24/7 Security & Concierge"
    ],
    // Booking.com Specialized Data
    isShortStay: true,
    shortStayData: {
      rating: 9.8,
      ratingText: "Exceptional",
      reviewCount: 164,
      stars: 5,
      cleaningFee: 1200,
      serviceFee: 650,
      cancellationPolicy: "Free cancellation up to 48 hours before check-in",
      checkInTime: "14:00 - 23:00",
      checkOutTime: "11:00",
      maxGuests: 4,
      bedsText: "1 Extra-Large King Bed + 1 Queen Bed",
      roomTypes: [
        {
          name: "Executive King Suite with City View",
          beds: "1 Extra-Large King Bed",
          maxGuests: 2,
          pricePerNight: 14500,
          perks: ["Free cancellation", "No prepayment needed", "Breakfast included", "Free Airport Transfer"]
        },
        {
          name: "Two-Bedroom Family Residence",
          beds: "1 King Bed + 2 Twin Beds",
          maxGuests: 4,
          pricePerNight: 19500,
          perks: ["Free cancellation", "Kitchenette", "Free Airport Transfer"]
        }
      ]
    },
    nearbyPlaces: [
      { category: "Transit", name: "Banani 11 Metro Station", distance: "250 m (3 mins walk)" },
      { category: "Dining", name: "Chef's Table & Bistro Lane", distance: "100 m (1 min walk)" },
      { category: "Airport", name: "Hazrat Shahjalal Intl Airport", distance: "7.2 km (18 mins drive)" }
    ],
    agent: {
      name: "Fahim Chowdhury",
      role: "Guest Stay Director",
      phone: "+880 1711 778899",
      email: "fahim@seventhskyproperty.com",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80"
    }
  },
  {
    id: "prop-v4",
    code: "SSP-DHN-804",
    title: "Lakeside Penthouse & Solarium",
    subtitle: "Corner Penthouse Overlooking Dhanmondi Lake with Private Terrace Garden",
    orientation: "vertical",
    category: "Residential",
    purpose: "Sale",
    propertyType: "Penthouse",
    price: 39500000,
    priceDisplay: "৳3.95 Cr",
    pricePerSqft: "৳10,400 / sq.ft",
    location: "Road 8/A, Dhanmondi, Dhaka",
    suburb: "Dhanmondi",
    city: "Dhaka",
    coordinates: { lat: 23.7538, lng: 90.3752 },
    bedrooms: 4,
    bathrooms: 4,
    carSpaces: 2,
    sizeSqft: 3800,
    yearBuilt: 2023,
    status: "Available",
    badge: "Lake View",
    featured: true,
    inspectionTimes: ["Saturday 03:00 PM - 04:30 PM"],
    heroImage: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1000&q=85",
    gallery: [
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1000&q=85",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80"
    ],
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    droneVideoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    floorPlanUrl: "https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&w=1200&q=80",
    description: "Panoramic lake vistas and custom Italian porcelain tiles. Includes dedicated private lift foyer, open-concept German kitchen, and automated solar lighting.",
    features: [
      "Unobstructed Dhanmondi Lake View",
      "Private Foyer with Fingerprint Lock",
      "Automated Rooftop Irrigation",
      "2 Dedicated Basement Car Stalls",
      "Independent Utility Inverters"
    ],
    nearbyPlaces: [
      { category: "Transit", name: "Dhanmondi 27 Hub", distance: "600 m (7 mins walk)" },
      { category: "Hospital", name: "Labaid Specialized Hospital", distance: "900 m (4 mins drive)" }
    ],
    agent: {
      name: "Tariqul Islam",
      role: "Senior Property Advisor",
      phone: "+880 1711 002233",
      email: "tariqul@seventhskyproperty.com",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80"
    }
  },

  // ==========================================
  // LANDSCAPE ORIENTATION PROPERTIES (Group of 4)
  // ==========================================
  {
    id: "prop-l1",
    code: "SSP-GUL-902",
    title: "The Glass Pavilion & Sky Villa",
    subtitle: "Architectural Penthouse with Private Terrace & Panoramic Skyline",
    orientation: "landscape",
    category: "Residential",
    purpose: "Sale",
    propertyType: "Penthouse",
    price: 48500000,
    priceDisplay: "৳4.85 Cr",
    pricePerSqft: "৳11,540 / sq.ft",
    location: "Road 79, Gulshan 2, Dhaka",
    suburb: "Gulshan 2",
    city: "Dhaka",
    coordinates: { lat: 23.7925, lng: 90.4178 },
    bedrooms: 4,
    bathrooms: 5,
    carSpaces: 3,
    sizeSqft: 4200,
    yearBuilt: 2023,
    status: "Available",
    badge: "Exclusive",
    featured: true,
    inspectionTimes: ["Saturday 11:00 AM - 12:00 PM", "Tuesday 03:30 PM - 04:30 PM"],
    heroImage: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80"
    ],
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    droneVideoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    floorPlanUrl: "https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&w=1200&q=80",
    description: "Designed for discerning homeowners, this expansive penthouse merges Scandinavian minimalism with floor-to-ceiling panoramic glass. Features a private rooftop garden, Italian marble finishes, and smart climate control.",
    features: [
      "Smart Biometric Access",
      "Private Heated Plunge Pool",
      "Italian Bottochino Marble",
      "Double Glazed Acoustic Windows",
      "Full Backup Generator"
    ],
    nearbyPlaces: [
      { category: "Transit", name: "Gulshan Circle 2", distance: "450 m (6 mins walk)" },
      { category: "Shopping", name: "Unimart Gulshan", distance: "600 m (7 mins walk)" }
    ],
    agent: {
      name: "Tariqul Islam",
      role: "Senior Property Advisor",
      phone: "+880 1711 002233",
      email: "tariqul@seventhskyproperty.com",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80"
    }
  },
  {
    id: "prop-l2",
    code: "SSP-COM-108",
    title: "The Apex Corporate Tower",
    subtitle: "Grade-A Commercial Office Floor with LEED Gold Certification",
    orientation: "landscape",
    category: "Commercial",
    purpose: "Rent",
    propertyType: "Commercial Office",
    price: 650000,
    priceDisplay: "৳6,50,000 / mo",
    pricePerSqft: "৳130 / sq.ft / mo",
    location: "Tejgaon Industrial Link Road, Dhaka",
    suburb: "Tejgaon",
    city: "Dhaka",
    coordinates: { lat: 23.7685, lng: 90.3985 },
    bedrooms: 0,
    bathrooms: 6,
    carSpaces: 8,
    sizeSqft: 5000,
    yearBuilt: 2023,
    status: "Available",
    badge: "Commercial Grade-A",
    featured: false,
    inspectionTimes: ["Monday - Friday 10:00 AM - 05:00 PM"],
    heroImage: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80"
    ],
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    droneVideoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    floorPlanUrl: "https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&w=1200&q=80",
    description: "Column-free commercial floorplate ready for multinational headquarters. Dual high-speed elevators, 3-phase industrial power, and LEED Gold eco standard.",
    features: [
      "Column-Free Design",
      "LEED Gold Sustainable Standard",
      "3-Phase Industrial Power Line",
      "Basement Automated Parking",
      "24/7 Facility Engineering Team"
    ],
    nearbyPlaces: [
      { category: "Transit", name: "Hatirjheel Express Ramp", distance: "400 m (2 mins drive)" },
      { category: "Transit", name: "Bijoy Sarani Metro", distance: "1.2 km (6 mins drive)" }
    ],
    agent: {
      name: "Tariqul Islam",
      role: "Senior Property Advisor",
      phone: "+880 1711 002233",
      email: "tariqul@seventhskyproperty.com",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80"
    }
  },
  {
    id: "prop-l3",
    code: "SSP-STS-02",
    title: "Baridhara Diplomatic Villa Suite",
    subtitle: "Booking.com 9.9 Superb Serviced Suite in Secured Precinct",
    orientation: "landscape",
    category: "Residential",
    purpose: "Guest House / Short Term Stay",
    propertyType: "Guest Suite",
    price: 16500,
    priceDisplay: "৳16,500 / night",
    pricePerSqft: "Serviced Stay",
    location: "Baridhara Diplomatic Zone, Dhaka",
    suburb: "Baridhara",
    city: "Dhaka",
    coordinates: { lat: 23.7995, lng: 90.4225 },
    bedrooms: 2,
    bathrooms: 2,
    carSpaces: 1,
    sizeSqft: 1950,
    yearBuilt: 2024,
    status: "Instant Book",
    badge: "Booking.com 9.9",
    featured: true,
    inspectionTimes: ["Daily 11:00 AM - 01:00 PM"],
    heroImage: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1600&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1600&q=80"
    ],
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    droneVideoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    floorPlanUrl: "https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&w=1200&q=80",
    description: "An elite sanctuary in Dhaka's safest zone. Features daily housekeeping, airport concierge transfers, Nespresso coffee lounge, and 24/7 security escorts for international visitors.",
    features: [
      "High Security Diplomatic Zone",
      "Self Check-In Smart Keypad",
      "Daily Linen Change & Cleaning",
      "Complimentary Airport Transfer",
      "High Speed Fiber WiFi (150 Mbps)"
    ],
    // Booking.com Specialized Data
    isShortStay: true,
    shortStayData: {
      rating: 9.9,
      ratingText: "Exceptional",
      reviewCount: 218,
      stars: 5,
      cleaningFee: 1500,
      serviceFee: 750,
      cancellationPolicy: "Free cancellation up to 48 hours before check-in",
      checkInTime: "14:00 - 23:00",
      checkOutTime: "12:00",
      maxGuests: 4,
      bedsText: "2 King Beds",
      roomTypes: [
        {
          name: "Diplomatic Master Suite",
          beds: "1 Extra-Large King Bed",
          maxGuests: 2,
          pricePerNight: 16500,
          perks: ["Free cancellation", "Breakfast included", "Free Airport Transfer", "Lake View Balcony"]
        },
        {
          name: "Royal Family Duplex Suite",
          beds: "2 King Beds",
          maxGuests: 4,
          pricePerNight: 23500,
          perks: ["Free cancellation", "Private Terrace", "Complimentary Mini-Bar"]
        }
      ]
    },
    nearbyPlaces: [
      { category: "Transit", name: "Diplomatic Checkpost", distance: "50 m (1 min walk)" },
      { category: "Park", name: "Baridhara Lakeside Park", distance: "250 m (3 mins walk)" },
      { category: "Airport", name: "Hazrat Shahjalal Intl Airport", distance: "6.8 km (15 mins drive)" }
    ],
    agent: {
      name: "Fahim Chowdhury",
      role: "Guest Stay Director",
      phone: "+880 1711 778899",
      email: "fahim@seventhskyproperty.com",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80"
    }
  },
  {
    id: "prop-l4",
    code: "SSP-RUR-501",
    title: "Sreemangal Tea Country Estate",
    subtitle: "Sprawling Organic Land & Heritage Countryside Retreat",
    orientation: "landscape",
    category: "Rural",
    purpose: "Sale",
    propertyType: "Estate / Farm",
    price: 32000000,
    priceDisplay: "৳3.20 Cr",
    pricePerSqft: "Agricultural Freehold",
    location: "Bhanugach Road, Sreemangal",
    suburb: "Sreemangal",
    city: "Sylhet",
    coordinates: { lat: 24.3065, lng: 91.7296 },
    bedrooms: 5,
    bathrooms: 4,
    carSpaces: 4,
    sizeSqft: 6500,
    yearBuilt: 2021,
    status: "Available",
    badge: "Eco Estate",
    featured: false,
    inspectionTimes: ["By Private Appointment"],
    heroImage: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1600&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80"
    ],
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    droneVideoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    floorPlanUrl: "https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&w=1200&q=80",
    description: "Agricultural and lifestyle retreat set amidst virgin tea gardens. Ideal for private eco-resort development or high-yield agro-forestry. Clear title and deed verification completed.",
    features: [
      "12 Bigha Clear Freehold Land",
      "Natural Freshwater Pond & Stream",
      "Solar Micro-Grid with Storage",
      "Perimeter Fencing & Guard House"
    ],
    nearbyPlaces: [
      { category: "Transit", name: "Sreemangal Railway", distance: "4.5 km (10 mins drive)" },
      { category: "Resort", name: "Grand Sultan Resort", distance: "2.1 km (5 mins drive)" }
    ],
    agent: {
      name: "Fahim Chowdhury",
      role: "Country & Rural Land Specialist",
      phone: "+880 1711 778899",
      email: "fahim@seventhskyproperty.com",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80"
    }
  }
];
