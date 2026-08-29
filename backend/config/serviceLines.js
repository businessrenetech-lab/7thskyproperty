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

module.exports = {
  SERVICE_LINES,
  SERVICE_LINE_KEYS,
  DEFAULT_SERVICE_LINE,
  getServiceLine,
  serviceLineForRelatedType,
};
