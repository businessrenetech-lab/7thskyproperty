/**
 * propertyState.service.js
 * ------------------------------------------------------------------
 * Computes the "lifecycle state + next action + blockers + financial strip"
 * for a single property. Everything the property-detail header needs to
 * turn a database row into a call-to-action.
 *
 * Called by:
 *   - GET /api/properties/:id           (embedded in the detail response)
 *   - GET /api/properties/:id/state     (dedicated refresh endpoint)
 *
 * Pure read: no side effects, no mutations. Safe to call anywhere.
 */
const sequelize = require('../config/db.config');
const Property = require('../models/Property');
const PropertyOwnerProfile = require('../models/PropertyOwnerProfile');
const Tenancy = require('../models/Tenancy');
const PropertyMedia = require('../models/PropertyMedia');
const { TenantApplication } = require('../models/TenantApplication');
const WorkOrder = require('../models/WorkOrder');

const OPEN_APP_STATUSES = ['draft', 'submitted', 'screening', 'verification', 'awaiting_documents', 'awaiting_owner_approval', 'approved'];
const OPEN_WO_STATUSES = ['draft', 'issued', 'accepted', 'in_progress'];

const num = (v) => Number(v || 0);
// MySQL can hand us '0000-00-00' as a valid-looking date — treat any non-parseable
// or zero-date as null so lifecycle logic doesn't mis-classify.
const parseDate = (v) => {
  if (!v) return null;
  const s = String(v);
  if (s.startsWith('0000-') || s === '0000-00-00' || s === '0000-00-00T00:00:00.000Z') return null;
  const d = new Date(s);
  if (isNaN(d.getTime()) || d.getFullYear() < 1900) return null;
  return d;
};
const daysBetween = (fromDate, toIso) => {
  const to = parseDate(toIso);
  if (!to) return null;
  const now = fromDate || new Date();
  return Math.round((to - now) / (1000 * 60 * 60 * 24));
};

async function computePropertyState(propertyId) {
  const property = await Property.findByPk(propertyId);
  if (!property) return null;
  const p = property.toJSON();
  const pid = p.id;

  const [ownerProfile, activeTenancies, allTenancies, openApps, openWOs, mediaCount, financialAgg] = await Promise.all([
    PropertyOwnerProfile.findOne({ where: { property_id: pid } }),
    Tenancy.findAll({ where: { property_id: pid, status: 'active' }, order: [['lease_start', 'DESC']] }),
    Tenancy.findAll({ where: { property_id: pid }, order: [['created_at', 'DESC']] }),
    TenantApplication.count({ where: { property_id: pid, status: OPEN_APP_STATUSES } }),
    WorkOrder.count({ where: { property_id: pid, status: OPEN_WO_STATUSES } }),
    PropertyMedia.count({ where: { property_id: pid } }),
    // Financial aggregates
    (async () => {
      const [[rin]] = await sequelize.query(`SELECT COALESCE(SUM(py.amount),0) AS t FROM payments py JOIN invoices inv ON py.invoice_id = inv.id WHERE inv.property_id = :pid AND py.direction = 'incoming' AND py.status = 'completed'`, { replacements: { pid } });
      const [[rout]] = await sequelize.query(`SELECT COALESCE(SUM(py.amount),0) AS t FROM payments py JOIN invoices inv ON py.invoice_id = inv.id WHERE inv.property_id = :pid AND py.direction = 'outgoing' AND py.status = 'completed'`, { replacements: { pid } });
      const [[billsPend]] = await sequelize.query(`SELECT COALESCE(SUM(balance),0) AS t FROM invoices WHERE property_id = :pid AND invoice_kind = 'provider' AND status NOT IN ('paid','cancelled')`, { replacements: { pid } });
      const [[invPend]] = await sequelize.query(`SELECT COALESCE(SUM(balance),0) AS t FROM invoices WHERE property_id = :pid AND invoice_kind = 'client' AND status NOT IN ('paid','cancelled')`, { replacements: { pid } });
      const [[nextRent]] = await sequelize.query(`SELECT due_date, (rent_due - rent_received) AS outstanding, period_label FROM rental_ledger WHERE property_id = :pid AND (rent_due - rent_received) > 0 ORDER BY due_date ASC LIMIT 1`, { replacements: { pid } });
      return { money_in: num(rin?.t), money_out: num(rout?.t), bills_pending: num(billsPend?.t), tenant_balance: num(invPend?.t), next_rent_due: nextRent || null };
    })(),
  ]);

  const activeTenancy = activeTenancies[0] || null;
  const anyTenancy = activeTenancy || allTenancies[0] || null;
  // Normalize potentially-zero MySQL dates to null so the UI/logic doesn't get fake dates.
  const leaseEndRaw = activeTenancy?.lease_end || null;
  const leaseEnd = parseDate(leaseEndRaw) ? leaseEndRaw : null;
  const moveOutDate = parseDate(activeTenancy?.move_out_date) ? activeTenancy.move_out_date : null;
  const leaseStart = parseDate(activeTenancy?.lease_start) ? activeTenancy.lease_start : null;
  const daysUntilLeaseEnd = daysBetween(null, leaseEnd);

  // Owner balance = money_in - money_out - bills_pending  (from PropertyDeal/folio; same formula getOne already uses)
  const owner_balance = financialAgg.money_in - financialAgg.money_out - financialAgg.bills_pending;

  // ── Blockers ────────────────────────────────────────────────────────
  const blockers = [];
  const managed = p.pm_status && p.pm_status !== 'not_managed';

  if (managed) {
    // Owner KYC blockers
    if (!p.owner_contact_id) {
      blockers.push({ key: 'no_owner', severity: 'high', label: 'No owner linked to this property', cta: 'Assign owner', tab: 'owner' });
    } else if (!ownerProfile) {
      blockers.push({ key: 'no_kyc', severity: 'high', label: 'Owner KYC profile not started', cta: 'Start KYC', tab: 'owner' });
    } else {
      if (!ownerProfile.nid_number && !ownerProfile.passport_number) {
        blockers.push({ key: 'kyc_id', severity: 'high', label: 'Owner NID / passport not on file', cta: 'Add ID', tab: 'owner' });
      }
      if (!ownerProfile.lawful_authority_confirmed) {
        blockers.push({ key: 'no_authority', severity: 'high', label: 'Lawful authority to rent not confirmed', cta: 'Confirm', tab: 'onboarding' });
      }
      if (!ownerProfile.bank_details_collected && !ownerProfile.bank_account_number) {
        blockers.push({ key: 'no_bank', severity: 'medium', label: 'Owner bank details missing (blocks disbursement)', cta: 'Add bank', tab: 'owner' });
      }
      if (!ownerProfile.tax_responsibility_ack) {
        blockers.push({ key: 'no_tax_ack', severity: 'low', label: 'Owner tax acknowledgement pending', cta: 'Record ack', tab: 'onboarding' });
      }
      if (ownerProfile.agreement_status !== 'signed') {
        blockers.push({ key: 'no_agreement', severity: 'high', label: 'Rental management agreement not signed', cta: 'Send agreement', tab: 'onboarding' });
      }
    }

    // Property setup blockers
    if (!p.access_contact) {
      blockers.push({ key: 'no_access', severity: 'medium', label: 'Access contact / key-holder not recorded', cta: 'Add contact', tab: 'details' });
    }
    if (!p.approved_monthly_rent || num(p.approved_monthly_rent) <= 0) {
      blockers.push({ key: 'no_rent', severity: 'high', label: 'No approved monthly rent set', cta: 'Set rent', tab: 'assessment' });
    }
    if (mediaCount === 0) {
      blockers.push({ key: 'no_photos', severity: 'medium', label: 'No property photos uploaded', cta: 'Upload photos', tab: 'details' });
    }
    if (p.rental_readiness_status !== 'ready_for_marketing' && !activeTenancy) {
      blockers.push({ key: 'not_ready', severity: 'medium', label: 'Rental assessment not marked ready for marketing', cta: 'Continue assessment', tab: 'assessment' });
    }
    if (financialAgg.bills_pending > 0) {
      blockers.push({ key: 'bills_pending', severity: 'medium', label: `Unpaid landlord bills: ৳${financialAgg.bills_pending.toLocaleString()}`, cta: 'Review bills', tab: 'financials' });
    }
  }

  // ── Lifecycle state (most specific wins) ────────────────────────────
  let lifecycle_state = 'onboarding';
  if (p.pm_status === 'closed') {
    lifecycle_state = 'closed';
  } else if (activeTenancy) {
    if (moveOutDate || (daysUntilLeaseEnd !== null && daysUntilLeaseEnd < 0)) {
      lifecycle_state = 'vacating';
    } else if (daysUntilLeaseEnd !== null && daysUntilLeaseEnd <= 90) {
      lifecycle_state = 'renewal';
    } else {
      lifecycle_state = 'tenanted';
    }
  } else if (openApps > 0) {
    lifecycle_state = 'application';
  } else if (p.rental_readiness_status === 'ready_for_marketing') {
    lifecycle_state = 'marketing';
  } else if (p.pm_status === 'assessment_pending' || p.pm_status === 'marketing') {
    lifecycle_state = 'assessment';
  } else if (p.pm_status === 'onboarding' || !managed) {
    lifecycle_state = 'onboarding';
  }

  // ── Next action per state ───────────────────────────────────────────
  // Priority: high-severity blocker overrides state-based CTA.
  const topBlocker = blockers.find((b) => b.severity === 'high');
  let next_action;
  if (topBlocker) {
    next_action = { title: topBlocker.label, cta: topBlocker.cta, tab: topBlocker.tab, tone: 'red' };
  } else {
    const stateCTA = {
      onboarding:  { title: 'Continue owner onboarding',              cta: 'Open onboarding', tab: 'onboarding', tone: 'blue' },
      assessment:  { title: 'Continue property readiness assessment', cta: 'Open assessment', tab: 'assessment', tone: 'blue' },
      marketing:   { title: 'Prepare listing & activate marketing',   cta: 'Prepare listing', tab: 'details',    tone: 'blue' },
      application: { title: `Review ${openApps} tenant application${openApps === 1 ? '' : 's'}`, cta: 'Review applications', tab: 'applications', tone: 'amber' },
      tenanted:    { title: 'Tenancy active — collect rent',          cta: 'Collect rent',    tab: 'tenants',    tone: 'green' },
      renewal:     { title: `Lease ends in ${daysUntilLeaseEnd}d — start renewal`, cta: 'Start renewal', tab: 'tenants', tone: 'amber' },
      vacating:    { title: 'Coordinate exit inspection & bond',      cta: 'Open exit flow',  tab: 'tenants',    tone: 'amber' },
      closed:      { title: 'Property file closed — archived',        cta: 'View archive',    tab: 'details',    tone: 'grey' },
    };
    next_action = stateCTA[lifecycle_state] || stateCTA.onboarding;
  }

  return {
    lifecycle_state,
    next_action,
    blockers,
    counts: {
      active_tenancies: activeTenancies.length,
      total_tenancies: allTenancies.length,
      applications_open: openApps,
      work_orders_open: openWOs,
      media_count: mediaCount,
    },
    financial: {
      owner_balance,
      tenant_balance: financialAgg.tenant_balance,
      money_in: financialAgg.money_in,
      money_out: financialAgg.money_out,
      bills_pending: financialAgg.bills_pending,
      next_rent_due: financialAgg.next_rent_due,
      lease_end: leaseEnd,
      days_until_lease_end: daysUntilLeaseEnd,
      approved_monthly_rent: num(p.approved_monthly_rent),
      readiness_pct: p.rental_readiness_status === 'ready_for_marketing' ? 100 : (p.rental_readiness_status === 'action_required' ? 50 : 0),
    },
    active_tenancy_summary: activeTenancy ? {
      id: activeTenancy.id,
      code: activeTenancy.tenancy_code,
      tenant_contact_id: activeTenancy.tenant_contact_id,
      lease_start: leaseStart,
      lease_end: leaseEnd,
      monthly_rent: num(activeTenancy.monthly_rent),
      status: activeTenancy.status,
      lease_status: activeTenancy.lease_status,
    } : null,
    computed_at: new Date().toISOString(),
  };
}

module.exports = { computePropertyState };
