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
    catalogue_vertical: 'water_tank_csa',
    code_prefix: {
      client: 'WTCM-C', project: 'WTCM-P', request: 'SR-', assessment: 'SA-',
      quotation: 'Q-', work_order: 'WO-', invoice: 'INV-', provider: 'SP-',
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
      recommended_services: ['Servicing', 'Standard Cleaning', 'Deep Chemical Cleaning', 'Gas Refill', 'Leak Detection', 'Fault Diagnosis', 'Compressor Replacement', 'PCB Replacement', 'Smart Thermostat Installation', 'AMC Enrolment'],
      report_types: ['Site Assessment', 'Installation', 'Servicing', 'Cleaning', 'Repair', 'AMC'],
      warranty_types: ['Installation', 'Labour', 'Repairs', 'Compressor', 'Parts', 'Manufacturer', 'General Workmanship'],
      warranty_months: { Installation: 12, Labour: 3, Repairs: 6, Compressor: 12, Parts: 6, Manufacturer: 12, 'General Workmanship': 3 },
      complaint_types: ['Service Quality', 'Cooling / Performance Issue', 'Incomplete Work', 'Damage During Service', 'Staff Conduct', 'Late Attendance', 'Billing Dispute', 'Repeat Fault', 'Other'],
      incident_types: ['Injury', 'Property Damage', 'Fire', 'Refrigerant Leak', 'Electrical Incident', 'Regulatory Investigation', 'Other'],
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
  codePrefix,
};
