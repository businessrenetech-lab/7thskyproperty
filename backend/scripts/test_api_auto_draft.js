'use strict';
require('dotenv').config();
const http = require('http');

async function testApi() {
  console.log('--- Testing Auto-Draft Endpoints via HTTP ---');
  
  // 1. Login to get JWT
  const loginPayload = JSON.stringify({ email: 'admin@seventhskyproperty.com', password: 'Admin#2026' });
  const loginRes = await fetchJson('POST', 'http://127.0.0.1:50001/api/auth/login', loginPayload);
  const token = loginRes.token || loginRes.accessToken;
  console.log('Login status:', loginRes.token ? 'JWT OK' : 'Failed', 'User:', loginRes.user?.name);

  // 2. Fetch latest property
  const propRes = await fetchJson('GET', 'http://127.0.0.1:50001/api/properties?limit=1', null, token);
  const property = propRes.data?.[0] || propRes.rows?.[0];
  console.log('Testing with property:', property?.id, property?.title);

  if (!property) {
    console.log('No property available to test.');
    process.exit(1);
  }

  // 3. Test POST /api/properties/:id/draft-campaign
  console.log('\n--- Calling POST /api/properties/' + property.id + '/draft-campaign ---');
  const draftRes1 = await fetchJson('POST', `http://127.0.0.1:50001/api/properties/${property.id}/draft-campaign`, JSON.stringify({ force: true }), token);
  console.log('Response Status:', draftRes1.campaign ? '200 OK' : 'Error');
  console.log('Campaign ID:', draftRes1.campaign?.id);
  console.log('Campaign Name:', draftRes1.campaign?.name);
  console.log('Campaign Code:', draftRes1.campaign?.campaign_code);
  console.log('Subject:', draftRes1.campaign?.subject);
  console.log('Audience Count:', draftRes1.campaign?.recipient_count);

  // 4. Test POST /api/marketing/campaigns/auto-draft/:propertyId
  console.log('\n--- Calling POST /api/marketing/campaigns/auto-draft/' + property.id + ' ---');
  const draftRes2 = await fetchJson('POST', `http://127.0.0.1:50001/api/marketing/campaigns/auto-draft/${property.id}`, JSON.stringify({ force: false }), token);
  console.log('Retrieved Existing Draft:', draftRes2.is_new === false);
  console.log('Message:', draftRes2.message);

  process.exit(0);
}

function fetchJson(method, urlStr, data, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    if (data) options.headers['Content-Length'] = Buffer.byteLength(data);
    if (token) options.headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch {
          resolve({ raw: body, statusCode: res.statusCode });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

testApi().catch(err => {
  console.error(err);
  process.exit(1);
});
