import http from 'http';

async function runTests() {
  console.log('--- Starting Mock Server Verification ---');
  
  // Dynamically import server
  const serverProcess = await import('./server.js');
  
  // Wait 1 second for port 5050 to bind
  await new Promise(r => setTimeout(r, 1200));

  const endpoints = [
    { method: 'GET', path: '/api/properties' },
    { method: 'GET', path: '/api/properties/SSP-GUL-902' },
    { method: 'GET', path: '/api/services' },
    { 
      method: 'POST', 
      path: '/api/enquiries', 
      body: { propertyCode: 'SSP-GUL-902', name: 'Test User', phone: '+88017000000', message: 'Test' } 
    },
    { 
      method: 'POST', 
      path: '/api/inspections/book', 
      body: { propertyCode: 'SSP-GUL-902', name: 'Test User', phone: '+88017000000', timeSlot: 'Saturday 11:00 AM' } 
    },
    { 
      method: 'POST', 
      path: '/api/appraisals/book', 
      body: { propertyAddress: 'Gulshan 2', ownerName: 'Test Owner', phone: '+88017000000' } 
    },
    { 
      method: 'POST', 
      path: '/api/auth/client-login', 
      body: { email: 'owner@seventhskyproperty.com', password: 'Admin' } 
    },
    { method: 'GET', path: '/api/testimonials' },
    { method: 'GET', path: '/api/faqs' },
    { method: 'GET', path: '/api/docs' }
  ];

  let passed = 0;
  for (const ep of endpoints) {
    try {
      const res = await fetch(`http://localhost:5050${ep.path}`, {
        method: ep.method,
        headers: { 'Content-Type': 'application/json' },
        body: ep.body ? JSON.stringify(ep.body) : undefined
      });
      const data = await res.json();
      if (res.status === 200 || res.status === 201) {
        console.log(`[PASS] ${ep.method} ${ep.path} -> ${res.status} OK (data keys: ${Object.keys(data).join(', ')})`);
        passed++;
      } else {
        console.error(`[FAIL] ${ep.method} ${ep.path} -> ${res.status}`, data);
      }
    } catch (err) {
      console.error(`[ERR] ${ep.method} ${ep.path}`, err.message);
    }
  }

  console.log(`\nResults: ${passed}/${endpoints.length} mock endpoints verified successfully.`);
  process.exit(passed === endpoints.length ? 0 : 1);
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
