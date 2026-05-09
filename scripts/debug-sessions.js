// Quick test for teacher-sessions error
const http = require('http');
const request = (method, path, body, token) => new Promise((resolve, reject) => {
  const url = new URL(path, 'http://localhost:5000');
  const options = { hostname: url.hostname, port: url.port, path: url.pathname + url.search, method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } };
  const req = http.request(options, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve({ status: res.statusCode, data: d })); });
  req.on('error', reject);
  if (body) req.write(JSON.stringify(body));
  req.end();
});

(async () => {
  const loginRes = await request('POST', '/api/auth/login', { email: 'admin@renetech.com', password: 'Redowan173123' });
  const { token } = JSON.parse(loginRes.data);
  console.log('Token:', token ? 'OK' : 'FAIL');

  const r = await request('GET', '/api/payroll/teacher-sessions?month=4&year=2026', null, token);
  console.log('Status:', r.status);
  console.log('Body:', r.data.substring(0, 800));
})();
