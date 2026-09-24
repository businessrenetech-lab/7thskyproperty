/**
 * Business lease structure — SOP Business Rental Management §9 and Business
 * Tenancy Management §9.
 *
 * These are DEFAULTS, not rules. The SOP says the structure applies "generally
 * … unless otherwise approved by management", so a departure produces a warning
 * the console shows and records against the tenancy. It never blocks a save:
 * refusing a six-month lease the manager approved would be a bug, not a control.
 */
const BUSINESS_LEASE_DEFAULTS = {
  lease_term_months: 36,
  extension_options: ['3+2', '3+3'],
  renewal_increment_pct: { min: 10, max: 20 },
  advance_months: 12,
};

const filled = (v) => v !== undefined && v !== null && String(v).trim() !== '';

function checkLeaseStructure(lease = {}) {
  const warnings = [];
  const d = BUSINESS_LEASE_DEFAULTS;

  if (filled(lease.lease_term_months) && Number(lease.lease_term_months) !== d.lease_term_months) {
    warnings.push({
      field: 'lease_term_months',
      message: `Standard business lease term is ${d.lease_term_months} months; this lease is ${Number(lease.lease_term_months)}. Record management approval.`,
    });
  }
  if (filled(lease.advance_months) && Number(lease.advance_months) !== d.advance_months) {
    warnings.push({
      field: 'advance_months',
      message: `Standard advance rent is ${d.advance_months} months; this lease is ${Number(lease.advance_months)}. Record management approval.`,
    });
  }
  if (filled(lease.renewal_increment_pct)) {
    const pct = Number(lease.renewal_increment_pct);
    if (pct < d.renewal_increment_pct.min || pct > d.renewal_increment_pct.max) {
      warnings.push({
        field: 'renewal_increment_pct',
        message: `Renewal increment is normally ${d.renewal_increment_pct.min}–${d.renewal_increment_pct.max}%; this lease is ${pct}%. Record management approval.`,
      });
    }
  }
  if (filled(lease.extension_option) && !d.extension_options.includes(String(lease.extension_option))) {
    warnings.push({
      field: 'extension_option',
      message: `Standard extension options are ${d.extension_options.join(' or ')}; this lease is ${lease.extension_option}. Record management approval.`,
    });
  }

  return { ok: warnings.length === 0, warnings };
}

module.exports = { BUSINESS_LEASE_DEFAULTS, checkLeaseStructure };
