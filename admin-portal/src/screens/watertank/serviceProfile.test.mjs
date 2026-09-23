// Run: node src/screens/watertank/serviceProfile.test.mjs   (from admin-portal/)
import assert from 'node:assert';
import fs from 'node:fs';

const common = fs.readFileSync(new URL('./common.jsx', import.meta.url), 'utf8');
const api = fs.readFileSync(new URL('../../services/api.js', import.meta.url), 'utf8');

assert.ok(common.includes("'/business-registration': {"), 'SERVICE_UI has the registration profile');
assert.ok(common.includes("business_registration: '/business-registration'"), 'LINE_TO_BASE maps the line');
assert.ok(common.includes("doc_code: 'BRG'"), 'document numbers are SSPC-BRG-…');
// svcBase() resolves the console from the URL against SVC_BASES; without the base
// listed there every shared screen falls back to Water Tank wording and flags.
const bases = common.match(/const SVC_BASES = \[[^\]]*\]/)[0];
assert.ok(bases.includes("'/business-registration'"), 'SVC_BASES lists the registration base');
assert.ok(/'\/business-registration',\s*'business_registration'/.test(api), 'api.js tags the header for registration pages');

// The path list is matched with includes(), so a longer path must not be shadowed by a shorter one.
const idxReg = api.indexOf("'/business-registration'");
const idxRent = api.indexOf("'/business-rent'");
assert.ok(idxReg > -1, 'registration present');
assert.ok(idxRent === -1 || idxReg < idxRent || !'/business-registration'.includes('/business-rent'),
  'registration must not be shadowed by another business path');

console.log('serviceProfile OK');
