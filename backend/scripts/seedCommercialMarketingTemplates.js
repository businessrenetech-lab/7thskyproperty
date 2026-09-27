/**
 * Commercial marketing email templates, and the property_category stamp on the
 * templates that already existed.
 *
 * The problem this fixes: `marketing_templates.category` means the CAMPAIGN type,
 * so nothing distinguished a residential email from a commercial one and every
 * console's Marketing hub listed all 20 — 19 of which are written about
 * residential apartments (Gulshan penthouse, Dhanmondi family residence, home
 * loan guide, first-time buyer checklist). Migration 0160 added
 * `property_category`; this stamps the existing rows and adds the commercial set.
 *
 * STAMPING RULE, applied conservatively:
 *  - residential  the content names apartments, families, bedrooms or home loans
 *  - NULL         genuinely class-agnostic (market reports, infrastructure alerts,
 *                 the NRB diaspora campaign). NULL is listed by every console, so
 *                 leaving a row NULL is the safe choice, never the lossy one.
 * Nothing is deleted and no body content is rewritten.
 *
 * The new commercial templates use the house shell lifted from TPL-NL-05
 * (services/marketingEmailShell.js), so they match the existing design instead of
 * introducing a second one. Their strapline reads "Commercial Sales & Asset
 * Advisory" — every seeded template said "Residential Sales & Asset Advisory",
 * even the commercial listing email.
 *
 * Idempotent by template_code. Run from backend/:
 *   node scripts/seedCommercialMarketingTemplates.js
 */
const sequelize = require('../config/db.config');
const MarketingTemplate = require('../models/MarketingTemplate');
const { renderEmail } = require('../services/marketingEmailShell');

const BRANCH = 1;
const DIVISION = 'Commercial Sales & Asset Advisory';

// Existing rows, by template_code, that are residential in content.
const RESIDENTIAL_CODES = [
  'TPL-NL-01', // Gulshan 2 Luxury Penthouse Debut
  'TPL-NL-02', // Dhanmondi Lakefront Family Residence
  'TPL-NL-03', // Uttara Modern Smart Apartment
  'TPL-NL-04', // Bashundhara R/A Green Duplex Villa
  'TPL-SU-03', // Weekend VIP Open House & Private Preview
  'TPL-SU-04', // Home Loan & Bank Financing Guide 2026
  'TPL-SO-01', // Just Sold in Record Time - Gulshan 2
  'TPL-SO-02', // Record-Breaking Sale Milestone in Banani
  'TPL-SO-04', // Just Sold in Uttara - 15 Qualified Waiting Buyers
  'TPL-BN-02', // First-Time Buyer Checklist & Legal Due Diligence
];
/*
 * Left NULL on purpose (listed by every console): TPL-SU-01 quarterly market
 * report, TPL-SU-02 price-reduction alert, TPL-SU-05 infrastructure corridor
 * alert, TPL-SO-03 off-market confidential transaction, TPL-BN-01 property match,
 * TPL-BN-03 inactive-buyer re-engagement, TPL-SE-01 valuation appraisal,
 * TPL-SE-02 why listings linger, TPL-SE-03 NRB diaspora. None of the nine is
 * specific to a property class.
 */
// TPL-NL-05 is the commercial investment floor email that already existed.
const COMMERCIAL_CODES = ['TPL-NL-05'];

const P = (html) => html;

/** A shared table of figures, the shape the existing commercial email uses. */
const factTable = (rows) => `
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:18px 0;border-collapse:collapse;">
${rows.map(([k, v]) => `                <tr>
                  <td style="padding:9px 12px;background:#f8fafc;border:1px solid #e2e8f0;color:#475569;font-size:13px;font-weight:700;width:46%;">${k}</td>
                  <td style="padding:9px 12px;border:1px solid #e2e8f0;color:#0f172a;font-size:13px;font-weight:700;">${v}</td>
                </tr>`).join('\n')}
              </table>`;

const para = (text) => `              <div style="color:#334155;font-size:14px;line-height:1.7;margin:0 0 14px 0;">${text}</div>`;

const bullets = (items) => `
              <ul style="margin:6px 0 16px 20px;padding:0;color:#334155;font-size:14px;line-height:1.7;">
${items.map((i) => `                <li style="margin:4px 0;">${i}</li>`).join('\n')}
              </ul>`;

const cta = (label) => `
              <div style="margin:24px 0 8px 0;">
                <a href="{{view_link}}" style="display:inline-block;background:#0284c7;color:#ffffff;font-size:14px;font-weight:800;text-decoration:none;padding:12px 26px;border-radius:6px;letter-spacing:0.2px;">${label}</a>
              </div>`;

const VARS = ['{{name}}', '{{property_title}}', '{{agent_name}}', '{{agent_phone}}', '{{agent_email}}', '{{view_link}}', '{{unsubscribe_link}}'];

const TEMPLATES = [
  {
    template_code: 'TPL-COM-NL-01',
    name: 'Commercial Office Floor — New Listing',
    category: 'new_listing',
    subject: 'New to market: {{property_title}} — A-grade office floor, Dhaka CBD',
    preheader: 'Fitted office floor with dedicated parking, generator backup and lift lobby access.',
    headline: 'An A-Grade Office Floor, Ready for Occupation',
    badge: 'New Listing',
    body: [
      para('Dear {{name}},'),
      para('We have just brought <strong>{{property_title}}</strong> to market. It suits an occupier who needs a floor that is ready to work in rather than one that needs eighteen months of fit-out.'),
      factTable([
        ['Floor area', 'As per the listing schedule'],
        ['Parking', 'Dedicated basement bays'],
        ['Power', 'Full generator backup'],
        ['Lift access', 'Dedicated lobby'],
        ['Availability', 'Immediate'],
      ]),
      para('<strong>Why occupiers shortlist this floor</strong>'),
      bullets([
        'A single contiguous floor plate, so no split teams across levels',
        'Service charges and common-area terms confirmed in writing before offer',
        'Ownership documents verified by our documentation team before listing',
      ]),
      cta('View the floor plan and schedule'),
      para('If the specification does not fit, tell us what does and we will search against it — including off-market stock.'),
    ],
    text: [
      'New to market: {{property_title}} - A-grade office floor, Dhaka CBD.',
      'Dear {{name}},',
      'A fitted office floor available for immediate occupation:',
      '- Single contiguous floor plate',
      '- Dedicated basement parking',
      '- Full generator backup',
      '- Ownership documents verified before listing',
      'View the floor plan: {{view_link}}',
      '{{agent_name}} | {{agent_phone}} | {{agent_email}}',
    ],
    tags: ['commercial', 'office', 'new_listing', 'occupier'],
  },
  {
    template_code: 'TPL-COM-NL-02',
    name: 'Commercial Retail & Showroom — New Listing',
    category: 'new_listing',
    subject: 'Retail frontage available: {{property_title}}',
    preheader: 'Ground-floor retail with main-road frontage and signage rights.',
    headline: 'Ground-Floor Retail With Main-Road Frontage',
    badge: 'New Listing',
    body: [
      para('Dear {{name}},'),
      para('<strong>{{property_title}}</strong> is now available. For a retail or showroom occupier the two things that decide a site are footfall and visibility, so those are what this listing leads with.'),
      factTable([
        ['Position', 'Ground floor, main-road frontage'],
        ['Signage', 'Facade signage rights included'],
        ['Frontage', 'As per the listing schedule'],
        ['Fit-out', 'Shell or part-fitted, by negotiation'],
        ['Use', 'Retail / showroom'],
      ]),
      bullets([
        'Signage rights confirmed with the owner in writing, not assumed',
        'Trading hours and service-charge terms set out before offer',
        'Lease length and rent-review basis stated up front',
      ]),
      cta('View the site and terms'),
      para('We can arrange a viewing at trading hours so you see the footfall rather than an empty street.'),
    ],
    text: [
      'Retail frontage available: {{property_title}}.',
      'Dear {{name}},',
      'Ground-floor retail with main-road frontage:',
      '- Facade signage rights included',
      '- Shell or part-fitted by negotiation',
      '- Trading hours and service charges stated before offer',
      'View the site: {{view_link}}',
      '{{agent_name}} | {{agent_phone}} | {{agent_email}}',
    ],
    tags: ['commercial', 'retail', 'showroom', 'new_listing'],
  },
  {
    template_code: 'TPL-COM-NL-03',
    name: 'Warehouse & Industrial Space — New Listing',
    category: 'new_listing',
    subject: 'Warehouse space: {{property_title}} — clear height and truck access',
    preheader: 'Industrial space with loading access, clear height and floor loading confirmed.',
    headline: 'Warehouse Space With Real Truck Access',
    badge: 'New Listing',
    body: [
      para('Dear {{name}},'),
      para('<strong>{{property_title}}</strong> is available now. For industrial space the specification decides everything, so here it is before the marketing copy.'),
      factTable([
        ['Clear height', 'As per the listing schedule'],
        ['Floor loading', 'Confirmed with the owner'],
        ['Loading access', 'Truck-accessible yard'],
        ['Power', 'Three-phase supply'],
        ['Use', 'Warehouse / light industrial'],
      ]),
      bullets([
        'Access road width verified on site, not taken from a plan',
        'Floor loading and clear height confirmed before listing',
        'Utility capacity checked against the stated supply',
      ]),
      cta('View the specification'),
    ],
    text: [
      'Warehouse space: {{property_title}}.',
      'Dear {{name}},',
      'Industrial space with confirmed specification:',
      '- Truck-accessible loading yard',
      '- Clear height and floor loading confirmed',
      '- Three-phase power',
      'View the specification: {{view_link}}',
      '{{agent_name}} | {{agent_phone}} | {{agent_email}}',
    ],
    tags: ['commercial', 'warehouse', 'industrial', 'new_listing'],
  },
  {
    template_code: 'TPL-COM-BN-01',
    name: 'Commercial Investor Nurture — Yield & Covenant',
    category: 'buyer_nurture',
    subject: 'What we check before we call a commercial yield "net", {{name}}',
    preheader: 'Service charges, void periods and tenant covenant — the three things that move a net yield.',
    headline: 'A Gross Yield Is Not A Net Yield',
    badge: 'Investor Briefing',
    body: [
      para('Dear {{name}},'),
      para('Most commercial listings quote a gross yield. Three things turn that into the number you actually receive, and we confirm all three before we put a figure in front of you.'),
      bullets([
        '<strong>Service charges.</strong> Who pays them, what they cover, and whether they are capped.',
        '<strong>Void periods.</strong> What the floor did between tenants, not just what it earns today.',
        '<strong>Tenant covenant.</strong> How long the lease runs, what the break clauses are, and who stands behind the rent.',
      ]),
      para('We also check the rent-review basis. A fixed uplift and an open-market review produce very different ten-year outcomes on the same headline yield.'),
      cta('Talk through a specific asset'),
      para('If you are weighing two assets against each other, send both and we will set the figures out side by side.'),
    ],
    text: [
      'What we check before calling a commercial yield "net".',
      'Dear {{name}},',
      'Three things turn a gross yield into a net one:',
      '- Service charges: who pays, what they cover, whether capped',
      '- Void periods: what the floor did between tenants',
      '- Tenant covenant: lease length, break clauses, who stands behind the rent',
      'We also check the rent-review basis.',
      'Talk it through: {{view_link}}',
      '{{agent_name}} | {{agent_phone}} | {{agent_email}}',
    ],
    tags: ['commercial', 'investor', 'yield', 'buyer_nurture'],
  },
  {
    template_code: 'TPL-COM-SE-01',
    name: 'Commercial Owner Engagement — Letting & Sale Appraisal',
    category: 'seller_engagement',
    subject: 'A commercial appraisal for your floor, {{name}} — let or sell',
    preheader: 'Rent achievable, sale value, and which of the two serves you better this year.',
    headline: 'Let It Or Sell It? The Figures Decide',
    badge: 'Owner Appraisal',
    body: [
      para('Dear {{name}},'),
      para('If you own commercial space in Dhaka, the right question this year is not what it is worth but which route pays you better — a letting or a sale. We appraise both and give you the two numbers together.'),
      bullets([
        '<strong>Achievable rent</strong>, benchmarked against lettings actually completed nearby, not asking prices',
        '<strong>Sale value</strong>, on the covenant and the lease term in place',
        '<strong>Cost of each route</strong>, including void risk, fit-out expectation and our fee',
      ]),
      para('We also tell you what is holding the floor back. Compliance gaps and missing ownership documents cost more in a commercial transaction than in a residential one, and both are fixable before marketing rather than during it.'),
      cta('Request the appraisal'),
    ],
    text: [
      'A commercial appraisal for your floor - let or sell.',
      'Dear {{name}},',
      'We appraise both routes and give you the numbers together:',
      '- Achievable rent, benchmarked on completed lettings',
      '- Sale value on the covenant and lease term in place',
      '- The cost of each route, including void risk and our fee',
      'Request the appraisal: {{view_link}}',
      '{{agent_name}} | {{agent_phone}} | {{agent_email}}',
    ],
    tags: ['commercial', 'owner', 'appraisal', 'seller_engagement'],
  },
  {
    template_code: 'TPL-COM-SU-01',
    name: 'Commercial Tenant Requirement — Space Search Update',
    category: 'sales_update',
    subject: 'Your commercial space search: what we found this week, {{name}}',
    preheader: 'Shortlisted floors against your brief, with the ones we rejected and why.',
    headline: 'This Week Against Your Brief',
    badge: 'Search Update',
    body: [
      para('Dear {{name}},'),
      para('Here is where your space search stands. We include what we <em>rejected</em> as well as what we shortlisted, because knowing why a floor was ruled out is how a brief gets sharper.'),
      factTable([
        ['Brief', 'Area, location and use as agreed'],
        ['Inspected this period', 'See the shortlist'],
        ['Shortlisted', 'Floors meeting the brief'],
        ['Rejected', 'With the reason recorded'],
        ['Next step', 'Viewings, then offer support'],
      ]),
      para('Where a floor came close but missed on one point, we say so — sometimes the owner will move on that point, and it is worth asking before we discard it.'),
      cta('See the shortlist'),
    ],
    text: [
      'Your commercial space search: this week against your brief.',
      'Dear {{name}},',
      'We report what we rejected as well as what we shortlisted.',
      '- Inspected this period, shortlisted, and rejected with reasons',
      '- Next step: viewings, then offer support',
      'See the shortlist: {{view_link}}',
      '{{agent_name}} | {{agent_phone}} | {{agent_email}}',
    ],
    tags: ['commercial', 'tenant', 'requirement', 'sales_update'],
  },
  {
    template_code: 'TPL-COM-SO-01',
    name: 'Commercial Transaction Completed',
    category: 'sold_update',
    subject: 'Completed: a commercial transaction in {{property_title}}',
    preheader: 'Another commercial floor transacted — what it tells you about current pricing.',
    headline: 'Completed, And What It Says About Pricing',
    badge: 'Completed',
    body: [
      para('Dear {{name}},'),
      para('We have completed a commercial transaction at <strong>{{property_title}}</strong>. Completed deals are the only reliable read on commercial pricing — asking prices tell you what owners hope for, not what buyers pay.'),
      bullets([
        'Agreed terms reached without a price reduction after offer',
        'Documentation and due diligence coordinated to settlement',
        'Commission and settlement reconciled at completion',
      ]),
      para('If you own comparable space, this transaction is relevant evidence for your own appraisal. If you are looking to acquire, it tells you where the market actually cleared.'),
      cta('Ask what this means for your asset'),
    ],
    text: [
      'Completed: a commercial transaction in {{property_title}}.',
      'Dear {{name}},',
      'Completed deals are the only reliable read on commercial pricing.',
      '- Agreed terms without a post-offer reduction',
      '- Documentation coordinated to settlement',
      '- Commission and settlement reconciled at completion',
      'Ask what this means for your asset: {{view_link}}',
      '{{agent_name}} | {{agent_phone}} | {{agent_email}}',
    ],
    tags: ['commercial', 'completed', 'sold_update'],
  },
];

function build(t) {
  return {
    branch_id: BRANCH,
    template_code: t.template_code,
    name: t.name,
    category: t.category,
    property_category: 'commercial',
    channel: 'any',
    subject: t.subject,
    preheader: t.preheader,
    headline: t.headline,
    body_html: renderEmail({
      division: DIVISION,
      subject: t.subject,
      badge: t.badge,
      headline: t.headline,
      bodyHtml: t.body.map(P).join('\n'),
    }),
    body_text: `${t.text.join('\n')}\n\nUnsubscribe: {{unsubscribe_link}}`,
    variables: VARS,
    tags: t.tags,
    is_system: true,
    is_active: true,
  };
}

async function run() {
  // 1) Stamp what already exists. NULL is left alone deliberately.
  for (const [cat, codes] of [['residential', RESIDENTIAL_CODES], ['commercial', COMMERCIAL_CODES]]) {
    const [found] = await sequelize.query(
      'SELECT template_code FROM marketing_templates WHERE template_code IN (:codes)',
      { replacements: { codes } },
    );
    const missing = codes.filter((c) => !found.some((f) => f.template_code === c));
    if (missing.length) {
      // A code that matches nothing is a typo in the list above, not a no-op.
      throw new Error(`${cat}: these template codes do not exist: ${missing.join(', ')}`);
    }
    await sequelize.query(
      'UPDATE marketing_templates SET property_category = :c WHERE template_code IN (:codes)',
      { replacements: { c: cat, codes } },
    );
    console.log(`stamped ${cat}: ${codes.length} existing template(s)`);
  }

  // 2) The commercial set.
  let created = 0; let updated = 0;
  for (const t of TEMPLATES) {
    const data = build(t);
    const row = await MarketingTemplate.findOne({ where: { template_code: data.template_code } });
    if (row) { await row.update(data); updated += 1; console.log(`  updated  ${data.template_code}  ${data.name}`); } else {
      await MarketingTemplate.create(data); created += 1; console.log(`  created  ${data.template_code}  ${data.name}`);
    }
  }

  const [[counts]] = await sequelize.query(
    `SELECT
       SUM(property_category = 'commercial') AS commercial,
       SUM(property_category = 'residential') AS residential,
       SUM(property_category IS NULL) AS any_category,
       COUNT(*) AS total
     FROM marketing_templates`,
  );
  console.log(`templates: ${created} created, ${updated} updated`);
  console.log(`by property_category -> commercial ${counts.commercial}, residential ${counts.residential}, any ${counts.any_category}, total ${counts.total}`);
}

module.exports = { TEMPLATES, RESIDENTIAL_CODES, COMMERCIAL_CODES, build, DIVISION };

if (require.main === module) {
  run().then(() => process.exit(0)).catch((e) => { console.error(e.message); process.exit(1); });
}
