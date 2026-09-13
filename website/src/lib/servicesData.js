/**
 * servicesData.js — Master Dataset of Seventh Sky Property Care Services.
 *
 * Dedicated to the Bangladesh urban and expatriate (NRB) market context.
 * Covers all 12 core and field service lines with:
 *  - Tailored Bangladesh pain points & regulatory realities (WASA, RAJUK, Khatian, AC Land, Sub-Registry)
 *  - Detailed deliverables and scope
 *  - 4-step Standard Operating Procedures (SOP)
 *  - Service options & packages
 *  - Pricing guidance in BDT
 *  - Dynamic step form configurations
 *  - Comprehensive FAQs
 *  - Targeted SEO keywords & Schema.org definitions
 */

export const SERVICE_CATEGORIES = [
  { id: 'all', label: 'All Services' },
  { id: 'interior-design', label: 'Interior & Renovation' },
  { id: 'care-maintenance', label: 'Care & Maintenance' },
  { id: 'legal-documentation', label: 'Legal & Title Verification' },
  { id: 'financial-advisory', label: 'Financial & Loan Support' },
  { id: 'relocation-logistics', label: 'Relocation & Logistics' },
  { id: 'rentals-sales', label: 'Rentals & Sales' },
];

export const SERVICE_HERO_CONFIG = {
  'water-tank': {
    image: '/assets/services/water-tank-hero.png',
    line1: 'Pure Water.',
    line2: 'Certified Sanitisation.',
    ctaText: 'Request Water Tank Cleaning',
  },
  'air-conditioning': {
    image: '/assets/services/ac-hero.png',
    line1: 'Optimal Climate.',
    line2: 'Precision Air Care.',
    ctaText: 'Request AC Servicing',
  },
  'interior-design': {
    image: '/assets/services/interior-hero.png',
    line1: 'Refined Spaces.',
    line2: 'Crafted for Living.',
    ctaText: 'Request Interior Consultation',
  },
  'land-property-assessment': {
    image: '/assets/services/land-assessment-main.jpg',
    line1: 'Verified Land.',
    line2: 'Definitive Valuation.',
    ctaText: 'Request Land Assessment',
  },
  'loan-financial-support': {
    image: '/assets/services/loan-financial-main.jpg',
    line1: 'Smart Capital.',
    line2: 'Seamless Financing.',
    ctaText: 'Request Loan Advisory',
  },
  'property-documentation-verification': {
    image: '/assets/services/legal-verification-main.jpg',
    line1: 'Ironclad Titles.',
    line2: 'Total Legal Security.',
    ctaText: 'Verify Property Title',
  },
  'property-will-succession': {
    image: '/assets/services/will-succession-main.jpg',
    line1: 'Generational Legacy.',
    line2: 'Protected Succession.',
    ctaText: 'Consult Succession Advisor',
  },
  'removal-relocation': {
    image: '/assets/services/relocation-main.jpg',
    line1: 'Effortless Moves.',
    line2: 'White-Glove Care.',
    ctaText: 'Request Relocation Quote',
  },
  'property-care-concierge': {
    image: '/assets/services/concierge-care-main.jpg',
    line1: 'Vigilant Care.',
    line2: 'Always Protected.',
    ctaText: 'Request Concierge Care',
  },
  'property-management': {
    image: '/assets/services/property-management-main.jpg',
    line1: 'Effortless Tenancy.',
    line2: 'Guaranteed Returns.',
    ctaText: 'Request Property Management',
  },
  'residential-sales': {
    image: '/assets/services/residential-sales-main.jpg',
    line1: 'Prime Real Estate.',
    line2: 'Curated Acquisitions.',
    ctaText: 'Explore Sales & Listings',
  },
  'short-stay': {
    image: '/assets/services/short-stay-main.jpg',
    line1: 'Executive Stays.',
    line2: 'Bespoke Comfort.',
    ctaText: 'Book Serviced Stay',
  },
};

export const SERVICES = [
  // ─── 1. WATER TANK CLEANING & SANITISATION ──────────────────────────────────
  {
    slug: 'water-tank',
    id: 'water_tank',
    category: 'care-maintenance',
    categoryLabel: 'Care & Maintenance',
    title: 'Water Tank Cleaning & Disinfection Services',
    shortTitle: 'Water Tank Cleaning',
    tagline: 'Certified deep sanitisation, sludge evacuation & laboratory water testing for underground reservoirs and rooftop tanks.',
    badge: 'Municipal Safety & Food-Grade Standards',
    accent: '#0284c7', // Sky Blue
    pricingGuide: 'From ৳3,500 / tank',
    iconName: 'Droplets',
    heroImage: '/assets/services/water-tank-hero.png',
    overview: `Crystal-clear, germ-free drinking water for your family. We deep-clean rooftop tanks and underground reservoirs using 150-bar rotary pressure washers, heavy mud extraction pumps, and 100% food-safe biodegradable sanitiser. Zero caustic bleach smell, zero harm to your tank plaster, and high-definition video proof sent directly to your phone.`,
    marketContextBD: `Traditional cleaning laborers often use harsh bleaching powder or caustic acids that corrode tank waterproofing plaster and leave behind dangerous chemical fumes. Seventh Sky uses certified food-grade, biodegradable sanitising agents that destroy 99.9% of bacteria without leaving any chemical taste or smell in your drinking water.`,
    keyHighlights: [
      '150-Bar Rotary High Pressure Jet Scrub',
      'Food-Safe Sanitisation (Zero Harsh Bleach Smell)',
      'Underground Reservoirs & Rooftop PVC/Concrete Tanks',
      'Certified Water Quality Lab Testing Available',
      'Full WhatsApp Photo & Video Walkthrough for Landlords',
      'Discounts for Apartment Societies & Multi-Tank Buildings',
    ],
    features: [
      {
        title: 'Deep Sludge & Mud Vacuum',
        desc: 'Submersible slurry pumps extract thick bottom mud, sand, and pipe rust without blocking your building drainage.',
      },
      {
        title: '150-Bar High Pressure Jet Scrub',
        desc: 'Rotary pressure jets strip sticky green algae, bacterial biofilms, and mineral scale from walls, ceiling, and corners.',
      },
      {
        title: 'Food-Safe Anti-Bacterial Sanitisation',
        desc: 'WHO-compliant biodegradable steriliser kills 99.9% bacteria (E. coli, coliform) with zero chemical taste or odor.',
      },
      {
        title: 'Anti-Microbial Crevice Fogging',
        desc: 'Deep fog mist penetrates microscopic hairline fissures and air vents to prevent rapid algae regrowth.',
      },
      {
        title: 'Leak & Float Valve Inspection',
        desc: 'Thorough inspection of internal walls, sealing hairline cracks with food-safe polymer and replacing faulty float valves.',
      },
      {
        title: 'Certified Lab Water Quality Testing',
        desc: 'Optional 12-parameter independent laboratory test measuring E. coli, TDS, pH, hardness, and heavy metals with official certificate.',
      },
    ],
    processSteps: [
      {
        step: 1,
        title: 'Drain & Inspect',
        desc: 'We isolate the inlet valve, pump out old stagnant water, and inspect internal walls for cracks or leaks.',
      },
      {
        step: 2,
        title: 'Sludge Vacuum',
        desc: 'Submersible slurry pumps extract thick mud, sand, and rusted pipe sediment from the tank floor.',
      },
      {
        step: 3,
        title: '150-Bar Jet & Sanitise',
        desc: 'Rotary water jets strip green algae, followed by a food-grade antibacterial mist that kills 99.9% germs.',
      },
      {
        step: 4,
        title: 'Refill & Video Report',
        desc: 'We rinse, reset your float valves, refill the tank, and send an HD before-and-after video directly to your WhatsApp.',
      },
    ],
    serviceOptions: [
      { name: 'Underground Reservoir Cleaning', unit: 'Per Tank / Capacity Based', desc: 'Up to 50,000 Gallons' },
      { name: 'Rooftop Overhead Tank Cleaning', unit: 'Per Tank (PVC or Concrete)', desc: '1,000L to 10,000L' },
      { name: 'Full Complex Bundle (Underground + Rooftop)', unit: 'Per Building', desc: 'Multi-Apartment Package' },
      { name: 'Leakage Crack Repair & Waterproofing', unit: 'Per Sq.Ft / Spot', desc: 'Polymer Cementitious Membrane' },
      { name: 'Annual Water Tank AMC (2 to 4 Visits/Yr)', unit: 'Yearly Contract', desc: 'Automated Reminders & Priority' },
    ],
    coverageAreas: [
      'Prime Residential Enclaves',
      'Diplomatic & Executive Sectors',
      'Central Metropolitan Hubs',
      'Northern Development Corridors',
      'Southern Residential Zones',
      'Suburban Estates',
      'Corporate & Commercial Districts',
    ],
    formConfig: {
      equipmentTypeLabel: 'Tank Type',
      equipmentOptions: ['Underground Reservoir', 'Rooftop Overhead (Concrete)', 'Rooftop Overhead (PVC / Plastic)', 'Both Underground & Overhead', 'Commercial Multi-Tank Complex'],
      capacityLabel: 'Approximate Capacity / Building Floors',
      capacityPlaceholder: 'e.g. 5,000 Gallons / 6-Story Building',
      specificOptions: [
        'Routine Deep Cleaning & Washing',
        'Chemical Disinfection & Odor Removal',
        'Water Leakage & Crack Seepage Repair',
        'Annual Maintenance Contract (AMC)',
        'Water Quality Laboratory Testing',
      ],
    },
    faqs: [
      {
        q: 'How frequently should property water tanks be cleaned?',
        a: 'Due to sediment buildup in municipal piped water networks and seasonal airborne dust, health authorities recommend cleaning both underground reservoirs and rooftop tanks at least every 4 to 6 months.',
      },
      {
        q: 'Will the cleaning disrupt water supply to the apartment building?',
        a: 'We coordinate the cleaning schedule with building management or residents, typically completing the entire process within 2 to 4 hours per tank so disruption is kept to an absolute minimum.',
      },
      {
        q: 'Is the disinfectant chemical safe for drinking water?',
        a: 'Yes, 100%. We strictly prohibit harsh bleaching powders. We utilize certified food-grade, biodegradable sanitising agents that leave zero residual odor or toxic compounds once refilled.',
      },
      {
        q: 'Can you provide video and photo proof for landlords living abroad?',
        a: 'Yes. Our site supervisors capture clear high-definition before-and-after photos and video walk-throughs, which are uploaded to your client portal and shared via WhatsApp with our clients.',
      },
    ],
    seo: {
      metaTitle: 'Professional Water Tank Cleaning & Sanitisation | Seventh Sky',
      metaDescription: 'Expert water tank cleaning, sanitisation & disinfection. Fast underground & rooftop tank cleaning for apartments & offices. Book online.',
      keywords: 'water tank cleaning, tank wash, underground water tank cleaning, rooftop water tank sanitisation, water tank hygiene, amc water tank',
    },
  },

  // ─── 2. AIR CONDITIONING SOLUTIONS ───────────────────────────────────────────
  {
    slug: 'air-conditioning',
    id: 'air_conditioning',
    category: 'care-maintenance',
    categoryLabel: 'Care & Maintenance',
    title: 'Air Conditioning Maintenance & Servicing',
    shortTitle: 'Air Conditioning Solutions',
    tagline: 'Precision master servicing, jet chemical wash, refrigerant leak repair & inverter diagnostics for homes, corporate offices, and VRF systems.',
    badge: 'Certified HVAC & Inverter Specialists',
    accent: '#7c3aed', // Violet
    pricingGuide: 'From ৳1,200 / unit',
    iconName: 'Wind',
    heroImage: '/assets/services/ac-hero.png',
    overview: `Instant ice-cold cooling and cleaner indoor air for your home or office. We provide mess-free indoor jet washes using waterproof protective jackets, deep chemical foam sanitisation to eliminate sour odors, and electronic leak fixes with 100% pure virgin gas. Zero water drips on your walls, and peak cooling restored in under 90 minutes.`,
    marketContextBD: `Most local street technicians use messy buckets that ruin wall paint and wallpapers, or inject cheap adulterated refrigerant that burns out expensive inverter compressors. Seventh Sky uses certified waterproof wash jackets, digital manifold gauges, and 100% pure virgin refrigerant with backed 30-day service warranties.`,
    keyHighlights: [
      '100% Mess-Free Jet Wash with Waterproof Protective Jackets',
      'Certified Pure Virgin R32, R410A & R22 Gas Refills',
      'Deep Chemical Foam Disinfection (Eliminates Damp Smell)',
      'Inverter PCB Circuit & Sensor Diagnostic Lab',
      'Electronic Leak Detection & Nitrogen Pressure Testing',
      'Residential & Corporate Preventive AMC Contracts',
    ],
    features: [
      {
        title: 'Master Jet Wash (Indoor & Outdoor)',
        desc: '120-bar rotary pressure jet strips greasy dirt and dust from cooling coils and outdoor condensers with zero water mess on your walls.',
      },
      {
        title: 'Deep Chemical Foam Sanitisation',
        desc: 'Biodegradable expanding foam dissolves kitchen grease and eliminates damp, sour smells and black mold from the blower fan.',
      },
      {
        title: 'Refrigerant Gas Leak Fix & Refill',
        desc: 'Electronic sniffer pinpoints micro-leaks before recharging pure virgin R32, R410A, or R22 gas to restore ice-cold cooling.',
      },
      {
        title: 'Inverter Diagnostics & PCB Repair',
        desc: 'Component-level troubleshooting for blinking error codes (E1, E6, F0, P0), sensor faults, and inverter compressor trips.',
      },
      {
        title: 'Water Leakage & Drain Clearing',
        desc: 'Pressure flushing of clogged drain hoses and re-aligning unit slopes to permanently stop water dripping down your bedroom walls.',
      },
      {
        title: 'Safe AC Uninstallation & Shifting',
        desc: 'Refrigerant pump-down saves 100% of gas during flat moves, with vibration-damped bracket mounting and neat trunked piping.',
      },
    ],
    processSteps: [
      {
        step: 1,
        title: 'Diagnostic Check',
        desc: 'We measure airflow speed, coil cooling delta, compressor ampere load, and check for any blinking error codes.',
      },
      {
        step: 2,
        title: 'Mess-Free Setup',
        desc: 'We wrap the indoor unit in a heavy-duty waterproof collection jacket and place floor protection sheets underneath.',
      },
      {
        step: 3,
        title: 'High-Pressure Jet Wash',
        desc: 'Deep rotary jet cleaning flushes out all dirt and bacteria from indoor cooling coils, blower fans, and outdoor units.',
      },
      {
        step: 4,
        title: 'Cooling Test & Sign-Off',
        desc: 'We verify ice-cold temperature output, check drain flow, wipe the unit dry, and issue your 30-day service warranty.',
      },
    ],
    serviceOptions: [
      { name: 'Standard Master Jet Servicing', unit: 'Per Split Unit (1 to 2 Ton)', desc: 'Full Indoor + Outdoor Jet Clean' },
      { name: 'Deep Chemical Anti-Bacterial Wash', unit: 'Per Unit', desc: 'Evaporator Foam Disinfection' },
      { name: 'Refrigerant Gas Top-Up / Full Refill', unit: 'Per Unit (R32 / R410A)', desc: 'Leak Inspection Included' },
      { name: 'AC Relocation & Re-Installation', unit: 'Per Set', desc: 'Includes Flaring & Vacuuming' },
      { name: 'Annual AC Maintenance AMC', unit: 'Annual Contract', desc: '4 Periodic Washes + Priority Support' },
    ],
    coverageAreas: [
      'Prime Residential Enclaves',
      'Diplomatic & Executive Sectors',
      'Central Metropolitan Hubs',
      'Northern Development Corridors',
      'Southern Residential Zones',
      'Suburban Estates',
      'Corporate & Commercial Districts',
    ],
    formConfig: {
      equipmentTypeLabel: 'AC System Type',
      equipmentOptions: ['1.0 Ton Split AC', '1.5 Ton Split AC', '2.0 Ton Split AC', 'Cassette / Ceiling Unit', 'Multi-Split / Ducted System', 'Commercial VRF / Package Unit'],
      capacityLabel: 'Brand & Number of Units',
      capacityPlaceholder: 'e.g. 3 × Gree 1.5 Ton Inverter',
      specificOptions: [
        'Master Jet Pump Servicing (Water Wash)',
        'Deep Chemical Coil Cleaning & Odor Removal',
        'Refrigerant Gas Leak Repair & Refill',
        'Not Cooling / Blowing Warm Air',
        'Water Leaking / Dripping Inside Room',
        'AC Shifting & Relocation to New Property',
      ],
    },
    faqs: [
      {
        q: 'Will jet washing my AC indoors make a mess on my room walls or floor?',
        a: 'Never. Our technicians use heavy-duty waterproof wash jackets that channel all drained water directly into collection buckets, keeping your wallpapers, curtains, and flooring completely dry.',
      },
      {
        q: 'Why is my AC running but not cooling properly?',
        a: 'The most common causes are dust-clogged evaporator coils, blocked outdoor condensers, or low refrigerant gas caused by vibration-induced joint leaks. Our diagnostic identifies the exact root cause in minutes.',
      },
      {
        q: 'Do you work with Inverter AC brands like Gree, General, and Daikin?',
        a: 'Yes. All our technicians are certified in modern variable-speed inverter electronics, DC brushless fan motors, and eco-friendly R32/R410A refrigerants.',
      },
      {
        q: 'Do you offer service warranties?',
        a: 'Yes! We provide a 30-day service warranty on standard master servicing and up to 6 months warranty on compressor replacements and genuine spare parts.',
      },
    ],
    seo: {
      metaTitle: 'Professional AC Servicing & Repair | Seventh Sky',
      metaDescription: 'Trusted AC cleaning, jet wash, gas refill & inverter repair. Fast doorstep service across all managed residential sectors. Book online.',
      keywords: 'ac servicing, ac repair, ac gas refill, ac master servicing, ac relocation, inverter ac service, hvac maintenance',
    },
  },

  // ─── 3. INTERIOR DESIGN, FIT-OUT & RENOVATION ──────────────────────────────
  {
    slug: 'interior-design',
    id: 'interior_design',
    category: 'interior-design',
    categoryLabel: 'Interior & Renovation',
    title: 'Interior Design, Fit-Out & Renovation Solutions',
    shortTitle: 'Interior Design & Fit-Out',
    tagline: 'Complete home & office interior design, turnkey apartment fit-outs, modular kitchens, and custom woodwork with fixed transparent pricing.',
    badge: 'Turnkey Design & Written Warranty',
    accent: '#059669', // Emerald
    pricingGuide: 'From ৳1,200 / sq.ft',
    iconName: 'Palette',
    heroImage: '/assets/services/interior-hero.png',
    overview: `Turning an empty apartment or office into a beautiful, comfortable place to live and work shouldn't be stressful. Property owners often struggle with unreliable carpenters, cheap materials that swell in humidity, endless delays, and surprise bills.

Seventh Sky makes interior design simple, predictable, and exciting. Across our 7 specialized services—full home interiors, modern offices, modular kitchens & storage, home renovations, furniture styling, private gyms, and dedicated prayer rooms—we manage everything from initial 3D plans to final key handover.`,
    marketContextBD: `Whether you are styling a brand-new flat or remodeling an older family property, you get total price transparency with zero hidden surprises. Living abroad? You can easily design and renovate your home from anywhere in the world with our realistic 3D renderings, weekly video walk-throughs, and clear milestone updates.`,
    keyHighlights: [
      'Realistic 3D Visual Previews Before Any Work Begins',
      'Guaranteed Fixed Pricing & Detailed Itemized Estimates (Zero Hidden Costs)',
      '100% Waterproof Kitchen Cabinets & Silent German Soft-Close Hinges',
      'Modern False Ceilings, Warm Hidden Lighting & Smart Phone Controls',
      'Dust-Free Factory Fabrication — 80% Pre-Built to Keep Your Home Clean',
      'Dedicated Home Gyms & Peaceful Prayer Rooms (Musallah) with Wudu',
      'Stress-Free Remote Project Updates for Overseas Property Owners',
    ],
    features: [
      {
        title: 'Full Home & Apartment Interiors',
        desc: 'Smart space planning, warm living rooms, chef kitchens, master bedroom suites, and easy smartphone lighting controls.',
      },
      {
        title: 'Office & Commercial Interiors',
        desc: 'Inspiring workspaces, soundproof meeting rooms, executive cabins, modern reception desks, and safe hidden cable wiring.',
      },
      {
        title: 'Custom Cabinets & Modular Kitchens',
        desc: '100% waterproof marine wood, stain-proof quartz waterfall countertops, and whisper-quiet German soft-close drawers.',
      },
      {
        title: 'Home Renovation & Remodeling',
        desc: 'Opening up dark spaces, modern bathroom plumbing and waterproofing, damp wall treatment, and fixed-cost guarantees.',
      },
      {
        title: 'Furniture, Curtains & Home Styling',
        desc: 'Solid teak and oak dining sets, stain-resistant fabrics, custom blackout curtains, art curation, and white-glove setup.',
      },
      {
        title: 'Private Home & Office Gyms',
        desc: 'Shock-absorbing rubber flooring to protect your tiles, shatter-proof mirrors, safe equipment layouts, and fresh airflow.',
      },
      {
        title: 'Dedicated Prayer Rooms (Musallah)',
        desc: 'Laser-verified Qibla direction, soft plush prayer carpeting, adjoining clean Wudu washing stations, and solid oak Quran shelves.',
      },
    ],
    processSteps: [
      {
        step: 1,
        title: 'Free Consultation & 3D Plan',
        desc: 'Accurate laser measurements, lifestyle consultation, realistic 3D picture previews, and a transparent itemized quote.',
      },
      {
        step: 2,
        title: 'Material Choice & Agreement',
        desc: 'Touch real wood, stone, and fabric samples, approve detailed 2D layouts, and lock in guaranteed delivery dates.',
      },
      {
        step: 3,
        title: 'Dust-Free Factory Fabrication',
        desc: '80% of cabinetry pre-built in our computerized factory, site engineer supervision, and weekly WhatsApp video updates.',
      },
      {
        step: 4,
        title: 'Fast Setup & Key Handover',
        desc: 'Clean 10-14 day installation, complete room styling, joint quality walkthrough, and written warranty handover.',
      },
    ],
    serviceOptions: [
      { name: 'Full Home & Apartment Interiors', unit: 'Per Sq.Ft / Turnkey', desc: '3D Design, Complete Woodwork & Styling' },
      { name: 'Office & Commercial Interiors', unit: 'Per Sq.Ft / Workstation', desc: 'Workstations, Cabins & Meeting Rooms' },
      { name: 'Custom Kitchens & Modular Cabinetry', unit: 'Custom Layout', desc: '100% Waterproof Boards & Quartz Stone' },
      { name: 'Home Renovation & Bathroom Remodeling', unit: 'Per Scope / Fixed Quote', desc: 'Wall Removal, Tiles & Waterproofing' },
      { name: 'Private Home & Office Gym Setup', unit: 'Room by Room', desc: 'Rubber Flooring, Mirrors & Ventilation' },
      { name: 'Dedicated Prayer Room (Musallah)', unit: 'Dedicated Space', desc: 'Qibla Alignment, Soft Carpeting & Wudu' },
      { name: 'Furniture, Curtains & Styling Setup', unit: 'Per Room / Package', desc: 'Solid Wood Furniture, Drapes & Decor' },
    ],
    coverageAreas: [
      'Prime Residential Enclaves',
      'Diplomatic & Executive Sectors',
      'Central Metropolitan Hubs',
      'Northern Development Corridors',
      'Southern Residential Zones',
      'Suburban Estates',
      'Corporate & Commercial Districts',
    ],
    formConfig: {
      equipmentTypeLabel: 'Space Type',
      equipmentOptions: [
        'Residential Apartment / Penthouse',
        'Luxury Duplex / Private Villa',
        'Corporate Office / Workspace',
        'Retail Showroom / Boutique',
        'Fitness Room / Wellness Studio',
        'Muslim Prayer Room (Musallah)',
        'Custom Kitchen & Joinery Only',
      ],
      capacityLabel: 'Approximate Floor Area',
      capacityPlaceholder: 'e.g. 2,500 Sq.Ft / 3-Bed Residence',
      specificOptions: [
        'Full Home Interior (Living, Bedrooms, Kitchen)',
        'Office & Commercial Interior Fit-Out',
        'Custom Modular Kitchen & Wardrobes',
        'Space Planning & Home Renovation',
        'Private or Office Fitness Room Setup',
        'Muslim Prayer Room (Musallah) & Wudu Area',
        'Furniture, Curtains & Room Styling',
        'Overseas Property Renovation Management',
      ],
    },
    faqs: [
      {
        q: 'How long does a complete interior project take from start to finish?',
        a: 'A typical 1,500 to 3,000 sq.ft home or office fit-out takes between 45 to 70 days after 3D design approval. Because 80% of cabinetry is pre-built in our factory, on-site assembly takes only 10 to 14 days, keeping disruption minimal.',
      },
      {
        q: 'Can I monitor my renovation if I live abroad or outside the city?',
        a: 'Absolutely! Many of our clients live overseas. We provide a dedicated project manager, weekly video walkthroughs, and photo updates directly on WhatsApp and your client portal so you can watch your home take shape from anywhere.',
      },
      {
        q: 'Are your quotes really fixed with zero hidden costs?',
        a: 'Yes, 100%. Before work begins, you receive a detailed, itemized Bill of Quantities (BOQ) with transparent rates. Once signed, your price is locked in. We never add surprise fees or unapproved price hikes.',
      },
      {
        q: 'How do you protect cabinets from humidity, water spills, and termites?',
        a: 'We never use cheap particle boards. We use 100% boiling-water-resistant (BWR) marine plywood, scratch-resistant laminates, machine-sealed waterproof edges, and authentic German hardware that will not swell, rot, or rust.',
      },
      {
        q: 'Do you design special rooms like home gyms and family prayer rooms?',
        a: 'Yes! We specialize in home fitness rooms (with heavy rubber flooring that protects your floor tiles) and serene Muslim prayer rooms (with verified Qibla direction, adjoining clean Wudu washing areas, and plush carpeting).',
      },
    ],
    seo: {
      metaTitle: 'Interior Design & Turnkey Home Fit-Out | Seventh Sky',
      metaDescription: 'Beautiful, functional home and office interior design. Modular kitchens, luxury bedrooms, renovations, gym rooms & prayer spaces with written warranty.',
      keywords: 'interior design, turnkey fit-out, apartment interior, modular kitchen, home renovation, office interior, gym room design, musallah interior',
    },
  },

  // ─── 4. LAND & PROPERTY ASSESSMENT (SURVEY & VALUATION) ──────────────────────
  {
    slug: 'land-property-assessment',
    id: 'land_property_assessment',
    category: 'legal-documentation',
    categoryLabel: 'Legal & Title Verification',
    title: 'Land & Property Assessment, Survey & Valuation',
    shortTitle: 'Land Survey & Valuation',
    tagline: 'Digital satellite land demarcation, boundary dispute checks & certified bank valuation reports you can trust.',
    badge: 'Certified Surveyors & Valuers',
    accent: '#4f46e5', // Indigo
    pricingGuide: 'From ৳8,000 / plot',
    iconName: 'Compass',
    heroImage: '/assets/services/land-assessment-main.jpg',
    overview: `Know the exact boundaries and true market value of your land before you buy, build, or take a bank loan. We deploy certified surveyors with high-precision digital satellite equipment and drones to physically mark your plot boundaries, detect neighbor encroachments, and issue official bank-accepted valuation certificates.`,
    marketContextBD: `Many buyers face painful land disputes because of mismatched boundary pillars, overlapping records, or illegal encroachments. We physically verify on-ground measurements against government cadastral sheets so your land ownership remains 100% undisputed.`,
    keyHighlights: [
      'Digital Total Station & High-Precision GPS Boundary Surveying',
      'Physical Boundary Pillar Pegging & Encroachment Detection',
      'Bank-Accepted Property Valuation for Mortgages & Loans',
      'Cadastral Map Matching Against Historical Land Records',
      'High-Resolution Drone Aerial Photography & Video',
      'Remote Land Protection & Physical Inspection for Absentee Owners',
    ],
    features: [
      {
        title: 'Exact Boundary Demarcation',
        desc: 'High-precision GPS surveying to physically peg your exact property corners and prevent neighbor encroachments.',
      },
      {
        title: 'Certified Property Valuation',
        desc: 'Official appraisal report accepted by all major commercial banks for home mortgages, equity loans, and balance sheets.',
      },
      {
        title: 'Cadastral Map Overlay',
        desc: 'Cross-matching physical land measurements with official government cadastral maps to catch size discrepancies.',
      },
      {
        title: 'Topographic & Elevation Survey',
        desc: 'Ground contour and flood-level analysis to guide civil foundation design for construction and large developments.',
      },
      {
        title: 'Encroachment Dispute Analysis',
        desc: 'Independent technical report documenting illegal boundary encroachments and road setback infringements.',
      },
      {
        title: 'Remote Vacant Land Inspection',
        desc: 'Routine site visits with high-definition drone video proof for owners living away to safeguard against unauthorized occupation.',
      },
    ],
    processSteps: [
      {
        step: 1,
        title: 'Deed & Record Study',
        desc: 'We review your title deed, mutation records, and official map sheets from the land office.',
      },
      {
        step: 2,
        title: 'On-Site Digital Survey',
        desc: 'Our certified surveyor locks GPS coordinates and measures exact boundaries with Total Station instruments.',
      },
      {
        step: 3,
        title: 'CAD Mapping & Boundary Pegging',
        desc: 'We process raw measurements into official CAD drawings and install physical boundary corner markers.',
      },
      {
        step: 4,
        title: 'Certified Report Delivery',
        desc: 'You receive sealed survey plans, bank valuation reports, and digital drone inspection footage.',
      },
    ],
    serviceOptions: [
      { name: 'Digital Land Boundary Survey', unit: 'Per Plot', desc: 'Total Station Survey + CAD Map' },
      { name: 'Bank Property Valuation Assessment', unit: 'Per Property', desc: 'Official Valuation for Loans & Mortgages' },
      { name: 'Cadastral Map Overlap Verification', unit: 'Per Plot', desc: 'Record Cross-Matching & Discrepancy Check' },
      { name: 'Drone Aerial Topography & Video', unit: 'Per Acre', desc: 'High-Res Elevation Model & Video Proof' },
      { name: 'Vacant Land Protection & Inspection', unit: 'Annual Contract', desc: 'Routine Visits & Drone Reports' },
    ],
    coverageAreas: [
      'All Sub-Registry Jurisdictions',
      'Urban & Metropolitan Sectors',
      'Special Development Zones',
      'Commercial Corridors',
      'Nationwide Legal Desk',
      'High Commission & Expat Liaison',
    ],
    formConfig: {
      equipmentTypeLabel: 'Land / Property Type',
      equipmentOptions: ['Residential Plot / Land', 'Commercial Land / Building', 'Agricultural / Agro Land', 'Industrial Plot / Factory', 'Built Apartment / Building Valuation'],
      capacityLabel: 'Land Area / Katha',
      capacityPlaceholder: 'e.g. 5 Katha / 10 Bigha / 2,500 Sq.Ft',
      specificOptions: [
        'Boundary Demarcation & Pegging (Total Station)',
        'Certified Bank Property Valuation',
        'Mouza Map & Dag Overlap Verification',
        'Encroachment Detection & Dispute Resolution',
        'Remote Land Verification & Physical Inspection',
      ],
    },
    faqs: [
      {
        q: 'What documents are required to conduct an official land survey?',
        a: 'We require a copy of the registered Title Deed, the latest Mutation Porcha, and the tax receipt. Having historical survey records is also helpful.',
      },
      {
        q: 'Are your property valuation reports accepted by commercial banks?',
        a: 'Yes. Our senior valuers are certified members of recognized appraisal bodies, and our reports follow standard institutional appraisal guidelines for credit and mortgages.',
      },
      {
        q: 'How do you detect if a neighbor has encroached on my plot?',
        a: 'We establish baseline coordinates from permanent survey benchmarks, overlay the field measurements onto the official cadastral map in CAD, and compute the exact square footage of any boundary infringement.',
      },
    ],
    seo: {
      metaTitle: 'Certified Land Survey & Property Valuation | Seventh Sky',
      metaDescription: 'Digital total station land survey, cadastral map matching & certified property valuation. Protect your land from encroachment. Book today.',
      keywords: 'land survey, property valuation, digital land survey, total station survey, cadastral map survey, land encroachment check, boundary verification',
    },
  },

  // ─── 5. HOME LOAN & FINANCIAL SUPPORT ───────────────────────────────────────
  {
    slug: 'loan-financial-support',
    id: 'loan_financial_support',
    category: 'financial-advisory',
    categoryLabel: 'Financial & Loan Support',
    title: 'Home Loan & Property Financing Support',
    shortTitle: 'Property Loan Support',
    tagline: 'Fast bank pre-approvals, lowest interest rates & end-to-end mortgage paperwork handling.',
    badge: 'Banking & Mortgage Advisory',
    accent: '#0d9488', // Teal
    pricingGuide: 'Free Eligibility Check',
    iconName: 'Landmark',
    heroImage: '/assets/services/loan-financial-main.jpg',
    overview: `Securing a home loan or commercial mortgage shouldn't take months of stressful bank visits. We compare rates across 15+ top financial institutions, calculate your borrowing eligibility, assemble your entire paperwork dossier, and fast-track bank sanctioning with zero hidden broker fees.`,
    marketContextBD: `Bank loan applications frequently get stalled by minor documentation errors, strict debt-to-income checks, or slow property title vetting. Our dedicated mortgage desk navigates bank credit requirements directly, securing pre-approval in days rather than months.`,
    keyHighlights: [
      'Direct Tie-Ups with 15+ Leading Banks & Financial Institutions',
      'Unbiased Interest Rate & Fee Comparison (Save Up to 1.5% on EMIs)',
      'Specialized Overseas Earner & Expat Financing Desk',
      'Fast-Track In-Principle Sanction Within 7 to 10 Working Days',
      'Complete Tax & Income Dossier Assembly with Zero Hassle',
      'Mortgage Balance Transfer to Cut Existing Monthly Payments',
    ],
    features: [
      {
        title: 'Rate Comparison & Bank Selection',
        desc: 'We compare interest rates, hidden processing fees, and early settlement rules across top banks to lock in your lowest monthly EMI.',
      },
      {
        title: 'Complete Paperwork Assembly',
        desc: 'We organize your salary certificates, tax returns, bank statements, and property vetting documents into an audit-ready bank dossier.',
      },
      {
        title: 'Fast-Track Pre-Approval',
        desc: 'Direct liaison with senior bank credit officers to secure formal in-principle sanction letters in days instead of months.',
      },
      {
        title: 'Overseas Earner Mortgage Desk',
        desc: 'Dedicated processing for clients earning abroad, managing foreign income proofs, embassy paperwork, and compliant remittance loans.',
      },
      {
        title: 'Construction & Renovation Loans',
        desc: 'Staged bank disbursement facilities to finance new residential building construction or luxury apartment interior remodels.',
      },
      {
        title: 'Refinancing & Balance Transfer',
        desc: 'Transfer your existing expensive home mortgage to lower-rate banks to immediately reduce your monthly payments and interest burden.',
      },
    ],
    processSteps: [
      {
        step: 1,
        title: 'Free Eligibility Check',
        desc: 'We evaluate your monthly income, debts, and property value to pinpoint your maximum borrowing capacity.',
      },
      {
        step: 2,
        title: 'Best Bank Match & Dossier',
        desc: 'We identify the bank offering the lowest rate, compile your full documentation, and submit the application.',
      },
      {
        step: 3,
        title: 'Sanction Letter Approval',
        desc: 'We manage bank valuation and legal deed scrutiny directly, securing your formal loan sanction letter.',
      },
      {
        step: 4,
        title: 'Mortgage Signing & Payout',
        desc: 'We assist with registry mortgage deed execution and ensure prompt disbursement to the property seller or developer.',
      },
    ],
    serviceOptions: [
      { name: 'New Home & Apartment Purchase Loan', unit: 'Up to 70% Property Value', desc: 'Lowest Interest Rates & Swift Bank Sanction' },
      { name: 'Plot Purchase & Construction Loan', unit: 'Staged Payouts', desc: 'Land & Multi-Story Building Construction' },
      { name: 'Overseas Earner Mortgage Package', unit: 'Remote Processing', desc: 'Fast Sanction for Global & Expat Earners' },
      { name: 'Mortgage Balance Transfer (Refinancing)', unit: 'Existing Loans', desc: 'Lower Monthly EMI & Interest Takeover' },
      { name: 'Commercial Property & Office Finance', unit: 'Custom Facilities', desc: 'Corporate & Mixed-Use Real Estate Funding' },
    ],
    coverageAreas: [
      'All Sub-Registry Jurisdictions',
      'Urban & Metropolitan Sectors',
      'Special Development Zones',
      'Commercial Corridors',
      'Nationwide Legal Desk',
      'High Commission & Expat Liaison',
    ],
    formConfig: {
      equipmentTypeLabel: 'Employment / Income Type',
      equipmentOptions: ['Salaried Professional', 'Business Owner / Entrepreneur', 'Overseas / Expat Earner', 'Self-Employed / Consultant'],
      capacityLabel: 'Desired Loan Amount',
      capacityPlaceholder: 'e.g. ৳75,00,000 (75 Lakhs)',
      specificOptions: [
        'New Home / Apartment Purchase Loan',
        'Plot Purchase & Building Construction Loan',
        'Overseas Earner Mortgage Support',
        'Home Loan Refinancing / Balance Transfer',
        'Commercial Property Financing',
      ],
    },
    faqs: [
      {
        q: 'What is the maximum loan-to-value (LTV) ratio available for home loans?',
        a: 'Under standard central banking guidelines, commercial banks typically finance up to 70% of the total property valuation for residential apartments, requiring a minimum 30% down payment from the buyer.',
      },
      {
        q: 'Can overseas earners get a home loan without traveling in person?',
        a: 'Yes! Through our dedicated remote financing desk, you can complete eligibility checks, income vetting, and mortgage deed execution through a verified Power of Attorney.',
      },
      {
        q: 'How long does bank loan sanctioning typically take?',
        a: 'With properly structured dossiers submitted through our team, initial in-principle sanction takes 7 to 10 working days, and final disbursement occurs within 3 to 4 weeks.',
      },
      {
        q: 'Do you charge upfront brokerage fees?',
        a: 'No. Our preliminary loan eligibility check and bank rate comparisons are completely free with zero hidden broker charges.',
      },
    ],
    seo: {
      metaTitle: 'Home Loan & Property Mortgage Advisory | Seventh Sky',
      metaDescription: 'Get fast home loan approvals, compare lowest bank interest rates & finance your property easily. Free eligibility check and dedicated expat loan support.',
      keywords: 'home loan, property mortgage, expat home loan, bank mortgage advice, flat purchase financing, loan balance transfer',
    },
  },

  // ─── 6. PROPERTY DOCUMENTATION & LEGAL VERIFICATION ──────────────────────────
  {
    slug: 'property-documentation-verification',
    id: 'property_documentation_verification',
    category: 'legal-documentation',
    categoryLabel: 'Legal & Title Verification',
    title: 'Property Title Search & Legal Verification',
    shortTitle: 'Property Title Verification',
    tagline: '100% scam-free property purchase with comprehensive 30-year deed search & legal vetting.',
    badge: 'Senior Property Advocates',
    accent: '#ea580c', // Orange
    pricingGuide: 'From ৳15,000 / vetting',
    iconName: 'ShieldCheck',
    heroImage: '/assets/services/legal-verification-main.jpg',
    overview: `Buying a flat or land is a major lifetime investment. Before you pay any booking deposit, our veteran property advocates examine the unbroken 30-year ownership history, inspect original registry archive volumes, and verify that the property is 100% authentic and completely free from hidden mortgages, counterfeit deeds, or court disputes.`,
    marketContextBD: `Fake title deeds, undisclosed bank loans, forged inheritance signatures, and unapproved building deviations cause devastating losses for unsuspecting buyers. We personally inspect registry archives and municipal files to deliver an independent, signed legal safety report.`,
    keyHighlights: [
      'Unbroken 30-Year Chain of Title Investigation (Deed Trace)',
      'Sub-Registry Archive Inspection & Non-Encumbrance (NEC) Search',
      'Mutation, Tax Clearance & Government Record Verification',
      'Building Approval & Statutory Permit Compliance Audit',
      'Screening Against Court Injunctions, Vested Land & Mortgages',
      'Written Legal Opinion Report Signed by Senior High Court Advocate',
    ],
    features: [
      {
        title: '30-Year Historical Title Trace',
        desc: 'We trace the full chain of ownership back 30+ years to verify legitimate sales, inheritances, and legal continuity.',
      },
      {
        title: 'Registry Archive Inspection',
        desc: 'Our legal team inspects original Sub-Registry volume books to verify deed authenticity and confirm no undisclosed second sales.',
      },
      {
        title: 'Non-Encumbrance Certificate (NEC)',
        desc: 'Official registry certification proving the property has never been mortgaged, leased, or sold to another party.',
      },
      {
        title: 'Mutation & Tax Verification',
        desc: 'We verify genuine mutation records, survey numbers, and up-to-date land tax payments at the local land office.',
      },
      {
        title: 'Building Permit & Plan Audit',
        desc: 'Cross-checking architectural approvals, setback compliance, and occupancy certificates to prevent demolition orders.',
      },
      {
        title: 'Signed Legal Opinion Report',
        desc: 'A plain-English legal risk report with clear traffic-light safety ratings (Green/Yellow/Red) before you pay any deposit.',
      },
    ],
    processSteps: [
      {
        step: 1,
        title: 'Document Intake',
        desc: 'Send us copies of the title deed, mutation records, tax receipts, and building approval drawings.',
      },
      {
        step: 2,
        title: 'Registry Archive Search',
        desc: 'Our legal officers inspect original records at the Sub-Registry and local land office archives.',
      },
      {
        step: 3,
        title: 'Court & Statutory Cross-Check',
        desc: 'We screen court registers for pending lawsuits and verify structural municipal approvals.',
      },
      {
        step: 4,
        title: 'Signed Legal Report',
        desc: 'You receive an authoritative legal opinion report confirming whether the property is safe to purchase.',
      },
    ],
    serviceOptions: [
      { name: 'Comprehensive Property Title Vetting', unit: 'Per Property / Flat', desc: 'Full 30-Yr Chain & Signed Legal Opinion' },
      { name: 'Sub-Registry Non-Encumbrance Search (NEC)', unit: 'Per Deed / Search', desc: 'Official Registry Archive Verification' },
      { name: 'Mutation & Tax Record Authentication', unit: 'Per Record', desc: 'Land Office Archive Verification' },
      { name: 'Building Plan & Approval Validation', unit: 'Per Building', desc: 'Municipal Permit & Deviation Check' },
      { name: 'Complete Pre-Purchase Buyer Protection', unit: 'Turnkey Package', desc: 'Full Due Diligence Before Token Payment' },
    ],
    coverageAreas: [
      'All Sub-Registry Jurisdictions',
      'Urban & Metropolitan Sectors',
      'Special Development Zones',
      'Commercial Corridors',
      'Nationwide Legal Desk',
      'High Commission & Expat Liaison',
    ],
    formConfig: {
      equipmentTypeLabel: 'Property Type',
      equipmentOptions: ['Apartment / Ready Flat', 'Residential Land Plot', 'Commercial Floor / Building', 'Under-Construction Developer Project', 'Inherited / Ancestral Property'],
      capacityLabel: 'Location / Registry Area',
      capacityPlaceholder: 'e.g. Sector 4, Central Sub-Registry Area',
      specificOptions: [
        'Complete Title Vetting & Legal Opinion (Before Buying)',
        'Sub-Registry Volume & NEC Search',
        'Mutation & Land Tax Authentication',
        'Building Approved Plan & Deviation Verification',
        'Inheritance & Succession Title Investigation',
      ],
    },
    faqs: [
      {
        q: 'Why is verifying the 30-year chain deed so essential?',
        a: 'A current deed is only as legally valid as the prior transfers behind it. If an owner 20 years ago transferred the property without all legal heirs consenting or via forged signatures, the current buyer can lose ownership in civil court.',
      },
      {
        q: 'What is a Non-Encumbrance Certificate (NEC)?',
        a: 'An NEC is an official document issued by the registry office confirming that the property is completely clear of undisclosed bank mortgages, leases, or conflicting sales during the searched period.',
      },
      {
        q: 'How long does a thorough legal verification take?',
        a: 'A complete search and signed legal opinion report takes 5 to 7 working days, allowing adequate time for physical registry archive inspections.',
      },
    ],
    seo: {
      metaTitle: 'Property Title Verification & Legal Due Diligence | Seventh Sky',
      metaDescription: 'Avoid property scams and disputed land. Complete 30-year title deed search, registry non-encumbrance vetting & lawyer-signed legal opinion reports.',
      keywords: 'property title verification, land deed verification, legal property vetting, non encumbrance certificate nec, property due diligence, buying flat legal check',
    },
  },

  // ─── 7. PROPERTY WILL, INHERITANCE & SUCCESSION SUPPORT ─────────────────────
  {
    slug: 'property-will-succession',
    id: 'property_will_succession',
    category: 'legal-documentation',
    categoryLabel: 'Legal & Title Verification',
    title: 'Property Will, Inheritance & Succession Support',
    shortTitle: 'Will & Succession Support',
    tagline: 'Protect family wealth and ensure smooth, dispute-free property inheritance across generations.',
    badge: 'Estate & Succession Law Specialists',
    accent: '#db2777', // Rose
    pricingGuide: 'From ৳20,000 / case',
    iconName: 'Scroll',
    heroImage: '/assets/services/will-succession-main.jpg',
    overview: `Transferring property to children or heirs can easily lead to bitter family disputes or frozen assets if not documented properly. We guide families through peaceful, legally sound inheritance planning—drafting legally binding Wills, Gift Deeds (Heba), formal Partition Deeds, and land mutation so every heir receives clear, sellable ownership.`,
    marketContextBD: `Ambiguous verbal promises and unregistered co-heir shares often result in multi-year court battles or co-heirs taking unauthorized possession. We provide confidential, compassionate legal structuring that complies strictly with statutory and personal inheritance laws.`,
    keyHighlights: [
      'Heirship & Succession Certificate Assistance',
      'Mutual Family Partition Deed (Bonton-nama) Drafting & Registration',
      'Gift Deeds (Heba) & Testamentary Will Documentation',
      'Inherited Land Mutation & Separate Khatians for Each Heir',
      'Full Compliance with Statutory & Personal Succession Laws',
      'Overseas Heir Representation via Attested Power of Attorney',
    ],
    features: [
      {
        title: 'Heirship & Share Calculation',
        desc: 'We review family genealogy, verify legal heirs, and accurately calculate each heir’s exact percentage share under statutory succession rules.',
      },
      {
        title: 'Partition Deed (Bonton-nama)',
        desc: 'Drafting clear, mutually agreed division deeds that demarcate exactly who owns which floor, room, or land parcel to prevent future disputes.',
      },
      {
        title: 'Registered Gift Deed (Heba)',
        desc: 'Drafting and registering legally binding lifetime gift deeds to transfer properties smoothly to spouses or children with zero hassle.',
      },
      {
        title: 'Inheritance Mutation',
        desc: 'Updating government land office records to cancel deceased owners and issue separate mutation records in each heir’s name.',
      },
      {
        title: 'Court Succession Certificates',
        desc: 'Filing civil court petitions for succession and probate certificates required for bank accounts, company shares, and property transfers.',
      },
      {
        title: 'Overseas Heir Representation',
        desc: 'Assisting family members living abroad with embassy-attested Power of Attorney documents so they are never excluded from their rightful inheritance.',
      },
    ],
    processSteps: [
      {
        step: 1,
        title: 'Family Consult & Heir Mapping',
        desc: 'We review family genealogy, death certificates, and property deeds to map exact statutory inheritance shares.',
      },
      {
        step: 2,
        title: 'Statutory Certification',
        desc: 'We obtain official heirship certificates and file court succession petitions where required.',
      },
      {
        step: 3,
        title: 'Partition Deed Registration',
        desc: 'We draft the formal family partition agreement and register it with the Sub-Registry with all heirs’ consent.',
      },
      {
        step: 4,
        title: 'Separate Mutation & Title',
        desc: 'We file for individual mutation records at the land office so every heir holds independent, sellable title documents.',
      },
    ],
    serviceOptions: [
      { name: 'Family Heirship Certificate Package', unit: 'Per Family Estate', desc: 'Government & Councillor Legal Certifications' },
      { name: 'Registered Partition Deed (Bonton-nama)', unit: 'Per Deed', desc: 'Drafting, Stamp & Sub-Registry Registration' },
      { name: 'Inherited Property Land Mutation', unit: 'Per Heir Record', desc: 'Separate Ownership Khatian Issuance' },
      { name: 'Civil Court Succession Certificate', unit: 'Court Petition', desc: 'Probate & Letters of Administration' },
      { name: 'Remote Power of Attorney (POA) Service', unit: 'Per Instrument', desc: 'Embassy & Foreign Affairs Attestation' },
    ],
    coverageAreas: [
      'All Sub-Registry Jurisdictions',
      'Urban & Metropolitan Sectors',
      'Special Development Zones',
      'Commercial Corridors',
      'Nationwide Legal Desk',
      'High Commission & Expat Liaison',
    ],
    formConfig: {
      equipmentTypeLabel: 'Succession Scenario',
      equipmentOptions: ['Deceased Parent / Ancestral Property Partition', 'Inherited Property Mutation', 'Heirship Certificate Filing', 'Will / Gift Deed (Heba) Drafting', 'Disputed Family Estate Resolution'],
      capacityLabel: 'Number of Heirs & Properties',
      capacityPlaceholder: 'e.g. 4 Heirs / 1 Apartment & 1 Plot',
      specificOptions: [
        'Mutual Partition Deed (Bonton-nama) Registration',
        'Inherited Property Mutation at Land Office',
        'Heirship Certificate & Family Tree Verification',
        'Civil Court Succession Certificate Application',
        'Overseas Heir Power of Attorney Representation',
      ],
    },
    faqs: [
      {
        q: 'Can inherited property be sold without a registered Partition Deed (Bonton-nama)?',
        a: 'Selling undivided shares without a registered Partition Deed creates severe legal defects. Buyers and banks will refuse financing, and other co-heirs can file injunctions. A registered partition deed gives each heir independent, undisputed title.',
      },
      {
        q: 'How can family members living abroad settle inheritance without traveling in person?',
        a: 'Overseas heirs can execute a Power of Attorney at the nearest embassy or consulate. Once attested, our legal team can handle all partition registration and mutation on their behalf.',
      },
      {
        q: 'What is a Heba (Gift) deed and how does it work?',
        a: 'A Heba is a registered legal gift transferring property ownership during the owner’s lifetime, typically between immediate family members (spouse, children, parents). Once registered, it provides immediate legal ownership with minimal stamp duty.',
      },
    ],
    seo: {
      metaTitle: 'Property Will, Inheritance & Succession Legal Advisory | Seventh Sky',
      metaDescription: 'Protect family wealth and resolve property inheritance peacefully. Partition deeds (bonton-nama), heirship certificates & inherited land mutation.',
      keywords: 'property inheritance, partition deed bonton nama, heirship certificate, property will drafting, heba gift deed, inherited land mutation',
    },
  },

  // ─── 8. HOME & OFFICE REMOVAL & RELOCATION ─────────────────────────────────
  {
    slug: 'removal-relocation',
    id: 'removal_relocation',
    category: 'relocation-logistics',
    categoryLabel: 'Relocation & Logistics',
    title: 'Home & Office Removal & Relocation Services',
    shortTitle: 'Removal & Relocation',
    tagline: 'Stress-free packing, safe transport & complete furniture assembly with zero damage guarantee.',
    badge: 'Dedicated Fleet & Master Packers',
    accent: '#b45309', // Amber Brown
    pricingGuide: 'From ৳7,500 / move',
    iconName: 'Truck',
    heroImage: '/assets/services/relocation-main.jpg',
    overview: `Moving to a new home or corporate office shouldn't be chaotic or exhausting. Our trained, uniformed moving crews pack every single dish, wrap delicate electronics in multi-layer bubble wrap, transport everything in covered weatherproof trucks, and assemble your furniture at your new address. You simply walk in and relax.`,
    marketContextBD: `Casual street laborers frequently scratch polished hardwood floors, crack expensive glassware, or leave modular beds unassembled. Seventh Sky brings heavy-duty moving blankets, foam corner protectors, master carpenters, and all-weather transport container trucks.`,
    keyHighlights: [
      'Multi-Layer Protective Packing (Heavy-Duty Boxes, Foam & Bubble Wrap)',
      'Master Carpenters for Dismantling & Reassembly (Beds, Wardrobes & Tables)',
      'Careful Handling of Large Smart TVs, Fridges & Fragile Chinaware',
      'Covered Weatherproof Container Trucks with GPS Tracking',
      'Unpacking & Room-by-Room Furniture Placement at Your New Home',
      'Zero Hidden Costs with Transparent All-Inclusive Quotes',
    ],
    features: [
      {
        title: 'Turnkey Home Moving',
        desc: 'Room-by-room packing, hanging wardrobe boxes for clothes, foam-padded glassware cartons, and organized unpacking in your new home.',
      },
      {
        title: 'Corporate Office Shifting',
        desc: 'Weekend and overnight moves, modular workstation dismantling, IT server packing, and zero business downtime.',
      },
      {
        title: 'Master Carpenter Service',
        desc: 'Experienced carpenters carefully dismantle and reassemble complex hydraulic beds, modular wardrobes, wall units, and conference tables.',
      },
      {
        title: 'Fragile & Electronics Care',
        desc: 'Custom shock-absorbent packaging for large OLED TVs, chandeliers, pianos, luxury artwork, and kitchen glassware.',
      },
      {
        title: 'Appliance Unhook & Reconnect',
        desc: 'Safe disconnection and reinstallation assistance for washing machines, refrigerators, water purifiers, and split AC units.',
      },
      {
        title: 'Covered Weatherproof Transport',
        desc: 'Dedicated enclosed container trucks protect your furniture and belongings from rain, dust, and transit vibrations.',
      },
    ],
    processSteps: [
      {
        step: 1,
        title: 'Free Survey & Fixed Quote',
        desc: 'We review your item inventory (in-person or via video call) and provide an all-inclusive transparent quote.',
      },
      {
        step: 2,
        title: 'Multi-Layer Packing',
        desc: 'Our uniformed crew arrives with heavy-duty boxes, bubble wrap, and foam pads, systematically packing every room.',
      },
      {
        step: 3,
        title: 'Safe Transit & Moving',
        desc: 'Careful loading into covered container trucks with transit strapping and real-time supervisor management.',
      },
      {
        step: 4,
        title: 'Setup & Debris Removal',
        desc: 'We unload into your chosen rooms, reassemble all furniture, position heavy appliances, and take away all empty boxes.',
      },
    ],
    serviceOptions: [
      { name: '1 to 2 Bedroom Apartment Move', unit: 'Local Move', desc: 'Packing, Covered Truck & Uniformed Crew' },
      { name: '3 to 4 Bedroom Luxury Residence Move', unit: 'Local Move', desc: 'Full Packing, Master Carpenter & Full Setup' },
      { name: 'Corporate Office Relocation', unit: 'Per Workstation', desc: 'Weekend Shifting, IT Care & Modular Furniture' },
      { name: 'Long-Distance & Regional Move', unit: 'Dedicated Route', desc: 'GPS-Tracked Covered Container Fleet' },
      { name: 'Short-Term Secure Furniture Storage', unit: 'Monthly Retainer', desc: 'Clean, Dry & Insured Warehouse Storage' },
    ],
    coverageAreas: [
      'Local Urban Relocations',
      'Inter-Zone Transitions',
      'High-Rise & Penthouse Moves',
      'Corporate & Commercial Facilities',
      'Executive Villa Transitions',
      'Long-Distance & Regional Corridors',
    ],
    formConfig: {
      equipmentTypeLabel: 'Move Category',
      equipmentOptions: ['1-2 Bedroom Apartment', '3-4 Bedroom Luxury Apartment', 'Duplex / Independent House', 'Small Office (Up to 15 Staff)', 'Large Corporate Office (15+ Staff)', 'Long-Distance Move'],
      capacityLabel: 'Pickup & Destination Areas',
      capacityPlaceholder: 'e.g. From Sector 3 to Executive Enclave',
      specificOptions: [
        'Full Turnkey Packing, Moving & Setup',
        'Furniture Dismantling & Carpenter Reassembly',
        'Corporate Office Weekend Shifting',
        'Long-Distance Regional Moving',
        'Short-Term Furniture Storage',
      ],
    },
    faqs: [
      {
        q: 'Do you provide all packing materials like boxes and bubble wrap?',
        a: 'Yes, 100%! We provide all heavy-duty corrugated cartons, bubble wrap, foam corner guards, stretch film, wardrobe boxes, and packing tape. You don’t need to buy a single box.',
      },
      {
        q: 'Can your team dismantle and reassemble imported furniture?',
        a: 'Yes. Our moving crews include certified master carpenters experienced with high-end modular furniture, hydraulic lift beds, and complex closets.',
      },
      {
        q: 'How far in advance should I book my move?',
        a: 'We recommend booking 3 to 5 days in advance, especially around month-end dates when moving schedules fill up quickly.',
      },
    ],
    seo: {
      metaTitle: 'House & Office Moving Services | Seventh Sky Relocation',
      metaDescription: 'Stress-free home & office relocation. Multi-layer packing, carpenter furniture assembly & covered container trucks. Get a free moving quote.',
      keywords: 'house shifting, office moving service, packers and movers, furniture shifting, residential relocation, white glove moving',
    },
  },

  // ─── 9. PROPERTY CARE, KEYHOLDING & CONCIERGE (FOR ABSENTEE OWNERS) ─────────
  {
    slug: 'property-care-concierge',
    id: 'property_care_concierge',
    category: 'care-maintenance',
    categoryLabel: 'Care & Maintenance',
    title: 'Property Care, Keyholding & Concierge Services',
    shortTitle: 'Property Care & Concierge',
    tagline: 'Routine property inspections, utility management & maintenance for owners living away.',
    badge: 'Exclusively for Absentee & Overseas Owners',
    accent: '#059669', // Emerald
    pricingGuide: 'From ৳5,000 / month',
    iconName: 'KeyRound',
    heroImage: '/assets/services/concierge-care-main.jpg',
    overview: `Leaving your apartment or residence vacant while living abroad or in another city exposes your valuable asset to damp walls, moldy air, plumbing leaks, pest infestations, and bill disconnection notices. We visit your property regularly, ventilate the rooms, flush all plumbing, inspect for leaks, pay all utility bills on time, and send you detailed video walk-throughs.`,
    marketContextBD: `Homeowners often rely on busy relatives or informal caretakers who forget to check on vacant flats. Seventh Sky delivers professional, corporate-level accountability with a dedicated WhatsApp concierge manager and transparent billing.`,
    keyHighlights: [
      'Dual-Custody Vault Keyholding with Authorized Access Only',
      'Monthly Physical Walkthroughs with High-Definition Video Reports',
      'All Utility Bill Payments (Electricity, Water, Gas & Municipal Holding Tax)',
      'Pre-Arrival VIP Deep Cleaning, AC Freshening & Food Stocking',
      'Rapid Emergency Repair Response for Plumbing or Electrical Faults',
      'Complete Transparent Online Billing Ledger with Zero Hidden Fees',
    ],
    features: [
      {
        title: 'Secure Vault Keyholding',
        desc: 'Your keys are stored in a fire-resistant dual-custody vault with barcoded tracking; escorted access only for authorized maintenance.',
      },
      {
        title: 'Monthly Video Inspections',
        desc: 'Detailed inspections checking for wall dampness, plumbing leaks, pest activity, and ceiling cracks, sent directly to your WhatsApp.',
      },
      {
        title: 'Utility Bill Settlement',
        desc: 'On-time payment of electricity, water, gas, internet, and municipal taxes, with scanned receipts uploaded to your online account.',
      },
      {
        title: 'Fresh Air & Plumbing Flushing',
        desc: 'During every visit we ventilate closed rooms and run water through all taps and traps to prevent sewer odors and pipe drying.',
      },
      {
        title: 'Pre-Arrival VIP Preparation',
        desc: 'Before you visit, we deep-clean the home, wash linens, service all AC units, and stock essentials so your home is ready when you arrive.',
      },
      {
        title: '24/7 Emergency Repairs',
        desc: 'Immediate response to sudden pipe bursts, electrical short-circuits, or roof leaks, supervised by our licensed engineers.',
      },
    ],
    processSteps: [
      {
        step: 1,
        title: 'Property Onboarding',
        desc: 'We conduct an initial video inventory audit, catalog all fixed appliances, and securely accept keys under receipt.',
      },
      {
        step: 2,
        title: 'Scheduled Monthly Visits',
        desc: 'Our property officers inspect the premises, ventilate rooms, flush plumbing lines, and test electrical systems.',
      },
      {
        step: 3,
        title: 'Video Report & Bill Clearing',
        desc: 'We send you photo/video proof, pay all monthly utility bills, and update your digital account ledger.',
      },
      {
        step: 4,
        title: 'On-Demand Concierge',
        desc: 'We coordinate pre-arrival preparation, building committee meetings, or authorized repairs whenever you need.',
      },
    ],
    serviceOptions: [
      { name: 'Essential Home Care Package', unit: 'Monthly Retainer', desc: 'Monthly Inspection + Utility Bills + Keyholding' },
      { name: 'Premium Care & Maintenance Package', unit: 'Monthly Retainer', desc: 'Bi-Weekly Visits + Minor Repairs Included' },
      { name: 'Pre-Arrival VIP Home Preparation', unit: 'Per Request', desc: 'Deep Cleaning, Bedding & AC Servicing' },
      { name: 'Tenant Move-In / Move-Out Inspection', unit: 'Per Inspection', desc: 'Full Inventory Check & Condition Report' },
    ],
    coverageAreas: [
      'Prime Residential Enclaves',
      'Diplomatic & Executive Sectors',
      'Central Metropolitan Hubs',
      'Northern Development Corridors',
      'Southern Residential Zones',
      'Suburban Estates',
      'Corporate & Commercial Districts',
    ],
    formConfig: {
      equipmentTypeLabel: 'Property Status',
      equipmentOptions: ['Vacant Apartment / Flat', 'Rented Flat (Tenant in Place)', 'Independent House / Villa', 'Commercial Floor / Office', 'Under-Construction / Shell'],
      capacityLabel: 'Property Location & Owner Country',
      capacityPlaceholder: 'e.g. Sector 7 | Owner in London, UK',
      specificOptions: [
        'Monthly Keyholding & Routine Inspection Care',
        'Utility Bill Payments & Building Service Charge Clearance',
        'Pre-Arrival House Setup & Deep Cleaning',
        'Emergency Repair & Water Leakage Management',
        'Tenant Move-In / Move-Out Inventory Inspection',
      ],
    },
    faqs: [
      {
        q: 'How do you keep my property keys secure?',
        a: 'Keys are stored in a fireproof dual-custody vault. Keys carry unique barcode tags without address labels and can only be accessed with two-factor senior management authorization.',
      },
      {
        q: 'How do I pay for utility bills and maintenance from abroad?',
        a: 'You can easily pay via international credit card, bank wire, or online payment channels. Scanned official receipts are uploaded to your client portal immediately.',
      },
      {
        q: 'What happens if there is an emergency leak while I am away?',
        a: 'Our 24/7 team responds immediately to isolate the issue (e.g. shutting off the main water valve), takes video evidence, provides an itemized estimate, and executes repairs upon your approval.',
      },
    ],
    seo: {
      metaTitle: 'Vacant Home Care & Property Concierge | Seventh Sky',
      metaDescription: 'Trusted care for vacant apartments and homes for overseas owners. Monthly inspections, utility bill payments & emergency repairs. Learn more.',
      keywords: 'property care, keyholding service, vacant apartment care, utility bill payment service, property concierge, absentee landlord care',
    },
  },

  // ─── 10. RESIDENTIAL PROPERTY MANAGEMENT (RENTALS & TENANCY) ────────────────
  {
    slug: 'property-management',
    id: 'property_management',
    category: 'rentals-sales',
    categoryLabel: 'Rentals & Sales',
    title: 'Residential Property & Tenancy Management',
    shortTitle: 'Property Management (Rentals)',
    tagline: 'Vetted high-quality tenants, guaranteed on-time rent collection & zero maintenance headaches for landlords.',
    badge: 'Complete Landlord Peace of Mind',
    accent: '#8b5cf6', // Violet
    pricingGuide: 'From 5% to 8% of Monthly Rent',
    iconName: 'Building2',
    heroImage: '/assets/services/property-management-main.jpg',
    overview: `Being a landlord shouldn't feel like an exhausting second job. We market your property, conduct thorough multi-point background checks on prospective tenants, execute legally binding lease contracts, collect monthly rents with direct bank deposits, and manage all repair calls so you enjoy truly passive income.`,
    marketContextBD: `Landlords frequently endure unpaid rent arrears, unauthorized sub-letting, and property damage from unvetted tenants. We enforce strict tenant verification, automated rent tracking, and regular condition audits to safeguard your asset.`,
    keyHighlights: [
      'Thorough Multi-Point Tenant Screening (National ID, Employer & Police Check)',
      'Legally Enforceable Tenancy Agreements Protecting Landlord Rights',
      'Automated Rent Collection with Direct Bank Payout by the 7th of Every Month',
      'Proactive Repair Management with Zero Landlord Midnight Calls',
      'Scheduled Move-In & Move-Out Condition Audits with Deposit Protection',
      'Online Landlord Dashboard with Monthly Statements & Tax Invoices',
    ],
    features: [
      {
        title: 'Premium Tenant Placement',
        desc: 'Professional property photography, virtual tours, and selective marketing to attract solvent corporate executives and verified families.',
      },
      {
        title: 'Rigorous Background Screening',
        desc: 'Verification of National ID, corporate employment, monthly income proofs, and tenant police registration before handing over keys.',
      },
      {
        title: 'Automated Rent Collection',
        desc: 'Digital rent invoices sent on the 1st of every month, automated reminders, and direct bank transfer to your account within 48 hours.',
      },
      {
        title: '24/7 Tenant Repair Desk',
        desc: 'Our dedicated maintenance team handles plumbing, electrical, and AC issues so you never receive late-night emergency calls.',
      },
      {
        title: 'Lease Renewal & Rent Escalation',
        desc: 'We manage annual rent increments (5-10%), execute renewal agreements, or market early vacancies to ensure zero rental downtime.',
      },
      {
        title: 'Move-Out Deposit Audit',
        desc: 'Thorough move-out inspections, reconciling utility bills, deducting repairs for damages, and returning security deposits peacefully.',
      },
    ],
    processSteps: [
      {
        step: 1,
        title: 'Property Inspection & Pricing',
        desc: 'We inspect your property, advise on the best market rent, take professional photos, and list it across verified channels.',
      },
      {
        step: 2,
        title: 'Screening & Agreement',
        desc: 'We verify tenant background, execute a legally vetted lease agreement, and collect security deposits.',
      },
      {
        step: 3,
        title: 'Move-In & Rent Administration',
        desc: 'We complete the move-in inventory, collect monthly rent, manage tenant requests, and disburse payouts directly to you.',
      },
      {
        step: 4,
        title: 'Renewal & Turnaround',
        desc: 'We coordinate lease renewals or pre-market upcoming vacancies to prevent empty months.',
      },
    ],
    serviceOptions: [
      { name: 'Full Turnkey Property Management', unit: 'Monthly % of Rent', desc: 'Rent Collection, Tenant Care, Repairs & Portal' },
      { name: 'Tenant Placement Only (Letting Service)', unit: 'One-Time Month Rent', desc: 'Marketing, Background Check & Lease Signing' },
      { name: 'Rental Valuation & Market Pricing Analysis', unit: 'Single Report', desc: 'Optimal Market Rent Analysis for Your Area' },
      { name: 'Tenancy Agreement & Dispute Advisory', unit: 'Per Case', desc: 'Legally Vetted Lease Drafting & Advisory' },
    ],
    coverageAreas: [
      'Prime Residential Enclaves',
      'Diplomatic & Executive Sectors',
      'Central Metropolitan Hubs',
      'Northern Development Corridors',
      'Southern Residential Zones',
      'Suburban Estates',
      'Corporate & Commercial Districts',
    ],
    formConfig: {
      equipmentTypeLabel: 'Property Type',
      equipmentOptions: ['2-3 Bedroom Apartment', '4+ Bedroom Luxury Apartment', 'Duplex / Villa', 'Full Residential Building (Multi-Unit)', 'Commercial Office Space'],
      capacityLabel: 'Expected Monthly Rent',
      capacityPlaceholder: 'e.g. ৳65,000 / month',
      specificOptions: [
        'Full Property Management (Rent Collection & Maintenance)',
        'Tenant Placement & Screening Only',
        'Rental Valuation & Market Pricing Consultation',
        'Tenancy Agreement Drafting & Legal Documentation',
        'Problem Tenant Eviction & Arrears Advice',
      ],
    },
    faqs: [
      {
        q: 'How do you verify prospective tenants?',
        a: 'We conduct a multi-point verification: National ID authentication, corporate employer confirmation, salary verification, prior landlord references, and police registration form submission.',
      },
      {
        q: 'When do I receive my rental payout each month?',
        a: 'Rent is collected from tenants between the 1st and 7th of every month. Once cleared, payouts are deposited directly into your bank account along with an automated statement.',
      },
      {
        q: 'Who pays for maintenance and repairs during the lease?',
        a: 'Minor routine maintenance from regular use (e.g. bulb replacement, minor drain clogs) is paid by the tenant under our lease. Structural and major appliance repairs are approved by the owner and managed by our team.',
      },
    ],
    seo: {
      metaTitle: 'Residential Property Management & Rental Administration | Seventh Sky',
      metaDescription: 'Hassle-free landlord property management. Verified tenant placement, on-time rent collection & 24/7 maintenance. Contact us today.',
      keywords: 'property management, rental property management, tenant placement, rent collection service, landlord services, flat letting service',
    },
  },

  // ─── 11. RESIDENTIAL PROPERTY SALES (BUY & SELL BROKERAGE) ──────────────────
  {
    slug: 'residential-sales',
    id: 'residential_sales',
    category: 'rentals-sales',
    categoryLabel: 'Rentals & Sales',
    title: 'Residential Property Sales & Buying Advisory',
    shortTitle: 'Residential Property Sales',
    tagline: 'Buy or sell verified luxury apartments & prime residential plots with complete confidence.',
    badge: 'Premium Residential Brokerage',
    accent: '#10b981', // Emerald
    pricingGuide: 'Transparent Brokerage Model',
    iconName: 'Home',
    heroImage: '/assets/services/residential-sales-main.jpg',
    overview: `Buying or selling high-value property shouldn't involve informal middlemen, inflated hidden markups, or title fraud. We operate on a transparent, professional mandate system—curating only 100% legally verified apartments and plots, connecting you with pre-qualified buyers, and managing the entire closing process safely.`,
    marketContextBD: `The property market is plagued by unverified listings and predatory broker markups. Seventh Sky works on a clear, written representation mandate with zero hidden fees and verified title deeds on every property.`,
    keyHighlights: [
      '100% Pre-Vetted Title & Encumbrance-Free Verified Listings',
      'Exclusive Seller Representation with Professional Drone & 4K Video',
      'Dedicated Buyer Mandate & Custom Property Sourcing',
      'Bilateral Price Negotiation with Zero Hidden Middleman Markups',
      'Legally Enforceable Bilateral Sale & Purchase Agreements',
      'Sub-Registry Closing, Stamp Duty & Mutation Coordination',
    ],
    features: [
      {
        title: 'Curated Verified Portfolio',
        desc: 'Every listed apartment and plot undergoes technical and legal scrutiny before being presented to buyers.',
      },
      {
        title: 'Professional Video & Marketing',
        desc: 'High-definition architectural photography, 4K video tours, and targeted marketing reaching qualified buyers.',
      },
      {
        title: 'Dedicated Buyer Mandates',
        desc: 'We scout the entire market on your behalf, screen titles, negotiate the best price, and protect your interests.',
      },
      {
        title: 'Developer Due Diligence',
        desc: 'Evaluating developer delivery track records, municipal permits, and structural warranties before you sign.',
      },
      {
        title: 'Transparent Sale Agreements',
        desc: 'Drafting fair, bilateral sale agreements with secure milestone payments coordinated by senior property advocates.',
      },
      {
        title: 'Registry Closing & Mutation',
        desc: 'Guiding you through registration fees, capital gains taxes, Sub-Registry deed execution, and post-sale mutation.',
      },
    ],
    processSteps: [
      {
        step: 1,
        title: 'Valuation & Mandate',
        desc: 'We assess realistic market valuation, review title deeds, and sign a clear representation agreement.',
      },
      {
        step: 2,
        title: 'Marketing & Private Viewings',
        desc: 'We launch professional video campaigns and organize private viewings for pre-qualified buyers.',
      },
      {
        step: 3,
        title: 'Negotiation & Sale Agreement',
        desc: 'We negotiate formal written offers and execute a legally binding sale contract with clear payment milestones.',
      },
      {
        step: 4,
        title: 'Registry Execution & Handover',
        desc: 'We prepare the registered sale deed, coordinate Sub-Registry closing, and complete physical key handover.',
      },
    ],
    serviceOptions: [
      { name: 'Seller Representation Mandate', unit: 'Standard Commission', desc: 'Turnkey Marketing, Negotiation & Sale Closing' },
      { name: 'Buyer Advisory & Acquisition Mandate', unit: 'Standard Commission', desc: 'Market Search, Due Diligence & Purchase Closing' },
      { name: 'Remote Property Purchase Package', unit: 'Turnkey Package', desc: 'Remote Inspection, Legal Vetting & Registration' },
      { name: 'Developer Contract & Risk Review', unit: 'Single Contract Review', desc: 'Legal Protection for Off-Plan Purchases' },
    ],
    coverageAreas: [
      'Prime Residential Enclaves',
      'Diplomatic & Executive Sectors',
      'Central Metropolitan Hubs',
      'Northern Development Corridors',
      'Southern Residential Zones',
      'Suburban Estates',
      'Corporate & Commercial Districts',
    ],
    formConfig: {
      equipmentTypeLabel: 'I Want To',
      equipmentOptions: ['Buy a Residential Property', 'Sell My Residential Property', 'Buy Land / Plot', 'Sell Land / Plot', 'Investment Property Consultation'],
      capacityLabel: 'Preferred Neighborhood / Budget',
      capacityPlaceholder: 'e.g. 3-Bed Luxury Residence / Budget: ৳3.5 Crore',
      specificOptions: [
        'Looking to Buy a Ready Apartment',
        'Looking to Sell My Luxury Flat / House',
        'Purchasing a Residential Plot / Land',
        'Selling Land with Complete Legal Title',
        'Dedicated Property Investment Sourcing',
      ],
    },
    faqs: [
      {
        q: 'What is Seventh Sky’s commission structure?',
        a: 'We operate under a transparent, industry-standard professional commission agreed upon in writing during mandate signing. We strictly never add hidden markups or arbitrary price adjustments.',
      },
      {
        q: 'How do you verify the title of properties you sell?',
        a: 'Before listing any property, our legal desk reviews the title deed, mutation records, tax clearance, and municipal approvals to ensure 100% clean ownership.',
      },
      {
        q: 'Can overseas buyers purchase property without traveling in person?',
        a: 'Yes! We assist with complete remote property sourcing, virtual video tours, legal document verification, and registration via Power of Attorney.',
      },
    ],
    seo: {
      metaTitle: 'Buy & Sell Luxury Apartments & Plots | Seventh Sky Real Estate',
      metaDescription: 'Curated luxury apartments and verified residential plots for sale. 100% title-verified properties with transparent negotiation. Contact our advisors.',
      keywords: 'buy apartment, luxury flats for sale, real estate agency, property for sale, residential plots for sale, real estate broker, verified property',
    },
  },

  // ─── 12. SHORT-TERM STAY & LUXURY SERVICED LIVING ───────────────────────────
  {
    slug: 'short-stay',
    id: 'short_stay',
    category: 'rentals-sales',
    categoryLabel: 'Rentals & Sales',
    title: 'Short Term Stay & Luxury Serviced Apartments',
    shortTitle: 'Short-Term Stays',
    tagline: 'Fully furnished luxury serviced apartments with hotel amenities, full power backup & concierge care.',
    badge: 'Hotel Comfort, Home Privacy',
    accent: '#f59e0b', // Amber
    pricingGuide: 'From ৳4,500 / night',
    iconName: 'Hotel',
    heroImage: '/assets/services/short-stay-main.jpg',
    overview: `Enjoy the privacy, space, and comfort of a luxury apartment with the service standards of a premium hotel. Fully furnished bedrooms, high-speed fiber internet, chef-ready modular kitchens, daily housekeeping, 24/7 power backup, and round-the-clock security in the city's finest, quietest neighborhoods.`,
    marketContextBD: `Standard hotel rooms are cramped and expensive for extended stays, while unmanaged private rentals are often dirty and uncoordinated. We provide hotel-grade linens, automatic generator backup, and dedicated concierge host support.`,
    keyHighlights: [
      'Prime Locations (Near International Airport, Business Hubs & Dining)',
      'Fully Furnished Suites with 4K Smart TVs & High-Speed Fiber Wi-Fi',
      '24/7 Full Standby Generator Backup (Uninterrupted AC & Electricity)',
      'Hotel-Standard Daily Housekeeping, Fresh Linens & Bathroom Amenities',
      'Chef-Ready Kitchen with Refrigerator, Microwave, Cookware & Purified Water',
      'Keyless Digital Door Locks & 24/7 Guarded Building Security',
    ],
    features: [
      {
        title: 'Designer Furnished Suites',
        desc: 'Spacious living rooms, plush sofas, 4K Smart TVs with streaming, dining spaces, and ambient lighting designed for rest.',
      },
      {
        title: 'Fully Equipped Kitchen',
        desc: 'Complete with refrigerator, microwave, gas/induction stove, electric kettle, cookware, dinner sets, and filtered water.',
      },
      {
        title: 'High-Speed Wi-Fi & Work Desk',
        desc: 'Dedicated 50+ Mbps fiber connection and ergonomic work desks tailored for business travelers and remote work.',
      },
      {
        title: '24/7 Generator Power Backup',
        desc: 'Full automatic generator backup keeps all air conditioners, appliances, and Wi-Fi running seamlessly during grid cuts.',
      },
      {
        title: 'Daily Housekeeping & Fresh Linens',
        desc: 'Professional housekeeping team providing regular room cleaning, trash removal, clean towels, and crisp bedsheets.',
      },
      {
        title: 'Keyless Digital Check-In',
        desc: 'Secure digital smart door locks, 24/7 on-demand check-in, CCTV security, and dedicated local host assistance.',
      },
    ],
    processSteps: [
      {
        step: 1,
        title: 'Select Suite & Dates',
        desc: 'Choose your desired serviced apartment, check availability, and pick your travel dates.',
      },
      {
        step: 2,
        title: 'Instant Confirmation & Pin Code',
        desc: 'Confirm your booking with transparent pricing (zero surprise taxes) and receive your digital access code.',
      },
      {
        step: 3,
        title: 'Seamless Check-In',
        desc: 'Arrive at your leisure with 24/7 keyless smart lock entry or personal greeting by our concierge team.',
      },
      {
        step: 4,
        title: 'Concierge Care Throughout',
        desc: 'Enjoy daily housekeeping, fast Wi-Fi, on-demand airport pickup, and hassle-free digital checkout.',
      },
    ],
    serviceOptions: [
      { name: '1-Bedroom Executive Suite', unit: 'Daily / Weekly / Monthly', desc: 'Ideal for Solo Travelers & Business Trips' },
      { name: '2-Bedroom Luxury Family Apartment', unit: 'Daily / Weekly / Monthly', desc: 'Spacious Comfort for Visiting Families' },
      { name: '3-Bedroom Presidential Penthouse', unit: 'Daily / Weekly / Monthly', desc: 'Expansive Luxury Living with Balcony Views' },
      { name: 'Corporate Extended Stay Package', unit: '1 to 12 Months', desc: 'Substantial Corporate Rates & Dedicated Service' },
    ],
    coverageAreas: [
      'Prime Residential Sectors',
      'Diplomatic & Embassy Enclaves',
      'Airport Transit Corridors',
      'Business & Commercial Hubs',
      'Luxury Shopping Districts',
      'Quiet Suburban Enclaves',
    ],
    formConfig: {
      equipmentTypeLabel: 'Apartment Size Required',
      equipmentOptions: ['1-Bedroom Studio (1-2 Guests)', '2-Bedroom Luxury Suite (3-4 Guests)', '3-Bedroom Family Residence (5-6 Guests)', 'Corporate Monthly Extended Stay'],
      capacityLabel: 'Stay Duration & Check-In Date',
      capacityPlaceholder: 'e.g. 10 Nights, Starting Next Monday',
      specificOptions: [
        'Vacation & Family Visit Stay',
        'Business & Corporate Executive Trip',
        'Medical Transit / Near Hospitals',
        'Transitional Stay (During Renovation)',
        'Airport Transit / Short Layover',
      ],
    },
    faqs: [
      {
        q: 'Where are your serviced apartments located?',
        a: 'Our residences are located in prime, quiet neighborhoods and diplomatic zones, offering safe surroundings and quick access to business districts and the international airport.',
      },
      {
        q: 'Is there fast Wi-Fi and power backup for remote work?',
        a: 'Yes. Every suite includes dedicated high-speed fiber internet (50+ Mbps) and full automatic generator power backup running all ACs and appliances 24/7.',
      },
      {
        q: 'Can I cook my own food in the apartment?',
        a: 'Yes! Every serviced apartment features a fully equipped kitchen with stove, microwave, refrigerator, blender, cookware, and dining sets.',
      },
    ],
    seo: {
      metaTitle: 'Luxury Serviced Apartments & Short Stay Living | Seventh Sky',
      metaDescription: 'Book fully furnished luxury serviced apartments with full power backup, fast Wi-Fi & 5-star concierge service for daily, weekly, or monthly stays.',
      keywords: 'serviced apartments, short term stay, furnished flat for rent, executive suites, luxury serviced living, holiday apartment',
    },
  },
];

/**
 * Helper to look up a service by its slug.
 */
export function getServiceBySlug(slug) {
  if (!slug) return null;
  const clean = String(slug).toLowerCase().trim();
  return SERVICES.find((s) => s.slug === clean) || null;
}

/**
 * Helper to get all services filtered by category ID.
 */
export function getServicesByCategory(categoryId) {
  if (!categoryId || categoryId === 'all') return SERVICES;
  return SERVICES.filter((s) => s.category === categoryId);
}
