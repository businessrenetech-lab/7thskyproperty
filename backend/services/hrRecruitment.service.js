/**
 * Recruitment rules (HRM Module 3). Pure functions: no database, so scripts/testHrRecruitment.js covers them.
 *
 *   screeningScore      M3 §11 weighted scorecard, 0–100
 *   allowedNext         M3 §2/§10 status order; Not Selected and Talent Pool from any open status
 *   checksComplete      M3 §14 only required checks count; nothing recorded is not complete
 *   canTransfer         M3 §21 the four conditions before a candidate becomes an employee
 *   findDuplicate       M3 §20 email, Bangladeshi mobile or National ID (deterministic, not AI)
 *   nextYearCode        M3 §17 VAC-2026-0001, CAN-2026-0001 (numbering restarts each year)
 */
const { APPLICANT_STATUSES } = require('../config/hrCatalog');

const DEFAULT_WEIGHTS = Object.freeze({ education: 15, experience: 30, technical: 20, communication: 15, cultural_fit: 10, certifications: 10 });
const CRITERIA_LABELS = { education: 'Education', experience: 'Relevant experience', technical: 'Technical skills', communication: 'Communication skills', cultural_fit: 'Cultural fit', certifications: 'Certifications' };

function screeningScore(scores = {}, weights = DEFAULT_WEIGHTS) {
  const total = Object.values(weights).reduce((a, b) => a + Number(b || 0), 0);
  if (Math.abs(total - 100) > 0.001) throw new Error('The weights must add up to 100.');
  let sum = 0;
  Object.entries(weights).forEach(([k, w]) => {
    const s = Math.min(5, Math.max(0, Number(scores[k]) || 0));
    sum += (s / 5) * Number(w);
  });
  return Math.round(sum * 10) / 10;
}

const CLOSED = ['Offer Accepted', 'Offer Declined', 'Not Selected', 'Talent Pool'];
const FORWARD = {
  'Application Received': ['Under Review', 'Shortlisted'],
  'Under Review': ['Shortlisted'],
  Shortlisted: ['Interview Scheduled'],
  'Interview Scheduled': ['Interview Completed'],
  'Interview Completed': ['Interview Scheduled', 'Assessment Pending', 'Reference Check'],
  'Assessment Pending': ['Assessment Completed'],
  'Assessment Completed': ['Reference Check'],
  'Reference Check': ['Offer Pending'],
  'Offer Pending': ['Offer Sent'],
  // Offer Sent → Accepted/Declined happens only through the candidate's own answer on the offer page.
  'Offer Sent': [],
};

/** Statuses HR may move an application to from `status`. */
function allowedNext(status) {
  if (status === 'Not Selected' || status === 'Offer Declined') return ['Talent Pool'];
  if (CLOSED.includes(status) || !APPLICANT_STATUSES.includes(status)) return [];
  return [...(FORWARD[status] || []), 'Not Selected', 'Talent Pool'];
}

function checksComplete(checks = []) {
  const required = checks.filter((c) => c.required);
  const missing = required.filter((c) => c.status !== 'done').map((c) => c.check_type);
  return { ok: checks.length > 0 && missing.length === 0, missing };
}

function canTransfer(application, offer, checks, approvals, hrConfirmed) {
  const reasons = [];
  if (application?.hired_employee_id) reasons.push('This candidate has already been transferred.');
  if (!offer || offer.status !== 'accepted' || application?.status !== 'Offer Accepted') reasons.push('The offer has not been accepted.');
  const c = checksComplete(checks || []);
  if (!c.ok) reasons.push(c.missing.length ? `Pre-employment checks not complete: ${c.missing.join(', ')}.` : 'No pre-employment checks are recorded.');
  if (!approvals?.length || approvals.some((a) => a.status !== 'approved')) reasons.push('The vacancy approvals are not complete.');
  if (!hrConfirmed) reasons.push('HR has not confirmed onboarding.');
  return { ok: reasons.length === 0, reasons };
}

/** A Bangladeshi mobile as +8801XXXXXXXXX, or null. */
function normalizeMobile(raw) {
  const d = String(raw || '').replace(/\D/g, '');
  const local = d.startsWith('880') ? d.slice(3) : d.startsWith('0') ? d.slice(1) : d;
  return /^1[3-9]\d{8}$/.test(local) ? `+880${local}` : null;
}
const normEmail = (e) => String(e || '').trim().toLowerCase() || null;
const normId = (n) => String(n || '').replace(/\s+/g, '') || null;

/** The existing candidate this input matches, preferring the original over a marked duplicate. */
function findDuplicate(input, candidates = []) {
  const email = normEmail(input.email);
  const mobile = normalizeMobile(input.mobile);
  const nid = normId(input.national_id);
  if (!email && !mobile && !nid) return null;
  const hits = candidates.filter((c) => (email && normEmail(c.email) === email)
    || (mobile && normalizeMobile(c.mobile) === mobile)
    || (nid && normId(c.national_id) === nid));
  return hits.find((c) => !c.duplicate_of_id) || hits[0] || null;
}

function nextYearCode(prefix, year, lastCode) {
  const head = `${prefix}${year}-`;
  const n = lastCode && String(lastCode).startsWith(head) ? parseInt(String(lastCode).slice(head.length), 10) || 0 : 0;
  return head + String(n + 1).padStart(4, '0');
}

const vacancySlug = (title, code) => `${String(title || 'vacancy').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120)}-${String(code).toLowerCase()}`;

const dhakaDate = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(d);
/** Published and not past its closing date (judged in Dhaka, like Hadi's job board). */
function isOpenForApplications(vacancy, now = new Date()) {
  if (!vacancy || vacancy.status !== 'published') return false;
  return !vacancy.closing_date || String(vacancy.closing_date).slice(0, 10) >= dhakaDate(now);
}

/** Scheduled interviews starting in the next 24 hours that have not had their reminder. */
function dueInterviewReminders(interviews, now = new Date()) {
  const t = now.getTime();
  return interviews.filter((i) => {
    if (i.status !== 'scheduled' || i.reminder_sent_at) return false;
    const at = new Date(i.scheduled_at).getTime();
    return at > t && at - t <= 24 * 3600 * 1000;
  });
}

const icsStamp = (d) => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const icsText = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/[,;]/g, (m) => `\\${m}`).replace(/\r?\n/g, '\\n');
/** An RFC 5545 invite for one interview. */
function icsFor(interview, { title = 'Interview', org = 'Seventh Sky Private Ltd', candidate = '' } = {}) {
  const start = new Date(interview.scheduled_at);
  const end = new Date(start.getTime() + (Number(interview.duration_minutes) || 45) * 60000);
  const where = interview.meeting_link || interview.location || '';
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', `PRODID:-//${icsText(org)}//HR//EN`, 'METHOD:REQUEST', 'BEGIN:VEVENT',
    `UID:hr-interview-${interview.id}@seventhskyproperty.com`, `DTSTAMP:${icsStamp(new Date())}`,
    `DTSTART:${icsStamp(start)}`, `DTEND:${icsStamp(end)}`,
    `SUMMARY:${icsText(`${interview.type}: ${title}${candidate ? ` (${candidate})` : ''}`)}`,
    `LOCATION:${icsText(where)}`, `DESCRIPTION:${icsText(`${org} ${interview.type}${interview.meeting_link ? `\nJoin: ${interview.meeting_link}` : ''}`)}`,
    'END:VEVENT', 'END:VCALENDAR', '',
  ].join('\r\n');
}

const fmtDay = (d) => new Date(`${String(d).slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
/** Ready-to-post text for LinkedIn, Facebook and Bdjobs. */
function shareText(vacancy, url) {
  return [
    `We're hiring: ${vacancy.title} at Seventh Sky Private Ltd (${vacancy.vacancy_code}).`,
    vacancy.closing_date ? `Apply by ${fmtDay(vacancy.closing_date)}.` : 'Applications are open now.',
    `Apply here: ${url}`,
  ].join('\n');
}

module.exports = {
  DEFAULT_WEIGHTS, CRITERIA_LABELS, CLOSED, screeningScore, allowedNext, checksComplete, canTransfer, findDuplicate, normalizeMobile,
  nextYearCode, vacancySlug, isOpenForApplications, dueInterviewReminders, icsFor, shareText, dhakaDate,
};
