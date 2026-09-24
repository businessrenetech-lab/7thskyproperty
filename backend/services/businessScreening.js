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

function screeningVerdict(app = {}) {
  const missing = BUSINESS_SCREENING_FIELDS
    .filter((f) => f.required)
    .filter((f) => {
      const v = app[f.key];
      return v === undefined || v === null || String(v).trim() === '';
    })
    .map((f) => f.key);
  const recorded = VERDICTS.includes(app.screening_verdict) ? app.screening_verdict : 'pending';
  return { verdict: recorded, missing, ready: missing.length === 0 };
}

module.exports = { BUSINESS_SCREENING_FIELDS, VERDICTS, screeningVerdict };
