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
  sylhetBranch: "Level 4, Al-Hamra Shopping City, Zindabazar, Sylhet 3100, Bangladesh",
  socials: {
    facebook: "https://facebook.com/seventhskyproperty",
    linkedin: "https://linkedin.com/company/seventh-sky-property",
    instagram: "https://instagram.com/seventhskyproperty",
    youtube: "https://youtube.com/@seventhskyproperty"
  },
  stats: [
    { label: "Assets Under Care", value: "৳850+ Cr", sub: "Managed portfolio value" },
    { label: "Client Retention", value: "98.4%", sub: "Long-term owner satisfaction" },
    { label: "Global NRB Owners", value: "620+", sub: "Expatriates served in 18 countries" },
    { label: "Average Lease Time", value: "14 Days", sub: "Vetted corporate tenants" }
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
    answer: "We are an institutional property care and asset management firm, not a casual brokerage. We provide ongoing caretaker oversight, video inspection audits, formal legal document vetting, automated rent ledgers, and 24/7 maintenance dispatch under clear service level agreements."
  },
  {
    question: "How do NRB Dedicated Services work for owners living abroad?",
    answer: "Non-Resident Bangladeshi owners receive dedicated account managers who conduct periodic 4K video inspections, manage developer handovers, coordinate caretaker staff, pay utility/municipal taxes, and wire rental disbursements directly into designated international or local bank accounts."
  },
  {
    question: "How do you screen and vet prospective tenants?",
    answer: "Our 4-tier screening evaluates national identity verification, police clearance filing, employment/salary verification with corporate HR, and previous landlord reference checks before drafting legally binding bilingual agreements."
  },
  {
    question: "What is the Upstate-style property inspection booking process?",
    answer: "Each listing features confirmed public inspection windows or private appointment bookings. You can book an inspection online in 30 seconds; our concierge confirms by SMS and WhatsApp, and a licensed property advisor welcomes you on-site."
  },
  {
    question: "Can I get an appraisal for selling or leasing my property?",
    answer: "Yes. Simply click 'Book an Appraisal' at the top of the page. Our property valuation team will analyze current precinct trends, recent comparable sales, and rental yields to provide a comprehensive market valuation."
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
    bio: "Oversees all on-site inspection protocols, maintenance dispatch, and emergency response teams across Dhaka and Sylhet.",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80"
  },
  {
    name: "Sabrina Rahman",
    role: "Director of Tenancy & Legal Conveyancing",
    bio: "Specializes in AC Land mutations, title deed vetting, police clearance workflows and secure tenancy management.",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80"
  }
];
