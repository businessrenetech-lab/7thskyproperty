// Mock Data for Testimonials, FAQs, Company Metrics & Leadership

export const COMPANY_INFO = {
  name: "Seventh Sky Property Management",
  tagline: "The Property Experts.",
  shortBio: "Pioneering institutional-grade property care, leasing, management, and real estate advisory across Bangladesh for local homeowners and Non-Resident Bangladeshis worldwide.",
  phone: "+880 1711 000 777",
  emergencyPhone: "+880 1800 777 999 (24/7 Hotline)",
  email: "care@seventhskyproperty.com",
  inquiryEmail: "properties@seventhskyproperty.com",
  address: "Suites 701-704, Sky View Landmark, Gulshan Avenue, Gulshan 2, Dhaka 1212, Bangladesh",
  regionalBranch: "Level 4, Regional Corporate Center, Commercial Hub, Bangladesh",
  socials: {
    facebook: "https://facebook.com/seventhskyproperty",
    linkedin: "https://linkedin.com/company/seventh-sky-property",
    instagram: "https://instagram.com/seventhskyproperty",
    youtube: "https://youtube.com/@seventhskyproperty"
  },
  stats: [
    { label: "Assets Under Care", value: "৳850+ Cr", sub: "Safe & protected property value" },
    { label: "On-Time Rent Record", value: "99.2%", sub: "Direct monthly bank deposit" },
    { label: "NRB Expat Owners", value: "620+", sub: "UK, USA, Gulf & Canada landlords" },
    { label: "Fast Tenant Placement", value: "14 Days", sub: "Police & job verified families" }
  ]
};

export const MOCK_TESTIMONIALS = [
  {
    id: "test-1",
    clientName: "Dr. Kazi Mahfuzur Rahman",
    clientRole: "Consultant Physician (London, UK)",
    property: "Gulshan 2 Luxury Apartment",
    quote: "Living in London, managing my Gulshan duplex was a constant headache until I onboarded Seventh Sky. Their video inspection reports and direct rental disbursements give me total peace of mind.",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
    rating: 5,
    tag: "NRB Dedicated Care"
  },
  {
    id: "test-2",
    clientName: "Nusrat Jahan",
    clientRole: "Commercial Property Owner (Dhaka)",
    property: "Banani Commercial Floor",
    quote: "Clean, tidy, minimalist, and deeply professional. Their tenant verification process is rigorous, and their emergency care team resolves any property maintenance within hours.",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80",
    rating: 5,
    tag: "Leasing & Tenancy"
  },
  {
    id: "test-3",
    clientName: "Tanvir Ahmed Chowdhury",
    clientRole: "Managing Director, Apex Tech (Sydney, Australia)",
    property: "Baridhara Penthouse",
    quote: "Seventh Sky handles my property deeds, mutation, caretaker oversight and utility payments without me having to take a single flight back to Bangladesh. Unmatched transparency.",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80",
    rating: 5,
    tag: "Property Documentation"
  }
];

export const MOCK_FAQS = [
  {
    question: "What makes Seventh Sky different from traditional brokers in Bangladesh?",
    answer: "Traditional brokers take a commission and disappear. Seventh Sky stays with you permanently. We manage your property full-time: collecting rent on time, screening tenants with police verification, fixing electrical/plumbing issues, and sending you monthly bank statements."
  },
  {
    question: "How do you help NRB landlords living abroad (UK, USA, Gulf, Canada)?",
    answer: "You never have to take an emergency flight back to Bangladesh. We inspect your flat with WhatsApp video updates, pay utility bills and service charges, coordinate caretakers, and deposit rental income directly into your bank account."
  },
  {
    question: "How do you screen and vet prospective tenants?",
    answer: "We perform strict National ID (NID) checks, police verification filings, workplace HR checks, and previous landlord references before drafting a legally binding biometric contract."
  },
  {
    question: "How do I book a visit to view a property?",
    answer: "You can book online in 30 seconds. We confirm your time slot by WhatsApp and SMS, and our certified property advisor meets you at the property with all keys and legal documentation ready."
  },
  {
    question: "Can I get a free valuation to sell or rent my flat or plot?",
    answer: "Yes. Simply click 'Get Free Consultation' or 'Request Appraisal'. Our valuation team inspects your property and gives you an honest fair-market rent and price assessment within 24 hours."
  }
];

export const MOCK_TEAM = [
  {
    name: "Redowan Sayem",
    role: "Chief Executive & Founder",
    bio: "Passionate about elevating property management standards with transparent systems, cutting-edge technology and human-centric service.",
    image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80"
  },
  {
    name: "Tariqul Islam",
    role: "Head of Property Care & Operations",
    bio: "Oversees all on-site inspection protocols, maintenance dispatch, and emergency response teams across Dhaka and prime metropolitan hubs.",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80"
  },
  {
    name: "Sabrina Rahman",
    role: "Director of Tenancy & Legal Conveyancing",
    bio: "Specializes in AC Land mutations, title deed vetting, police clearance workflows and secure tenancy management.",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80"
  }
];
