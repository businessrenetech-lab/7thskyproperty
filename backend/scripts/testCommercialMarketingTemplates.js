const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  TEMPLATES, RESIDENTIAL_CODES, COMMERCIAL_CODES, build, DIVISION,
} = require('./seedCommercialMarketingTemplates');
const { pmCategory } = require('../utils/pmCategory');

// Seven commercial templates, one per campaign type the console needs.
assert.strictEqual(TEMPLATES.length, 7);
const codes = TEMPLATES.map((t) => t.template_code);
assert.strictEqual(new Set(codes).size, codes.length, 'no duplicate template_code');
for (const c of codes) {
  assert.ok(/^TPL-COM-/.test(c), `${c} is namespaced so it cannot collide with the existing set`);
}
// The existing codes are a different namespace entirely.
for (const c of [...RESIDENTIAL_CODES, ...COMMERCIAL_CODES]) {
  assert.ok(!codes.includes(c), `${c} already exists and must not be recreated`);
}

// Every campaign type the hub filters by is covered, so a commercial user is not
// left with an empty list on any tab.
const campaignTypes = new Set(TEMPLATES.map((t) => t.category));
for (const t of ['new_listing', 'buyer_nurture', 'seller_engagement', 'sales_update', 'sold_update']) {
  assert.ok(campaignTypes.has(t), `a commercial template exists for the ${t} campaign type`);
}

// The three commercial property kinds the SOP scope names get their own listing
// email: office, retail/showroom, warehouse/industrial.
const allTags = TEMPLATES.flatMap((t) => t.tags);
for (const kind of ['office', 'retail', 'warehouse']) {
  assert.ok(allTags.includes(kind), `a listing template covers ${kind}`);
}

// ── Every built row is complete and correctly stamped ───────────────────────
for (const t of TEMPLATES) {
  const row = build(t);
  assert.strictEqual(row.property_category, 'commercial', `${t.template_code} is stamped commercial`);
  assert.strictEqual(pmCategory(row.property_category), 'commercial',
    `${t.template_code} uses a value pmCategory recognises`);
  assert.ok(row.subject && row.preheader && row.headline, `${t.template_code} has subject, preheader and headline`);
  assert.ok(row.body_html.startsWith('<!DOCTYPE'), `${t.template_code} is a full HTML email`);
  assert.ok(row.body_html.includes('</html>'), `${t.template_code} is closed`);
  assert.ok(row.body_html.length > 3000, `${t.template_code} is a real email, not a stub`);
  assert.ok(row.body_text && row.body_text.length > 150, `${t.template_code} has a text part`);

  // The strapline must say Commercial. Every seeded template said "Residential
  // Sales & Asset Advisory", even the commercial listing email.
  assert.ok(row.body_html.includes('Commercial Sales &amp; Asset Advisory'),
    `${t.template_code} carries the commercial strapline`);
  assert.ok(!row.body_html.includes('Residential Sales'),
    `${t.template_code} must not carry the residential strapline`);

  // Merge variables must be declared AND actually used, or a send leaves {{gaps}}.
  for (const v of ['{{name}}', '{{unsubscribe_link}}']) {
    assert.ok(row.variables.includes(v), `${t.template_code} declares ${v}`);
  }
  assert.ok(row.body_html.includes('{{name}}') || row.body_text.includes('{{name}}'),
    `${t.template_code} greets the recipient`);
  assert.ok(row.body_text.includes('{{unsubscribe_link}}'),
    `${t.template_code} can be unsubscribed from`);

  // Any merge tag that appears must be one we declare.
  const used = new Set([...String(row.body_html).matchAll(/\{\{[a-z_]+\}\}/g)].map((m) => m[0]));
  for (const u of used) {
    assert.ok(row.variables.includes(u), `${t.template_code} uses ${u} without declaring it`);
  }

  // Residential vocabulary has no place in a commercial email.
  const text = `${row.subject} ${row.preheader} ${row.headline} ${row.body_text}`.toLowerCase();
  for (const word of ['bedroom', 'penthouse', 'family residence', 'home loan', 'first-time buyer']) {
    assert.ok(!text.includes(word), `${t.template_code} must not talk about "${word}"`);
  }
}

// ── The stamping lists ──────────────────────────────────────────────────────
assert.strictEqual(new Set(RESIDENTIAL_CODES).size, RESIDENTIAL_CODES.length);
for (const c of RESIDENTIAL_CODES) {
  assert.ok(!COMMERCIAL_CODES.includes(c), `${c} cannot be both residential and commercial`);
}
assert.strictEqual(DIVISION, 'Commercial Sales & Asset Advisory');

// ── The scoping rule the controller implements ──────────────────────────────
// A NULL property_category must stay visible to every console, or stamping the
// residential rows would hide the market reports from everyone.
const src = fs.readFileSync(path.join(__dirname, '..', 'controllers', 'marketingCampaign.controller.js'), 'utf8');
assert.ok(/property_category: propCat/.test(src), 'listTemplates filters on property_category');
assert.ok(/property_category: null/.test(src), 'and always includes the category-agnostic templates');
assert.ok(/pmCategory\(req\.query\.property_category\)/.test(src),
  'it resolves the category through pmCategory, so an unknown value leaves the list unfiltered');
assert.ok(/'property_category'/.test(src), 'updateTemplate allows property_category to be changed');

console.log('commercialMarketingTemplates OK');
