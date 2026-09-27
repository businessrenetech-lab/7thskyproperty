/**
 * Rural dispute management — SOP Rural Property Rental Management §6 Step 4 and
 * §14, the rural rent workbook's Risk Register (Sheet 18), and the rural SALE
 * workbooks' Risk Registers (seller Sheet 16, buyer Sheet 18).
 *
 * A dispute is a RISK with a lifecycle, not a separate table: property_risks
 * already exists, is category-scoped and carries property, tenancy, owner and
 * tenant. This adds the stage machine the SOP implies.
 *
 * The existing `status` enum ('open' | 'monitoring' | 'mitigated' | 'closed') is
 * left alone — altering an enum on a live table to add one value is not worth the
 * risk, and `dispute_stage` says something different anyway: status is how the
 * risk is being managed, stage is where the dispute has got to.
 */

// Rural RENT: workbook Sheet 18 examples, plus the SOP §6 Step 4 risks.
const RURAL_DISPUTE_CATEGORIES = [
  'Ownership Dispute',
  'Boundary Dispute',
  'Succession Issue',
  'Encumbrance',
  'Access Dispute',
  'Environmental Risk',
  'Regulatory Concern',
  'Tenant Default',
];

/**
 * Rural SALE adds four risks the lease side does not have, from the sale
 * workbook's Risk Register (seller Sheet 16: Government Acquisition Risk,
 * Encroachment, Financing Risk) and the buyer's (Sheet 18: Registration Delay).
 * 'Tenant Default' is dropped — there is no tenant in a sale — but every other
 * rent category still applies, so the sale list is built FROM the rent one rather
 * than typed out again, which is how the two would drift apart.
 */
const SALE_ONLY_DISPUTE_CATEGORIES = [
  'Government Acquisition Risk',
  'Encroachment',
  'Financing Risk',
  'Registration Delay',
];

const RURAL_SALE_DISPUTE_CATEGORIES = [
  ...RURAL_DISPUTE_CATEGORIES.filter((c) => c !== 'Tenant Default'),
  ...SALE_ONLY_DISPUTE_CATEGORIES,
];

/** Every rural dispute category, either side. What the API accepts. */
const ALL_DISPUTE_CATEGORIES = [
  ...RURAL_DISPUTE_CATEGORIES,
  ...SALE_ONLY_DISPUTE_CATEGORIES,
];

/**
 * The categories a console may raise. Rural Rent and Rural Sale offer different
 * lists; an unknown scope gets everything rather than nothing, so a caller that
 * does not know its scope is never blocked.
 */
function categoriesFor(scope) {
  const s = String(scope || '').toLowerCase();
  if (s === 'rent' || s === 'rural_rent' || s === 'rural_tenancy') return RURAL_DISPUTE_CATEGORIES;
  if (s === 'sale' || s === 'rural_sale' || s === 'rural_purchase') return RURAL_SALE_DISPUTE_CATEGORIES;
  return ALL_DISPUTE_CATEGORIES;
}

const DISPUTE_STAGES = ['raised', 'under_review', 'escalated', 'resolved', 'closed'];

/**
 * Where a dispute may go next.
 *
 * Forward only, with two deliberate exceptions: a dispute may be escalated
 * straight from `raised` (some arrive already serious), and a `resolved` dispute
 * may reopen to `under_review` if the resolution does not hold. Nothing may leave
 * `closed` — reopening a closed matter is a new dispute with its own record.
 */
const ALLOWED = {
  raised: ['under_review', 'escalated', 'closed'],
  under_review: ['escalated', 'resolved', 'closed'],
  escalated: ['resolved', 'closed'],
  resolved: ['under_review', 'closed'],
  closed: [],
};

const isStage = (s) => DISPUTE_STAGES.includes(String(s || ''));

/** The stages this dispute may move to, or [] for an unknown or closed stage. */
function nextStages(from) {
  return ALLOWED[String(from || '')] || [];
}

/**
 * Whether a transition is allowed. Returns { ok, reason } rather than throwing so
 * a controller can answer 400 with something a user can act on.
 */
function canTransition(from, to) {
  if (!isStage(from)) return { ok: false, reason: `'${from}' is not a dispute stage.` };
  if (!isStage(to)) return { ok: false, reason: `'${to}' is not a dispute stage.` };
  if (from === to) return { ok: false, reason: `The dispute is already ${to}.` };
  if (!nextStages(from).includes(to)) {
    return { ok: false, reason: `A ${from.replace('_', ' ')} dispute cannot move to ${to.replace('_', ' ')}. Allowed: ${nextStages(from).join(', ') || 'none'}.` };
  }
  return { ok: true, reason: null };
}

/** Escalated and unresolved is what the Operations view must surface. */
const needsAttention = (d = {}) => d.dispute_stage === 'escalated';

module.exports = {
  RURAL_DISPUTE_CATEGORIES, RURAL_SALE_DISPUTE_CATEGORIES, SALE_ONLY_DISPUTE_CATEGORIES,
  ALL_DISPUTE_CATEGORIES, categoriesFor,
  DISPUTE_STAGES, nextStages, canTransition, needsAttention,
};
