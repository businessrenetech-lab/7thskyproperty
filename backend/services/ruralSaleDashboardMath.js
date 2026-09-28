/**
 * Pure math behind the Rural Sale dashboards — no DB, so it is testable.
 *
 * `propertyTypeCounts` and `revenueByType` are not redefined here: they are the
 * same rural-type grouping the Rent dashboards use and already live (and are
 * already tested) in ruralRentDashboardMath.js. The figures below are the ones
 * the SALE workbook asks for and the rent side has no equivalent of:
 * inspection-to-offer and offer-to-sale ratios, days on market, and commission.
 */
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const dayOnly = (v) => String(v instanceof Date ? v.toISOString() : v).slice(0, 10);
const days = (from, to) => Math.round(
  (new Date(`${dayOnly(to)}T00:00:00Z`) - new Date(`${dayOnly(from)}T00:00:00Z`)) / 86400000,
);

/** A ratio as a percentage to one decimal. 0 when the denominator is 0, never NaN. */
function ratio(numerator, denominator) {
  const d = num(denominator);
  if (d <= 0) return 0;
  return Math.round((num(numerator) / d) * 1000) / 10;
}

/**
 * The sale funnel the sale SOP §14 measures: listings, inspections, offers and
 * completed sales, with the two ratios it names.
 */
function saleFunnel({ listings = 0, inspections = 0, offers = 0, sales = 0 } = {}) {
  return {
    listings: num(listings),
    inspections: num(inspections),
    offers: num(offers),
    sales: num(sales),
    inspectionToOffer: ratio(offers, inspections),
    offerToSale: ratio(sales, offers),
    conversionRate: ratio(sales, listings),
  };
}

/**
 * Average days on market over the properties that are still listed, measured from
 * when each was created. A property listed today counts as 0, not as 1.
 *
 * Sold properties are excluded: once sold, days-on-market is a historical figure
 * that belongs to the completed sale, and mixing the two makes the average drift
 * down every time something sells.
 */
function daysOnMarket(properties = [], today = new Date()) {
  const listed = properties.filter((p) => !['sold', 'archived', 'withdrawn'].includes(String(p.status || '')));
  if (!listed.length) return { count: 0, average: 0, longest: 0 };
  const ages = listed.map((p) => Math.max(0, days(p.created_at || today, today)));
  return {
    count: listed.length,
    average: Math.round((ages.reduce((t, n) => t + n, 0) / ages.length) * 10) / 10,
    longest: Math.max(...ages),
  };
}

/**
 * Commission across the deals on this book. `earned` is what completed deals
 * carry; `pipeline` is what the open ones would pay if they complete — reported
 * separately, because adding the two would overstate revenue.
 */
function commission(deals = []) {
  const done = (d) => ['completed', 'settled', 'closed'].includes(String(d.status || ''));
  const completed = deals.filter(done);
  const open = deals.filter((d) => !done(d) && String(d.status || '') !== 'cancelled');
  const sum = (rows, field) => rows.reduce((t, r) => t + num(r[field]), 0);
  const prices = completed.map((d) => num(d.sale_price)).filter((n) => n > 0);
  return {
    earned: sum(completed, 'commission_amount'),
    pipeline: sum(open, 'commission_amount') + sum(open, 'expected_commission'),
    completedDeals: completed.length,
    openDeals: open.length,
    saleValue: sum(completed, 'sale_price'),
    averageSalePrice: prices.length ? Math.round(prices.reduce((t, n) => t + n, 0) / prices.length) : 0,
  };
}

/**
 * The risk dashboard the sale checklist asks for: disputes grouped by the four
 * headings it names, with everything else under Other so nothing is dropped.
 */
const RISK_GROUPS = {
  Ownership: ['Ownership Dispute', 'Encumbrance', 'Encroachment'],
  Succession: ['Succession Issue'],
  Boundary: ['Boundary Dispute', 'Access Dispute'],
  Financing: ['Financing Risk'],
  Regulatory: ['Regulatory Concern', 'Government Acquisition Risk', 'Registration Delay', 'Environmental Risk'],
};

function riskGroups(disputes = []) {
  const out = Object.fromEntries(Object.keys(RISK_GROUPS).map((k) => [k, 0]));
  out.Other = 0;
  for (const d of disputes) {
    const cat = String(d.risk_category || '');
    const group = Object.keys(RISK_GROUPS).find((k) => RISK_GROUPS[k].includes(cat));
    out[group || 'Other'] += 1;
  }
  return out;
}

module.exports = { ratio, saleFunnel, daysOnMarket, commission, riskGroups, RISK_GROUPS };
