// Config check for the Residential Interior Design service line + flags.
const assert = require('assert');
const { getServiceLine, serviceLineForRelatedType } = require('../config/serviceLines');

const sl = getServiceLine('residential_interior_design');
assert.ok(sl && sl.key === 'residential_interior_design', 'residential_interior_design line exists');
assert.equal(sl.parent.key, 'interior_design', 'grouped under interior_design parent');
assert.equal(sl.api_base, 'wt', 'shares the wt engine');
assert.equal(sl.no_provider, true, 'no_provider flag set');
assert.equal(sl.no_amc, true, 'no_amc flag set');
assert.equal(sl.variations, true, 'variations module on');
assert.equal(sl.completion_signoff, true, 'completion_signoff module on');
assert.equal(sl.related_type.customer, 'residential_interior_design_customer_agreement', 'customer related_type');
assert.ok(!sl.related_type.provider, 'no provider related_type');
assert.ok(!sl.code_prefix.provider, 'no provider code prefix');
assert.equal(sl.code_prefix.client, 'RIDS-C', 'client code prefix');
assert.equal(sl.code_prefix.invoice, 'RIDI-', 'invoice code prefix');
assert.equal(sl.catalogue_vertical, 'residential_interior_design_csa', 'catalogue vertical');
assert.equal(serviceLineForRelatedType('residential_interior_design_customer_agreement'), 'residential_interior_design', 'related_type maps back for auto-invoicing');

// serviceFlags accessor
const { serviceFlags } = require('../utils/controllerHelpers');
const flags = serviceFlags({ headers: { 'x-service-line': 'residential_interior_design' } });
assert.deepEqual(flags, { no_provider: true, no_amc: true, variations: true, completion_signoff: true }, 'serviceFlags reflects config');

console.log('PASS interiorConfig');
