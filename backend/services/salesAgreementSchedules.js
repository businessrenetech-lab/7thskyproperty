// backend/services/salesAgreementSchedules.js
//
// Schedule A (Selected Services) and Schedule D (Checklist) taxonomies for the
// residential sales service agreements, transcribed VERBATIM from the V0.2
// source documents (SSPC-RPPS-01 / SSPC-RPSS-01). These drive the checkbox
// rendering — a ticked box (☑) for every item the builder selected, an empty
// box (☐) for the rest — and the Schedule B summary field list.

const PURCHASE = {
  party: 'Buyer',
  client_heading: 'PROPERTY BUYER / CLIENT',
  client_footer: 'Hereinafter referred to as the "Buyer", "Purchaser", or "Client"',
  commission_label: 'Professional Success Fee — % of Purchase Price (or as agreed)',
  schedule_a_title: 'SCHEDULE A — Selected Services',
  schedule_a: [
    ['Buyer Consultation & Planning', ['Initial Consultation', 'Property Requirement Assessment', 'Budget Planning', 'Purchase Strategy', 'Market Guidance']],
    ['Property Search', ['Property Identification', 'Property Shortlisting', 'Market Opportunity Search', 'Property Comparison', 'Buyer Recommendation Report']],
    ['Inspection & Property Coordination', ['Inspection Scheduling', 'Property Viewing Coordination', 'Buyer & Seller Communication', 'Inspection Feedback', 'Follow-up Coordination']],
    ['Negotiation & Transaction Support', ['Offer Preparation', 'Offer Submission', 'Negotiation Support', 'Sale Agreement Coordination', 'Settlement Coordination', 'Registration Coordination']],
    ['Documentation & Professional Coordination', ['Ownership Verification Coordination', 'Property Document Coordination', 'Conveyancing Coordination', 'Property Valuation Coordination', 'Bank / Financial Institution Coordination', 'Legal Coordination']],
    ['Additional Support Services', ['Loan Assistance Coordination', 'Land Survey Coordination', 'Interior Design Consultation Coordination', 'Relocation Assistance', 'Utility Connection Coordination', 'Other']],
  ],
  schedule_b_title: 'SCHEDULE B — Property Purchase Summary',
  schedule_b_fields: [
    ['Work Order No.', 'work_order_no'], ['Quotation No.', 'quotation_no'], ['Client Name', 'client_name'],
    ['Preferred Property Type', 'property_type'], ['Preferred Location', 'preferred_location'],
    ['Budget Range', 'budget_range'], ['Finance Method', 'finance_method'], ['Intended Use', 'intended_use'],
    ['Selected Services', 'selected_services_text'], ['Expected Purchase Date', 'expected_date'], ['Special Requirements', 'special_requirements'],
  ],
  schedule_d_title: 'SCHEDULE D — Property Purchase Checklist',
  schedule_d: [
    ['Buyer Information', ['National ID / Passport', 'Contact Details', 'Finance Pre-Approval (if applicable)', 'Budget Confirmation', 'Intended Use (Owner Occupier / Investment)']],
    ['Property Requirements', ['Preferred Property Type', 'Preferred Location', 'Minimum Bedrooms', 'Minimum Bathrooms', 'Land Size Requirements', 'Parking Requirements', 'Special Features']],
    ['Due Diligence', ['Property Inspection Completed', 'Valuation Completed (if applicable)', 'Building / Engineering Inspection Completed', 'Ownership Verification Completed', 'Legal Review Completed', 'Finance Approval Obtained']],
    ['Purchase & Settlement', ['Offer Accepted', 'Sale Agreement Executed', 'Conveyancer / Lawyer Appointed', 'Settlement Date Confirmed', 'Property Handover Arranged', 'Utility Connection Arranged', 'Other Special Instructions']],
  ],
};

const SALE = {
  party: 'Seller',
  client_heading: 'PROPERTY OWNER / SELLER (CLIENT)',
  client_footer: 'Hereinafter referred to as the "Client", "Seller", or "Property Owner"',
  commission_label: 'Professional Sales Commission — % of Final Sale Price (or as agreed)',
  schedule_a_title: 'SCHEDULE A — Selected Services',
  schedule_a: [
    ['Property Assessment & Sales Strategy', ['Initial Property Consultation', 'Property Assessment', 'Market Appraisal', 'Pricing Strategy', 'Sales Strategy']],
    ['Property Preparation', ['Cleaning Coordination', 'Gardening & Landscaping Coordination', 'Repair & Maintenance Coordination', 'Painting Coordination', 'Renovation Coordination', 'Property Styling', 'Furniture & Home Presentation']],
    ['Marketing & Promotion', ['Professional Photography', 'Drone Photography & Videography', 'Property Listing Preparation', 'Online Marketing', 'Social Media Promotion', 'Advertising Campaigns', 'Brochure Preparation']],
    ['Buyer Management', ['Buyer Enquiry Management', 'Inspection Coordination', 'Open House Coordination', 'Buyer Follow-up', 'Buyer Feedback Reports']],
    ['Negotiation & Transaction Support', ['Offer Coordination', 'Negotiation Support', 'Sale Agreement Coordination', 'Settlement Coordination', 'Handover Coordination']],
    ['Documentation & Professional Coordination', ['Ownership Verification Coordination', 'Conveyancing Coordination', 'Legal Documentation Coordination', 'Property Valuation Coordination', 'Financial Institution Coordination']],
    ['Additional Services', ['Utility Disconnection Coordination', 'Cleaning Before Handover', 'Property Maintenance Prior to Settlement', 'Other']],
  ],
  schedule_b_title: 'SCHEDULE B — Property Sale Summary',
  schedule_b_fields: [
    ['Work Order No.', 'work_order_no'], ['Quotation No.', 'quotation_no'], ['Property Owner', 'client_name'],
    ['Property Address', 'property_address'], ['Property Type', 'property_type'], ['Estimated Market Value', 'market_value'],
    ['Agreed Listing Price', 'listing_price'], ['Minimum Acceptable Sale Price (if applicable)', 'min_price'],
    ['Selected Services', 'selected_services_text'], ['Marketing Commencement Date', 'marketing_date'],
    ['Expected Settlement Date', 'settlement_date'], ['Special Conditions', 'special_requirements'],
  ],
  schedule_d_title: 'SCHEDULE D — Property Sale Checklist',
  schedule_d: [
    ['Property Information', ['Ownership Documents', 'National ID / Passport', 'Property Address', 'Title / Deed Information', 'Utility Information']],
    ['Property Preparation', ['Cleaning Completed', 'Repairs Completed', 'Gardening Completed', 'Property Styling Completed', 'Photography Completed']],
    ['Marketing', ['Listing Approved', 'Advertising Approved', 'Brochure Prepared', 'Online Marketing Activated', 'Inspection Schedule Approved']],
    ['Transaction', ['Offer Accepted', 'Conveyancer Appointed', 'Bank Details Confirmed', 'Settlement Date Confirmed', 'Property Handover Arranged', 'Other Special Instructions']],
  ],
};

// ── Commercial Property Sale (SSPC-CPSS-01) — signed with the Seller ──────────
// Transcribed VERBATIM from "Commercial Property - Sale Service Agreement V0.2".
const COMMERCIAL_SALE = {
  party: 'Seller',
  client_heading: 'PROPERTY OWNER / SELLER (CLIENT)',
  client_footer: 'Hereinafter referred to as the "Seller" or "Client"',
  commission_label: 'Professional Sales Commission / Success Fee — % of Final Sale Price (or as agreed)',
  schedule_a_title: 'SCHEDULE A — Selected Commercial Property Sale Services',
  schedule_a: [
    ['Property Assessment & Sales Strategy', ['Initial Consultation', 'Commercial Property Assessment', 'Market Analysis', 'Pricing Strategy', 'Sales Strategy']],
    ['Property Preparation', ['Cleaning Coordination', 'Repairs & Maintenance Coordination', 'Renovation Coordination', 'Property Presentation Coordination', 'Compliance Preparation Support']],
    ['Marketing & Promotion', ['Professional Photography Coordination', 'Drone Photography Coordination', 'Commercial Property Listing', 'Online Marketing', 'Social Media Promotion', 'Advertising Campaigns']],
    ['Buyer Management', ['Buyer Enquiry Management', 'Buyer Qualification', 'Inspection Coordination', 'Offer Coordination', 'Negotiation Support']],
    ['Documentation & Settlement', ['Ownership Documentation Coordination', 'Sale Documentation Coordination', 'Conveyancing Coordination', 'Settlement Coordination', 'Property Handover Coordination']],
    ['Additional Services', ['Property Valuation Coordination', 'Engineering Inspection Coordination', 'Survey Coordination', 'Legal Documentation Coordination', 'Business Sale Coordination (if applicable)', 'Other']],
  ],
  schedule_b_title: 'SCHEDULE B — Commercial Property Sale Summary',
  schedule_b_fields: [
    ['Client Reference No.', 'client_ref_no'], ['Work Order No.', 'work_order_no'], ['Property Owner', 'client_name'],
    ['Property Address', 'property_address'], ['Property Type', 'property_type'], ['Ownership Status', 'ownership_status'],
    ['Current Tenancy (if applicable)', 'current_tenancy'], ['Existing Business Use', 'existing_business_use'],
    ['Estimated Market Value', 'market_value'], ['Agreed Listing Price', 'listing_price'], ['Minimum Acceptable Sale Price', 'min_price'],
    ['Selected Service Package', 'selected_services_text'], ['Exclusive Listing Period (if applicable)', 'exclusive_period'],
    ['Special Conditions', 'special_requirements'],
  ],
  schedule_d_title: 'SCHEDULE D — Commercial Property Sale Checklist',
  schedule_d: [
    ['Property Assessment', ['Initial Consultation Completed', 'Property Details Confirmed', 'Agreement Signed', 'Quotation / Work Order Approved']],
    ['Property Preparation', ['Property Ready for Marketing', 'Photography Completed', 'Marketing Materials Approved', 'Listing Published']],
    ['Buyer Management', ['Buyer Enquiries Managed', 'Property Inspections Completed', 'Offers Received', 'Negotiations Completed']],
    ['Settlement', ['Sale Documentation Coordinated', 'Settlement Completed', 'Property Handover Completed', 'Final Invoice Issued', 'File Closed']],
  ],
};

// ── Commercial Property Purchase (SSPC-CPPS-01) — signed with the Buyer ───────
// Transcribed VERBATIM from "Commercial Property - Purchase Service Agreement V0.2".
const COMMERCIAL_PURCHASE = {
  party: 'Buyer',
  client_heading: 'PROPERTY BUYER / PURCHASER (CLIENT)',
  client_footer: 'Hereinafter referred to as the "Buyer", "Purchaser", or "Client"',
  commission_label: 'Professional Success Fee / Commission — % of Purchase Price (or as agreed)',
  schedule_a_title: 'SCHEDULE A — Selected Commercial Property Purchase Services',
  schedule_a: [
    ['Buyer Consultation', ['Initial Consultation', 'Commercial Property Requirement Assessment', 'Budget Planning Guidance', 'Investment Strategy Discussion', 'Commercial Market Guidance']],
    ['Commercial Property Search', ['Commercial Property Search', 'Property Shortlisting', 'Seller Communication', 'Property Inspection Coordination', 'Property Evaluation Assistance']],
    ['Due Diligence & Purchase Coordination', ['Due Diligence Coordination', 'Ownership Document Coordination', 'Document Verification Coordination', 'Negotiation Support', 'Purchase Agreement Coordination', 'Settlement Coordination', 'Registration Coordination', 'Property Handover Coordination']],
    ['Additional Services', ['Bank Loan Coordination', 'Property Valuation Coordination', 'Engineering Inspection Coordination', 'Land Survey Coordination', 'Legal Documentation Coordination', 'Other']],
  ],
  schedule_b_title: 'SCHEDULE B — Commercial Property Purchase Summary',
  schedule_b_fields: [
    ['Client Reference No.', 'client_ref_no'], ['Work Order No.', 'work_order_no'],
    ['Preferred Property Type', 'property_type'], ['Preferred Location', 'preferred_location'],
    ['Intended Business Use', 'intended_use'], ['Estimated Purchase Budget', 'budget_range'],
    ['Financing Method', 'finance_method'], ['Preferred Property Size', 'property_size'],
    ['Expected Purchase Timeframe', 'expected_date'], ['Investment Objectives', 'investment_objectives'],
    ['Selected Service Package', 'selected_services_text'], ['Special Requirements', 'special_requirements'],
  ],
  schedule_d_title: 'SCHEDULE D — Commercial Property Purchase Checklist',
  schedule_d: [
    ['Buyer Consultation', ['Client Consultation Completed', 'Requirements Confirmed', 'Agreement Signed', 'Quotation / Work Order Approved']],
    ['Property Search & Evaluation', ['Suitable Properties Identified', 'Property Inspections Completed', 'Due Diligence Coordinated', 'Negotiations Completed']],
    ['Purchase Process', ['Purchase Documentation Coordinated', 'Finance Coordination Completed (if applicable)', 'Settlement Coordinated', 'Property Handover Completed']],
    ['Completion', ['Services Completed', 'Final Invoice Issued', 'File Closed']],
  ],
};

// ── Business Sale (SSPC-BSS-01) — signed with the Business Owner / Seller ─────
// Transcribed VERBATIM from "Business Sale - Customer Service Agreement V0.2".
const BUSINESS_SALE = {
  party: 'Seller',
  client_heading: 'BUSINESS OWNER / SELLER (CLIENT)',
  client_footer: 'Hereinafter referred to as the "Client", "Seller", or "Business Owner"',
  commission_label: 'Business Sale Success Fee — % of Final Sale Price (or as agreed)',
  schedule_a_title: 'SCHEDULE A — Selected Services',
  schedule_a: [
    ['Business Sale Consultation', ['Initial Consultation', 'Sale Strategy Development', 'Market Positioning Advice', 'Business Readiness Assessment', 'Sale Planning']],
    ['Business Preparation', ['Business Profile Preparation', 'Operational Review Coordination', 'Documentation Preparation', 'Photography & Videography', 'Marketing Material Preparation']],
    ['Marketing & Buyer Sourcing', ['Online Business Listing', 'Social Media Marketing', 'Buyer Lead Generation', 'Investor Outreach', 'Buyer Enquiry Management']],
    ['Buyer Screening & Negotiation', ['Preliminary Buyer Screening', 'Financial Capability Review', 'Offer Coordination', 'Sale Negotiation Coordination']],
    ['Transaction Coordination', ['Due Diligence Coordination', 'Legal Documentation Coordination', 'Settlement Coordination', 'Business Handover Coordination', 'Post-Settlement Support']],
    ['Additional Services', ['Business Valuation Coordination', 'Accounting Adviser Coordination', 'Finance Coordination', 'Tax Adviser Coordination', 'Other']],
  ],
  schedule_b_title: 'SCHEDULE B — Business Sale Summary',
  schedule_b_fields: [
    ['Work Order No.', 'work_order_no'], ['Quotation No.', 'quotation_no'], ['Business Name', 'business_name'],
    ['Business Type', 'business_type'], ['Business Address', 'business_address'], ['Ownership Structure', 'ownership_structure'],
    ['Reason for Sale', 'reason_for_sale'], ['Indicative Sale Price', 'indicative_price'],
    ['Selected Services', 'selected_services_text'], ['Estimated Commencement Date', 'commencement_date'],
    ['Estimated Completion Date', 'completion_date'], ['Special Requirements', 'special_requirements'],
  ],
  schedule_d_title: 'SCHEDULE D — Business Sale Checklist',
  schedule_d: [
    ['Business Information', ['Business Name', 'Trade Licence / Company Registration', 'Nature of Business', 'Ownership Details', 'Business Address']],
    ['Business Documents', ['Trade Licence', 'Company Registration Certificate', 'TIN / BIN (if applicable)', 'Financial Statements (where applicable)', 'Business Asset Register', 'Existing Lease Agreement (if applicable)']],
    ['Sale Information', ['Indicative Sale Price', 'Included Business Assets', 'Stock Information (if applicable)', 'Employee Information (if applicable)', 'Intellectual Property Details (if applicable)']],
    ['Marketing & Sale Requirements', ['Photography Approved', 'Marketing Content Approved', 'Inspection Availability Confirmed', 'Buyer Qualification Criteria Confirmed', 'Confidentiality Requirements Confirmed', 'Other Special Instructions']],
  ],
};

// ── Business Purchase (SSPC-BPS-01) — signed with the Buyer / Acquirer ────────
// Transcribed VERBATIM from "Business Purchase Customer Service Agreement V0.2".
const BUSINESS_PURCHASE = {
  party: 'Buyer',
  client_heading: 'BUSINESS BUYER / ACQUIRER (CLIENT)',
  client_footer: 'Hereinafter referred to as the "Buyer", "Acquirer", or "Client"',
  commission_label: 'Business Acquisition Success Fee — % of Purchase Price (or as agreed)',
  schedule_a_title: 'SCHEDULE A — Selected Services',
  schedule_a: [
    ['Business Purchase Consultation', ['Initial Consultation', 'Buyer Requirement Assessment', 'Acquisition Strategy', 'Investment Planning', 'Market Opportunity Assessment']],
    ['Business Search & Shortlisting', ['Business Search', 'Business Shortlisting', 'Opportunity Assessment', 'Seller Matching', 'Market Comparison']],
    ['Business Inspection', ['Inspection Coordination', 'Business Presentation Coordination', 'Operational Walkthrough Coordination', 'Seller Meeting Coordination']],
    ['Negotiation & Transaction Coordination', ['Offer Coordination', 'Purchase Negotiation Coordination', 'Seller Communication', 'Transaction Coordination']],
    ['Due Diligence & Documentation', ['Due Diligence Coordination', 'Financial Information Coordination', 'Legal Documentation Coordination', 'Purchase Agreement Coordination', 'Settlement Coordination']],
    ['Post-Purchase Coordination', ['Business Handover Coordination', 'Utility Transfer Coordination', 'Licence Transfer Coordination', 'Post-Settlement Support']],
    ['Additional Services', ['Business Valuation Coordination', 'Legal Adviser Coordination', 'Accounting Adviser Coordination', 'Finance Coordination', 'Other']],
  ],
  schedule_b_title: 'SCHEDULE B — Business Purchase Summary',
  schedule_b_fields: [
    ['Work Order No.', 'work_order_no'], ['Quotation No.', 'quotation_no'], ['Client Name', 'client_name'],
    ['Preferred Business Type', 'business_type'], ['Preferred Location', 'preferred_location'], ['Investment Budget', 'budget_range'],
    ['Preferred Industry', 'preferred_industry'], ['Purchase Purpose', 'purchase_purpose'],
    ['Selected Services', 'selected_services_text'], ['Estimated Commencement Date', 'commencement_date'],
    ['Estimated Completion Date', 'completion_date'], ['Special Requirements', 'special_requirements'],
  ],
  schedule_d_title: 'SCHEDULE D — Business Purchase Checklist',
  schedule_d: [
    ['Buyer Information', ['National ID / Passport', 'Company Registration Documents (if applicable)', 'Contact Details', 'Proof of Funds / Finance Approval (if applicable)']],
    ['Purchase Requirements', ['Preferred Business Type', 'Preferred Industry', 'Preferred Location', 'Investment Budget', 'Intended Business Purpose']],
    ['Due Diligence Requirements', ['Financial Records Review', 'Legal Documentation Review', 'Business Licence Verification', 'Tax & Regulatory Review', 'Asset & Equipment Verification', 'Lease Review (if applicable)']],
    ['Transaction Requirements', ['Purchase Price Agreed', 'Settlement Date', 'Business Handover Requirements', 'Licence Transfer Requirements', 'Other Special Instructions']],
  ],
};

// ── Business Rental Management (SSPC-BRMS-01) — signed with the Owner/Landlord ─
// Transcribed VERBATIM from "Business Rental Management Service Agreement V0.2".
const BUSINESS_RENTAL = {
  party: 'Owner',
  client_heading: 'BUSINESS OWNER / LANDLORD (CLIENT)',
  client_footer: 'Hereinafter referred to as the "Client", "Owner", or "Landlord"',
  commission_label: "Business Leasing Success Fee — one month's rent (or as agreed)",
  schedule_a_title: 'SCHEDULE A — Selected Services',
  schedule_a: [
    ['Business Rental Consultation', ['Initial Consultation', 'Rental Strategy', 'Market Rental Assessment', 'Business Rental Planning', 'Commercial Advice']],
    ['Business Preparation', ['Presentation Assessment', 'Cleaning Coordination', 'Repairs & Maintenance Coordination', 'Signage Coordination', 'Photography & Videography', 'Business Presentation Improvement']],
    ['Marketing & Promotion', ['Business Listing Preparation', 'Online Marketing', 'Social Media Promotion', 'Commercial Advertising', 'Enquiry Management', 'Investor / Tenant Promotion']],
    ['Tenant Sourcing & Screening', ['Tenant Sourcing', 'Business Operator Sourcing', 'Preliminary Screening', 'Financial Capability Review', 'Business Suitability Assessment']],
    ['Lease Coordination', ['Property Inspection Coordination', 'Lease Negotiation Coordination', 'Letter of Offer Coordination', 'Lease Documentation Coordination', 'Lease Execution Coordination', 'Business Handover Coordination']],
    ['Ongoing Rental Management', ['Rent Collection Coordination', 'Tenant Communication', 'Routine Inspection Coordination', 'Maintenance Coordination', 'Lease Renewal Coordination', 'Exit Coordination']],
    ['Additional Services', ['Business Valuation Coordination', 'Legal Documentation Coordination', 'Utility Coordination', 'Other']],
  ],
  schedule_b_title: 'SCHEDULE B — Business Rental Summary',
  schedule_b_fields: [
    ['Work Order No.', 'work_order_no'], ['Quotation No.', 'quotation_no'], ['Business Name', 'business_name'],
    ['Business Type', 'business_type'], ['Business Address', 'business_address'], ['Ownership Structure', 'ownership_structure'],
    ['Current Operational Status', 'operational_status'], ['Expected Monthly Rent', 'monthly_rent'], ['Expected Security Deposit', 'security_deposit'],
    ['Preferred Lease Term', 'lease_term'], ['Selected Services', 'selected_services_text'],
    ['Estimated Commencement Date', 'commencement_date'], ['Estimated Completion Date', 'completion_date'], ['Special Requirements', 'special_requirements'],
  ],
  schedule_d_title: 'SCHEDULE D — Business Rental Checklist',
  schedule_d: [
    ['Business Information', ['Business Name', 'Trade Licence / Company Registration', 'Nature of Business', 'Ownership Details', 'Business Address']],
    ['Business Documents', ['Trade Licence', 'Company Registration Certificate', 'TIN / BIN (if applicable)', 'Existing Lease Agreement (if applicable)', 'Financial Information (if required)']],
    ['Rental Information', ['Expected Monthly Rent', 'Expected Security Deposit', 'Preferred Lease Term', 'Rent Review Structure', 'Included Assets & Equipment']],
    ['Marketing Requirements', ['Photography Approved', 'Marketing Description Approved', 'Inspection Availability Confirmed', 'Tenant Criteria Confirmed', 'Other Special Instructions']],
  ],
};

// ── Business Tenancy Management (SSPC-BTMS-01) — signed with the Tenant/Lessee ─
// Transcribed VERBATIM from "Business Tenancy Management Service Agreement V0.2".
const BUSINESS_TENANCY = {
  party: 'Tenant',
  client_heading: 'BUSINESS TENANT / LESSEE (CLIENT)',
  client_footer: 'Hereinafter referred to as the "Client", "Tenant", or "Lessee"',
  commission_label: "Business Tenancy Success Fee — one month's rent (or as agreed)",
  schedule_a_title: 'SCHEDULE A — Selected Services',
  schedule_a: [
    ['Business Leasing Consultation', ['Initial Consultation', 'Business Requirement Assessment', 'Location Assessment', 'Rental Budget Assessment', 'Leasing Strategy Advice']],
    ['Property Search & Shortlisting', ['Commercial Property Search', 'Property Shortlisting', 'Market Rental Comparison', 'Property Suitability Assessment']],
    ['Property Inspection', ['Inspection Coordination', 'Property Viewing', 'Landlord Meeting Coordination', 'Site Assessment']],
    ['Lease Negotiation', ['Rental Negotiation', 'Commercial Terms Negotiation', 'Lease Condition Review Coordination', 'Letter of Offer Coordination']],
    ['Documentation & Move-In Coordination', ['Lease Documentation Coordination', 'Utility Connection Coordination', 'Key Handover Coordination', 'Fit-Out Coordination', 'Business Commencement Support']],
    ['Ongoing Tenancy Management', ['Lease Renewal Coordination', 'Rent Review Assistance', 'Landlord Communication', 'Maintenance Coordination', 'Exit Coordination']],
    ['Additional Services', ['Business Relocation Assistance', 'Expansion Property Search', 'Multiple Site Coordination', 'Other']],
  ],
  schedule_b_title: 'SCHEDULE B — Project Summary',
  schedule_b_fields: [
    ['Work Order No.', 'work_order_no'], ['Quotation No.', 'quotation_no'], ['Client Name', 'client_name'],
    ['Business Type', 'business_type'], ['Preferred Location', 'preferred_location'], ['Property Type', 'property_type'],
    ['Space Requirement', 'space_requirement'], ['Monthly Rental Budget', 'rental_budget'], ['Lease Term Preference', 'lease_term'],
    ['Selected Services', 'selected_services_text'], ['Estimated Commencement Date', 'commencement_date'],
    ['Estimated Completion Date', 'completion_date'], ['Special Requirements', 'special_requirements'],
  ],
  schedule_d_title: 'SCHEDULE D — Business Tenancy Requirements Checklist',
  schedule_d: [
    ['Business Information', ['Business Name', 'Nature of Business', 'Business Registration Details (if applicable)', 'Contact Details']],
    ['Property Requirements', ['Preferred Location', 'Property Type', 'Minimum Floor Area', 'Parking Requirements', 'Utility Requirements', 'Accessibility Requirements']],
    ['Financial Information', ['Monthly Rental Budget', 'Preferred Lease Term', 'Security Deposit Budget', 'Fit-Out Budget (if applicable)']],
    ['Supporting Documents', ['National ID / Passport', 'Business Registration Documents (if applicable)', 'Financial Information (if required)', 'Other Supporting Documents']],
  ],
};

// ── Business Registration (SSPC-BR-CSA-01) — signed with the Client ───────────
// Transcribed VERBATIM from "Business Registration Customer Service Agreement V0.2".
// A service-delivery engagement (not a listing) — Seventh Sky coordinates trade
// licence, company registration, tax and corporate documentation on the Client's
// behalf. No success fee — all charges are professional service / coordination fees.
const BUSINESS_REGISTRATION = {
  party: 'Client',
  client_heading: 'CLIENT',
  client_footer: 'Hereinafter referred to as "the Client"',
  commission_label: 'Priority / Urgent Processing Coordination (if engaged)',
  schedule_a_title: 'SCHEDULE A — Selected Services',
  schedule_a: [
    ['Trade Licence Services', ['New Trade Licence Application', 'Trade Licence Renewal', 'Trade Licence Amendment', 'Municipality Documentation', 'City Corporation Documentation', 'Local Authority Coordination']],
    ['Business Registration Services', ['Sole Proprietorship Registration', 'Partnership Registration', 'Private Limited Company Registration', 'Public Limited Company Registration', 'Business Name Registration', 'RJSC Registration Coordination']],
    ['Corporate Documentation', ['Memorandum of Association Coordination', 'Articles of Association Coordination', 'Shareholder Documentation', 'Director Documentation', 'Company Resolution Preparation', 'Statutory Documentation']],
    ['Tax & Regulatory Registration', ['TIN Registration Coordination', 'BIN Registration Coordination', 'VAT Registration Coordination', 'Tax Registration Support', 'Regulatory Compliance Documentation']],
    ['Corporate Compliance Services', ['Annual Return Coordination', 'Company Information Update', 'Regulatory Filing Support', 'Corporate Record Maintenance', 'Company Secretarial Coordination']],
    ['Business Advisory Services', ['Business Structure Consultation', 'Registration Process Guidance', 'Documentation Review', 'Regulatory Compliance Advice']],
    ['Additional Services', ['Government Authority Liaison', 'Certified Document Coordination', 'Translation Coordination', 'Business Information Update', 'Other']],
  ],
  schedule_b_title: 'SCHEDULE B — Project Summary',
  schedule_b_fields: [
    ['Work Order No.', 'work_order_no'], ['Quotation No.', 'quotation_no'], ['Client Name', 'client_name'],
    ['Business Name', 'business_name'], ['Business Structure', 'business_structure'], ['Selected Services', 'selected_services_text'],
    ['Scope of Work', 'scope_of_work'], ['Government Authorities Involved', 'authorities'],
    ['Estimated Commencement Date', 'commencement_date'], ['Estimated Completion Date', 'completion_date'],
    ['Special Requirements', 'special_requirements'],
  ],
  schedule_d_title: 'SCHEDULE D — Required Client Documents & Registration Checklist',
  schedule_d: [
    ['Client Identification', ['National ID / Passport', 'Passport-size Photograph (if required)', 'Proof of Address (if applicable)']],
    ['Business Information', ['Proposed Business Name', 'Nature of Business', 'Business Address', 'Contact Details', 'Ownership Details']],
    ['Company Registration (where applicable)', ['Shareholder Information', 'Director Information', 'Memorandum of Association', 'Articles of Association', 'Share Capital Information', 'Board Resolution (if applicable)']],
    ['Tax & Regulatory Documents', ['TIN Information', 'BIN / VAT Information (if applicable)', 'Existing Registration Documents (if applicable)', 'Other Supporting Documents Required by the Relevant Authority']],
  ],
};

module.exports = {
  purchase: PURCHASE,
  sale: SALE,
  purchase_commercial: COMMERCIAL_PURCHASE,
  sale_commercial: COMMERCIAL_SALE,
  sale_business: BUSINESS_SALE,
  purchase_business: BUSINESS_PURCHASE,
  rent_business: BUSINESS_RENTAL,
  tenancy_business: BUSINESS_TENANCY,
  registration_business: BUSINESS_REGISTRATION,
};
