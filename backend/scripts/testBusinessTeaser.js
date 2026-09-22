const assert = require('assert');
const { turnoverBand, yearsEstablished, applyBusinessTeaser, fullBusinessDetails } = require('../services/businessTeaser.service');

assert.strictEqual(turnoverBand(null), 'On request');
assert.strictEqual(turnoverBand(0), 'On request');
assert.strictEqual(turnoverBand(4_999_999), 'Under ৳50 L');
assert.strictEqual(turnoverBand(5_000_000), '৳50 L–1 Cr');
assert.strictEqual(turnoverBand(10_000_000), '৳1–2 Cr');
assert.strictEqual(turnoverBand(19_999_999), '৳1–2 Cr');
assert.strictEqual(turnoverBand(20_000_000), '৳2–5 Cr');
assert.strictEqual(turnoverBand(50_000_000), '৳5–10 Cr');
assert.strictEqual(turnoverBand(100_000_000), '৳10 Cr+');
assert.strictEqual(turnoverBand('1.5e7'), '৳1–2 Cr');

const now = new Date('2026-09-21');
assert.strictEqual(yearsEstablished(2016, now), 10);
assert.strictEqual(yearsEstablished(3000, now), null);
assert.strictEqual(yearsEstablished(null, now), null);

const pub = {
  id: 9, property_code: 'SSP-9', slug: 'rahim-traders-banani', title: 'Rahim Traders Ltd', category: 'business',
  area: 'Banani', city: 'Dhaka', address: 'House 12, Road 5', latitude: 23.79, description: 'Owner Rahim…',
  seo_title: 'Rahim Traders', price: 25000000, media: [{ file_url: '/uploads/properties/a.jpg' }],
};
const profile = {
  business_type: 'trading', industry: 'Electronics import', staff_count: 14, year_established: 2016,
  annual_turnover: 30000000, annual_profit: 6000000, lease_details: 'Lease to 2030', teaser_headline: '', teaser_summary: 'Established importer.',
};
const t = applyBusinessTeaser(pub, profile);
assert.strictEqual(t.title, 'Trading business in Banani');
assert.strictEqual(t.slug, 'ssp-9');
assert.strictEqual(t.description, 'Established importer.');
for (const k of ['address', 'latitude', 'seo_title']) assert.ok(!(k in t), `teaser leaked ${k}`);
assert.ok(!JSON.stringify(t).includes('Rahim'), 'teaser leaked the business name');
assert.ok(!JSON.stringify(t).includes('30000000') && !JSON.stringify(t).includes('6000000'), 'teaser leaked exact financials');
assert.deepStrictEqual(t.business.turnover_band, '৳2–5 Cr');
assert.strictEqual(t.business.staff_count, 14);
assert.strictEqual(t.price, 25000000);
assert.strictEqual(t.media.length, 1);
assert.strictEqual(applyBusinessTeaser(pub, { ...profile, teaser_headline: 'Profitable importer' }).title, 'Profitable importer');
assert.strictEqual(applyBusinessTeaser(pub, null).title, 'Business in Banani');

const full = fullBusinessDetails(pub, profile);
assert.strictEqual(full.title, 'Rahim Traders Ltd');
assert.strictEqual(full.business.annual_turnover, 30000000);
assert.strictEqual(full.business.lease_details, 'Lease to 2030');
assert.strictEqual(full.business.confidential, false);
console.log('businessTeaser OK');
