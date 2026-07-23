/**
 * app.js — Passenger/Hostinger Node.js entry point for the Next.js website.
 *
 * Hostinger's "Setup Node.js App" (Phusion Passenger) runs a single JS file,
 * not `next start`. This boots the production Next.js server and lets Passenger
 * own the socket/port (passed via process.env.PORT).
 *
 * Requires a production build first:  npm run build
 * Set the startup file to this app.js in hPanel → Node.js App.
 */
const { createServer } = require('http');
const next = require('next');

const app = next({ dev: false, dir: __dirname });
const handle = app.getRequestHandler();
const port = process.env.PORT || 3000;

app.prepare().then(() => {
  createServer((req, res) => handle(req, res)).listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`✓ Website (Next.js) running on port ${port}`);
  });
}).catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Website failed to start:', err);
  process.exit(1);
});
