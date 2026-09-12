// Residential Interior Design CSA pack renders faithfully.
const assert = require('assert');
const svc = require('../services/wtCustomerAgreement.service');

const out = svc.buildAgreement({
  vertical: 'residential_interior_design_csa',
  client: { full_name: 'Test Client', email: 't@example.com' },
  org: { represented_by: 'SS Rep', position: 'Director' },
  services: [],
  pricing: { lines: [], summary: {}, payment_schedule: [] },
  schedule_b: { property_address: 'Dhaka', design_style: 'Modern' },
});

assert.ok(out && out.html, 'buildAgreement returns html');
assert.equal(out.doc_no, 'SSPC-RIDS-CSA-01', 'residential doc number');
assert.ok(/RESIDENTIAL INTERIOR DESIGN/i.test(out.html), 'title present');
assert.ok(/SCHEDULE A/i.test(out.html), 'Schedule A present');
assert.ok(/SCHEDULE C/i.test(out.html), 'Schedule C present');
assert.ok(/Interior Design &amp; Planning|Interior Design & Planning/.test(out.html), 'Schedule A group present');
assert.ok(/WARRANT/i.test(out.html), 'warranty/Schedule D present');
// pack content exposed for the builder UI
const content = svc.contentFor('residential_interior_design_csa');
assert.ok(content.service_groups['Interior Design & Planning'], 'service group exposed');
assert.ok(content.service_groups['Renovation & Fit-Out'], 'renovation group exposed');

console.log('PASS interiorPack');
