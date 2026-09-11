// backend/scripts/testBusinessDays.js — unit checks for the business-day helper.
const assert = require('assert');
const { addBusinessDays, businessDaysBetween } = require('../utils/businessDays');
const D = (s) => new Date(s + 'T00:00:00'); // 2026-09-11 Fri, 14 Mon, 18 Fri, 21 Mon
let pass = 0; const ok = (c, m) => { assert.ok(c, m); pass++; };

ok(addBusinessDays(D('2026-09-11'), 1).getDate() === 14, 'Fri +1 = Mon 14');   // skip Sat/Sun
ok(addBusinessDays(D('2026-09-14'), 5).getDate() === 21, 'Mon +5 = next Mon 21');
ok(addBusinessDays(D('2026-09-11'), 0).getDate() === 11, '+0 = same day');
ok(businessDaysBetween(D('2026-09-14'), D('2026-09-18')) === 4, 'Mon→Fri = 4');
ok(businessDaysBetween(D('2026-09-11'), D('2026-09-14')) === 1, 'Fri→Mon = 1 (weekend skipped)');
ok(businessDaysBetween(D('2026-09-14'), D('2026-09-14')) === 0, 'same day = 0');
ok(businessDaysBetween(D('2026-09-18'), D('2026-09-14')) === -4, 'Fri→Mon backward = -4');

console.log(`${pass} PASS / 0 FAIL (businessDays)`);
