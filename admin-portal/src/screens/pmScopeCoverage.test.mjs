// Run: node src/screens/pmScopeCoverage.test.mjs   (from admin-portal/)
// Guards the invariant: a screen rendered inside a PM console must know its scope.
// Seven of these had no usePmScope at all, so they showed every console's data.
import assert from 'node:assert';
import fs from 'node:fs';

const SCREENS = ['BulkRentCollection', 'BulkOwnerDisbursement', 'Compliance',
  'Communication', 'GlobalInvoicing', 'RentReminders', 'Projects'];

for (const name of SCREENS) {
  const src = fs.readFileSync(new URL(`./${name}.jsx`, import.meta.url), 'utf8');
  assert.ok(src.includes('usePmScope'), `${name} must read the console scope`);
  // Either idiom is fine: a template string or a params object.
  assert.ok(/property_category[=:]\s*\$?\{?scope\.category|category=\$\{scope\.category\}|vertical_key/.test(src),
    `${name} must send its category (or a vertical_key) to the API`);
}

console.log('pmScopeCoverage OK');
