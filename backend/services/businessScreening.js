/**
 * Business tenant screening — SOP Business Rental Management §11 and
 * Business Tenancy Management §6. A business tenant is screened on what it
 * trades, whether it may lawfully do so, and whether it can pay.
 *
 * Gathering the facts and recording the decision are separate: `ready` says the
 * file is complete, `verdict` says what was decided. A full file with no
 * decision is still pending, and a decision may be recorded early.
 */
const BUSINESS_SCREENING_FIELDS = [
  { key: 'business_type', label: 'Business type', required: true },
  { key: 'intended_activity', label: 'Intended commercial activity', required: true },
  { key: 'trade_licence_no', label: 'Trade licence number', required: true },
  { key: 'corporate_profile', label: 'Corporate profile', required: true },
  { key: 'financial_capability', label: 'Financial capability', required: true },
  { key: 'operational_suitability', label: 'Operational suitability', required: true },
  { key: 'previous_leasing_history', label: 'Previous leasing history', required: true },
  { key: 'screening_notes', label: 'Screening notes', required: false },
];

const VERDICTS = ['pending', 'suitable', 'conditional', 'declined'];

/**
 * Rural tenant screening — SOP Rural Property Rental Management §10 Step 11 and
 * CRM Owner Sheet 8. A farmer is screened on farming experience and financial
 * capacity, not on a trade licence and a corporate profile.
 */
const RURAL_SCREENING_FIELDS = [
  { key: 'nid_verified', label: 'NID verification', required: true },
  { key: 'business_verification', label: 'Business verification', required: true },
  { key: 'farming_experience', label: 'Farming experience', required: true },
  { key: 'financial_capacity', label: 'Financial capacity', required: true },
  { key: 'references_verified', label: 'References', required: true },
  { key: 'background_check', label: 'Background check', required: true },
  { key: 'intended_use', label: 'Intended use', required: true },
  { key: 'screening_notes', label: 'Screening notes', required: false },
];

/** One field set per console. A category absent here is not screened at all. */
const SCREENING_FIELDS_BY_CATEGORY = {
  business: BUSINESS_SCREENING_FIELDS,
  rural: RURAL_SCREENING_FIELDS,
};

/** The field set for a category, or [] where screening does not apply. */
function screeningFields(category) {
  return SCREENING_FIELDS_BY_CATEGORY[String(category || '')] || [];
}


function screeningVerdict(app = {}, category = 'business') {
  // Defaults to business so every existing single-argument caller is unaffected.
  const fields = screeningFields(category).length ? screeningFields(category) : BUSINESS_SCREENING_FIELDS;
  const missing = fields
    .filter((f) => f.required)
    .filter((f) => {
      const v = app[f.key];
      return v === undefined || v === null || String(v).trim() === '';
    })
    .map((f) => f.key);
  const recorded = VERDICTS.includes(app.screening_verdict) ? app.screening_verdict : 'pending';
  return { verdict: recorded, missing, ready: missing.length === 0 };
}

module.exports = {
  BUSINESS_SCREENING_FIELDS, RURAL_SCREENING_FIELDS, SCREENING_FIELDS_BY_CATEGORY,
  VERDICTS, screeningFields, screeningVerdict,
};
