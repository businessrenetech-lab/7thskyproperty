// Comprehensive Service Taxonomy per website_requirements.txt
// Every service features an exact 10-15 word concise hover explanation

export const SERVICE_CATEGORIES = [
  {
    id: "property-care-concierge",
    title: "Property Care & Concierge",
    category: "Property Care Services",
    icon: "ShieldCheck",
    shortDesc: "End-to-end caretaker oversight, maintenance routines, and luxury concierge support for residential assets.",
    featured: true,
    services: [
      {
        id: "cleaning-services",
        name: "Cleaning Services",
        explanation: "Professional cleaning solutions maintaining hygiene, comfort and property presentation.", // verbatim from spec
        icon: "Sparkles",
        subItems: ["Deep Cleaning", "Rooftop Cleaning", "Window Cleaning", "Move-In Detailing"]
      },
      {
        id: "gardening-landscaping",
        name: "Gardening & Landscaping",
        explanation: "Enhance outdoor spaces through professional gardening, landscaping and maintenance.", // verbatim from spec
        icon: "Trees",
        subItems: ["Lawn Grooming", "Shrub Trimming", "Seasonal Planting", "Irrigation Check"]
      },
      {
        id: "utility-bill-coordination",
        name: "Utility Bill Coordination",
        explanation: "Timely payment processing and reconciliation for electricity, gas, internet and municipal water.",
        icon: "Receipt",
        subItems: ["DESCO / DPDC Billing", "WASA Water Dues", "Titas Gas Accounts", "Broadband Setup"]
      },
      {
        id: "caretaker-coordination",
        name: "Caretaker Coordination",
        explanation: "On-site staff supervision, security oversight and day-to-day administrative reporting for properties.",
        icon: "UserCheck",
        subItems: ["Daily Attendance", "Visitor Logs", "Maintenance Escalations", "Access Control"]
      },
      {
        id: "emergency-assistance",
        name: "Emergency Assistance",
        explanation: "Rapid 24/7 incident response addressing plumbing failures, power surges and structural emergencies.",
        icon: "AlertCircle",
        subItems: ["Plumbing Bursts", "Electrical Faults", "Lockout Solutions", "Storm Preparedness"]
      },
      {
        id: "repair-maintenance",
        name: "Repair & Maintenance",
        explanation: "Proactive structural repairs, interior repainting, carpentry fixes and comprehensive progress tracking.",
        icon: "Wrench",
        subItems: ["Painting & Polish", "Carpentry & Plaster", "Work Tracking", "Before & After Photos"]
      },
      {
        id: "inspection-services",
        name: "Inspection Services",
        explanation: "Thorough entry, routine and exit inspections accompanied by photographic condition documentation.",
        icon: "ClipboardCheck",
        subItems: ["Entry Condition", "Biannual Routine Check", "Exit Assessment", "Cloud Photo Reports"]
      },
      {
        id: "smart-property-solutions",
        name: "Smart Property Solutions",
        explanation: "Modern IoT security installation including smart biometric door locks and remote camera monitoring.",
        icon: "Cpu",
        subItems: ["CCTV Surveillance", "Digital Smart Locks", "Smart Home Hubs", "Remote Security Alerts"]
      }
    ]
  },
  {
    id: "nrb-dedicated-services",
    title: "NRB Dedicated Services",
    category: "Property Care Services",
    icon: "Globe",
    shortDesc: "Specialized asset care and remote transparency tailored exclusively for Non-Resident Bangladeshis.",
    featured: true,
    services: [
      {
        id: "nrb-property-monitoring",
        name: "NRB Property Monitoring",
        explanation: "Continuous asset surveillance and security oversight protecting vacant family properties across Bangladesh.",
        icon: "Eye",
        subItems: ["Bi-Weekly Visits", "Boundary Verification", "Squatter Prevention", "Perimeter Check"]
      },
      {
        id: "overseas-owner-reporting",
        name: "Overseas Owner Reporting",
        explanation: "Digital monthly statements, currency-converted financial summaries and WhatsApp status digests for expatriates.",
        icon: "FileSpreadsheet",
        subItems: ["Monthly Financials", "Expense Invoices", "Tenant Health Check", "Tax Clearance"]
      },
      {
        id: "remote-property-coordination",
        name: "Remote Property Coordination",
        explanation: "Handling local government correspondence, developer handovers and developer snagging lists remotely.",
        icon: "Handshake",
        subItems: ["Developer Handovers", "RAJUK Coordination", "Society Dues", "Key Vaulting"]
      },
      {
        id: "periodic-video-inspection-reports",
        name: "Periodic Video Inspection Reports",
        explanation: "Ultra-high definition walk-through video tours delivering real-time visual proof of property upkeep.",
        icon: "Video",
        subItems: ["4K Walkthrough Video", "Drone Roof Scans", "Time-Stamped Logs", "Live Video Calls"]
      }
    ]
  },
  {
    id: "leasing-tenancy-management",
    title: "Leasing & Tenancy Management",
    category: "Property Care Services",
    icon: "Key",
    shortDesc: "Rigorous tenant screening, professional lease drafting, rent collection and ledger administration.",
    featured: true,
    services: [
      {
        id: "tenant-application-assessment",
        name: "Tenant Application Assessment",
        explanation: "Comprehensive applicant screening verifying creditworthiness, employment history and reliable rental references.",
        icon: "UserSearch",
        subItems: ["Salary Proof", "Corporate Vetting", "Reference Calls", "Background Review"]
      },
      {
        id: "tenant-background-verification",
        name: "Tenant Background Verification",
        explanation: "Formal national ID authentication, police verification filing and prior tenancy history validation.",
        icon: "ShieldAlert",
        subItems: ["NID Authentication", "Police Form Filing", "Landlord History", "Family Background"]
      },
      {
        id: "lease-coordination-administration",
        name: "Lease Coordination & Administration",
        explanation: "Legally enforceable tenancy contract drafting, stamp duty execution and digital record archiving.",
        icon: "FileText",
        subItems: ["Stamp Agreement", "Bilingual Contracts", "Digital Signing", "Vault Storage"]
      },
      {
        id: "rental-financial-management",
        name: "Rental Financial Management",
        explanation: "Automated monthly rent collection, owner disbursement ledgers and itemized operational accounting.",
        icon: "BadgePercent",
        subItems: ["Direct Bank Transfers", "Security Deposit Custody", "Expense Deductions", "Tax Invoices"]
      }
    ]
  },
  {
    id: "property-documentation-support",
    title: "Property Documentation Support",
    category: "Property Care Services",
    icon: "Stamp",
    shortDesc: "Expert legal title vetting, land mutation, deed registration and property succession guidance.",
    featured: false,
    services: [
      {
        id: "deed-document-verification",
        name: "Deed & Document Verification",
        explanation: "Legal scrutiny of title deeds, bia-deeds, CS/SA/RS/BS parchass, and municipal clearance.",
        icon: "FileCheck2",
        subItems: ["Title Searching", "Chain Deed Analysis", "Non-Encumbrance", "Sub-Registry Vetting"]
      },
      {
        id: "mutation-support",
        name: "Mutation Support",
        explanation: "Facilitating AC Land e-mutation petitions, DCR payment processing and updated khatian collection.",
        icon: "FilePenLine",
        subItems: ["AC Land Petitions", "DCR Payments", "Khatian Release", "Khajna Updates"]
      },
      {
        id: "conveyancing-transfer-support",
        name: "Conveyancing & Transfer Support",
        explanation: "End-to-end legal drafting for sale deeds, irrevocable power of attorney and deed execution.",
        icon: "Briefcase",
        subItems: ["Sale Deed Drafting", "Power of Attorney", "Registration Presence", "Stamp Duty Calculation"]
      },
      {
        id: "property-will-succession-support",
        name: "Property Will & Succession Support",
        explanation: "Legal documentation coordination for probate administration, heirship certificates and family succession.",
        icon: "Scroll",
        subItems: ["Waras Certificate", "Probate Petitions", "Gift Deeds (Heba)", "Succession Planning"]
      }
    ]
  },
  {
    id: "removal-relocation",
    title: "Removal & Relocation Services",
    category: "Property Care Services",
    icon: "Truck",
    shortDesc: "White-glove residential moving, commercial office transitions, packing, and turnkey utility setup.",
    featured: false,
    services: [
      {
        id: "residential-moving",
        name: "Residential Moving Services",
        explanation: "Intercity and local residential moving with protective multi-layer furniture wrapping and transit insurance.",
        icon: "PackageCheck",
        subItems: ["Bubble Wrap Packing", "Disassembly & Assembly", "Fleet Transport", "Fragile Art Handling"]
      },
      {
        id: "corporate-employee-relocation",
        name: "Corporate Employee Relocation",
        explanation: "Seamless executive relocation packages combining transit coordination, temporary housing and home settling.",
        icon: "Building2",
        subItems: ["Executive Transit", "Interim Guest Stays", "School Search", "Neighborhood Orientation"]
      },
      {
        id: "move-in-move-out-services",
        name: "Move-In & Move-Out Services",
        explanation: "Turnkey pre-arrival deep cleaning, utility reactivation, furniture staging and end-of-lease handover.",
        icon: "Home",
        subItems: ["Pre-Move Deep Sanitizing", "End of Lease Cleans", "Key Handover", "Lock Rekeying"]
      },
      {
        id: "utility-address-transfer",
        name: "Utility & Address Transfer",
        explanation: "Hassle-free migration of home broadband, electricity connections, bank registries and government records.",
        icon: "Wifi",
        subItems: ["ISP Relocation", "Meter Transfers", "Bank Address Updates", "Govt ID Re-filing"]
      }
    ]
  },
  {
    id: "interior-design",
    title: "Interior Design & Fit-Out",
    category: "Properties",
    icon: "Palette",
    shortDesc: "Contemporary architectural transformations, custom cabinetry, ergonomics and serene prayer room designs.",
    featured: false,
    services: [
      {
        id: "residential-interior-design",
        name: "Residential Interior Design",
        explanation: "Custom spatial design, lighting architectures and bespoke living room aesthetics for modern homes.",
        icon: "Sofa",
        subItems: ["Living Room Concepts", "Modular Kitchens", "Master Suites", "Accent Ceilings"]
      },
      {
        id: "space-planning-renovation",
        name: "Space Planning & Renovation",
        explanation: "Full-scale architectural restructuring, modern bathroom overhauls and acoustic wall paneling installations.",
        icon: "Maximize",
        subItems: ["Floor Optimization", "Civil Renovations", "Acoustic Wall Panels", "Luxury Tiles"]
      },
      {
        id: "prayer-fitness-rooms",
        name: "Prayer & Fitness Room Design",
        explanation: "Specialized tranquil prayer sanctuaries with acoustic insulation, alongside dedicated private home fitness studios.",
        icon: "HeartHandshake",
        subItems: ["Islamic Geometry", "Ablution Nooks", "Home Gym Flooring", "Mirror Walls"]
      },
      {
        id: "custom-fitout-solutions",
        name: "Custom Design & Fit-Out",
        explanation: "Precision custom joinery, imported hardware fittings and turnkey styling for premium residential estates.",
        icon: "Hammer",
        subItems: ["Bespoke Wardrobes", "Hidden Lighting", "Curtain Automation", "Artifact Curation"]
      }
    ]
  }
];

// Temporarily Hidden per website_requirements.txt page 9-16
export const TEMPORARILY_HIDDEN_SERVICES = [
  {
    id: "solar-energy-solutions",
    title: "Solar & Energy Solutions",
    hiddenNotice: "Temporarily hidden in public launch",
    subServices: ["Residential Solar Installation", "Preventive Maintenance", "Battery & Backup Power"]
  },
  {
    id: "air-conditioning-solutions",
    title: "Air Conditioning Solutions",
    hiddenNotice: "Temporarily hidden in public launch",
    subServices: ["Residential AC Installation", "Preventive Maintenance", "Chemical Cleaning", "Gas Refill"]
  },
  {
    id: "water-tank-services",
    title: "Water Tank Cleaning & Maintenance Services",
    hiddenNotice: "Temporarily hidden in public launch",
    subServices: ["Rooftop Water Tank Cleaning", "Underground Tank Sanitisation", "Water Quality Testing", "Annual Maintenance Contracts"]
  }
];
