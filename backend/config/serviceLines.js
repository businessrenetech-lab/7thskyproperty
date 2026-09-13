/**
 * serviceLines.js — the single source of per-service-line truth.
 *
 * Every service line (Water Tank, Air Conditioning, …) runs the SAME workflow
 * engine; only this config differs. Controllers scope their queries by
 * `service_line` (see utils/controllerHelpers.serviceScope) and read labels,
 * code prefixes, the catalogue vertical, required documents and agreement
 * template names from here — never from hard-coded literals.
 *
 * Adding a new service = a new entry here + a catalogue seed + agreement
 * templates + a console entry on the frontend. No core code is copied.
 *
 * See SERVICE_MODULE_DUPLICATION.md for the full contract.
 */

const SERVICE_LINES = {
  water_tank: {
    key: 'water_tank',
    label: 'Water Tank',
    short: 'WTCM',
    accent: '#12b6f3',
    api_base: 'wt',                 // /api/wt-*
    route_base: 'water-tank',       // /water-tank/*
    env_tag: 'WT',                  // signing-envelope code tag: ENV-WTCSA-/ENV-WTSDP-/ENV-WTPWO-
    catalogue_vertical: 'water_tank_csa',
    code_prefix: {
      client: 'WTCM-C', project: 'WTCM-P', request: 'SR-', assessment: 'SA-',
      quotation: 'Q-', work_order: 'WO-', invoice: 'INV-', provider: 'SP-',
      // Project-costing accounts payable (all lines fall back to these).
      supplier: 'SUP-', supplier_bill: 'SB-',
    },
    required_docs: {
      compliance: ['Trade Licence', 'Company Registration', 'TIN', 'BIN', 'Safety Certification'],
      insurance: ['Public Liability Insurance', 'Workers Compensation', 'Contractor Insurance', 'Vehicle Insurance'],
    },
    service_categories: [
      'Tank Cleaning Contractor', 'Tank Maintenance Contractor', 'Repair Contractor',
      'Waterproofing Contractor', 'Plumbing Contractor', 'Water Testing Laboratory',
      'Water Treatment Specialist', 'Pump Service Technician', 'AMC Provider',
    ],
    related_type: {
      customer: 'water_tank_customer_agreement',
      provider: 'water_tank_provider_agreement',
    },
    agreement_template: {
      customer: 'Water Tank Cleaning & Maintenance Customer Service Agreement',
      provider: 'Master Service Delivery Provider Agreement',
    },
    // The words the shared operations screens show — so an AC console never says
    // "Tank". Reference endpoints return this; the frontend renders from it.
    ui: {
      full_label: 'Water Tank Cleaning & Maintenance',
      project_types: ['Cleaning & Maintenance', 'Tank Sanitisation', 'Repair & Waterproofing', 'Water Quality & Testing', 'AMC Visit', 'Inspection Only', 'Mixed Scope'],
      categories: ['Cleaning', 'Disinfection', 'Repairs', 'Water Quality', 'Maintenance', 'AMC', 'Inspection'],
      property_types: ['Apartment', 'House', 'Duplex', 'Commercial Building', 'Hotel', 'Restaurant', 'School', 'Hospital', 'Factory', 'Warehouse', 'Mosque', 'Other'],
      // The consultation service picker: category → the services a client can request.
      service_catalogue: {
        Residential: ['Rooftop Water Tank Cleaning', 'Underground Water Tank Cleaning', 'Apartment Water Tank Cleaning', 'House Water Tank Cleaning', 'Tank Sanitisation', 'Bacteria & Algae Treatment', 'Water Tank Inspection', 'Tank Maintenance'],
        Commercial: ['Commercial Buildings', 'Hotels', 'Restaurants', 'Schools', 'Hospitals', 'Factories', 'Warehouses'],
        Repair: ['Crack Repair', 'Leakage Repair', 'Valve Replacement', 'Pipe Repair', 'Waterproofing', 'Structural Reinforcement'],
        'Water Quality': ['Water Testing', 'Water Treatment', 'Filtration Systems', 'Water Purification'],
        AMC: ['Residential AMC', 'Commercial AMC'],
      },
      // The project's tank_type/tanks_count/tank_capacity/water_source columns are
      // reused per service; only the labels and option lists differ.
      equipment: {
        section_label: 'Tank Details',
        type_label: 'Tank Type',
        type_options: ['Rooftop', 'Underground', 'Overhead', 'Ground Level', 'Apartment Common', 'Industrial'],
        count_label: 'Number of Tanks',
        capacity_label: 'Tank Capacity',
        capacity_placeholder: 'e.g. 2 × 1,500 L',
        source_label: 'Water Source',
        source_options: ['Municipal (WASA)', 'Deep Tube Well', 'Both', 'Other'],
      },
      // Site-assessment reference: construction materials and a shortlist of
      // services the assessor commonly recommends.
      assess_materials: ['Concrete', 'PVC / Plastic', 'Stainless Steel', 'Mild Steel', 'Fibreglass (GRP)', 'Brick / Masonry'],
      assess_sources: ['WASA Supply', 'Deep Tube Well', 'Shallow Tube Well', 'Surface Water', 'Rainwater Harvesting', 'Tanker Delivery'],
      recommended_services: ['Tank Cleaning', 'Disinfection', 'Sterilisation', 'Bacteria & Algae Treatment', 'Leak Detection', 'Crack Repair', 'Waterproofing', 'Valve Replacement', 'Pipe Connection Repair', 'Pump Maintenance', 'Water Quality Testing', 'AMC Enrolment'],
      report_types: ['Site Assessment', 'Cleaning', 'Inspection', 'Testing', 'Repair', 'AMC'],
      // Warranty / complaint / incident registers vocabulary.
      warranty_types: ['Cleaning & Disinfection', 'Waterproofing', 'Crack Repair', 'Structural Reinforcement', 'Valve & Fittings', 'Pump Service', 'Filtration System', 'General Workmanship'],
      warranty_months: { 'Cleaning & Disinfection': 6, Waterproofing: 24, 'Crack Repair': 12, 'Structural Reinforcement': 24, 'Valve & Fittings': 12, 'Pump Service': 12, 'Filtration System': 12, 'General Workmanship': 12 },
      complaint_types: ['Service Quality', 'Water Discolouration', 'Incomplete Work', 'Damage During Service', 'Staff Conduct', 'Late Attendance', 'Billing Dispute', 'Repeat Fault', 'Other'],
      incident_types: ['Injury', 'Contamination', 'Property Damage', 'Environmental', 'Equipment Failure', 'Other'],
    },
  },

  air_conditioning: {
    key: 'air_conditioning',
    label: 'Air Conditioning',
    short: 'ACCM',
    accent: '#7c3aed',              // violet — tells the AC console apart at a glance
    api_base: 'ac',                 // /api/ac-*
    route_base: 'air-conditioning', // /air-conditioning/*
    env_tag: 'ACS',                 // signing-envelope code tag: ENV-ACSCSA-/ENV-ACSDP-/ENV-ACSPWO-
    // The public onboarding path differs from route_base for legacy reasons.
    onboard_path: 'air-condition-provider-onboard',
    catalogue_vertical: 'air_conditioning_csa',
    code_prefix: {
      client: 'ACCM-C', project: 'ACCM-P', request: 'ACR-', assessment: 'ACA-',
      quotation: 'ACQ-', work_order: 'ACW-', invoice: 'ACI-', provider: 'ACP-',
    },
    // From the AC Third-Party SOP: AC adds electrical + refrigerant + safety
    // compliance and professional-indemnity + equipment insurance.
    required_docs: {
      compliance: ['Trade Licence', 'Company Registration', 'TIN', 'BIN', 'Electrical Certification', 'Refrigerant Handling Certification', 'Safety Training'],
      insurance: ['Public Liability Insurance', 'Workers Compensation', 'Vehicle Insurance', 'Contractor Insurance', 'Professional Indemnity', 'Equipment Insurance'],
    },
    service_categories: [
      'AC Installation Contractor', 'AC Maintenance Contractor', 'AC Repair Contractor',
      'AC Relocation Contractor', 'Refrigerant & Gas Specialist', 'Smart Climate Control Technician',
      'HVAC Contractor', 'Emergency Service Provider', 'AMC Contractor',
    ],
    related_type: {
      customer: 'air_conditioning_customer_agreement',
      provider: 'air_conditioning_provider_agreement',
    },
    agreement_template: {
      customer: 'Air Conditioning Cleaning Customer Service Agreement',
      provider: 'Master Service Delivery Provider Agreement',
    },
    ui: {
      full_label: 'Air Conditioning Solutions',
      project_types: ['Consultation', 'Installation', 'Relocation', 'Maintenance & Repairs', 'Cleaning', 'Refrigerant Service', 'AMC Visit', 'Smart Climate Control', 'Emergency Service', 'Mixed Scope'],
      categories: ['Consultation', 'Installation', 'Relocation', 'Maintenance', 'Repairs', 'Cleaning', 'Refrigerant', 'AMC', 'Smart Climate', 'Emergency'],
      property_types: ['House', 'Apartment', 'Office', 'Retail Shop', 'Restaurant', 'Café', 'School', 'Hospital', 'Warehouse', 'Factory', 'Commercial Building', 'Other'],
      service_catalogue: {
        Consultation: ['Residential AC Consultation', 'Commercial Site Assessment', 'Energy Efficiency Assessment'],
        Installation: ['Split AC Installation', 'Inverter AC Installation', 'Cassette AC Installation', 'Ducted AC Installation', 'Multi-Zone AC Installation'],
        Relocation: ['Residential AC Relocation', 'Commercial AC Relocation'],
        Maintenance: ['Preventive Maintenance', 'Commercial Preventive Maintenance', 'Fault Diagnosis'],
        Repairs: ['Compressor Replacement', 'Fan Motor Replacement', 'PCB Replacement', 'Sensor Replacement'],
        Cleaning: ['Standard AC Cleaning', 'Deep Chemical Cleaning', 'Indoor Unit Cleaning', 'Outdoor Unit Cleaning'],
        Refrigerant: ['Leak Detection', 'Refrigerant Gas Top-Up', 'Full Refrigerant Gas Refill'],
        'Smart Climate': ['Smart Thermostat Installation', 'Wi-Fi Smart AC Configuration'],
        AMC: ['Residential AMC', 'Commercial AMC'],
        Emergency: ['Emergency Call-Out', 'After Hours / Public Holiday Call-Out'],
      },
      // Reuses the project's tank_* / water_source columns as generic equipment
      // fields — no migration needed; only the labels and options change.
      equipment: {
        section_label: 'Equipment Details',
        type_label: 'System Type',
        type_options: ['Split System', 'Inverter', 'Cassette', 'Ducted', 'Window', 'Portable', 'Multi-Zone', 'Commercial'],
        count_label: 'Number of Units',
        capacity_label: 'Capacity (Ton / BTU)',
        capacity_placeholder: 'e.g. 2 × 1.5 Ton',
        source_label: 'Refrigerant Type',
        source_options: ['R32', 'R410A', 'R22', 'R290', 'Other'],
      },
      assess_materials: ['Gree', 'Midea', 'Daikin', 'General', 'Carrier', 'Samsung', 'LG', 'Chigo', 'Other'],
      assess_sources: ['R32', 'R410A', 'R22', 'R290', 'Other'],
      // Site-assessment safety/condition checklist for Air Conditioning — replaces
      // the Water Tank tank-access/confined-space checks so the AC assessment never
      // shows tank wording under "Safety verification".
      assess_checks: [
        { key: 'power_isolated', label: 'Power supply isolated / breaker off before work', group: 'Access & Safety' },
        { key: 'height_access_safe', label: 'Safe access to high / roof-mounted outdoor units (ladder, scaffold)', group: 'Access & Safety' },
        { key: 'electrical_earth', label: 'Earthing and electrical safety verified', group: 'Access & Safety' },
        { key: 'refrigerant_ppe', label: 'Refrigerant handling PPE and recovery kit on site', group: 'Access & Safety' },
        { key: 'unit_mounting_secure', label: 'Indoor / outdoor unit mounting secure', group: 'Condition' },
        { key: 'drainage_clear', label: 'Condensate drainage clear and correctly routed', group: 'Condition' },
        { key: 'coil_condition', label: 'Coils and fins condition assessed (corrosion, damage)', group: 'Condition' },
        { key: 'refrigerant_leak', label: 'Refrigerant leak indicators checked (oil traces, low gas)', group: 'Condition' },
        { key: 'electrical_load', label: 'Electrical supply / load adequate for the unit', group: 'Systems' },
        { key: 'controls_functional', label: 'Thermostat / controls functional test pass', group: 'Systems' },
      ],
      assess_templates: [
        { key: 'standard', label: 'Standard (all systems)', extra: [] },
        { key: 'split', label: 'Split / Inverter', extra: [
          { key: 'outdoor_unit_access', label: 'Outdoor unit accessible for service', group: 'Access & Safety' },
          { key: 'pipe_run_lagged', label: 'Refrigerant pipe run insulated / lagged', group: 'Condition' },
        ] },
        { key: 'cassette_ducted', label: 'Cassette / Ducted', extra: [
          { key: 'ceiling_access', label: 'Ceiling / plenum access available', group: 'Access & Safety' },
          { key: 'duct_condition', label: 'Ductwork condition and airflow assessed', group: 'Condition' },
        ] },
        { key: 'vrf_commercial', label: 'VRF / Commercial', extra: [
          { key: 'permit_to_work', label: 'Permit to work issued by site management', group: 'Access & Safety' },
          { key: 'shutdown_window', label: 'Shutdown window agreed with the client', group: 'Access & Safety' },
          { key: 'multi_zone_map', label: 'Multi-zone / indoor-unit map recorded', group: 'Systems' },
        ] },
      ],
      assess_equipment: [
        'Refrigerant gauge manifold', 'Vacuum pump', 'Recovery machine', 'Leak detector',
        'Coil cleaning pump', 'Nitrogen purge kit', 'Multimeter / clamp meter', 'Fin comb',
        'Ladder / scaffold', 'PPE set',
      ],
      recommended_services: ['Servicing', 'Standard Cleaning', 'Deep Chemical Cleaning', 'Gas Refill', 'Leak Detection', 'Fault Diagnosis', 'Compressor Replacement', 'PCB Replacement', 'Smart Thermostat Installation', 'AMC Enrolment'],
      report_types: ['Site Assessment', 'Installation', 'Servicing', 'Cleaning', 'Repair', 'AMC'],
      warranty_types: ['Installation', 'Labour', 'Repairs', 'Compressor', 'Parts', 'Manufacturer', 'General Workmanship'],
      warranty_months: { Installation: 12, Labour: 3, Repairs: 6, Compressor: 12, Parts: 6, Manufacturer: 12, 'General Workmanship': 3 },
      complaint_types: ['Service Quality', 'Cooling / Performance Issue', 'Incomplete Work', 'Damage During Service', 'Staff Conduct', 'Late Attendance', 'Billing Dispute', 'Repeat Fault', 'Other'],
      incident_types: ['Injury', 'Property Damage', 'Fire', 'Refrigerant Leak', 'Electrical Incident', 'Regulatory Investigation', 'Other'],
    },
  },

  land_property_assessment: {
    key: 'land_property_assessment',
    label: 'Land & Property Assessment',
    short: 'LPAS',
    accent: '#4f46e5',              // indigo — first sub-service of Doc Verification & Transfer
    api_base: 'wt',                 // shared /api/wt-* mount, scoped by the X-Service-Line header
    route_base: 'land-property-assessment',
    env_tag: 'SVS',                 // signing-envelope code tag: ENV-SVSCSA-/ENV-SVSDP-/ENV-SVSPWO-
    catalogue_vertical: 'land_property_assessment_csa',
    // Seventh Sky delivers this Doc Verification & Transfer service in-house —
    // there is no third-party service provider. On a signed Customer Service
    // Agreement the project opens automatically and proceeds internally (no
    // provider-assignment gate), the same internal-team model as Interior Design.
    no_provider: true,
    delivery_model: 'internal_team',
    completion_signoff: true,
    // Parent grouping on the main dashboard. The "Property Doc Verification &
    // Transfer Support" service has four sub-services; this is the first. The
    // other three (Loan & Financial Support, Property Documentation &
    // Verification, Property Will Succession) become sibling service lines under
    // the same `parent` when their documents arrive.
    parent: { key: 'doc_verification_transfer', label: 'Property Doc Verification & Transfer Support' },
    // Turns on the client Document Manager (side menu + client dashboard tab +
    // request links). Property Doc Verification & Transfer sub-services collect
    // property/ownership documents from the client for the assessment, so they
    // get the Doc Manager; Water Tank / Air Conditioning do not.
    doc_manager: true,
    // From SOP examples (LPAS-2027-001 client/project, LPAS-SP-001 provider) — kept
    // in the platform's sequential style (LPAS-C0001) rather than the year form.
    code_prefix: {
      client: 'LPAS-C', project: 'LPAS-P', request: 'LPAR-', assessment: 'LPAA-',
      quotation: 'LPAQ-', work_order: 'LPAW-', invoice: 'LPAI-', provider: 'LPAS-SP-',
    },
    // From the Third-Party SOP (Provider Onboarding Step 1) and Schedule C of the
    // Service Delivery Provider Master Agreement — surveying/valuation professionals
    // carry professional registration + professional indemnity.
    required_docs: {
      compliance: ['Trade Licence', 'Company Registration', 'TIN', 'BIN', 'Professional Registration'],
      insurance: ['Professional Indemnity Insurance', 'Public Liability Insurance', 'Workers Compensation', 'Vehicle Insurance'],
    },
    service_categories: [
      'Licensed Land Surveyor', 'Surveying Firm', 'Property Valuer', 'Valuation Company',
      'Civil Engineer', 'Structural Engineer', 'Technical Consultant', 'Drone Survey Operator',
    ],
    related_type: {
      customer: 'land_property_assessment_customer_agreement',
      provider: 'land_property_assessment_provider_agreement',
    },
    agreement_template: {
      customer: 'Survey & Valuation Services Customer Service Agreement',
      provider: 'Master Service Delivery Provider Agreement',
    },
    ui: {
      full_label: 'Land & Property Assessment (Survey & Valuation)',
      project_types: ['Land Survey', 'Property Valuation', 'Technical Assessment', 'Due Diligence', 'NRB Property Support', 'Multi-Stage Project', 'Mixed Scope'],
      categories: ['Survey', 'Valuation', 'Technical', 'Due Diligence', 'NRB Support', 'Mapping'],
      property_types: ['Residential Property', 'Commercial Property', 'Industrial Property', 'Agricultural Property', 'Vacant Land', 'Mixed Use Development', 'Apartment / Unit', 'Office Building', 'Shopping Complex', 'Hotel / Resort', 'Factory / Warehouse', 'Development Site', 'Government Property', 'Educational Institution', 'Hospital / Healthcare', 'Other'],
      // The consultation service picker: category → the services a client can request
      // (Survey & Valuation Services CSA, Clause 3 / Schedule A).
      service_catalogue: {
        'Land Survey': ['Boundary Survey', 'Cadastral Survey', 'Topographic Survey', 'Contour Survey', 'Construction / Engineering Survey', 'Subdivision Survey', 'GIS / Digital Mapping', 'Drone Survey', 'Utility Mapping'],
        'Property Valuation': ['Residential Property Valuation', 'Commercial Property Valuation', 'Industrial Property Valuation', 'Agricultural / Land Valuation', 'Rental Assessment', 'Insurance Valuation', 'Investment / Mortgage Valuation', 'Development Site Valuation'],
        'Technical Property Services': ['Property Condition Assessment', 'Due Diligence Inspection', 'Site Verification', 'Measurement Verification', 'Technical Property Report'],
        'NRB Property Support': ['Remote Property Inspection', 'Property Verification', 'Video Inspection', 'Construction Progress Inspection', 'Ownership Verification Coordination'],
      },
      // The project's tank_type/tanks_count/tank_capacity/water_source columns are
      // reused as generic land/property fields — no migration needed; only labels
      // and options change.
      equipment: {
        section_label: 'Property & Land Details',
        type_label: 'Property Type',
        type_options: ['Residential', 'Commercial', 'Industrial', 'Agricultural', 'Vacant Land', 'Mixed Use', 'Development Site', 'Other'],
        count_label: 'Number of Plots / Units',
        capacity_label: 'Land Area',
        capacity_placeholder: 'e.g. 5 Katha / 0.5 Acre',
        source_label: 'Land Record Basis',
        source_options: ['CS Khatian', 'SA Khatian', 'RS Khatian', 'BS / City Khatian', 'Mutation Khatian', 'Not Available'],
      },
      // Site-inspection reference: boundary marker types + record basis the assessor
      // records. (Reused from the WT assess_materials/assess_sources slots.)
      assess_materials: ['Concrete Boundary Pillar', 'Brick Wall', 'Fence', 'Natural Boundary', 'Road Frontage', 'No Physical Boundary'],
      assess_sources: ['CS Khatian', 'SA Khatian', 'RS Khatian', 'BS / City Khatian', 'Mutation Khatian', 'Not Available'],
      // Site-inspection safety/condition checklist for Survey & Valuation — replaces
      // the Water Tank tank-access checks so the assessment never shows tank wording.
      // Derived from the Work Order Property Details + the Risk Register (boundary
      // dispute, encroachment, missing records, access, ownership).
      assess_checks: [
        { key: 'site_access_confirmed', label: 'Safe and reasonable site access confirmed', group: 'Access & Safety' },
        { key: 'occupant_permission', label: 'Occupant / owner permission for inspection obtained', group: 'Access & Safety' },
        { key: 'terrain_safe', label: 'Terrain / site conditions safe for the survey team', group: 'Access & Safety' },
        { key: 'ownership_docs_available', label: 'Ownership / title documents available for reference', group: 'Records' },
        { key: 'mouza_jl_confirmed', label: 'Mouza and JL No. confirmed', group: 'Records' },
        { key: 'khatian_dag_verified', label: 'Khatian / Dag numbers verified against records', group: 'Records' },
        { key: 'existing_plan_available', label: 'Existing survey plan / mutation available', group: 'Records' },
        { key: 'boundary_markers_visible', label: 'Boundary markers / pillars identifiable on site', group: 'Condition & Risk' },
        { key: 'encroachment_check', label: 'Encroachment on the land checked', group: 'Condition & Risk' },
        { key: 'boundary_dispute', label: 'No apparent boundary dispute with adjoining land', group: 'Condition & Risk' },
      ],
      assess_templates: [
        { key: 'standard', label: 'Standard (all services)', extra: [] },
        { key: 'boundary_survey', label: 'Boundary / Cadastral Survey', extra: [
          { key: 'adjoining_owners_noted', label: 'Adjoining owners / plots noted', group: 'Records' },
          { key: 'pegging_required', label: 'Pegging / boundary marking required', group: 'Condition & Risk' },
        ] },
        { key: 'valuation', label: 'Property Valuation', extra: [
          { key: 'comparable_sales_available', label: 'Comparable sales evidence available in the area', group: 'Records' },
          { key: 'structure_measured', label: 'Building / structure measured for valuation', group: 'Condition & Risk' },
        ] },
        { key: 'technical', label: 'Technical / Due Diligence', extra: [
          { key: 'permits_reviewed', label: 'Approvals / permits reviewed', group: 'Records' },
          { key: 'structural_condition', label: 'Structural condition assessed', group: 'Condition & Risk' },
        ] },
      ],
      assess_equipment: [
        'Total Station', 'GPS / GNSS Receiver', 'Auto Level', 'Laser Distance Meter',
        'Drone', 'Measuring Tape', 'Survey Pegs', 'Camera', 'Laptop / CAD', 'Safety Equipment',
      ],
      // Documents the CLIENT provides for a survey / valuation assessment. Grounded
      // in the SOP (Phase 2 Step 5: Mouza/JL/Dag/Khatian, existing plans), the Work
      // Order checklist (Client Documents Received, Property Ownership Documents) and
      // the Property Register (CS/SA/RS/BS), plus the standard Bangladesh land
      // conveyancing set an assessor needs. Drives the Doc Manager checklist, the
      // client Documents tab and the public document-request link. `required` marks
      // the minimum an assessment should not proceed without.
      client_docs: [
        { key: 'nid_passport', label: 'Owner NID / Passport', group: 'Identity', category: 'identity', required: true },
        { key: 'rep_nid', label: 'Representative NID / Passport (if applicable)', group: 'Identity', category: 'identity', required: false },
        { key: 'poa', label: 'Power of Attorney (NRB / representative)', group: 'Identity', category: 'identity', required: false },
        { key: 'title_deed', label: 'Title Deed (Dolil)', group: 'Ownership & Title', category: 'ownership', required: true },
        { key: 'bia_deed', label: 'Bia / Chain Deeds', group: 'Ownership & Title', category: 'ownership', required: false },
        { key: 'mutation_khatian', label: 'Mutation Khatian (Namjari / Porcha)', group: 'Ownership & Title', category: 'ownership', required: false },
        { key: 'dcr', label: 'DCR (Duplicate Carbon Receipt)', group: 'Ownership & Title', category: 'ownership', required: false },
        { key: 'cs_khatian', label: 'CS Khatian', group: 'Land Records', category: 'land_record', required: false },
        { key: 'sa_khatian', label: 'SA Khatian', group: 'Land Records', category: 'land_record', required: false },
        { key: 'rs_khatian', label: 'RS Khatian', group: 'Land Records', category: 'land_record', required: true },
        { key: 'bs_khatian', label: 'BS / City Khatian', group: 'Land Records', category: 'land_record', required: false },
        { key: 'mouza_map', label: 'Mouza Map', group: 'Plans & Maps', category: 'plan', required: false },
        { key: 'existing_survey_plan', label: 'Existing Survey Plan', group: 'Plans & Maps', category: 'plan', required: false },
        { key: 'building_plan', label: 'Approved Building Plan (if built)', group: 'Plans & Maps', category: 'plan', required: false },
        { key: 'land_tax_receipt', label: 'Land Tax (Khajna) Receipt', group: 'Statutory', category: 'statutory', required: false },
        { key: 'holding_tax_receipt', label: 'Holding / Municipal Tax Receipt', group: 'Statutory', category: 'statutory', required: false },
        { key: 'other', label: 'Other Supporting Document', group: 'Other', category: 'other', required: false },
      ],
      recommended_services: ['Boundary Survey', 'Topographic Survey', 'Land Measurement', 'Subdivision Survey', 'Land Valuation', 'Property Valuation', 'Property Condition Assessment', 'Due Diligence Inspection', 'Ownership Verification', 'Drone Survey', 'GIS / Digital Mapping'],
      report_types: ['Site Inspection', 'Survey', 'Valuation', 'Technical Assessment', 'Due Diligence', 'NRB Report'],
      // The Survey & Valuation CSA offers a "Rectification / Warranty Period (Days)"
      // covering reporting/administrative errors and service-provider omissions.
      warranty_types: ['Survey Report', 'Valuation Report', 'Technical Report', 'Administrative / Reporting Error', 'General Professional Rectification'],
      warranty_months: { 'Survey Report': 3, 'Valuation Report': 3, 'Technical Report': 3, 'Administrative / Reporting Error': 3, 'General Professional Rectification': 3 },
      complaint_types: ['Report Accuracy', 'Incorrect Measurement', 'Incorrect Valuation', 'Missing Information', 'Delays', 'Staff Conduct', 'Billing Dispute', 'Repeat Fault', 'Other'],
      incident_types: ['Injury', 'Property Access Dispute', 'Boundary Dispute', 'Encroachment', 'Data / Record Loss', 'Other'],
    },
  },

  loan_financial_support: {
    key: 'loan_financial_support',
    label: 'Loan & Financial Support',
    short: 'LFS',
    accent: '#0d9488',              // teal — 2nd sub-service of Doc Verification & Transfer
    api_base: 'wt',                 // shared /api/wt-* mount, scoped by the X-Service-Line header
    route_base: 'loan-financial-support',
    env_tag: 'LFS',                 // signing-envelope code tag: ENV-LFSCSA-/ENV-LFSSDP-/ENV-LFSPWO-
    catalogue_vertical: 'loan_financial_support_csa',
    // In-house delivery, no third-party provider — signed agreement auto-opens the
    // project and it proceeds internally (same internal-team model as Interior Design).
    no_provider: true,
    delivery_model: 'internal_team',
    completion_signoff: true,
    parent: { key: 'doc_verification_transfer', label: 'Property Doc Verification & Transfer Support' },
    doc_manager: true,             // Phase 4 Document Collection — collects the client's financial documents
    loan_tracker: true,            // loan-specific module: the Loan Application Tracker (Sheet 8 + Banking Liaison)
    // From the Third-Party SOP (RLFS-SP-001) — kept in the platform's sequential style.
    code_prefix: {
      client: 'RLFS-C', project: 'RLFS-P', request: 'RLFR-', assessment: 'RLFA-',
      quotation: 'RLFQ-', work_order: 'RLFW-', invoice: 'RLFI-', provider: 'RLFS-SP-',
    },
    // Finance providers carry professional registration + professional indemnity;
    // the Master Agreement (Sec. 7) requires insurance where available/appropriate.
    required_docs: {
      compliance: ['Trade Licence', 'Company Registration', 'TIN', 'BIN', 'Professional Registration'],
      insurance: ['Professional Indemnity Insurance', 'Public Liability Insurance'],
    },
    service_categories: [
      'Mortgage Broker', 'Loan Consultant', 'Property Valuer', 'Banking Consultant',
      'Financial Documentation Specialist', 'Financial Advisor', 'Loan Processing Consultant',
    ],
    related_type: {
      customer: 'loan_financial_support_customer_agreement',
      provider: 'loan_financial_support_provider_agreement',
    },
    agreement_template: {
      customer: 'Loan & Financial Support Services Customer Service Agreement',
      provider: 'Master Service Delivery Provider Agreement',
    },
    ui: {
      full_label: 'Loan & Financial Support',
      project_types: ['Home Loan', 'Refinancing', 'Construction Loan', 'Investment Loan', 'Valuation Coordination', 'Financial Documentation', 'NRB Finance', 'Mixed Scope'],
      categories: ['Loan', 'Mortgage', 'Valuation', 'Documentation', 'Banking Liaison', 'NRB'],
      property_types: ['House', 'Apartment', 'Residential Building', 'Commercial Property', 'Industrial Property', 'Agricultural Property', 'Vacant Land', 'Mixed Use', 'Other'],
      // Consultation service picker (Customer Service Agreement Clause 3 / Schedule A).
      service_catalogue: {
        'Loan & Mortgage Support': ['Home Loan Assistance', 'Investment Property Loan Assistance', 'Commercial Property Loan Assistance', 'Construction Loan Assistance', 'Land Purchase Loan Assistance', 'Mortgage Coordination', 'Loan Refinancing Support', 'Loan Documentation Assistance', 'Banking Liaison Support', 'Pre-Approval Coordination', 'Loan Settlement Coordination'],
        'Property Valuation Coordination': ['Residential Property Valuation Coordination', 'Commercial Property Valuation Coordination', 'Land Valuation Coordination', 'Mortgage Valuation Coordination', 'Bank Valuation Coordination', 'Independent Valuation Coordination', 'Valuation Report Review', 'Revaluation Coordination'],
        'Financial Documentation Support': ['Financial Document Review', 'Income Verification Coordination', 'Asset & Liability Documentation', 'Loan Application Documentation', 'Financial Record Coordination', 'Supporting Evidence Collection', 'Identity Verification Coordination', 'Compliance Documentation'],
        'NRB Financial Support': ['Overseas Client Loan Coordination', 'Remote Documentation Support', 'Digital Document Verification Coordination', 'Financial Institution Liaison', 'Overseas Settlement Coordination', 'Cross-Border Documentation Support', 'Property Finance Coordination'],
      },
      // The project's tank_* / water_source columns are reused as generic finance
      // fields — no migration needed; only labels and options change.
      equipment: {
        section_label: 'Finance Details',
        type_label: 'Purpose of Finance',
        type_options: ['Property Purchase', 'Property Construction', 'Property Renovation', 'Property Investment', 'Refinancing', 'Equity Release', 'Business Finance', 'Other'],
        count_label: 'Number of Applicants',
        capacity_label: 'Estimated Loan Amount',
        capacity_placeholder: 'e.g. ৳50,00,000',
        source_label: 'Preferred Lender',
        source_options: ['City Bank', 'BRAC Bank', 'Dutch-Bangla Bank', 'Eastern Bank', 'HSBC', 'Standard Chartered', 'IDLC Finance', 'Not decided', 'Other'],
      },
      // Financial eligibility / documentation-readiness checklist (the loan
      // service's equivalent of a site inspection). From the Financial
      // Consultation Register + Risk Register — no tank/property-site wording.
      assess_materials: ['Salaried', 'Self-Employed', 'Business Owner', 'NRB / Overseas', 'Retired', 'Other'],
      assess_sources: ['City Bank', 'BRAC Bank', 'Dutch-Bangla Bank', 'Eastern Bank', 'HSBC', 'Standard Chartered', 'IDLC Finance', 'Not decided', 'Other'],
      assess_checks: [
        { key: 'identity_verified', label: 'Client identity verified (NID / Passport)', group: 'Eligibility' },
        { key: 'income_verified', label: 'Income and employment evidence available', group: 'Eligibility' },
        { key: 'existing_loans_disclosed', label: 'Existing loans / liabilities disclosed', group: 'Eligibility' },
        { key: 'credit_concerns_checked', label: 'Credit concerns / defaults reviewed', group: 'Eligibility' },
        { key: 'loan_amount_feasible', label: 'Requested loan amount feasible vs. income', group: 'Eligibility' },
        { key: 'documents_available', label: 'Required financial documents available', group: 'Documentation' },
        { key: 'property_identified', label: 'Property identified / ownership documents available', group: 'Documentation' },
        { key: 'purpose_confirmed', label: 'Purpose of finance confirmed', group: 'Documentation' },
        { key: 'valuation_needed', label: 'Property valuation required for the lender', group: 'Coordination' },
        { key: 'privacy_consent', label: 'Privacy consent obtained to share with lenders', group: 'Coordination' },
      ],
      assess_templates: [
        { key: 'standard', label: 'Standard (all services)', extra: [] },
        { key: 'home_loan', label: 'Home Loan', extra: [
          { key: 'down_payment_ready', label: 'Down payment / equity available', group: 'Eligibility' },
          { key: 'sale_agreement', label: 'Sale agreement / offer letter available', group: 'Documentation' },
        ] },
        { key: 'refinance', label: 'Refinancing', extra: [
          { key: 'existing_statements', label: 'Existing loan statements available', group: 'Documentation' },
          { key: 'settlement_figure', label: 'Existing loan settlement figure obtained', group: 'Coordination' },
        ] },
        { key: 'nrb', label: 'NRB / Overseas', extra: [
          { key: 'overseas_income', label: 'Overseas income evidence available', group: 'Eligibility' },
          { key: 'poa_available', label: 'Power of Attorney available for local signing', group: 'Documentation' },
        ] },
      ],
      assess_equipment: ['Financial Calculator', 'Document Scanner', 'Secure File Storage', 'Video Call Facility'],
      recommended_services: ['Home Loan Assistance', 'Mortgage Coordination', 'Loan Refinancing Support', 'Banking Liaison Support', 'Bank Valuation Coordination', 'Income Verification Coordination', 'Loan Application Documentation', 'Pre-Approval Coordination'],
      report_types: ['Financial Eligibility Assessment', 'Loan Assessment Summary', 'Valuation Coordination', 'Documentation Review', 'Banking Liaison', 'Completion Report'],
      warranty_types: ['Administrative Rectification', 'Documentation Rectification', 'Coordination Rectification'],
      warranty_months: { 'Administrative Rectification': 3, 'Documentation Rectification': 3, 'Coordination Rectification': 3 },
      complaint_types: ['Service Quality', 'Incorrect Advice', 'Documentation Error', 'Delays', 'Poor Communication', 'Billing Dispute', 'Loan Rejection Concern', 'Other'],
      incident_types: ['Data / Privacy Breach', 'Document Loss', 'Fraudulent Document', 'Regulatory Concern', 'Other'],
      // Client financial documents (SOP Phase 4 Step 10 + Work Order Section 5).
      client_docs: [
        { key: 'nid_passport', label: 'National ID / Passport', group: 'Identity', category: 'identity', required: true },
        { key: 'passport_photo', label: 'Passport-size Photograph', group: 'Identity', category: 'identity', required: false },
        { key: 'salary_certificate', label: 'Salary Certificate / Employment Letter', group: 'Income & Employment', category: 'income', required: true },
        { key: 'bank_statements', label: 'Bank Statements', group: 'Income & Employment', category: 'financial', required: true },
        { key: 'tax_return', label: 'Income Tax Return', group: 'Income & Employment', category: 'financial', required: false },
        { key: 'trade_licence', label: 'Trade Licence / Business Documents (if self-employed)', group: 'Income & Employment', category: 'financial', required: false },
        { key: 'asset_records', label: 'Asset Records', group: 'Financial', category: 'financial', required: false },
        { key: 'existing_loan_statements', label: 'Existing Loan Statements', group: 'Financial', category: 'financial', required: false },
        { key: 'property_documents', label: 'Property Ownership Documents', group: 'Property', category: 'property', required: false },
        { key: 'sale_agreement', label: 'Sale Agreement / Offer Letter', group: 'Property', category: 'property', required: false },
        { key: 'valuation_report', label: 'Property Valuation Report', group: 'Property', category: 'property', required: false },
        { key: 'other', label: 'Other Supporting Document', group: 'Other', category: 'other', required: false },
      ],
    },
  },

  property_documentation_verification: {
    key: 'property_documentation_verification',
    label: 'Property Documentation & Verification',
    short: 'PDV',
    accent: '#ea580c',              // orange — 3rd sub-service of Doc Verification & Transfer
    api_base: 'wt',
    route_base: 'property-documentation-verification',
    env_tag: 'PDV',                 // ENV-PDVCSA-/ENV-PDVSDP-/ENV-PDVPWO-
    catalogue_vertical: 'property_documentation_verification_csa',
    // In-house delivery, no third-party provider — signed agreement auto-opens the
    // project and it proceeds internally (same internal-team model as Interior Design).
    no_provider: true,
    delivery_model: 'internal_team',
    completion_signoff: true,
    parent: { key: 'doc_verification_transfer', label: 'Property Doc Verification & Transfer Support' },
    doc_manager: true,             // Phase 4 Document Collection — deed, mutation, porcha, tax, NID, PoA
    verification_register: true,   // line-specific module: Government Search + Verification Findings register
    // From the Third-Party SOP (PDV-SP-001).
    code_prefix: {
      client: 'PDV-C', project: 'PDV-P', request: 'PDVR-', assessment: 'PDVA-',
      quotation: 'PDVQ-', work_order: 'PDVW-', invoice: 'PDVI-', provider: 'PDV-SP-',
    },
    required_docs: {
      compliance: ['Trade Licence', 'Company Registration', 'TIN', 'BIN', 'Professional Registration'],
      insurance: ['Professional Indemnity Insurance', 'Public Liability Insurance'],
    },
    service_categories: [
      'Lawyer', 'Conveyancer', 'Land Consultant', 'Mutation Specialist',
      'Property Verification Specialist', 'Documentation Consultant',
    ],
    related_type: {
      customer: 'property_documentation_verification_customer_agreement',
      provider: 'property_documentation_verification_provider_agreement',
    },
    agreement_template: {
      customer: 'Property Documentation & Verification Services Customer Service Agreement',
      provider: 'Master Service Delivery Provider Agreement',
    },
    ui: {
      full_label: 'Property Documentation & Verification',
      project_types: ['Deed Verification', 'Due Diligence', 'Mutation Support', 'Conveyancing / Transfer', 'Documentation Support', 'NRB Documentation', 'Mixed Scope'],
      categories: ['Verification', 'Mutation', 'Documentation', 'Conveyancing', 'Transfer', 'NRB'],
      property_types: ['House', 'Apartment', 'Residential Building', 'Commercial Property', 'Industrial Property', 'Agricultural Property', 'Vacant Land', 'Mixed Use', 'Development Site', 'Other'],
      // Consultation service picker (Customer Service Agreement Clause 3 / Schedule A).
      service_catalogue: {
        'Property Documentation & Verification': ['Deed Verification', 'Chain of Ownership Verification', 'Title Review', 'Property Document Verification', 'Land Record Verification', 'Government Record Verification', 'Encumbrance Review', 'Due Diligence Documentation Review', 'Property Background Verification'],
        'Mutation & Land Record Support': ['Mutation Documentation Review', 'Mutation Application Support', 'Land Record Correction Support', 'Government Liaison Support', 'Record Status Verification', 'Mutation Follow-up'],
        'Property Documentation Support': ['Documentation Review', 'Drafting Property Correspondence', 'Official Correspondence Coordination', 'Property File Compilation', 'Administrative Documentation Support', 'Record Management Support'],
        'Conveyancing & Transfer Coordination': ['Property Transfer Documentation Support', 'Conveyancing Coordination', 'Sale & Purchase Documentation Review', 'Registration Coordination', 'Settlement Coordination', 'Due Diligence Coordination'],
        'NRB Property Documentation Support': ['Overseas Documentation Coordination', 'Remote Document Verification', 'Digital Documentation Support', 'Property Ownership Verification', 'Cross-Border Documentation Coordination'],
      },
      // Reuses the project's tank_* / water_source columns as property + record fields.
      equipment: {
        section_label: 'Property & Records',
        type_label: 'Property Type',
        type_options: ['Residential', 'Commercial', 'Industrial', 'Agricultural', 'Vacant Land', 'Mixed Use', 'Development Site', 'Other'],
        count_label: 'Number of Plots / Units',
        capacity_label: 'Land Area',
        capacity_placeholder: 'e.g. 5 Katha / 0.5 Acre',
        source_label: 'Latest Land Record',
        source_options: ['CS Khatian', 'SA Khatian', 'RS Khatian', 'BS / City Khatian', 'Mutation Khatian', 'Not Available'],
      },
      // Due-diligence readiness checklist (the verification service's assessment).
      // From the Risk Register (fraud, forged documents, ownership dispute, missing
      // records, litigation) + Property Details.
      assess_materials: ['CS Khatian', 'SA Khatian', 'RS Khatian', 'BS / City Khatian', 'Mutation Khatian', 'Not Available'],
      assess_sources: ['Sub-Registry Office', 'AC Land Office', 'Land Registry', 'City Corporation', 'Municipality', 'Court'],
      assess_checks: [
        { key: 'originals_seen', label: 'Original documents sighted (not photocopies only)', group: 'Documents' },
        { key: 'deed_chain_available', label: 'Deed / chain of ownership available', group: 'Documents' },
        { key: 'mouza_dag_khatian', label: 'Mouza, JL, Dag and Khatian confirmed', group: 'Records' },
        { key: 'mutation_status', label: 'Mutation (Namjari) status known', group: 'Records' },
        { key: 'tax_receipts_current', label: 'Land tax (Khajna) / holding tax receipts current', group: 'Records' },
        { key: 'encumbrance_concern', label: 'Encumbrance / mortgage / lien concern identified', group: 'Risk' },
        { key: 'ownership_dispute', label: 'Ownership dispute or litigation flag', group: 'Risk' },
        { key: 'forgery_concern', label: 'Forgery / fraud indicators reviewed', group: 'Risk' },
        { key: 'poa_valid', label: 'Power of Attorney valid (if applicable)', group: 'Risk' },
        { key: 'seller_identity_verified', label: 'Owner / seller identity verified against NID', group: 'Risk' },
      ],
      assess_templates: [
        { key: 'standard', label: 'Standard (all services)', extra: [] },
        { key: 'deed_verification', label: 'Deed / Title Verification', extra: [
          { key: 'chain_complete', label: 'Chain of ownership traced to a clear root', group: 'Documents' },
          { key: 'registry_matches', label: 'Registry record matches the deed', group: 'Records' },
        ] },
        { key: 'mutation', label: 'Mutation Support', extra: [
          { key: 'mutation_docs_ready', label: 'Mutation application documents ready', group: 'Documents' },
          { key: 'dcr_available', label: 'DCR / mutation fee receipt available', group: 'Records' },
        ] },
        { key: 'conveyancing', label: 'Conveyancing / Transfer', extra: [
          { key: 'buyer_seller_confirmed', label: 'Buyer and seller confirmed', group: 'Documents' },
          { key: 'registration_slot', label: 'Registration date / office arranged', group: 'Records' },
        ] },
      ],
      assess_equipment: ['Document Scanner', 'Record Search Access', 'Secure File Storage', 'Camera'],
      recommended_services: ['Deed Verification', 'Chain of Ownership Verification', 'Encumbrance Review', 'Due Diligence Documentation Review', 'Mutation Documentation Review', 'Registration Coordination', 'Property Ownership Verification'],
      report_types: ['Due Diligence Assessment', 'Verification Report', 'Chain of Ownership', 'Mutation Status', 'Encumbrance Report', 'Completion Report'],
      warranty_types: ['Administrative Rectification', 'Documentation Rectification', 'Report Correction'],
      warranty_months: { 'Administrative Rectification': 3, 'Documentation Rectification': 3, 'Report Correction': 3 },
      complaint_types: ['Service Quality', 'Incorrect Verification', 'Missing Findings', 'Delays', 'Poor Communication', 'Billing Dispute', 'Other'],
      incident_types: ['Fraud / Forged Document', 'Ownership Dispute', 'Missing Records', 'Litigation', 'Data / Privacy Breach', 'Other'],
      // Client documents (SOP Phase 4 Step 9 + Work Order Section 5).
      client_docs: [
        { key: 'title_deed', label: 'Property Deed / Title Deed (Dolil)', group: 'Ownership & Title', category: 'ownership', required: true },
        { key: 'previous_deeds', label: 'Previous Sale Deed(s) / Bia Deed', group: 'Ownership & Title', category: 'ownership', required: false },
        { key: 'mutation_certificate', label: 'Mutation Certificate (Namjari)', group: 'Ownership & Title', category: 'ownership', required: false },
        { key: 'porcha_khatian', label: 'Porcha / Khatian', group: 'Land Records', category: 'land_record', required: true },
        { key: 'dcr', label: 'DCR (Duplicate Carbon Receipt)', group: 'Land Records', category: 'land_record', required: false },
        { key: 'land_tax_receipt', label: 'Land Tax (Khajna) Receipt', group: 'Statutory', category: 'statutory', required: false },
        { key: 'holding_tax_receipt', label: 'Holding / Municipal Tax Receipt', group: 'Statutory', category: 'statutory', required: false },
        { key: 'nid_passport', label: 'NID / Passport (owner)', group: 'Identity', category: 'identity', required: true },
        { key: 'poa', label: 'Power of Attorney (if applicable)', group: 'Identity', category: 'identity', required: false },
        { key: 'registration_documents', label: 'Registration Documents', group: 'Legal', category: 'legal', required: false },
        { key: 'court_orders', label: 'Court Orders (if any)', group: 'Legal', category: 'legal', required: false },
        { key: 'other', label: 'Other Supporting Document', group: 'Other', category: 'other', required: false },
      ],
    },
  },

  property_will_succession: {
    key: 'property_will_succession',
    label: 'Property Will & Succession',
    short: 'PWS',
    accent: '#db2777',              // pink/rose — 4th sub-service of Doc Verification & Transfer
    api_base: 'wt',
    route_base: 'property-will-succession',
    env_tag: 'PWS',                 // ENV-PWSCSA-/ENV-PWSSDP-/ENV-PWSPWO-
    catalogue_vertical: 'property_will_succession_csa',
    // In-house delivery, no third-party provider — signed agreement auto-opens the
    // project and it proceeds internally (same internal-team model as Interior Design).
    no_provider: true,
    delivery_model: 'internal_team',
    completion_signoff: true,
    parent: { key: 'doc_verification_transfer', label: 'Property Doc Verification & Transfer Support' },
    doc_manager: true,             // Document Collection — will, death cert, succession cert, beneficiary docs
    beneficiary_register: true,    // line-specific module: the Beneficiary / Heirs Register
    // From the Third-Party SOP (PWS-SP-001).
    code_prefix: {
      client: 'PWS-C', project: 'PWS-P', request: 'PWSR-', assessment: 'PWSA-',
      quotation: 'PWSQ-', work_order: 'PWSW-', invoice: 'PWSI-', provider: 'PWS-SP-',
    },
    required_docs: {
      compliance: ['Trade Licence', 'Company Registration', 'TIN', 'BIN', 'Professional Registration'],
      insurance: ['Professional Indemnity Insurance', 'Public Liability Insurance'],
    },
    service_categories: [
      'Lawyer', 'Conveyancer', 'Estate Administrator', 'Probate Practitioner',
      'Succession Consultant', 'Documentation Consultant',
    ],
    related_type: {
      customer: 'property_will_succession_customer_agreement',
      provider: 'property_will_succession_provider_agreement',
    },
    agreement_template: {
      customer: 'Property Will & Succession Support Services Customer Service Agreement',
      provider: 'Master Service Delivery Provider Agreement',
    },
    ui: {
      full_label: 'Property Will & Succession Support',
      project_types: ['Will Documentation', 'Ownership Transfer', 'Nomination & Records', 'Succession Planning', 'Estate Administration', 'NRB Succession', 'Mixed Scope'],
      categories: ['Will', 'Transfer', 'Nomination', 'Succession', 'Legal Coordination', 'NRB'],
      property_types: ['House', 'Apartment', 'Residential Building', 'Commercial Property', 'Industrial Property', 'Agricultural Property', 'Vacant Land', 'Mixed Use', 'Estate / Portfolio', 'Other'],
      // Consultation service picker (Customer Service Agreement Clause 3 / Schedule A).
      service_catalogue: {
        'Property Will Documentation Support': ['Property Will Documentation Review', 'Property Will Preparation Coordination', 'Will Documentation Assistance', 'Witness Coordination', 'Will Registration Coordination', 'Estate Documentation Review', 'Secure Document Storage Coordination'],
        'Property Ownership Transfer Support': ['Ownership Transfer Documentation Support', 'Beneficiary Documentation', 'Property Ownership Transfer Coordination', 'Estate Transfer Coordination', 'Succession Documentation Review', 'Property Record Verification'],
        'Property Nomination & Record Support': ['Beneficiary Record Review', 'Nomination Documentation', 'Property Ownership Record Review', 'Family Property Record Coordination', 'Property Portfolio Record Review'],
        'Legal & Professional Coordination': ['Lawyer Coordination', 'Conveyancer Coordination', 'Probate Practitioner Coordination', 'Estate Administration Coordination', 'Land Registry Coordination', 'Government Authority Liaison', 'Financial Institution Coordination'],
        'Property Succession Support': ['Succession Planning Coordination', 'Family Property Succession Coordination', 'Estate Documentation Coordination', 'Beneficiary Coordination', 'Property Succession Administration Support', 'Property Distribution Coordination', 'NRB Property Succession Support'],
      },
      // Reuses the project's tank_* / water_source columns as estate/property fields.
      equipment: {
        section_label: 'Estate & Property',
        type_label: 'Property Type',
        type_options: ['Residential', 'Commercial', 'Industrial', 'Agricultural', 'Vacant Land', 'Mixed Use', 'Estate / Portfolio', 'Other'],
        count_label: 'Number of Beneficiaries',
        capacity_label: 'Estimated Estate Value',
        capacity_placeholder: 'e.g. ৳2,00,00,000',
        source_label: 'Will Status',
        source_options: ['Registered Will', 'Unregistered Will', 'Draft Will', 'No Will (Intestate)', 'Unknown'],
      },
      // Succession-readiness checklist (the will/succession service's assessment).
      // From the Consultation Register + Risk Register (family/beneficiary/ownership
      // dispute, missing documents, court proceedings).
      assess_materials: ['Registered Will', 'Unregistered Will', 'Draft Will', 'No Will (Intestate)', 'Unknown'],
      assess_sources: ['Sub-Registry Office', 'Court', 'AC Land Office', 'Notary', 'Land Registry'],
      assess_checks: [
        { key: 'will_exists', label: 'Existing will available (if any)', group: 'Will & Estate' },
        { key: 'will_registered', label: 'Will registration status confirmed', group: 'Will & Estate' },
        { key: 'ownership_documents', label: 'Property ownership / title documents available', group: 'Will & Estate' },
        { key: 'beneficiaries_identified', label: 'Beneficiaries / heirs identified', group: 'Beneficiaries' },
        { key: 'beneficiary_docs', label: 'Beneficiary identity documents available', group: 'Beneficiaries' },
        { key: 'family_consent', label: 'Family / beneficiary consent obtained', group: 'Beneficiaries' },
        { key: 'death_certificate', label: 'Death certificate available (succession cases)', group: 'Succession' },
        { key: 'succession_certificate', label: 'Succession / heirship certificate needed', group: 'Succession' },
        { key: 'dispute_flag', label: 'Family / beneficiary / ownership dispute flag', group: 'Risk' },
        { key: 'court_proceedings', label: 'Court proceedings pending', group: 'Risk' },
      ],
      assess_templates: [
        { key: 'standard', label: 'Standard (all services)', extra: [] },
        { key: 'will', label: 'Will Documentation', extra: [
          { key: 'witnesses_available', label: 'Witnesses available for the will', group: 'Will & Estate' },
          { key: 'assets_listed', label: 'Estate assets listed', group: 'Will & Estate' },
        ] },
        { key: 'succession', label: 'Succession / Inheritance', extra: [
          { key: 'heirs_confirmed', label: 'Legal heirs confirmed', group: 'Beneficiaries' },
          { key: 'shares_agreed', label: 'Beneficiary shares agreed', group: 'Beneficiaries' },
        ] },
        { key: 'transfer', label: 'Ownership Transfer', extra: [
          { key: 'transfer_route', label: 'Transfer route (mutation / registration) identified', group: 'Succession' },
          { key: 'noc_needed', label: 'No-objection / consent from co-heirs needed', group: 'Risk' },
        ] },
      ],
      assess_equipment: ['Document Scanner', 'Secure File Storage', 'Video Call Facility', 'Witness Facility'],
      recommended_services: ['Property Will Documentation Review', 'Will Registration Coordination', 'Succession Documentation Review', 'Beneficiary Documentation', 'Property Ownership Transfer Coordination', 'Probate Practitioner Coordination', 'Succession Planning Coordination'],
      report_types: ['Succession Review', 'Will Documentation Review', 'Beneficiary Summary', 'Ownership Transfer Review', 'Coordination Report', 'Completion Report'],
      warranty_types: ['Administrative Rectification', 'Documentation Rectification', 'Coordination Rectification'],
      warranty_months: { 'Administrative Rectification': 3, 'Documentation Rectification': 3, 'Coordination Rectification': 3 },
      complaint_types: ['Service Quality', 'Incorrect Advice', 'Missing Information', 'Delays', 'Poor Coordination', 'Billing Dispute', 'Family / Beneficiary Concern', 'Other'],
      incident_types: ['Family Dispute', 'Beneficiary Dispute', 'Ownership Dispute', 'Missing Documents', 'Court Proceedings', 'Data / Privacy Breach', 'Other'],
      // Client documents (SOP Document Collection + Workbook Sheet 7).
      client_docs: [
        { key: 'nid_passport', label: 'NID / Passport (client)', group: 'Identity', category: 'identity', required: true },
        { key: 'existing_will', label: 'Existing Will (if any)', group: 'Will & Estate', category: 'will', required: false },
        { key: 'property_documents', label: 'Property Ownership Documents / Title Deeds', group: 'Property', category: 'property', required: true },
        { key: 'property_tax', label: 'Property Tax Records', group: 'Property', category: 'property', required: false },
        { key: 'death_certificate', label: 'Death Certificate (succession cases)', group: 'Will & Estate', category: 'will', required: false },
        { key: 'succession_certificate', label: 'Succession / Heirship Certificate', group: 'Will & Estate', category: 'will', required: false },
        { key: 'probate_documents', label: 'Probate Documents', group: 'Legal', category: 'legal', required: false },
        { key: 'poa', label: 'Power of Attorney (if applicable)', group: 'Legal', category: 'legal', required: false },
        { key: 'beneficiary_documents', label: 'Beneficiary / Heir Identity Documents', group: 'Beneficiaries', category: 'beneficiary', required: false },
        { key: 'family_details', label: 'Family / Beneficiary Details', group: 'Beneficiaries', category: 'beneficiary', required: false },
        { key: 'other', label: 'Other Supporting Document', group: 'Other', category: 'other', required: false },
      ],
    },
  },

  removal_relocation: {
    key: 'removal_relocation',
    label: 'Removal & Relocation',
    short: 'RRS',
    accent: '#b45309',              // amber-brown — Removal & Relocation
    api_base: 'wt',
    route_base: 'removal-relocation',
    env_tag: 'RRS',                 // ENV-RRSCSA-/ENV-RRSPWO-
    catalogue_vertical: 'removal_relocation_csa',
    // Delivered by our OWN team + vehicles, not an agreement-bound provider.
    // These two flags flip the shared core; every OTHER line omits them and keeps
    // the default provider behaviour (provider_agreement_required defaults true,
    // delivery_model defaults 'provider').
    delivery_model: 'internal_team',
    provider_agreement_required: false,   // no provider master agreement / KYC gate
    team_fleet: true,                      // Team & Fleet module (crew + vehicles)
    inventory: true,                       // inventory list + prohibited-items / inventory declarations
    two_locations: true,                   // pickup + drop-off addresses
    code_prefix: {
      client: 'RRS-C', project: 'RRS-P', request: 'RRSR-', assessment: 'RRSA-',
      quotation: 'RRSQ-', work_order: 'RRSW-', invoice: 'RRSI-', provider: 'RRS-SP-',
    },
    // No provider onboarding for this line, but if an external provider IS used it
    // is captured simply (name, fee, disbursement) — these are the doc lists the
    // (rarely used) provider intake would show.
    required_docs: {
      compliance: ['Trade Licence', 'TIN'],
      insurance: ['Public Liability Insurance', 'Vehicle Insurance'],
    },
    service_categories: [
      'Removal Team', 'Packing Crew', 'Driver', 'External Removal Contractor', 'Storage Partner',
    ],
    related_type: {
      customer: 'removal_relocation_customer_agreement',
      provider: 'removal_relocation_provider_agreement',
    },
    agreement_template: {
      customer: 'Removal & Relocation Services Customer Service Agreement',
      provider: 'Master Service Delivery Provider Agreement',
    },
    ui: {
      full_label: 'Removal & Relocation Services',
      project_types: ['Residential Relocation', 'Commercial Relocation', 'Packing Only', 'Clearance / Disposal', 'Move Support', 'Storage', 'Mixed Scope'],
      categories: ['Residential', 'Commercial', 'Packing', 'Furniture', 'Clearance', 'Move Support', 'Storage'],
      property_types: ['Studio Apartment', '1 Bedroom', '2 Bedroom', '3 Bedroom', '4 Bedroom+', 'Office', 'Retail Shop', 'Warehouse', 'House', 'Other'],
      // Consultation service picker (Customer Service Agreement Clause 3 / Schedule A).
      service_catalogue: {
        'Residential Relocation': ['Studio Apartment', '1 Bedroom', '2 Bedroom', '3 Bedroom', '4 Bedroom+'],
        'Commercial Relocation': ['Office Relocation', 'Retail Shop Relocation', 'Warehouse Relocation', 'Business Relocation'],
        'Packing Services': ['Packing', 'Unpacking', 'Fragile Item Packing', 'Furniture Wrapping', 'Carton Supply'],
        'Furniture Services': ['Furniture Moving', 'Furniture Dismantling', 'Furniture Reassembly', 'Heavy Item Moving'],
        'Clearance & Disposal': ['Household Clearance', 'Office Clearance', 'Furniture Disposal', 'General Waste Removal'],
        'Move Support': ['Move-In Support', 'Move-Out Support', 'Utility Coordination', 'Address Change Assistance'],
        'Other Services': ['Temporary Storage Coordination', 'Labour Only', 'Vehicle Only', 'Emergency Relocation'],
      },
      // The project's tank_* / water_source columns are reused as generic move fields.
      equipment: {
        section_label: 'Move Details',
        type_label: 'Move Type',
        type_options: ['Residential', 'Commercial', 'Office', 'Packing Only', 'Clearance', 'Storage', 'Other'],
        count_label: 'Estimated Volume',
        capacity_label: 'Vehicle Required',
        capacity_placeholder: 'e.g. 1 × Truck (Medium)',
        source_label: 'Distance / Route',
        source_options: ['Within City', 'Intercity', 'Long Distance', 'Local (<10km)'],
      },
      // Site-inspection checklist (SOP Sec. 7). Volume, access (pickup+dropoff),
      // risks, special items, labour + vehicle needs, prohibited-items check.
      assess_materials: ['Cartons', 'Bubble Wrap', 'Protective Covers', 'Furniture Blankets', 'Tape', 'Labels'],
      assess_sources: ['Truck (Large)', 'Truck (Medium)', 'Van', 'Pickup', 'Multiple Vehicles'],
      assess_checks: [
        { key: 'volume_assessed', label: 'Volume / item count assessed', group: 'Scope' },
        { key: 'special_items', label: 'Fragile / high-value / special-handling items identified', group: 'Scope' },
        { key: 'disassembly_needed', label: 'Furniture dismantling / reassembly needed', group: 'Scope' },
        { key: 'pickup_access', label: 'Pickup access checked (lift / stairs / truck / parking)', group: 'Access' },
        { key: 'dropoff_access', label: 'Drop-off access checked (lift / stairs / truck / parking)', group: 'Access' },
        { key: 'labour_estimated', label: 'Labour (crew size) estimated', group: 'Resources' },
        { key: 'vehicle_estimated', label: 'Vehicle type / count estimated', group: 'Resources' },
        { key: 'prohibited_checked', label: 'No prohibited / hazardous items expected', group: 'Risk' },
        { key: 'parking_permit', label: 'Parking / building permit required', group: 'Risk' },
        { key: 'photos_taken', label: 'Site photos taken', group: 'Risk' },
      ],
      assess_templates: [
        { key: 'standard', label: 'Standard (all moves)', extra: [] },
        { key: 'residential', label: 'Residential', extra: [
          { key: 'appliances', label: 'Large appliances to move (fridge, washer)', group: 'Scope' },
        ] },
        { key: 'commercial', label: 'Commercial / Office', extra: [
          { key: 'it_equipment', label: 'IT / server equipment handling', group: 'Scope' },
          { key: 'afterhours', label: 'After-hours / weekend move window', group: 'Access' },
        ] },
      ],
      assess_equipment: ['Trolley / Dolly', 'Lifting Straps', 'Furniture Blankets', 'Bubble Wrap', 'Cartons', 'Dismantling Tools', 'Ramp', 'PPE'],
      recommended_services: ['Packing', 'Furniture Wrapping', 'Furniture Dismantling', 'Heavy Item Moving', 'Unpacking', 'Furniture Disposal', 'Temporary Storage Coordination'],
      report_types: ['Site Inspection', 'Packing', 'Loading', 'Delivery', 'Damage', 'Closure'],
      warranty_types: ['Service Rectification', 'Damage Rectification'],
      warranty_months: { 'Service Rectification': 1, 'Damage Rectification': 1 },
      complaint_types: ['Damage', 'Late Arrival', 'Missing Item', 'Staff Conduct', 'Incomplete Move', 'Billing Dispute', 'Delay Charge Dispute', 'Other'],
      incident_types: ['Property Damage', 'Item Damage', 'Item Loss', 'Injury', 'Vehicle Accident', 'Prohibited Item Found', 'Customer Delay', 'Other'],
      // Team & Fleet vocabulary (crew roles + vehicle types).
      crew_roles: ['Team Leader', 'Driver', 'Mover', 'Packer', 'Supervisor'],
      vehicle_types: ['Truck (Large)', 'Truck (Medium)', 'Van', 'Pickup'],
    },
  },

  property_care_concierge: {
    key: 'property_care_concierge',
    label: 'Property Care & Concierge',
    short: 'PCC',
    accent: '#059669',              // emerald — Property Care & Concierge
    api_base: 'wt',
    route_base: 'property-care-concierge',
    env_tag: 'PCC',                 // ENV-PCCCSA-/ENV-PCCPWO-
    catalogue_vertical: 'property_care_concierge_csa',
    // Delivered by our OWN team + vehicles (optional external subcontractor per
    // work order), not an agreement-bound provider — same internal-team model as
    // Removal & Relocation.
    delivery_model: 'internal_team',
    provider_agreement_required: false,   // no provider master agreement / KYC gate
    team_fleet: true,                      // Team & Fleet module (staff + vehicles)
    two_locations: false,                  // single service property
    // Property-Care-specific modules (each gated by its own flag on the shared core).
    asset_register: true,                  // per-property asset & maintenance register
    concierge: true,                       // access declarations + entry/exit checklists
    utility_coordination: true,            // utility bill / connection assistance register
    code_prefix: {
      client: 'PCC-C', project: 'PCC-P', request: 'PCCR-', assessment: 'PCCA-',
      quotation: 'PCCQ-', work_order: 'PCCW-', invoice: 'PCCI-', provider: 'PCC-SP-',
    },
    // No provider onboarding; if an external subcontractor IS used it is captured
    // simply on the work order (name, fee, disbursement).
    required_docs: {
      compliance: ['Trade Licence', 'TIN'],
      insurance: ['Public Liability Insurance'],
    },
    service_categories: [
      'Service Team', 'Technician', 'Cleaner', 'Gardener', 'Inspector', 'Security',
      'External Subcontractor',
    ],
    related_type: {
      customer: 'property_care_concierge_customer_agreement',
      provider: 'property_care_concierge_provider_agreement',
    },
    agreement_template: {
      customer: 'Property Care & Concierge Services Customer Service Agreement',
      provider: 'Master Service Delivery Provider Agreement',
    },
    ui: {
      full_label: 'Property Care & Concierge Services',
      project_types: ['One-Off Service', 'Ongoing Care Plan', 'Vacant Property Care', 'NRB Owner Care', 'Concierge Engagement', 'Presentation / Styling', 'Mixed Scope'],
      categories: ['Property Care & Maintenance', 'Property Presentation', 'Smart Property Solutions', 'Security & Monitoring', 'Property Marketing Support', 'NRB Property Services', 'Concierge Services'],
      property_types: ['Apartment', 'House', 'Townhouse', 'Villa', 'Commercial', 'Retail', 'Office', 'Warehouse', 'Vacant Land', 'Other'],
      // Consultation service picker (Customer Service Agreement Clause 3 / Schedule A).
      service_catalogue: {
        'Property Care & Maintenance': ['Cleaning Services', 'Gardening & Landscaping', 'General Repairs & Maintenance', 'Painting Services', 'Minor Renovation', 'Emergency Assistance', 'Property Inspections', 'Utility Bill Assistance', 'Work Progress Reporting', 'Before & After Photography'],
        'Property Presentation': ['Property Styling', 'Home Staging', 'Furnishing Assistance', 'Seasonal Property Preparation', 'Property Readiness'],
        'Smart Property Solutions': ['CCTV Installation', 'Smart Lock Installation', 'Smart Home Devices', 'Access Control Systems', 'Remote Property Monitoring'],
        'Security & Monitoring': ['Vacant Property Checks', 'Property Monitoring', 'Emergency Property Response', 'Security Patrol Services'],
        'Property Marketing Support': ['Professional Photography', 'Videography', 'Drone Photography', 'Listing Preparation', 'Social Media Promotion'],
        'NRB Property Services': ['Overseas Owner Reporting', 'Remote Property Monitoring', 'Periodic Video Inspection', 'Property Visit Reports', 'Overseas Owner Care'],
        'Concierge Services': ['Mail Collection', 'Key Holding', 'Property Opening & Closing', 'Appointment Coordination', 'Utility Connection Assistance', 'Pre-Arrival Preparation'],
      },
      // The project's tank_* / water_source columns are reused as generic
      // service/property fields for this line.
      equipment: {
        section_label: 'Service Details',
        type_label: 'Primary Service Category',
        type_options: ['Property Care & Maintenance', 'Property Presentation', 'Smart Property Solutions', 'Security & Monitoring', 'Property Marketing Support', 'NRB Property Services', 'Concierge Services'],
        count_label: 'Service Frequency',
        capacity_label: 'Access Method',
        capacity_placeholder: 'e.g. Key held / Client present / Lockbox',
        source_label: 'Occupancy Status',
        source_options: ['Owner-Occupied', 'Tenanted', 'Vacant', 'Overseas Owner (NRB)', 'Mixed Use'],
      },
      // Site-inspection checklist (SOP Sec. 6-8): property size/condition, areas to
      // service, access, hazards, utilities, security — single service property.
      assess_materials: ['Cleaning Consumables', 'Garden Supplies', 'Paint & Sundries', 'Repair Materials', 'Fixtures & Fittings', 'PPE'],
      assess_sources: ['Owner-Occupied', 'Tenanted', 'Vacant', 'Overseas Owner (NRB)', 'Mixed Use'],
      assess_checks: [
        { key: 'property_size', label: 'Property size / number of areas assessed', group: 'Scope' },
        { key: 'areas_to_service', label: 'Areas requiring service identified', group: 'Scope' },
        { key: 'service_frequency', label: 'Service frequency confirmed (one-off / ongoing)', group: 'Scope' },
        { key: 'property_condition', label: 'Property condition recorded', group: 'Condition' },
        { key: 'existing_damage', label: 'Existing damage documented (with photos)', group: 'Condition' },
        { key: 'access_confirmed', label: 'Access arrangements / key holding confirmed', group: 'Access' },
        { key: 'parking_access', label: 'Parking / loading access checked', group: 'Access' },
        { key: 'safety_hazards', label: 'Safety hazards identified', group: 'Risk' },
        { key: 'utilities_available', label: 'Utilities availability checked', group: 'Risk' },
        { key: 'security_arrangements', label: 'Security / alarm arrangements noted', group: 'Risk' },
      ],
      assess_templates: [
        { key: 'standard', label: 'Standard (all services)', extra: [] },
        { key: 'ongoing', label: 'Ongoing Care Plan', extra: [
          { key: 'visit_schedule', label: 'Recurring visit schedule agreed', group: 'Scope' },
        ] },
        { key: 'vacant', label: 'Vacant / NRB Property', extra: [
          { key: 'meter_readings', label: 'Meter readings / utilities to monitor', group: 'Risk' },
          { key: 'keyholding', label: 'Key-holding & alarm code arrangement', group: 'Access' },
        ] },
      ],
      assess_equipment: ['Cleaning Kit', 'Garden Tools', 'Ladder', 'Power Tools', 'Inspection Camera', 'PPE', 'Signage', 'Vehicle'],
      recommended_services: ['Cleaning Services', 'Gardening & Landscaping', 'General Repairs & Maintenance', 'Property Inspections', 'Vacant Property Checks', 'Remote Property Monitoring', 'Key Holding', 'Property Opening & Closing'],
      report_types: ['Site Inspection', 'Property Visit', 'Progress', 'Video Inspection', 'Damage', 'Closure'],
      warranty_types: ['Service Rectification', 'Workmanship Rectification'],
      warranty_months: { 'Service Rectification': 1, 'Workmanship Rectification': 3 },
      complaint_types: ['Service Quality', 'Incomplete Work', 'Damage During Service', 'Staff Conduct', 'Late Attendance', 'Missed Visit', 'Billing Dispute', 'Repeat Fault', 'Other'],
      incident_types: ['Property Damage', 'Security / Access Breach', 'Prohibited Conduct', 'Theft / Loss', 'Injury / WHS', 'Equipment Failure', 'Other'],
      // Team & Fleet vocabulary (staff roles + vehicle types).
      crew_roles: ['Supervisor', 'Technician', 'Cleaner', 'Gardener', 'Inspector', 'Security Officer', 'Handyman', 'Driver'],
      vehicle_types: ['Van', 'Pickup', 'Car', 'Truck'],
      // Recurring / ongoing service frequencies (workbook Lists & Status Values).
      service_frequencies: ['One-Off', 'Daily', 'Weekly', 'Fortnightly', 'Monthly', 'Quarterly', 'Six-Monthly', 'Annual', 'As Required'],
    },
  },

  // ── Interior Design Solutions — parent group of 7 client-facing verticals ──
  // NO service provider (no_provider) and NO AMC (no_amc): design/fit-out is
  // delivered/coordinated by Seventh Sky and completed via a Project Completion
  // Sign-Off, not a provider payout. Runs the shared /api/wt-* engine, scoped by
  // X-Service-Line. First vertical live: Residential; the other six follow as
  // agreement packs + config entries under the same `parent`.
  residential_interior_design: {
    key: 'residential_interior_design',
    label: 'Residential Interior Design',
    short: 'RIDS',
    accent: '#9333ea',              // purple — Interior Design group
    api_base: 'wt',                 // shared /api/wt-* mount, scoped by the header
    route_base: 'residential-interior-design',
    env_tag: 'RIDS',                // ENV-RIDSCSA-…
    catalogue_vertical: 'residential_interior_design_csa',
    parent: { key: 'interior_design', label: 'Interior Design Solutions' },
    // Behaviour flags — no provider side, no AMC; interior-specific modules on.
    no_provider: true,
    no_amc: true,
    variations: true,
    completion_signoff: true,
    // Seventh Sky delivers/coordinates the project itself — no agreement-bound
    // service provider. Reuse the tested internal-team work-order flow (allocate
    // instead of assign; schedule → start → complete → verify unchanged), the
    // same model the Removal line uses.
    delivery_model: 'internal_team',
    // No provider prefix — providers are not used on this line.
    code_prefix: {
      client: 'RIDS-C', project: 'RIDS-P', request: 'RIDR-', assessment: 'RIDA-',
      quotation: 'RIDQ-', work_order: 'RIDW-', invoice: 'RIDI-',
    },
    // No provider onboarding, so no required provider docs / service categories.
    required_docs: { compliance: [], insurance: [] },
    service_categories: [],
    related_type: {
      customer: 'residential_interior_design_customer_agreement',
      // no provider agreement
    },
    agreement_template: {
      customer: 'Residential Interior Design Solutions Customer Service Agreement',
    },
    ui: {
      full_label: 'Residential Interior Design',
      // From the SOP + CSA Clause 3 / Schedule A.
      project_types: ['Interior Design & Planning', 'Renovation & Fit-Out', 'Furniture & Styling', 'Project Coordination', 'Full Home Design', 'Mixed Scope'],
      categories: ['Design & Planning', 'Renovation', 'Fit-Out', 'Furniture', 'Styling', 'Coordination'],
      property_types: ['Apartment', 'House', 'Duplex', 'Villa', 'Studio', 'Penthouse', 'Other'],
      // Consultation service picker (Schedule A groups → services).
      service_catalogue: {
        'Interior Design & Planning': ['Design Consultation', 'Concept Design', 'Space Planning', '2D Layout & Drawings', '3D Visualisation', 'Material & Finish Selection', 'Lighting Design', 'Colour Scheme & Mood Board'],
        'Renovation & Fit-Out': ['Full Home Renovation', 'Partial Renovation', 'False Ceiling', 'Flooring', 'Painting & Wall Finishes', 'Kitchen Fit-Out', 'Wardrobe & Storage', 'Bathroom Renovation', 'Electrical & Plumbing Coordination'],
        'Furniture & Styling': ['Custom Furniture', 'Furniture Supply & Placement', 'Soft Furnishings', 'Curtains & Blinds', 'Decor & Accessories', 'Home Styling'],
        'Project Coordination': ['Project Management', 'Site Supervision', 'Vendor Coordination', 'Procurement', 'Installation Management', 'Handover'],
      },
      // The shared project's generic equipment columns, relabelled for interiors.
      equipment: {
        section_label: 'Space Details',
        type_label: 'Property Type',
        type_options: ['Apartment', 'House', 'Duplex', 'Villa', 'Studio', 'Penthouse', 'Other'],
        count_label: 'Number of Rooms / Zones',
        capacity_label: 'Approximate Area',
        capacity_placeholder: 'e.g. 1,800 sq ft',
        source_label: 'Design Style',
        source_options: ['Modern', 'Contemporary', 'Minimalist', 'Classic', 'Scandinavian', 'Industrial', 'Traditional', 'Mixed', 'Client to advise'],
      },
      // The "assessment" here is the SOP Phase 1 — Consultation & Design
      // Assessment + Property Inspection Procedure (SOP §5, §7). It is a design
      // consultation + site measurement + feasibility review, NOT a tank check.
      // Grouped as the SOP structures it: Consultation & Requirement Analysis,
      // Site Inspection, Design Assessment, Preliminary Feasibility Review.
      assess_materials: ['Concrete', 'Brick', 'Wood', 'Gypsum Board', 'Tiles', 'Marble', 'Glass', 'Metal', 'Existing Finishes', 'Other'],
      assess_sources: ['Modern', 'Contemporary', 'Minimalist', 'Classic', 'Scandinavian', 'Industrial', 'Traditional', 'Luxury', 'Mixed', 'Client to advise'],
      assess_checks: [
        // Consultation & Requirement Analysis (SOP Step 2)
        { key: 'design_vision', label: 'Design vision & style preference captured', group: 'Consultation' },
        { key: 'renovation_scope', label: 'Renovation / design scope discussed', group: 'Consultation' },
        { key: 'furnishing_expectation', label: 'Furnishing & styling expectation captured', group: 'Consultation' },
        { key: 'budget_captured', label: 'Project budget captured', group: 'Consultation' },
        { key: 'timeline_expectation', label: 'Timeline expectation agreed', group: 'Consultation' },
        // Property Inspection Procedure (SOP §5)
        { key: 'site_inspection', label: 'Site inspection carried out', group: 'Site Inspection' },
        { key: 'measurements_taken', label: 'Room measurements recorded', group: 'Site Inspection' },
        { key: 'photography', label: 'Existing condition photographed', group: 'Site Inspection' },
        { key: 'electrical_plumbing', label: 'Electrical & plumbing points noted', group: 'Site Inspection' },
        // Design Assessment
        { key: 'design_assessment', label: 'Design assessment completed', group: 'Design Assessment' },
        { key: 'renovation_feasibility', label: 'Renovation feasibility reviewed', group: 'Design Assessment' },
        { key: 'structural_constraints', label: 'Structural constraints / no-touch areas identified', group: 'Design Assessment' },
        // Preliminary Feasibility Review (SOP Step 3)
        { key: 'practicality', label: 'Project practicality assessed', group: 'Feasibility Review' },
        { key: 'budget_alignment', label: 'Budget alignment reviewed', group: 'Feasibility Review' },
        { key: 'operational_complexity', label: 'Operational complexity & risk factors reviewed', group: 'Feasibility Review' },
      ],
      // Common residential scopes — extra items layered onto the standard checklist.
      assess_templates: [
        { key: 'standard', label: 'Standard (all scopes)', extra: [] },
        { key: 'full_home', label: 'Full Home Design', extra: [
          { key: 'room_by_room', label: 'Room-by-room requirements captured', group: 'Consultation' },
          { key: 'phasing', label: 'Phasing / staged execution discussed', group: 'Feasibility Review' },
        ] },
        { key: 'renovation', label: 'Renovation & Fit-Out', extra: [
          { key: 'demolition_scope', label: 'Demolition / removal scope noted', group: 'Site Inspection' },
          { key: 'services_reroute', label: 'Electrical / plumbing re-routing assessed', group: 'Design Assessment' },
          { key: 'building_permission', label: 'Building / society permissions needed?', group: 'Feasibility Review' },
        ] },
        { key: 'kitchen_bath', label: 'Kitchen / Bathroom', extra: [
          { key: 'wet_area_waterproofing', label: 'Wet-area waterproofing considered', group: 'Design Assessment' },
          { key: 'appliance_fit', label: 'Appliance / fixture dimensions captured', group: 'Site Inspection' },
        ] },
        { key: 'furniture_styling', label: 'Furniture & Styling only', extra: [
          { key: 'existing_furniture', label: 'Existing furniture to retain noted', group: 'Consultation' },
          { key: 'delivery_access', label: 'Delivery / lift access for furniture checked', group: 'Site Inspection' },
        ] },
      ],
      assess_equipment: ['Measuring Tape / Laser Meter', 'Camera', 'Moisture Meter', 'Material & Finish Samples', 'Laptop / CAD', 'Mood Board / Reference Deck'],
      recommended_services: ['Design Consultation', 'Space Planning', '3D Visualisation', 'Full Home Renovation', 'Kitchen Fit-Out', 'Custom Furniture', 'Home Styling', 'Project Management'],
      report_types: ['Site Visit', 'Design Concept', 'Progress', 'Handover', 'Completion Sign-Off'],
      // Project-costing categories for supplier bills + the cost sheet.
      cost_categories: ['Materials', 'Furniture', 'Joinery / Carpentry', 'Painting', 'Electrical', 'Plumbing', 'Flooring', 'False Ceiling', 'Labour', 'Subcontractor', 'Transport', 'Permits / Govt', 'Design / Consultant', 'Misc'],
      supplier_categories: ['Material Supplier', 'Furniture Supplier', 'Carpenter / Joiner', 'Painter', 'Electrician', 'Plumber', 'Flooring Contractor', 'False Ceiling Contractor', 'Labour Contractor', 'Subcontractor', 'Transport', 'Other'],
      // From CSA Schedule D (Warranty Summary).
      warranty_types: ['Workmanship', 'Fit-Out & Renovation', 'Custom Furniture', 'Supplied Materials', 'Installation', 'General Workmanship'],
      warranty_months: { Workmanship: 12, 'Fit-Out & Renovation': 12, 'Custom Furniture': 12, 'Supplied Materials': 6, Installation: 6, 'General Workmanship': 6 },
      complaint_types: ['Design Quality', 'Workmanship', 'Incomplete Work', 'Damage During Work', 'Material Quality', 'Staff Conduct', 'Delays', 'Billing Dispute', 'Other'],
      incident_types: ['Injury', 'Property Damage', 'Fire', 'Electrical Incident', 'Water Damage', 'Other'],
    },
  },

  /* ── Fitness Room Interior Design (Interior Design Solutions #2) ─────────────
   * Sibling of Residential Interior Design under the Interior Design parent. The
   * operational SOP is identical (Consultation & Assessment → Design Development →
   * Execution & Coordination → Completion & Handover), so it reuses the same
   * project stages, assessment engine, variations and costing; only the CSA and
   * the fitness vocabulary differ. Seventh Sky delivers in-house — no third-party
   * provider, no AMC — so a signed CSA auto-opens the project and proceeds
   * internally, exactly like Residential Interior Design (SSPC-FRIDS-CSA-01 v0.2). */
  fitness_room_interior_design: {
    key: 'fitness_room_interior_design',
    label: 'Fitness Room Interior Design',
    short: 'FRIDS',
    accent: '#dc2626',              // red — energetic, tells it apart from RIDS purple
    api_base: 'wt',                 // shared /api/wt-* mount, scoped by the header
    route_base: 'fitness-room-interior-design',
    env_tag: 'FRIDS',               // ENV-FRIDSCSA-…
    catalogue_vertical: 'fitness_room_interior_design_csa',
    parent: { key: 'interior_design', label: 'Interior Design Solutions' },
    // Behaviour flags — no provider side, no AMC; interior-specific modules on.
    no_provider: true,
    no_amc: true,
    variations: true,
    completion_signoff: true,
    // Seventh Sky delivers/coordinates the project itself — reuse the internal-team
    // work-order flow (allocate instead of assign), same as Residential Interior.
    delivery_model: 'internal_team',
    code_prefix: {
      client: 'FRIDS-C', project: 'FRIDS-P', request: 'FRIDR-', assessment: 'FRIDA-',
      quotation: 'FRIDQ-', work_order: 'FRIDW-', invoice: 'FRIDI-',
    },
    required_docs: { compliance: [], insurance: [] },
    service_categories: [],
    related_type: {
      customer: 'fitness_room_interior_design_customer_agreement',
    },
    agreement_template: {
      customer: 'Fitness Room Interior Design Solutions Customer Service Agreement',
    },
    ui: {
      full_label: 'Fitness Room Interior Design',
      // From the SOP + CSA Clause 3 / Schedule A.
      project_types: ['Fitness Room Design & Planning', 'Fit-Out & Installation', 'Furniture, Equipment & Styling', 'Project Coordination', 'Full Facility Design', 'Mixed Scope'],
      categories: ['Design & Planning', 'Fit-Out', 'Installation', 'Equipment', 'Styling', 'Coordination'],
      property_types: ['Home Gym', 'Apartment Gym', 'Commercial Gym', 'Corporate Fitness Centre', 'Wellness Studio', 'Rehabilitation Centre', 'Hotel Fitness Centre', 'Other'],
      // Consultation service picker (Schedule A groups → services).
      service_catalogue: {
        'Fitness Room Design & Planning': ['Home Gym Design', 'Commercial Gym Design', 'Corporate Fitness Centre Design', 'Wellness Studio Design', 'Rehabilitation Fitness Centre Design', 'Hotel Fitness Centre Design', 'Apartment Gym Design', 'Fitness Space Planning', 'Equipment Layout Planning', 'Functional Traffic Flow Planning', '2D Design Drawings', '3D Visualisation', 'Lighting Design'],
        'Fit-Out & Installation': ['Gym Fit-Out', 'Renovation & Remodelling', 'Carpentry & Joinery', 'Flooring Installation', 'Ceiling Installation', 'Glass & Mirror Installation', 'Painting & Decoration', 'Electrical & Lighting Coordination', 'HVAC Coordination', 'Acoustic Treatment'],
        'Furniture, Equipment & Styling': ['Fitness Equipment Procurement Coordination', 'Reception Area Design', 'Storage Solutions', 'Locker Area Design', 'Wellness & Recovery Area Design', 'Decorative Styling', 'Branding & Signage Coordination', 'Audio-Visual Equipment Coordination'],
        'Project Coordination': ['Site Assessment', 'Project Planning', 'Contractor Coordination', 'Supplier Coordination', 'Material Coordination', 'Installation Supervision', 'Progress Monitoring', 'Quality Coordination', 'Practical Completion & Handover'],
      },
      // The shared project's generic equipment columns, relabelled for fitness rooms.
      equipment: {
        section_label: 'Fitness Space Details',
        type_label: 'Fitness Facility Type',
        type_options: ['Home Gym', 'Apartment Gym', 'Commercial Gym', 'Corporate Fitness Centre', 'Wellness Studio', 'Rehabilitation Centre', 'Hotel Fitness Centre', 'Other'],
        count_label: 'Number of Zones / Areas',
        capacity_label: 'Approximate Area',
        capacity_placeholder: 'e.g. 1,200 sq ft',
        source_label: 'Design Style',
        source_options: ['Modern', 'Industrial', 'Minimalist', 'Premium / Luxury', 'Functional', 'Boutique Studio', 'Mixed', 'Client to advise'],
      },
      // SOP Phase 1 — Consultation & Fitness Room Design Assessment (SOP §5, §7):
      // consultation + fitness room site inspection + operational assessment +
      // renovation feasibility review. Grouped as the SOP structures it.
      assess_materials: ['Concrete', 'Brick', 'Rubber Flooring', 'Vinyl / PVC', 'Gypsum Board', 'Tiles', 'Glass', 'Mirror', 'Metal', 'Acoustic Panels', 'Existing Finishes', 'Other'],
      assess_sources: ['Modern', 'Industrial', 'Minimalist', 'Premium / Luxury', 'Functional', 'Boutique Studio', 'Mixed', 'Client to advise'],
      assess_checks: [
        // Consultation & Requirement Analysis (SOP Step 2)
        { key: 'facility_type', label: 'Fitness facility type & usage captured', group: 'Consultation' },
        { key: 'equipment_requirements', label: 'Equipment requirements captured', group: 'Consultation' },
        { key: 'renovation_scope', label: 'Renovation / fit-out scope discussed', group: 'Consultation' },
        { key: 'budget_captured', label: 'Project budget captured', group: 'Consultation' },
        { key: 'timeline_expectation', label: 'Timeline expectation agreed', group: 'Consultation' },
        // Fitness Room Property Assessment (SOP §5)
        { key: 'site_inspection', label: 'Fitness room site inspection carried out', group: 'Site Inspection' },
        { key: 'measurements_taken', label: 'Measurements & ceiling height recorded', group: 'Site Inspection' },
        { key: 'photography', label: 'Existing condition photographed', group: 'Site Inspection' },
        { key: 'floor_load', label: 'Floor load capacity for equipment noted', group: 'Site Inspection' },
        { key: 'power_ventilation', label: 'Power, HVAC & ventilation points noted', group: 'Site Inspection' },
        // Operational / Design Assessment
        { key: 'equipment_layout', label: 'Equipment layout & traffic flow assessed', group: 'Design Assessment' },
        { key: 'renovation_feasibility', label: 'Renovation feasibility reviewed', group: 'Design Assessment' },
        { key: 'structural_constraints', label: 'Structural constraints / no-touch areas identified', group: 'Design Assessment' },
        // Preliminary Feasibility Review (SOP Step 3)
        { key: 'practicality', label: 'Project practicality assessed', group: 'Feasibility Review' },
        { key: 'budget_alignment', label: 'Budget alignment reviewed', group: 'Feasibility Review' },
        { key: 'operational_complexity', label: 'Operational complexity & risk factors reviewed', group: 'Feasibility Review' },
      ],
      assess_templates: [
        { key: 'standard', label: 'Standard (all scopes)', extra: [] },
        { key: 'home_gym', label: 'Home / Apartment Gym', extra: [
          { key: 'noise_neighbours', label: 'Noise / neighbour impact considered', group: 'Design Assessment' },
          { key: 'delivery_access', label: 'Delivery / lift access for equipment checked', group: 'Site Inspection' },
        ] },
        { key: 'commercial_gym', label: 'Commercial / Corporate Gym', extra: [
          { key: 'occupancy_capacity', label: 'Occupancy / member capacity captured', group: 'Consultation' },
          { key: 'reception_locker', label: 'Reception, locker & wellness areas scoped', group: 'Design Assessment' },
          { key: 'permits', label: 'Building / fire / society permissions needed?', group: 'Feasibility Review' },
        ] },
        { key: 'wellness_studio', label: 'Wellness / Studio', extra: [
          { key: 'acoustic_treatment', label: 'Acoustic treatment requirements noted', group: 'Design Assessment' },
          { key: 'flooring_spec', label: 'Specialist flooring (yoga / studio) considered', group: 'Design Assessment' },
        ] },
      ],
      assess_equipment: ['Measuring Tape / Laser Meter', 'Camera', 'Ceiling Height Gauge', 'Material & Finish Samples', 'Laptop / CAD', 'Equipment Spec Sheets'],
      recommended_services: ['Site Assessment', 'Equipment Layout Planning', '3D Visualisation', 'Gym Fit-Out', 'Flooring Installation', 'Fitness Equipment Procurement Coordination', 'Acoustic Treatment', 'Practical Completion & Handover'],
      report_types: ['Site Visit', 'Design Concept', 'Progress', 'Handover', 'Completion Sign-Off'],
      // Project-costing categories for supplier bills + the cost sheet.
      cost_categories: ['Fitness Equipment', 'Materials', 'Gym Flooring', 'Mirrors & Glass', 'Joinery / Carpentry', 'Painting', 'Electrical & Lighting', 'HVAC', 'Acoustic Treatment', 'Labour', 'Subcontractor', 'Transport & Installation', 'Permits / Govt', 'Design / Consultant', 'Misc'],
      supplier_categories: ['Fitness Equipment Supplier', 'Material Supplier', 'Flooring Contractor', 'Glass & Mirror Contractor', 'Carpenter / Joiner', 'Painter', 'Electrician', 'HVAC Contractor', 'Acoustic Contractor', 'Labour Contractor', 'Subcontractor', 'Transport', 'Other'],
      // From CSA Schedule D (Warranty Summary).
      warranty_types: ['Design Services', 'Workmanship', 'Installation', 'Equipment Installation', 'Furniture Installation', 'Manufacturer'],
      warranty_months: { 'Design Services': 12, Workmanship: 12, Installation: 12, 'Equipment Installation': 12, 'Furniture Installation': 6, Manufacturer: 12 },
      complaint_types: ['Design Quality', 'Workmanship', 'Incomplete Work', 'Damage During Work', 'Equipment Issue', 'Material Quality', 'Staff Conduct', 'Delays', 'Billing Dispute', 'Other'],
      incident_types: ['Injury', 'Property Damage', 'Fire', 'Electrical Incident', 'Water Damage', 'Equipment Failure', 'Other'],
    },
  },

  /* ── Commercial Interior Design (Interior Design Solutions #3) ───────────────
   * Sibling of Residential / Fitness Room under the Interior Design parent — the
   * SOP workflow is identical, so it reuses the same project stages, assessment,
   * variations and costing; only the CSA and commercial vocabulary differ
   * (office / retail / restaurant / showroom / hospitality fit-out). In-house
   * delivery, no third-party provider, no AMC (SSPC-CIDS-CSA-01 v0.2). */
  commercial_interior_design: {
    key: 'commercial_interior_design',
    label: 'Commercial Interior Design',
    short: 'CIDS',
    accent: '#1d4ed8',              // strong blue — corporate, distinct from RIDS purple / FRIDS red
    api_base: 'wt',
    route_base: 'commercial-interior-design',
    env_tag: 'CIDS',                // ENV-CIDSCSA-…
    catalogue_vertical: 'commercial_interior_design_csa',
    parent: { key: 'interior_design', label: 'Interior Design Solutions' },
    no_provider: true,
    no_amc: true,
    variations: true,
    completion_signoff: true,
    delivery_model: 'internal_team',
    code_prefix: {
      client: 'CIDS-C', project: 'CIDS-P', request: 'CIDR-', assessment: 'CIDA-',
      quotation: 'CIDQ-', work_order: 'CIDW-', invoice: 'CIDI-',
    },
    required_docs: { compliance: [], insurance: [] },
    service_categories: [],
    related_type: {
      customer: 'commercial_interior_design_customer_agreement',
    },
    agreement_template: {
      customer: 'Commercial Interior Design Solutions Customer Service Agreement',
    },
    ui: {
      full_label: 'Commercial Interior Design',
      // From the SOP + CSA Clause 3 / Schedule A.
      project_types: ['Commercial Interior Design', 'Fit-Out & Renovation', 'Furniture & Styling', 'Project Coordination', 'Full Fit-Out', 'Mixed Scope'],
      categories: ['Design & Planning', 'Fit-Out', 'Renovation', 'Furniture', 'Styling', 'Coordination'],
      property_types: ['Office', 'Retail Shop', 'Restaurant / Café', 'Showroom', 'Hotel / Hospitality', 'Clinic / Medical', 'Warehouse', 'Mixed-Use', 'Other'],
      service_catalogue: {
        'Commercial Interior Design': ['Office Interior Design', 'Retail Interior Design', 'Restaurant & Café Design', 'Showroom Design', 'Hotel & Hospitality Design', 'Commercial Space Planning', 'Workspace Optimisation', 'Reception & Waiting Area Design', 'Corporate Branding Integration', 'Lighting Design', 'Ceiling & Flooring Design', 'Smart Office Solutions'],
        'Fit-Out & Renovation': ['Office Fit-Out', 'Retail Fit-Out', 'Restaurant Fit-Out', 'Commercial Renovation', 'Partition & Glass Installation', 'Carpentry & Joinery', 'Painting & Decoration', 'Flooring Installation', 'Ceiling Installation', 'Electrical & Lighting Coordination', 'HVAC Coordination'],
        'Furniture & Styling': ['Furniture Selection', 'Furniture Procurement Coordination', 'Custom Furniture', 'Workstations', 'Reception Furniture', 'Decorative Accessories', 'Window Furnishings', 'Signage Coordination'],
        'Project Coordination': ['Site Assessment', 'Project Planning', 'Contractor Coordination', 'Material Coordination', 'Supplier Coordination', 'Progress Monitoring', 'Quality Coordination', 'Practical Completion & Handover'],
      },
      equipment: {
        section_label: 'Commercial Space Details',
        type_label: 'Business Type',
        type_options: ['Office', 'Retail Shop', 'Restaurant / Café', 'Showroom', 'Hotel / Hospitality', 'Clinic / Medical', 'Warehouse', 'Mixed-Use', 'Other'],
        count_label: 'Number of Floors / Zones',
        capacity_label: 'Approximate Area',
        capacity_placeholder: 'e.g. 5,000 sq ft',
        source_label: 'Design Style',
        source_options: ['Modern', 'Corporate', 'Minimalist', 'Premium / Luxury', 'Industrial', 'Boutique', 'Brand-aligned', 'Mixed', 'Client to advise'],
      },
      // SOP Phase 1 — Consultation & Commercial Design Assessment + site survey.
      assess_materials: ['Concrete', 'Brick', 'Gypsum Board', 'Glass', 'Aluminium', 'Tiles', 'Vinyl / Carpet', 'Wood', 'Metal', 'Acoustic Panels', 'Existing Finishes', 'Other'],
      assess_sources: ['Modern', 'Corporate', 'Minimalist', 'Premium / Luxury', 'Industrial', 'Boutique', 'Brand-aligned', 'Mixed', 'Client to advise'],
      assess_checks: [
        // Consultation & Requirement Analysis (SOP Step 2)
        { key: 'business_type', label: 'Business type & operational needs captured', group: 'Consultation' },
        { key: 'brand_requirements', label: 'Brand / corporate identity requirements captured', group: 'Consultation' },
        { key: 'fitout_scope', label: 'Fit-out / renovation scope discussed', group: 'Consultation' },
        { key: 'budget_captured', label: 'Project budget captured', group: 'Consultation' },
        { key: 'timeline_expectation', label: 'Timeline / occupancy date agreed', group: 'Consultation' },
        // Commercial Site Assessment (SOP §5)
        { key: 'site_survey', label: 'Commercial site survey carried out', group: 'Site Survey' },
        { key: 'measurements_taken', label: 'Measurements & floor plan recorded', group: 'Site Survey' },
        { key: 'photography', label: 'Existing condition photographed', group: 'Site Survey' },
        { key: 'mep_points', label: 'MEP (electrical / HVAC / plumbing) points noted', group: 'Site Survey' },
        { key: 'occupancy_capacity', label: 'Occupancy / workstation capacity captured', group: 'Site Survey' },
        // Design / Feasibility Assessment
        { key: 'space_planning', label: 'Space planning & workflow assessed', group: 'Design Assessment' },
        { key: 'renovation_feasibility', label: 'Renovation feasibility reviewed', group: 'Design Assessment' },
        { key: 'building_permissions', label: 'Building / landlord / fire permissions identified', group: 'Design Assessment' },
        // Preliminary Feasibility Review (SOP Step 3)
        { key: 'practicality', label: 'Project practicality assessed', group: 'Feasibility Review' },
        { key: 'budget_alignment', label: 'Budget alignment reviewed', group: 'Feasibility Review' },
        { key: 'operational_complexity', label: 'Operational complexity & risk factors reviewed', group: 'Feasibility Review' },
      ],
      assess_templates: [
        { key: 'standard', label: 'Standard (all scopes)', extra: [] },
        { key: 'office', label: 'Office', extra: [
          { key: 'workstation_count', label: 'Workstation / seat count captured', group: 'Consultation' },
          { key: 'meeting_rooms', label: 'Meeting / collaboration spaces scoped', group: 'Design Assessment' },
        ] },
        { key: 'retail_showroom', label: 'Retail / Showroom', extra: [
          { key: 'display_layout', label: 'Display / merchandising layout scoped', group: 'Design Assessment' },
          { key: 'storefront', label: 'Storefront / signage requirements noted', group: 'Site Survey' },
        ] },
        { key: 'restaurant', label: 'Restaurant / Café', extra: [
          { key: 'kitchen_mep', label: 'Kitchen MEP & exhaust requirements noted', group: 'Site Survey' },
          { key: 'seating_capacity', label: 'Seating capacity & flow scoped', group: 'Design Assessment' },
          { key: 'food_permits', label: 'Food / fire safety permits needed?', group: 'Feasibility Review' },
        ] },
      ],
      assess_equipment: ['Measuring Tape / Laser Meter', 'Camera', 'Floor Plan / CAD', 'Material & Finish Samples', 'Laptop', 'Brand Guidelines'],
      recommended_services: ['Site Assessment', 'Commercial Space Planning', 'Office Fit-Out', 'Retail Fit-Out', 'Electrical & Lighting Coordination', 'HVAC Coordination', 'Furniture Procurement Coordination', 'Practical Completion & Handover'],
      report_types: ['Site Visit', 'Design Concept', 'Progress', 'Handover', 'Completion Sign-Off'],
      cost_categories: ['Materials', 'Furniture & Workstations', 'Partitions & Glass', 'Joinery / Carpentry', 'Painting', 'Electrical & Lighting', 'HVAC', 'Flooring', 'False Ceiling', 'Signage & Branding', 'Labour', 'Subcontractor', 'Transport & Installation', 'Permits / Govt', 'Design / Consultant', 'Misc'],
      supplier_categories: ['Material Supplier', 'Furniture Supplier', 'Partition / Glass Contractor', 'Carpenter / Joiner', 'Painter', 'Electrician', 'HVAC Contractor', 'Flooring Contractor', 'False Ceiling Contractor', 'Signage Supplier', 'Labour Contractor', 'Subcontractor', 'Transport', 'Other'],
      warranty_types: ['Design Services', 'Workmanship', 'Installation', 'Furniture', 'Manufacturer'],
      warranty_months: { 'Design Services': 12, Workmanship: 12, Installation: 12, Furniture: 6, Manufacturer: 12 },
      complaint_types: ['Design Quality', 'Workmanship', 'Incomplete Work', 'Damage During Work', 'Material Quality', 'Staff Conduct', 'Delays', 'Billing Dispute', 'Other'],
      incident_types: ['Injury', 'Property Damage', 'Fire', 'Electrical Incident', 'Water Damage', 'Other'],
    },
  },

  /* ── Custom Design & Fit-Out Solutions (Interior Design Solutions #4) ────────
   * Sibling under the Interior Design parent — identical SOP workflow, so it
   * reuses the same project stages, assessment, variations and costing. The CSA
   * and vocabulary cover bespoke design + fit-out across residential, office,
   * retail and hospitality. In-house delivery, no provider, no AMC
   * (SSPC-CDFS-CSA-01 v0.2). */
  custom_design_fitout: {
    key: 'custom_design_fitout',
    label: 'Custom Design & Fit-Out',
    short: 'CDFS',
    accent: '#0f766e',              // teal-green — distinct from the other interior lines
    api_base: 'wt',
    route_base: 'custom-design-fit-out',
    env_tag: 'CDFS',                // ENV-CDFSCSA-…
    catalogue_vertical: 'custom_design_fitout_csa',
    parent: { key: 'interior_design', label: 'Interior Design Solutions' },
    no_provider: true,
    no_amc: true,
    variations: true,
    completion_signoff: true,
    delivery_model: 'internal_team',
    code_prefix: {
      client: 'CDFS-C', project: 'CDFS-P', request: 'CDFR-', assessment: 'CDFA-',
      quotation: 'CDFQ-', work_order: 'CDFW-', invoice: 'CDFI-',
    },
    required_docs: { compliance: [], insurance: [] },
    service_categories: [],
    related_type: {
      customer: 'custom_design_fitout_customer_agreement',
    },
    agreement_template: {
      customer: 'Custom Design & Fit-Out Solutions Customer Service Agreement',
    },
    ui: {
      full_label: 'Custom Design & Fit-Out',
      // From the SOP + CSA Clause 3 / Schedule A.
      project_types: ['Design & Planning', 'Fit-Out & Installation', 'Furniture & Styling', 'Project Coordination', 'Full Fit-Out', 'Mixed Scope'],
      categories: ['Design & Planning', 'Fit-Out', 'Installation', 'Furniture', 'Styling', 'Coordination'],
      property_types: ['Residential', 'Office', 'Retail Shop', 'Restaurant / Café', 'Showroom', 'Hospitality', 'Mixed-Use', 'Other'],
      service_catalogue: {
        'Design & Planning Services': ['Concept Design', 'Space Planning', 'Interior Layout Design', 'Furniture Layout Planning', 'Office Design', 'Retail Design', 'Residential Design', 'Hospitality Design', 'Colour & Material Selection', '2D Design Drawings', '3D Visualisation'],
        'Fit-Out & Installation': ['Office Fit-Out', 'Retail Fit-Out', 'Residential Fit-Out', 'Commercial Fit-Out', 'Carpentry & Joinery', 'Ceiling Installation', 'Flooring Installation', 'Partition & Glass Installation', 'Painting & Decoration', 'Electrical & Lighting Coordination', 'HVAC Coordination'],
        'Furniture & Styling': ['Furniture Procurement', 'Custom Furniture', 'Decorative Styling', 'Window Furnishings', 'Signage Installation', 'Display & Feature Installations', 'Appliance Coordination'],
        'Project Coordination': ['Site Assessment', 'Project Planning', 'Contractor Coordination', 'Supplier Coordination', 'Material Coordination', 'Installation Supervision', 'Progress Monitoring', 'Quality Coordination', 'Practical Completion & Handover'],
      },
      equipment: {
        section_label: 'Project Space Details',
        type_label: 'Property Type',
        type_options: ['Residential', 'Office', 'Retail Shop', 'Restaurant / Café', 'Showroom', 'Hospitality', 'Mixed-Use', 'Other'],
        count_label: 'Number of Rooms / Zones',
        capacity_label: 'Approximate Area',
        capacity_placeholder: 'e.g. 2,500 sq ft',
        source_label: 'Design Style',
        source_options: ['Modern', 'Contemporary', 'Minimalist', 'Classic', 'Industrial', 'Bespoke', 'Brand-aligned', 'Mixed', 'Client to advise'],
      },
      // SOP Phase 1 — Consultation & Design Assessment + site survey.
      assess_materials: ['Concrete', 'Brick', 'Wood', 'Gypsum Board', 'Glass', 'Metal', 'Tiles', 'Marble', 'Laminate', 'Veneer', 'Existing Finishes', 'Other'],
      assess_sources: ['Modern', 'Contemporary', 'Minimalist', 'Classic', 'Industrial', 'Bespoke', 'Brand-aligned', 'Mixed', 'Client to advise'],
      assess_checks: [
        // Consultation & Requirement Analysis (SOP Step 2)
        { key: 'project_type', label: 'Project type & usage captured', group: 'Consultation' },
        { key: 'design_vision', label: 'Design vision & bespoke requirements captured', group: 'Consultation' },
        { key: 'fitout_scope', label: 'Fit-out / installation scope discussed', group: 'Consultation' },
        { key: 'budget_captured', label: 'Project budget captured', group: 'Consultation' },
        { key: 'timeline_expectation', label: 'Timeline expectation agreed', group: 'Consultation' },
        // Site Assessment (SOP §5)
        { key: 'site_survey', label: 'Site survey carried out', group: 'Site Survey' },
        { key: 'measurements_taken', label: 'Measurements & layout recorded', group: 'Site Survey' },
        { key: 'photography', label: 'Existing condition photographed', group: 'Site Survey' },
        { key: 'services_points', label: 'Electrical / plumbing / HVAC points noted', group: 'Site Survey' },
        // Design / Feasibility Assessment
        { key: 'custom_feasibility', label: 'Custom / bespoke element feasibility reviewed', group: 'Design Assessment' },
        { key: 'renovation_feasibility', label: 'Renovation / structural feasibility reviewed', group: 'Design Assessment' },
        { key: 'permissions', label: 'Building / landlord permissions identified', group: 'Design Assessment' },
        // Preliminary Feasibility Review (SOP Step 3)
        { key: 'practicality', label: 'Project practicality assessed', group: 'Feasibility Review' },
        { key: 'budget_alignment', label: 'Budget alignment reviewed', group: 'Feasibility Review' },
        { key: 'operational_complexity', label: 'Operational complexity & risk factors reviewed', group: 'Feasibility Review' },
      ],
      assess_templates: [
        { key: 'standard', label: 'Standard (all scopes)', extra: [] },
        { key: 'residential', label: 'Residential', extra: [
          { key: 'room_by_room', label: 'Room-by-room requirements captured', group: 'Consultation' },
          { key: 'delivery_access', label: 'Delivery / lift access checked', group: 'Site Survey' },
        ] },
        { key: 'commercial', label: 'Office / Retail', extra: [
          { key: 'occupancy', label: 'Occupancy / layout capacity captured', group: 'Consultation' },
          { key: 'brand_alignment', label: 'Brand / identity alignment scoped', group: 'Design Assessment' },
        ] },
        { key: 'custom_furniture', label: 'Custom Furniture / Joinery', extra: [
          { key: 'bespoke_drawings', label: 'Bespoke drawings / specifications captured', group: 'Design Assessment' },
          { key: 'material_selection', label: 'Material / finish selection confirmed', group: 'Consultation' },
        ] },
      ],
      assess_equipment: ['Measuring Tape / Laser Meter', 'Camera', 'Floor Plan / CAD', 'Material & Finish Samples', 'Laptop', 'Reference Deck'],
      recommended_services: ['Site Assessment', 'Space Planning', '3D Visualisation', 'Office Fit-Out', 'Residential Fit-Out', 'Custom Furniture', 'Practical Completion & Handover'],
      report_types: ['Site Visit', 'Design Concept', 'Progress', 'Handover', 'Completion Sign-Off'],
      cost_categories: ['Materials', 'Custom Furniture', 'Joinery / Carpentry', 'Partitions & Glass', 'Painting', 'Electrical & Lighting', 'HVAC', 'Flooring', 'False Ceiling', 'Signage', 'Labour', 'Subcontractor', 'Transport & Installation', 'Permits / Govt', 'Design / Consultant', 'Misc'],
      supplier_categories: ['Material Supplier', 'Furniture Supplier', 'Carpenter / Joiner', 'Partition / Glass Contractor', 'Painter', 'Electrician', 'HVAC Contractor', 'Flooring Contractor', 'False Ceiling Contractor', 'Signage Supplier', 'Labour Contractor', 'Subcontractor', 'Transport', 'Other'],
      warranty_types: ['Design Services', 'Workmanship', 'Installation', 'Custom Furniture', 'Manufacturer'],
      warranty_months: { 'Design Services': 12, Workmanship: 12, Installation: 12, 'Custom Furniture': 12, Manufacturer: 12 },
      complaint_types: ['Design Quality', 'Workmanship', 'Incomplete Work', 'Damage During Work', 'Material Quality', 'Staff Conduct', 'Delays', 'Billing Dispute', 'Other'],
      incident_types: ['Injury', 'Property Damage', 'Fire', 'Electrical Incident', 'Water Damage', 'Other'],
    },
  },

  /* ── Furniture & Styling Consultation (Interior Design Solutions #5) ─────────
   * Sibling under the Interior Design parent — identical SOP workflow (4 phases:
   * Consultation & Styling Assessment → Furniture & Styling Planning →
   * Implementation → Completion & Handover), so it reuses the same project
   * stages, assessment, variations and costing. The CSA and vocabulary cover
   * furniture consultation, interior styling and procurement coordination.
   * In-house delivery, no provider, no AMC (SSPC-FSCS-CSA-01 v0.2). */
  furniture_styling_consultation: {
    key: 'furniture_styling_consultation',
    label: 'Furniture & Styling Consultation',
    short: 'FSCS',
    accent: '#c026d3',              // fuchsia/magenta — distinct from the other interior lines
    api_base: 'wt',
    route_base: 'furniture-styling-consultation',
    env_tag: 'FSCS',                // ENV-FSCSCSA-…
    catalogue_vertical: 'furniture_styling_consultation_csa',
    parent: { key: 'interior_design', label: 'Interior Design Solutions' },
    no_provider: true,
    no_amc: true,
    variations: true,
    completion_signoff: true,
    delivery_model: 'internal_team',
    code_prefix: {
      client: 'FSCS-C', project: 'FSCS-P', request: 'FSCR-', assessment: 'FSCA-',
      quotation: 'FSCQ-', work_order: 'FSCW-', invoice: 'FSCI-',
    },
    required_docs: { compliance: [], insurance: [] },
    service_categories: [],
    related_type: {
      customer: 'furniture_styling_consultation_customer_agreement',
    },
    agreement_template: {
      customer: 'Furniture & Styling Consultation Customer Service Agreement',
    },
    ui: {
      full_label: 'Furniture & Styling Consultation',
      // From the SOP + CSA Clause 3 / Schedule A.
      project_types: ['Furniture Consultation', 'Interior Styling', 'Furniture Procurement & Coordination', 'Project Coordination', 'Full Styling', 'Mixed Scope'],
      categories: ['Consultation', 'Styling', 'Procurement', 'Coordination'],
      property_types: ['Apartment', 'House', 'Villa', 'Office', 'Retail Shop', 'Showroom', 'Hospitality', 'Other'],
      service_catalogue: {
        'Furniture Consultation': ['Residential Furniture Consultation', 'Commercial Furniture Consultation', 'Office Furniture Planning', 'Workspace Furniture Consultation', 'Furniture Layout Planning', 'Space Optimisation', 'Furniture Selection Advice', 'Custom Furniture Consultation'],
        'Interior Styling': ['Residential Styling', 'Commercial Styling', 'Office Styling', 'Decorative Styling', 'Colour Consultation', 'Soft Furnishing Selection', 'Window Furnishing Consultation', 'Artwork & Decorative Item Selection', 'Display & Feature Styling'],
        'Furniture Procurement & Coordination': ['Furniture Sourcing Coordination', 'Supplier Coordination', 'Custom Furniture Coordination', 'Furniture Procurement', 'Decorative Item Procurement', 'Furniture Delivery Coordination', 'Installation Coordination', 'Styling Setup Coordination', 'Final Presentation Coordination'],
        'Project Coordination': ['Site Assessment', 'Budget Planning', 'Project Planning', 'Contractor Coordination', 'Supplier Coordination', 'Installation Supervision', 'Progress Monitoring', 'Quality Coordination', 'Practical Completion & Handover'],
      },
      equipment: {
        section_label: 'Space & Styling Details',
        type_label: 'Property Type',
        type_options: ['Apartment', 'House', 'Villa', 'Office', 'Retail Shop', 'Showroom', 'Hospitality', 'Other'],
        count_label: 'Number of Rooms / Zones',
        capacity_label: 'Approximate Area',
        capacity_placeholder: 'e.g. 1,500 sq ft',
        source_label: 'Styling Theme',
        source_options: ['Modern', 'Contemporary', 'Minimalist', 'Classic', 'Scandinavian', 'Bohemian', 'Luxury', 'Mixed', 'Client to advise'],
      },
      // SOP Phase 1 — Consultation & Styling Assessment + site inspection.
      assess_materials: ['Wood', 'Upholstery / Fabric', 'Leather', 'Metal', 'Glass', 'Rattan / Cane', 'Laminate', 'Veneer', 'Existing Furniture', 'Other'],
      assess_sources: ['Modern', 'Contemporary', 'Minimalist', 'Classic', 'Scandinavian', 'Bohemian', 'Luxury', 'Mixed', 'Client to advise'],
      assess_checks: [
        // Consultation & Requirement Analysis (SOP Step 2)
        { key: 'styling_vision', label: 'Styling vision & theme captured', group: 'Consultation' },
        { key: 'furniture_requirements', label: 'Furniture requirements captured', group: 'Consultation' },
        { key: 'colour_scheme', label: 'Colour scheme & mood preference captured', group: 'Consultation' },
        { key: 'budget_captured', label: 'Furnishing budget captured', group: 'Consultation' },
        { key: 'timeline_expectation', label: 'Timeline expectation agreed', group: 'Consultation' },
        // Site Inspection & Styling Assessment (SOP §5)
        { key: 'site_inspection', label: 'Site inspection carried out', group: 'Site Inspection' },
        { key: 'measurements_taken', label: 'Room & furniture measurements recorded', group: 'Site Inspection' },
        { key: 'photography', label: 'Existing space & furniture photographed', group: 'Site Inspection' },
        { key: 'existing_furniture', label: 'Existing furniture to retain / reuse noted', group: 'Site Inspection' },
        { key: 'delivery_access', label: 'Delivery / lift access for furniture checked', group: 'Site Inspection' },
        // Styling Assessment
        { key: 'layout_assessment', label: 'Furniture layout & flow assessed', group: 'Styling Assessment' },
        { key: 'lighting_natural', label: 'Natural light & focal points assessed', group: 'Styling Assessment' },
        { key: 'styling_scope', label: 'Styling / decor scope defined', group: 'Styling Assessment' },
        // Preliminary Feasibility Review (SOP Step 3)
        { key: 'practicality', label: 'Project practicality assessed', group: 'Feasibility Review' },
        { key: 'budget_alignment', label: 'Budget alignment reviewed', group: 'Feasibility Review' },
      ],
      assess_templates: [
        { key: 'standard', label: 'Standard (all scopes)', extra: [] },
        { key: 'full_home_styling', label: 'Full Home Styling', extra: [
          { key: 'room_by_room', label: 'Room-by-room styling requirements captured', group: 'Consultation' },
          { key: 'phasing', label: 'Phased styling / procurement discussed', group: 'Feasibility Review' },
        ] },
        { key: 'procurement', label: 'Furniture Procurement', extra: [
          { key: 'supplier_shortlist', label: 'Supplier / product shortlist prepared', group: 'Styling Assessment' },
          { key: 'lead_times', label: 'Furniture lead times noted', group: 'Feasibility Review' },
        ] },
        { key: 'commercial_styling', label: 'Commercial / Office Styling', extra: [
          { key: 'brand_alignment', label: 'Brand / identity alignment scoped', group: 'Styling Assessment' },
          { key: 'workstation_needs', label: 'Workstation / functional needs captured', group: 'Consultation' },
        ] },
      ],
      assess_equipment: ['Measuring Tape / Laser Meter', 'Camera', 'Material & Fabric Samples', 'Colour Swatches', 'Laptop / Mood Board', 'Furniture Catalogues'],
      recommended_services: ['Furniture Consultation', 'Furniture Layout Planning', 'Colour Consultation', 'Soft Furnishing Selection', 'Furniture Procurement', 'Styling Setup Coordination', 'Final Presentation Coordination'],
      report_types: ['Site Visit', 'Styling Concept', 'Progress', 'Handover', 'Completion Sign-Off'],
      cost_categories: ['Furniture', 'Custom Furniture', 'Soft Furnishings', 'Decorative Items', 'Artwork', 'Curtains & Blinds', 'Rugs & Textiles', 'Lighting Fixtures', 'Styling Props', 'Labour', 'Subcontractor', 'Transport & Delivery', 'Installation', 'Design / Consultant', 'Misc'],
      supplier_categories: ['Furniture Supplier', 'Custom Furniture Maker', 'Soft Furnishing Supplier', 'Decor / Accessories Supplier', 'Curtain / Blind Supplier', 'Artwork Supplier', 'Lighting Supplier', 'Installation / Assembly Contractor', 'Labour Contractor', 'Transport', 'Other'],
      warranty_types: ['Consultation Services', 'Styling Services', 'Furniture Installation', 'Custom Furniture', 'Manufacturer'],
      warranty_months: { 'Consultation Services': 6, 'Styling Services': 6, 'Furniture Installation': 12, 'Custom Furniture': 12, Manufacturer: 12 },
      complaint_types: ['Styling Quality', 'Furniture Quality', 'Incomplete Work', 'Damage During Work', 'Wrong Item Supplied', 'Delays', 'Billing Dispute', 'Staff Conduct', 'Other'],
      incident_types: ['Injury', 'Property Damage', 'Furniture Damage', 'Fire', 'Water Damage', 'Other'],
    },
  },

  /* ── Muslim Prayer Room Interior Design (Interior Design Solutions #6) ───────
   * Sibling under the Interior Design parent — identical 4-phase SOP workflow, so
   * it reuses the same project stages, assessment, variations and costing. The
   * CSA and vocabulary cover prayer room design, Qibla orientation, Wudu
   * facilities, prayer carpets and Islamic décor. In-house delivery, no provider,
   * no AMC (SSPC-MPRIDS-CSA-01 v0.2). */
  prayer_room_interior_design: {
    key: 'prayer_room_interior_design',
    label: 'Prayer Room Interior Design',
    short: 'MPRIDS',
    accent: '#047857',              // deep emerald green — distinct from the other interior lines
    api_base: 'wt',
    route_base: 'prayer-room-interior-design',
    env_tag: 'MPRIDS',             // ENV-MPRIDSCSA-…
    catalogue_vertical: 'prayer_room_interior_design_csa',
    parent: { key: 'interior_design', label: 'Interior Design Solutions' },
    no_provider: true,
    no_amc: true,
    variations: true,
    completion_signoff: true,
    delivery_model: 'internal_team',
    code_prefix: {
      client: 'MPRIDS-C', project: 'MPRIDS-P', request: 'MPRIDR-', assessment: 'MPRIDA-',
      quotation: 'MPRIDQ-', work_order: 'MPRIDW-', invoice: 'MPRIDI-',
    },
    required_docs: { compliance: [], insurance: [] },
    service_categories: [],
    related_type: {
      customer: 'prayer_room_interior_design_customer_agreement',
    },
    agreement_template: {
      customer: 'Muslim Prayer Room Interior Design Solutions Customer Service Agreement',
    },
    ui: {
      full_label: 'Muslim Prayer Room Interior Design',
      // From the SOP + CSA Clause 3 / Schedule A.
      project_types: ['Prayer Room Design & Planning', 'Interior Fit-Out & Renovation', 'Furniture, Décor & Equipment', 'Project Coordination', 'Full Prayer Room', 'Mixed Scope'],
      categories: ['Design & Planning', 'Fit-Out', 'Renovation', 'Furniture & Décor', 'Equipment', 'Coordination'],
      property_types: ['Home Prayer Room', 'Office Prayer Room', 'Mosque / Masjid', 'Commercial Prayer Space', 'School / Institution', 'Hospital', 'Mall / Public', 'Other'],
      service_catalogue: {
        'Prayer Room Design & Planning': ['Prayer Room Space Planning', 'Musallah Layout Design', 'Qibla Orientation Planning', 'Prayer Capacity Planning', 'Male & Female Prayer Area Planning', 'Imam Area Design', 'Wudu Area Planning', 'Accessibility Planning', 'Lighting Design', '2D Design Drawings', '3D Visualisation'],
        'Interior Fit-Out & Renovation': ['Prayer Room Fit-Out', 'Renovation & Refurbishment', 'Carpentry & Joinery', 'Flooring Installation', 'Prayer Carpet Coordination', 'Ceiling Installation', 'Painting & Decoration', 'Glass & Partition Installation', 'Electrical & Lighting', 'Plumbing Coordination for Wudu Facilities'],
        'Furniture, Décor & Equipment': ['Islamic Décor Consultation', 'Furniture Coordination', 'Shoe Rack Design & Installation', 'Shelving & Storage Solutions', "Qur'an Storage Solutions", 'Audio System Coordination', 'Digital Prayer Time Display Coordination', 'Window Furnishing Coordination', 'Signage & Wayfinding Coordination'],
        'Project Coordination': ['Site Assessment', 'Project Planning', 'Budget Planning', 'Contractor Coordination', 'Supplier Coordination', 'Material Coordination', 'Installation Supervision', 'Progress Monitoring', 'Quality Coordination', 'Practical Completion & Handover'],
      },
      equipment: {
        section_label: 'Prayer Room Details',
        type_label: 'Prayer Room Type',
        type_options: ['Home Prayer Room', 'Office Prayer Room', 'Mosque / Masjid', 'Commercial Prayer Space', 'School / Institution', 'Hospital', 'Mall / Public', 'Other'],
        count_label: 'Prayer Capacity (persons)',
        capacity_label: 'Approximate Area',
        capacity_placeholder: 'e.g. 800 sq ft',
        source_label: 'Design Style',
        source_options: ['Modern Islamic', 'Traditional', 'Minimalist', 'Contemporary', 'Ornate / Classical', 'Mixed', 'Client to advise'],
      },
      // SOP Phase 1 — Consultation & Prayer Room Design Assessment + site survey.
      assess_materials: ['Concrete', 'Brick', 'Wood', 'Gypsum Board', 'Prayer Carpet', 'Tiles', 'Marble', 'Glass', 'Metal', 'Existing Finishes', 'Other'],
      assess_sources: ['Modern Islamic', 'Traditional', 'Minimalist', 'Contemporary', 'Ornate / Classical', 'Mixed', 'Client to advise'],
      assess_checks: [
        // Consultation & Requirement Analysis (SOP Step 2)
        { key: 'prayer_room_type', label: 'Prayer room type & usage captured', group: 'Consultation' },
        { key: 'capacity_requirement', label: 'Prayer capacity requirement captured', group: 'Consultation' },
        { key: 'gender_areas', label: 'Male / female prayer area needs captured', group: 'Consultation' },
        { key: 'wudu_requirement', label: 'Wudu facility requirement captured', group: 'Consultation' },
        { key: 'budget_captured', label: 'Project budget captured', group: 'Consultation' },
        { key: 'timeline_expectation', label: 'Timeline expectation agreed', group: 'Consultation' },
        // Prayer Room Property Assessment (SOP §5)
        { key: 'site_survey', label: 'Site survey carried out', group: 'Site Survey' },
        { key: 'qibla_orientation', label: 'Qibla orientation confirmed on site', group: 'Site Survey' },
        { key: 'measurements_taken', label: 'Measurements & layout recorded', group: 'Site Survey' },
        { key: 'photography', label: 'Existing condition photographed', group: 'Site Survey' },
        { key: 'wudu_plumbing', label: 'Wudu / plumbing points assessed', group: 'Site Survey' },
        // Design / Feasibility Assessment
        { key: 'layout_feasibility', label: 'Musallah layout & capacity feasibility reviewed', group: 'Design Assessment' },
        { key: 'accessibility', label: 'Accessibility requirements assessed', group: 'Design Assessment' },
        { key: 'renovation_feasibility', label: 'Renovation feasibility reviewed', group: 'Design Assessment' },
        // Preliminary Feasibility Review (SOP Step 3)
        { key: 'practicality', label: 'Project practicality assessed', group: 'Feasibility Review' },
        { key: 'budget_alignment', label: 'Budget alignment reviewed', group: 'Feasibility Review' },
      ],
      assess_templates: [
        { key: 'standard', label: 'Standard (all scopes)', extra: [] },
        { key: 'home_office', label: 'Home / Office Prayer Room', extra: [
          { key: 'compact_layout', label: 'Compact layout / multi-use considered', group: 'Design Assessment' },
        ] },
        { key: 'mosque', label: 'Mosque / Institutional', extra: [
          { key: 'large_capacity', label: 'Large capacity & rows planning captured', group: 'Consultation' },
          { key: 'ablution_block', label: 'Ablution (Wudu) block scope defined', group: 'Design Assessment' },
          { key: 'permits', label: 'Building / community permissions needed?', group: 'Feasibility Review' },
        ] },
        { key: 'wudu_focus', label: 'Wudu Facility Focus', extra: [
          { key: 'water_supply', label: 'Water supply & drainage assessed', group: 'Site Survey' },
          { key: 'wet_area_waterproofing', label: 'Wet-area waterproofing considered', group: 'Design Assessment' },
        ] },
      ],
      assess_equipment: ['Measuring Tape / Laser Meter', 'Qibla Compass', 'Camera', 'Material & Carpet Samples', 'Laptop / CAD', 'Reference Deck'],
      recommended_services: ['Prayer Room Space Planning', 'Qibla Orientation Planning', 'Wudu Area Planning', 'Prayer Room Fit-Out', 'Prayer Carpet Coordination', "Qur'an Storage Solutions", 'Practical Completion & Handover'],
      report_types: ['Site Visit', 'Design Concept', 'Progress', 'Handover', 'Completion Sign-Off'],
      cost_categories: ['Materials', 'Prayer Carpet', 'Furniture & Storage', 'Joinery / Carpentry', 'Painting', 'Electrical & Lighting', 'Plumbing (Wudu)', 'Flooring', 'False Ceiling', 'Islamic Décor', 'Audio / Display Equipment', 'Signage', 'Labour', 'Subcontractor', 'Transport & Installation', 'Permits / Govt', 'Design / Consultant', 'Misc'],
      supplier_categories: ['Material Supplier', 'Prayer Carpet Supplier', 'Furniture Supplier', 'Carpenter / Joiner', 'Painter', 'Electrician', 'Plumber', 'Flooring Contractor', 'False Ceiling Contractor', 'Décor / Signage Supplier', 'Audio / Display Supplier', 'Labour Contractor', 'Subcontractor', 'Transport', 'Other'],
      warranty_types: ['Design Services', 'Fit-Out Workmanship', 'Furniture Installation', 'Prayer Carpet Installation', 'Wudu Facility Installation', 'Manufacturer'],
      warranty_months: { 'Design Services': 12, 'Fit-Out Workmanship': 12, 'Furniture Installation': 12, 'Prayer Carpet Installation': 6, 'Wudu Facility Installation': 12, Manufacturer: 12 },
      complaint_types: ['Design Quality', 'Workmanship', 'Incomplete Work', 'Damage During Work', 'Carpet Quality', 'Wudu / Plumbing Issue', 'Material Quality', 'Staff Conduct', 'Delays', 'Billing Dispute', 'Other'],
      incident_types: ['Injury', 'Property Damage', 'Fire', 'Electrical Incident', 'Water Damage', 'Other'],
    },
  },

  /* ── Space Planning & Renovation (Interior Design Solutions #7) ──────────────
   * Final sibling under the Interior Design parent — identical 4-phase SOP
   * workflow (Consultation & Space Planning Assessment → Design Development &
   * Space Planning → Renovation & Execution Coordination → Completion & Handover),
   * so it reuses the same project stages, assessment, variations and costing. The
   * CSA and vocabulary cover space planning, layout optimisation and renovation
   * fit-out. In-house delivery, no provider, no AMC (SSPC-SPRS-CSA-01 v0.2). */
  space_planning_renovation: {
    key: 'space_planning_renovation',
    label: 'Space Planning & Renovation',
    short: 'SPRS',
    accent: '#ea580c',              // amber-orange — distinct from the other interior lines
    api_base: 'wt',
    route_base: 'space-planning-renovation',
    env_tag: 'SPRS',               // ENV-SPRSCSA-…
    catalogue_vertical: 'space_planning_renovation_csa',
    parent: { key: 'interior_design', label: 'Interior Design Solutions' },
    no_provider: true,
    no_amc: true,
    variations: true,
    completion_signoff: true,
    delivery_model: 'internal_team',
    code_prefix: {
      client: 'SPRS-C', project: 'SPRS-P', request: 'SPRR-', assessment: 'SPRA-',
      quotation: 'SPRQ-', work_order: 'SPRW-', invoice: 'SPRI-',
    },
    required_docs: { compliance: [], insurance: [] },
    service_categories: [],
    related_type: {
      customer: 'space_planning_renovation_customer_agreement',
    },
    agreement_template: {
      customer: 'Space Planning & Renovation Interior Design Solutions Customer Service Agreement',
    },
    ui: {
      full_label: 'Space Planning & Renovation',
      // From the SOP + CSA Clause 3 / Schedule A.
      project_types: ['Space Planning & Design', 'Renovation & Fit-Out', 'Furniture & Interior Solutions', 'Project Coordination', 'Full Renovation', 'Mixed Scope'],
      categories: ['Space Planning', 'Renovation', 'Fit-Out', 'Furniture', 'Styling', 'Coordination'],
      property_types: ['Apartment', 'House', 'Villa', 'Office', 'Retail Shop', 'Showroom', 'Commercial', 'Other'],
      service_catalogue: {
        'Space Planning & Design': ['Space Planning Consultation', 'Site Assessment', 'Layout Planning', 'Space Optimisation', 'Functional Flow Planning', 'Furniture Layout Planning', 'Storage Planning', 'Workspace Planning', 'Residential Space Planning', 'Commercial Space Planning', 'Office Layout Planning', 'Retail Layout Planning', 'Lighting Layout Planning', '2D Design Drawings', '3D Visualisation'],
        'Renovation & Fit-Out': ['Interior Renovation', 'Office Renovation', 'Residential Renovation', 'Commercial Fit-Out', 'Carpentry & Joinery', 'Partition Installation', 'Ceiling Installation', 'Flooring Installation', 'Painting & Decoration', 'Glass & Aluminium Works', 'Electrical Coordination', 'Plumbing Coordination', 'Built-in Cabinetry'],
        'Furniture & Interior Solutions': ['Furniture Consultation', 'Furniture Procurement Coordination', 'Modular Furniture Coordination', 'Appliance Coordination', 'Decorative Item Coordination', 'Window Furnishing Coordination', 'Interior Styling'],
        'Project Coordination': ['Budget Planning', 'Project Planning', 'Contractor Coordination', 'Supplier Coordination', 'Material Coordination', 'Installation Supervision', 'Progress Monitoring', 'Quality Coordination', 'Practical Completion & Handover'],
      },
      equipment: {
        section_label: 'Space & Renovation Details',
        type_label: 'Property Type',
        type_options: ['Apartment', 'House', 'Villa', 'Office', 'Retail Shop', 'Showroom', 'Commercial', 'Other'],
        count_label: 'Number of Rooms / Zones',
        capacity_label: 'Approximate Area',
        capacity_placeholder: 'e.g. 2,000 sq ft',
        source_label: 'Design Style',
        source_options: ['Modern', 'Contemporary', 'Minimalist', 'Classic', 'Industrial', 'Scandinavian', 'Mixed', 'Client to advise'],
      },
      // SOP Phase 1 — Consultation & Space Planning Assessment + site survey.
      assess_materials: ['Concrete', 'Brick', 'Wood', 'Gypsum Board', 'Glass', 'Aluminium', 'Tiles', 'Marble', 'Laminate', 'Existing Finishes', 'Other'],
      assess_sources: ['Modern', 'Contemporary', 'Minimalist', 'Classic', 'Industrial', 'Scandinavian', 'Mixed', 'Client to advise'],
      assess_checks: [
        // Consultation & Requirement Analysis (SOP Step 2)
        { key: 'planning_objective', label: 'Space planning objective & usage captured', group: 'Consultation' },
        { key: 'renovation_scope', label: 'Renovation / fit-out scope discussed', group: 'Consultation' },
        { key: 'furniture_requirements', label: 'Furniture / storage requirements captured', group: 'Consultation' },
        { key: 'budget_captured', label: 'Project budget captured', group: 'Consultation' },
        { key: 'timeline_expectation', label: 'Timeline expectation agreed', group: 'Consultation' },
        // Space Planning Assessment (SOP §5)
        { key: 'site_survey', label: 'Site survey carried out', group: 'Site Survey' },
        { key: 'measurements_taken', label: 'Measurements & existing layout recorded', group: 'Site Survey' },
        { key: 'photography', label: 'Existing condition photographed', group: 'Site Survey' },
        { key: 'services_points', label: 'Electrical / plumbing / structural points noted', group: 'Site Survey' },
        // Design / Feasibility Assessment
        { key: 'layout_optimisation', label: 'Layout optimisation & flow assessed', group: 'Design Assessment' },
        { key: 'structural_constraints', label: 'Structural / load-bearing constraints identified', group: 'Design Assessment' },
        { key: 'renovation_feasibility', label: 'Renovation feasibility reviewed', group: 'Design Assessment' },
        // Preliminary Feasibility Review (SOP Step 3)
        { key: 'practicality', label: 'Project practicality assessed', group: 'Feasibility Review' },
        { key: 'budget_alignment', label: 'Budget alignment reviewed', group: 'Feasibility Review' },
        { key: 'permissions', label: 'Building / landlord permissions identified', group: 'Feasibility Review' },
      ],
      assess_templates: [
        { key: 'standard', label: 'Standard (all scopes)', extra: [] },
        { key: 'space_planning_only', label: 'Space Planning only', extra: [
          { key: 'zoning', label: 'Zoning / functional areas captured', group: 'Design Assessment' },
        ] },
        { key: 'renovation', label: 'Renovation & Fit-Out', extra: [
          { key: 'demolition_scope', label: 'Demolition / removal scope noted', group: 'Site Survey' },
          { key: 'services_reroute', label: 'Electrical / plumbing re-routing assessed', group: 'Design Assessment' },
          { key: 'building_permission', label: 'Building / society permissions needed?', group: 'Feasibility Review' },
        ] },
        { key: 'office_commercial', label: 'Office / Commercial', extra: [
          { key: 'workstation_count', label: 'Workstation / seat count captured', group: 'Consultation' },
          { key: 'phasing', label: 'Phased / after-hours work discussed', group: 'Feasibility Review' },
        ] },
      ],
      assess_equipment: ['Measuring Tape / Laser Meter', 'Camera', 'Floor Plan / CAD', 'Material & Finish Samples', 'Laptop', 'Reference Deck'],
      recommended_services: ['Space Planning Consultation', 'Layout Planning', 'Space Optimisation', 'Interior Renovation', 'Carpentry & Joinery', 'Built-in Cabinetry', 'Practical Completion & Handover'],
      report_types: ['Site Visit', 'Design Concept', 'Progress', 'Handover', 'Completion Sign-Off'],
      cost_categories: ['Materials', 'Furniture & Modular', 'Partitions & Glass', 'Joinery / Carpentry', 'Built-in Cabinetry', 'Painting', 'Electrical', 'Plumbing', 'Flooring', 'False Ceiling', 'Labour', 'Subcontractor', 'Transport & Installation', 'Permits / Govt', 'Design / Consultant', 'Misc'],
      supplier_categories: ['Material Supplier', 'Furniture Supplier', 'Carpenter / Joiner', 'Partition / Glass Contractor', 'Painter', 'Electrician', 'Plumber', 'Flooring Contractor', 'False Ceiling Contractor', 'Labour Contractor', 'Subcontractor', 'Transport', 'Other'],
      warranty_types: ['Space Planning Services', 'Renovation Workmanship', 'Carpentry & Joinery', 'Partition Installation', 'Flooring Installation', 'Ceiling Installation', 'Furniture Installation', 'Manufacturer'],
      warranty_months: { 'Space Planning Services': 12, 'Renovation Workmanship': 12, 'Carpentry & Joinery': 12, 'Partition Installation': 12, 'Flooring Installation': 12, 'Ceiling Installation': 12, 'Furniture Installation': 12, Manufacturer: 12 },
      complaint_types: ['Design Quality', 'Workmanship', 'Incomplete Work', 'Damage During Work', 'Material Quality', 'Staff Conduct', 'Delays', 'Billing Dispute', 'Other'],
      incident_types: ['Injury', 'Property Damage', 'Fire', 'Electrical Incident', 'Water Damage', 'Other'],
    },
  },
};

const DEFAULT_SERVICE_LINE = 'water_tank';

/** Every valid service_line key. */
const SERVICE_LINE_KEYS = Object.keys(SERVICE_LINES);

/** Resolve a service line by key, falling back to the default (Water Tank). */
function getServiceLine(key) {
  return SERVICE_LINES[key] || SERVICE_LINES[DEFAULT_SERVICE_LINE];
}

/** Map an envelope.related_type back to its service line (for signing completion). */
function serviceLineForRelatedType(relatedType) {
  return SERVICE_LINE_KEYS.find((k) => {
    const rt = SERVICE_LINES[k].related_type || {};
    return rt.customer === relatedType || rt.provider === relatedType;
  }) || null;
}

/**
 * True when a service line belongs to the Interior Design Solutions family
 * (parent.key === 'interior_design'). Interior sub-lines (Residential, Fitness
 * Room, and future Commercial / Prayer Room / etc.) share the same operations
 * engine, so features gated on "is this interior" should use this rather than
 * naming a single line — new sub-lines then work with no further edits.
 */
function isInteriorLine(key) {
  const sl = SERVICE_LINES[key];
  return !!(sl && sl.parent && sl.parent.key === 'interior_design');
}

/**
 * The record-code prefix for a service line and entity kind (client, project,
 * request, assessment, quotation, work_order, invoice, provider). So an Air
 * Conditioning client is coded ACCM-C…, not WTCM-C…. Falls back to the Water
 * Tank prefix if a service line does not declare one.
 */
function codePrefix(serviceLine, kind) {
  const cp = getServiceLine(serviceLine).code_prefix || {};
  return cp[kind] || getServiceLine(DEFAULT_SERVICE_LINE).code_prefix[kind];
}

module.exports = {
  SERVICE_LINES,
  SERVICE_LINE_KEYS,
  DEFAULT_SERVICE_LINE,
  getServiceLine,
  serviceLineForRelatedType,
  isInteriorLine,
  codePrefix,
};
