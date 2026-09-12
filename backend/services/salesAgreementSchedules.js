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

module.exports = { purchase: PURCHASE, sale: SALE };
