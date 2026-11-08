// Recruitment rules (HRM plan Task 17). Run: node scripts/testHrRecruitment.js — silent on success.
const assert = require('assert');
const {
  DEFAULT_WEIGHTS, screeningScore, allowedNext, checksComplete, canTransfer, findDuplicate, nextYearCode,
  normalizeMobile, vacancySlug, dueInterviewReminders, icsFor, isOpenForApplications, shareText,
} = require('../services/hrRecruitment.service');

// ── Screening (M3 §11) ──────────────────────────────────────────────────────
assert.strictEqual(Object.values(DEFAULT_WEIGHTS).reduce((a, b) => a + b, 0), 100);
assert.strictEqual(screeningScore({ education: 5, experience: 5, technical: 5, communication: 5, cultural_fit: 5, certifications: 5 }), 100);
assert.strictEqual(screeningScore({ education: 4, experience: 3, technical: 5, communication: 4, cultural_fit: 3, certifications: 0 }), 68);
assert.strictEqual(screeningScore({ education: 3 }), 9);                          // missing criteria count as 0
assert.strictEqual(screeningScore({ education: 9, experience: -2 }), 15);         // scores clamp to 0–5
assert.throws(() => screeningScore({}, { education: 50 }));

// ── Status moves (M3 §2, §10) ───────────────────────────────────────────────
assert.ok(allowedNext('Shortlisted').includes('Interview Scheduled'));
assert.ok(!allowedNext('Application Received').includes('Offer Sent'));
assert.ok(allowedNext('Under Review').includes('Not Selected'));
assert.ok(allowedNext('Interview Completed').includes('Talent Pool'));
assert.ok(allowedNext('Interview Completed').includes('Interview Scheduled'));    // another round
assert.ok(allowedNext('Interview Completed').includes('Reference Check'));        // assessment is optional
assert.deepStrictEqual(allowedNext('Offer Accepted'), []);                         // only the transfer moves it on
assert.deepStrictEqual(allowedNext('Not Selected'), ['Talent Pool']);
assert.deepStrictEqual(allowedNext('Offer Declined'), ['Talent Pool']);
assert.deepStrictEqual(allowedNext('Talent Pool'), []);
assert.deepStrictEqual(allowedNext('Nonsense'), []);
assert.ok(!allowedNext('Offer Sent').includes('Offer Accepted'));                  // the candidate accepts, not HR

// ── Pre-employment checks (M3 §14) ──────────────────────────────────────────
assert.deepStrictEqual(checksComplete([{ check_type: 'Reference Checks', required: true, status: 'done' }, { check_type: 'Police Clearance', required: true, status: 'pending' }]).missing, ['Police Clearance']);
assert.strictEqual(checksComplete([{ check_type: 'Medical Assessment', required: false, status: 'pending' }]).ok, true);
assert.strictEqual(checksComplete([{ check_type: 'Identity Verification', required: true, status: 'failed' }]).ok, false);
assert.strictEqual(checksComplete([]).ok, false);                                  // nothing recorded is not complete

// ── Transfer to the Employee Master (M3 §21) ────────────────────────────────
const t = canTransfer({ status: 'Offer Accepted' }, { status: 'accepted' }, [{ required: true, status: 'pending', check_type: 'Identity Verification' }], [], false);
assert.strictEqual(t.ok, false); assert.strictEqual(t.reasons.length, 3);       // checks, approvals, HR confirmation
const done = [{ required: true, status: 'done', check_type: 'Identity Verification' }];
assert.strictEqual(canTransfer({ status: 'Offer Accepted' }, { status: 'accepted' }, done, [{ status: 'approved' }], true).ok, true);
assert.strictEqual(canTransfer({ status: 'Offer Sent' }, { status: 'sent' }, done, [{ status: 'approved' }], true).ok, false);
assert.strictEqual(canTransfer({ status: 'Offer Accepted' }, null, done, [{ status: 'approved' }], true).ok, false);
assert.strictEqual(canTransfer({ status: 'Offer Accepted', hired_employee_id: 4 }, { status: 'accepted' }, done, [{ status: 'approved' }], true).ok, false);   // once only
assert.strictEqual(canTransfer({ status: 'Offer Accepted' }, { status: 'accepted' }, done, [{ status: 'approved' }, { status: 'pending' }], true).ok, false);

// ── Duplicates (M3 §20, Review Focus 5) ─────────────────────────────────────
assert.ok(findDuplicate({ email: ' Ayesha@Mail.com ' }, [{ id: 1, email: 'ayesha@mail.com' }]));
assert.ok(findDuplicate({ mobile: '01711-000000' }, [{ id: 1, mobile: '+8801711000000' }]));
assert.ok(findDuplicate({ national_id: ' 1990 123 ' }, [{ id: 1, national_id: '1990123' }]));
assert.strictEqual(findDuplicate({ email: 'new@mail.com', mobile: '01800000000' }, [{ id: 1, email: 'old@mail.com', mobile: '+8801711000000' }]), null);
assert.strictEqual(findDuplicate({}, [{ id: 1, email: null, mobile: null }]), null);   // empty never matches empty
assert.strictEqual(findDuplicate({ email: 'a@b.com' }, [{ id: 3, email: 'a@b.com', duplicate_of_id: 1 }, { id: 1, email: 'a@b.com' }]).id, 1);   // the original

assert.strictEqual(normalizeMobile('01711-000000'), '+8801711000000');
assert.strictEqual(normalizeMobile('8801711000000'), '+8801711000000');
assert.strictEqual(normalizeMobile('+880 1711 000000'), '+8801711000000');
assert.strictEqual(normalizeMobile('12345'), null);

// ── Codes and slugs (M3 §17) ────────────────────────────────────────────────
assert.strictEqual(nextYearCode('VAC-', 2026, 'VAC-2025-0009'), 'VAC-2026-0001');
assert.strictEqual(nextYearCode('VAC-', 2026, 'VAC-2026-0009'), 'VAC-2026-0010');
assert.strictEqual(nextYearCode('CAN-', 2026, null), 'CAN-2026-0001');
assert.strictEqual(vacancySlug('Senior Property Manager (Dhaka)', 'VAC-2026-0003'), 'senior-property-manager-dhaka-vac-2026-0003');

// ── Open for applications: published, not past the closing date in Dhaka ────
const at = new Date('2026-10-30T19:00:00Z');                                       // 31 Oct 01:00 in Dhaka
assert.strictEqual(isOpenForApplications({ status: 'published', closing_date: '2026-10-31' }, at), true);
assert.strictEqual(isOpenForApplications({ status: 'published', closing_date: '2026-10-30' }, at), false);
assert.strictEqual(isOpenForApplications({ status: 'published', closing_date: null }, at), true);
assert.strictEqual(isOpenForApplications({ status: 'closed', closing_date: null }, at), false);

// ── Interview reminders (M3 §12): once, about 24 hours before ───────────────
const now = new Date('2026-10-30T06:00:00Z');
const rows = [
  { id: 1, status: 'scheduled', scheduled_at: '2026-10-31T05:00:00Z', reminder_sent_at: null },   // in 23 h → due
  { id: 2, status: 'scheduled', scheduled_at: '2026-11-02T05:00:00Z', reminder_sent_at: null },   // too far
  { id: 3, status: 'scheduled', scheduled_at: '2026-10-31T05:00:00Z', reminder_sent_at: '2026-10-30T05:00:00Z' },
  { id: 4, status: 'cancelled', scheduled_at: '2026-10-31T05:00:00Z', reminder_sent_at: null },
  { id: 5, status: 'scheduled', scheduled_at: '2026-10-30T05:00:00Z', reminder_sent_at: null },   // already past
];
assert.deepStrictEqual(dueInterviewReminders(rows, now).map((r) => r.id), [1]);

// ── Calendar invite ─────────────────────────────────────────────────────────
const ics = icsFor({ id: 7, type: 'Online Interview', scheduled_at: '2026-11-02T04:30:00Z', duration_minutes: 45, meeting_link: 'https://meet.example/abc' }, { title: 'Property Manager', org: 'Seventh Sky Private Ltd' });
assert.match(ics, /BEGIN:VCALENDAR/);
assert.match(ics, /DTSTART:20261102T043000Z/);
assert.match(ics, /DTEND:20261102T051500Z/);
assert.match(ics, /UID:hr-interview-7@/);
assert.match(ics, /\r\n/);                                                           // RFC 5545 line endings

// ── Job-board text (open question 3: no partner API yet) ────────────────────
const s = shareText({ title: 'Property Manager', vacancy_code: 'VAC-2026-0001', closing_date: '2026-11-30' }, 'https://example.com/admin/careers/pm-vac-2026-0001');
assert.match(s, /Property Manager/);
assert.match(s, /30 Nov 2026/);
assert.match(s, /https:\/\/example.com\/admin\/careers\/pm-vac-2026-0001/);

// ── The offer letter template loses anything that could run on the public offer page ──
{
  const { stripActive } = require('../services/hrRecruitmentStore');
  const out = stripActive('<p onclick="x()">Hi {{candidate_name}}</p><script>alert(1)</script><img src=x onerror=alert(1)><a href="javascript:go()">a</a><iframe src="//e"></iframe><table style="width:100%"><tr><td>Pay</td></tr></table>');
  assert.ok(!/script|onerror|onclick|javascript:|iframe/i.test(out), out);
  assert.match(out, /<p>Hi \{\{candidate_name\}\}<\/p>/);
  assert.match(out, /<table style="width:100%"><tr><td>Pay<\/td><\/tr><\/table>/);
  assert.strictEqual(stripActive('<SCRIPT src=x>'), '');
}
