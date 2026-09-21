/**
 * Every route the dev server mounts (server.js) must also be in the production
 * manifest (routes/manifest.js). production-server.js mounts ONLY the manifest,
 * so a route missing there works locally and 404s in production.
 * Server-free: parses source, never touches the DB.
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const serverSrc = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
const manifest = require('../routes/manifest');
const inManifest = new Set(manifest.map(([p]) => p));

const devMounts = [...serverSrc.matchAll(/mount\('([^']+)',\s*'\.\/routes\/([^']+)'\)/g)].map((m) => [m[1], m[2]]);
const missing = devMounts.filter(([p]) => !inManifest.has(p));
assert.deepStrictEqual(
  missing, [],
  `Mounted in server.js but missing from routes/manifest.js:\n${missing.map((m) => `  ${m[0]} -> ${m[1]}`).join('\n')}`,
);

// Manifest entries whose module doesn't exist are skipped by BOTH servers at boot
// (resilient mounting), so they aren't a parity bug — report them, don't fail.
const dead = manifest.filter(([, mod]) => {
  try { require.resolve(path.join(__dirname, '..', 'routes', mod)); return false; } catch { return true; }
});
if (dead.length) console.warn(`warning: manifest modules not found (skipped in dev and prod alike): ${dead.map(([p, m]) => `${p} -> ${m}`).join(', ')}`);

console.log(`manifest parity OK — ${devMounts.length} dev mounts, ${manifest.length} manifest entries`);
