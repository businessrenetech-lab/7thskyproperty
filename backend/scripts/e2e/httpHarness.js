// Shared helpers for the e2e scripts: admin login, JSON requests, PASS/FAIL log.
const http = require('http');

const PORT = Number(process.env.PORT) || 50001;
const EMAIL = process.env.E2E_EMAIL || 'admin@seventhskyproperty.com';
const PASSWORD = process.env.E2E_PASSWORD || 'Admin#2026';
const STAMP = Date.now().toString().slice(-6);
const R = { pass: 0, fail: 0 };
let TOKEN = '';

function ok(cond, msg, detail) {
  R[cond ? 'pass' : 'fail'] += 1;
  const tag = cond ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
  console.log(`${tag}\t${msg}${detail !== undefined ? `  \x1b[2m${detail}\x1b[0m` : ''}`);
  return cond;
}

function req(method, path, opts = {}) {
  return new Promise((resolve) => {
    const data = opts.body ? JSON.stringify(opts.body) : null;
    const headers = { 'X-Branch-Id': '1' };
    if (!opts.noAuth && TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
    if (data) { headers['Content-Type'] = 'application/json'; headers['Content-Length'] = Buffer.byteLength(data); }
    const r = http.request({ host: '127.0.0.1', port: PORT, method, path, headers }, (x) => {
      let d = ''; x.on('data', (c) => { d += c; });
      x.on('end', () => { let j; try { j = JSON.parse(d); } catch { j = { _raw: d.slice(0, 300) }; } resolve({ status: x.statusCode, body: j }); });
    });
    r.on('error', (e) => resolve({ status: 0, body: { _err: e.message } }));
    if (data) r.write(data);
    r.end();
  });
}

async function login() {
  const r = await req('POST', '/api/auth/login', { noAuth: true, body: { email: EMAIL, password: PASSWORD } });
  TOKEN = r.body?.token || '';
  return ok(!!TOKEN, 'admin login', EMAIL);
}

function finish() {
  console.log(`\n${R.fail ? '\x1b[31m' : '\x1b[32m'}${R.pass} PASS / ${R.fail} FAIL\x1b[0m`);
  process.exit(R.fail ? 1 : 0);
}

module.exports = { login, req, ok, finish, STAMP };
