'use strict';
/**
 * testUploadSignature.js
 * Verifies that an uploaded image signature (data:image/png;base64,...)
 * is accepted by POST /api/sign/:token/sign, saved into signature_fields (MEDIUMTEXT),
 * and rendered as an <img> tag in the final signed document.
 */
const http = require('http');
const PORT = 50001;
const EMAIL = 'admin@seventhskyproperty.com';
const PASSWORD = 'Admin#2026';
const STAMP = Date.now().toString().slice(-6);
let TOKEN = '';

function req(method, path, body = null, headers = {}) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null;
    const h = {
      'Content-Type': 'application/json',
      'X-Branch-Id': '1',
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
      ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      ...headers,
    };
    const r = http.request({ host: '127.0.0.1', port: PORT, method, path, headers: h }, (res) => {
      let buf = '';
      res.on('data', (c) => (buf += c));
      res.on('end', () => {
        let json;
        try { json = JSON.parse(buf); } catch { json = { _raw: buf }; }
        resolve({ status: res.statusCode, headers: res.headers, body: json, raw: buf });
      });
    });
    r.on('error', (e) => resolve({ status: 0, body: { error: e.message } }));
    if (data) r.write(data);
    r.end();
  });
}

(async () => {
  console.log('=== TEST UPLOADED SIGNATURE PLACEMENT ===');

  // 1. Admin login
  const login = await req('POST', '/api/auth/login', { email: EMAIL, password: PASSWORD });
  TOKEN = login.body?.token || '';
  if (!TOKEN) throw new Error('Admin login failed: ' + JSON.stringify(login.body));

  // 2. Contact + Property
  const c = await req('POST', '/api/contacts', {
    full_name: `Sig Landlord ${STAMP}`,
    primary_phone: `0177${STAMP}`,
    email: `sigll${STAMP}@example.com`,
    contact_type: 'individual',
    national_id: `199${STAMP}`,
  });
  const contactId = c.body?.data?.id;

  const prop = await req('POST', '/api/properties', {
    title: `Sig Flat ${STAMP}`,
    category: 'residential',
    property_type: 'apartment',
    listing_type: 'rent',
    status: 'available',
    owner_contact_id: contactId,
    approved_monthly_rent: 40000,
  });
  const propId = prop.body?.data?.id;
  console.log(`Created contact #${contactId}, property #${propId}`);

  // 3. Draft PM Agreement
  const body = {
    property_id: propId,
    client_contact_id: contactId,
    client: { full_name: c.body.data.full_name, email: c.body.data.email, nid: '19900000', property_address: 'Banani' },
    org: { represented_by: 'Seventh Sky Rep', position: 'PM Director', email: 'rep@seventhsky.com' },
    witnesses: [{ name: 'PM Witness', email: `pmw${STAMP}@example.com` }],
    services: ['Rental Consultation', 'Rental Market Assessment', 'Tenant Sourcing'],
    pricing_input: { monthly_rent: 40000, selected: [{ code: 'RPRM-004' }, { code: 'RPRM-006' }], frequency: 'Monthly' },
    schedule_b: { expected_rent: 40000 },
    save_as_draft: true,
  };

  const draft = await req('POST', '/api/rprm/agreements', body);
  const envId = draft.body?.id;
  console.log(`Created PM agreement envelope #${envId}`);

  // 4. Send agreement
  const send = await req('POST', `/api/rprm/agreements/${envId}/send`, {});
  console.log(`Sent PM agreement: status ${send.status}`);

  // 5. Get signing links
  const links = await req('GET', `/api/signing/envelopes/${envId}/links`);
  const list = (links.body?.data?.links || []).sort((a, b) => (a.order || 0) - (b.order || 0));
  console.log(`Retrieved ${list.length} signer links`);

  // 6. Signer #1 (Landlord) signs using an UPLOADED image (data:image/png;base64,...)
  const testSamplePngBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAA0SURBVGhD7c4BDQAwDMCg+Tedq7h4ZkE2knrn1n1HRESkp6enp6enp6enp6enp6enp6cnX59aAj3aCugLAAAAAElFTkSuQmCC';
  const first = list[0];
  const firstToken = (first.link || '').split('/').pop();
  const firstView = await req('GET', `/api/sign/${firstToken}`);
  const firstFields = (firstView.body?.data?.fields || firstView.body?.fields || []).map((f) => ({
    id: f.id,
    value: f.field_type === 'signature' ? testSamplePngBase64 : new Date().toISOString().slice(0, 10),
  }));

  const signFirst = await req('POST', `/api/sign/${firstToken}/sign`, { fields: firstFields });
  console.log(`Signer 1 (Landlord) signed with uploaded image: HTTP ${signFirst.status} - ${signFirst.body?.message || signFirst.raw}`);

  // 7. Sign remaining parties
  for (let i = 1; i < list.length; i++) {
    const l = list[i];
    const tok = (l.link || '').split('/').pop();
    const v = await req('GET', `/api/sign/${tok}`);
    const flds = (v.body?.data?.fields || v.body?.fields || []).map((f) => ({
      id: f.id,
      value: f.field_type === 'signature' ? `${l.name} /sig/` : new Date().toISOString().slice(0, 10),
    }));
    const s = await req('POST', `/api/sign/${tok}/sign`, { fields: flds });
    console.log(`Signer ${i + 1} (${l.name}) signed: HTTP ${s.status}`);
  }

  // 8. Fetch completed document and assert uploaded image placement
  const signedDoc = await req('GET', `/api/sign/${firstToken}/signed-document`);
  const html = typeof signedDoc.body === 'string' ? signedDoc.body : (signedDoc.body?._raw || signedDoc.raw);

  const hasImgTag = html.includes('<img src="data:image/png;base64,');
  const hasAlt = html.includes('alt="Signature of');
  console.log(`\nASSERTION: Uploaded image rendered in final document <img> tag? ${hasImgTag ? 'PASS' : 'FAIL'}`);
  console.log(`ASSERTION: Signature alt attribute included? ${hasAlt ? 'PASS' : 'FAIL'}`);

  if (hasImgTag && hasAlt) {
    console.log('\nSUCCESS! Uploaded signature image verified end-to-end flawlessly!');
    process.exit(0);
  } else {
    console.error('\nFAILURE! Image was not embedded in signed document.');
    process.exit(1);
  }
})().catch((err) => {
  console.error('Test crashed:', err);
  process.exit(1);
});
