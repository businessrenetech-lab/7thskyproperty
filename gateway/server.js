const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = 3000;

// ─── Admin Portal (all staff roles) ────────────────────────────────────────────
app.use('/admin', createProxyMiddleware({
  target: 'http://127.0.0.1:5174',
  changeOrigin: true,
  ws: true,
  pathRewrite: (p, req) => req.originalUrl,
}));

// ─── Student Portal (separate) ─────────────────────────────────────────────────
app.use('/student', createProxyMiddleware({
  target: 'http://127.0.0.1:5173',
  changeOrigin: true,
  ws: true,
  pathRewrite: (p, req) => req.originalUrl,
}));

// ─── Teacher Portal ────────────────────────────────────────────────────────────
app.use('/teacher', createProxyMiddleware({
  target: 'http://127.0.0.1:5175',
  changeOrigin: true,
  ws: true,
  pathRewrite: (p, req) => req.originalUrl,
}));

// ─── Accounting Portal ─────────────────────────────────────────────────────────
app.use('/accounting', createProxyMiddleware({
  target: 'http://127.0.0.1:5176',
  changeOrigin: true,
  ws: true,
  pathRewrite: (p, req) => req.originalUrl,
}));

// ─── HR Portal ─────────────────────────────────────────────────────────────────
app.use('/hrm', createProxyMiddleware({
  target: 'http://127.0.0.1:5177',
  changeOrigin: true,
  ws: true,
  pathRewrite: (p, req) => req.originalUrl,
}));

// ─── Brand Manager / CRM Portal ────────────────────────────────────────────────
app.use('/brandmanager', createProxyMiddleware({
  target: 'http://127.0.0.1:5178',
  changeOrigin: true,
  ws: true,
  pathRewrite: (p, req) => req.originalUrl,
}));

// ─── Backend API ───────────────────────────────────────────────────────────────
app.use('/api', createProxyMiddleware({
  target: 'http://127.0.0.1:5000',
  changeOrigin: true,
  pathRewrite: (p, req) => req.originalUrl,
}));

// ─── Uploads (backend-served files) ────────────────────────────────────────────
app.use('/uploads', createProxyMiddleware({
  target: 'http://127.0.0.1:5000',
  changeOrigin: true,
  pathRewrite: (p, req) => req.originalUrl,
}));

// ─── Website (Next.js catch-all) ───────────────────────────────────────────────
app.use('/', createProxyMiddleware({
  target: 'http://127.0.0.1:3001',
  changeOrigin: true,
  ws: true,
}));

app.listen(PORT, () => {
  console.log(`\n  ╔══════════════════════════════════════╗`);
  console.log(`  ║  Language Academy Gateway · :${PORT}    ║`);
  console.log(`  ╠══════════════════════════════════════╣`);
  console.log(`  ║  Website  → localhost:${PORT}            ║`);
  console.log(`  ║  Admin    → localhost:${PORT}/admin      ║`);
  console.log(`  ║  Student  → localhost:${PORT}/student    ║`);
  console.log(`  ║  Teacher  → localhost:${PORT}/teacher    ║`);
  console.log(`  ║  HRM      → localhost:${PORT}/hrm        ║`);
  console.log(`  ║  Accounts → localhost:${PORT}/accounting ║`);
  console.log(`  ║  CRM      → localhost:${PORT}/brandmanager║`);
  console.log(`  ║  API      → localhost:${PORT}/api        ║`);
  console.log(`  ╚══════════════════════════════════════╝\n`);
});
