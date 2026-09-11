// backend/utils/businessDays.js — weekdays only (Mon–Fri), no holiday calendar.
const midnight = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const isWeekend = (d) => d.getDay() === 0 || d.getDay() === 6;

// Advance `date` by n business days (n>=0). n=0 returns the same (normalised) day.
function addBusinessDays(date, n) {
  const d = midnight(date); let left = Math.max(0, Math.floor(n));
  while (left > 0) { d.setDate(d.getDate() + 1); if (!isWeekend(d)) left--; }
  return d;
}

// Count weekdays strictly after `from`, up to and including `to`.
// Positive when `to` is after `from` (business days remaining), negative when before.
function businessDaysBetween(from, to) {
  const a = midnight(from); const b = midnight(to);
  if (a.getTime() === b.getTime()) return 0;
  const forward = b > a; const step = forward ? 1 : -1;
  let count = 0; const d = new Date(a);
  while (d.getTime() !== b.getTime()) { d.setDate(d.getDate() + step); if (!isWeekend(d)) count += step; }
  return count;
}

module.exports = { addBusinessDays, businessDaysBetween };
