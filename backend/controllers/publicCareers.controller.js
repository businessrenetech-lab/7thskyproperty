/**
 * /api/public/careers: the careers page and the candidate's offer page (plan Tasks 19 and 20; M3 §7, §8, §15).
 * No login. Applying is rate-limited and has a honeypot; an offer is reached only through its emailed token,
 * which is stored hashed. Only open vacancies and their public job description are shown.
 */
const fs = require('fs');
const sequelize = require('../config/db.config');
const { asyncHandler } = require('../utils/controllerHelpers');
const Org = require('../models/hrOrganisation');
const R = require('../models/hrRecruitment');
const Branch = require('../models/Branch');
const rules = require('../services/hrRecruitment.service');
const store = require('../services/hrRecruitmentStore');
const comms = require('../services/communication.service');

const bad = (res, status, error, extra = {}) => res.status(status).json({ error, ...extra });
const files = (req) => Object.values(req.files || {}).flat();
const discard = (req) => files(req).forEach((f) => fs.unlink(f.path, () => {}));
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const JD_PUBLIC = ['summary', 'duties', 'responsibilities', 'qualifications', 'experience', 'technical_skills', 'soft_skills', 'working_hours', 'career_path'];

async function publicRows(vacancies) {
  const ids = (k) => [...new Set(vacancies.map((v) => v[k]).filter(Boolean))];
  const [jds, deps, poss, branches] = await Promise.all([
    R.HrJobDescription.findAll({ where: { id: ids('job_description_id') }, raw: true }),
    Org.HrDepartment.findAll({ where: { id: ids('department_id') }, attributes: ['id', 'name'], raw: true }),
    Org.HrPosition.findAll({ where: { id: ids('position_id') }, attributes: ['id', 'title'], raw: true }),
    Branch.findAll({ where: { id: ids('location_branch_id') }, attributes: ['id', 'name'], raw: true }),
  ]);
  const find = (list, id) => list.find((x) => x.id === id) || {};
  return vacancies.map((v) => {
    const jd = find(jds, v.job_description_id);
    return {
      code: v.vacancy_code, slug: v.public_slug, title: jd.title || find(poss, v.position_id).title || v.vacancy_code,
      department: find(deps, v.department_id).name || null, location: find(branches, v.location_branch_id).name || null,
      employment_type: v.employment_type, positions: v.positions_count, closing_date: v.closing_date, published_at: v.published_at,
      salary_min: v.salary_min != null ? Number(v.salary_min) : null, salary_max: v.salary_max != null ? Number(v.salary_max) : null,
      job: Object.fromEntries(JD_PUBLIC.map((k) => [k, jd[k] || null])),
    };
  });
}

async function openVacancies() {
  const rows = (await R.HrVacancy.findAll({ where: { status: 'published' }, order: [['published_at', 'DESC']] })).map(store.plain);
  return rows.filter((v) => rules.isOpenForApplications(v));
}

exports.list = asyncHandler(async (req, res) => {
  const rows = await publicRows(await openVacancies());
  res.json({ data: rows.map(({ job, ...r }) => ({ ...r, summary: job.summary })) });
});

exports.get = asyncHandler(async (req, res) => {
  const v = await R.HrVacancy.findOne({ where: { public_slug: String(req.params.slug || '') } });
  if (!v || !rules.isOpenForApplications(store.plain(v))) return bad(res, 404, 'This vacancy is closed or does not exist');
  const [row] = await publicRows([store.plain(v)]);
  res.json(row);
});

// Upload fields on the form → document types (M3 §8). The first three are required, as in the approved design.
const DOC_FIELDS = { cv: 'CV', photo: 'Photo', national_id_doc: 'National ID', certificates: 'Educational Certificates', cover_letter_doc: 'Cover Letter', portfolio: 'Portfolio', licences: 'Licence Copies' };
const REQUIRED_DOCS = { cv: 'Attach your CV', photo: 'Attach a photograph', national_id_doc: 'Attach your National ID' };
exports.DOC_UPLOADS = Object.keys(DOC_FIELDS);

exports.apply = asyncHandler(async (req, res) => {
  const b = req.body || {};
  // Honeypot: people never see the "website" field, bots fill it. Answer as if it worked and keep nothing.
  if (String(b.website || '').trim()) { discard(req); return res.status(201).json({ message: 'Application received' }); }
  const v = await R.HrVacancy.findOne({ where: { public_slug: String(req.params.slug || '') } });
  if (!v || !rules.isOpenForApplications(store.plain(v))) { discard(req); return bad(res, 404, 'This vacancy is closed or does not exist'); }
  const name = String(b.full_name || '').trim();
  const email = String(b.email || '').trim().toLowerCase();
  const mobile = rules.normalizeMobile(b.mobile);
  const errors = {};
  if (!name || name.length > 150) errors.full_name = 'Enter your full name';
  if (!EMAIL.test(email) || email.length > 190) errors.email = 'Enter a valid email address';
  if (!mobile) errors.mobile = 'Enter a Bangladeshi mobile number, for example 01712345678';
  Object.entries(REQUIRED_DOCS).forEach(([k, msg]) => { if (!(req.files && req.files[k] && req.files[k].length)) errors[k] = msg; });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(b.date_of_birth || ''))) errors.date_of_birth = 'Enter your date of birth';
  if (!String(b.address || '').trim()) errors.address = 'Enter your address';
  if (!String(b.highest_qualification || '').trim()) errors.highest_qualification = 'Enter your highest qualification';
  if (!String(b.institution || '').trim()) errors.institution = 'Enter your institution';
  const gradYear = Number(b.graduation_year);
  if (!(Number.isInteger(gradYear) && gradYear >= 1950 && gradYear <= new Date().getFullYear() + 1)) errors.graduation_year = 'Enter your graduation year';
  if (String(b.consent) !== 'true' && String(b.consent) !== '1') errors.consent = 'Please agree so we can process your application';
  const years = b.years_experience === undefined || b.years_experience === '' ? null : Number(b.years_experience);
  if (years != null && !(years >= 0 && years <= 60)) errors.years_experience = 'Enter your years of experience as a number';
  if (Object.keys(errors).length) { discard(req); return bad(res, 400, 'Please check the highlighted fields', { fields: errors }); }

  const input = {
    full_name: name, email, mobile, national_id: String(b.national_id || '').trim() || null, address: String(b.address || '').slice(0, 2000) || null,
    date_of_birth: /^\d{4}-\d{2}-\d{2}$/.test(String(b.date_of_birth || '')) ? b.date_of_birth : null,
    highest_qualification: String(b.highest_qualification || '').slice(0, 150) || null, institution: String(b.institution || '').slice(0, 150) || null, graduation_year: gradYear,
    current_employer: String(b.current_employer || '').slice(0, 150) || null, current_position: String(b.current_position || '').slice(0, 150) || null,
    years_experience: years, expected_salary: Number(b.expected_salary) > 0 ? Number(b.expected_salary) : null,
    notice_period: String(b.notice_period || '').slice(0, 60) || null, location: String(b.location || '').slice(0, 120) || null,
    availability: String(b.availability || '').slice(0, 60) || null,
    skills: String(b.skills || '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 30),
  };

  let out;
  try {
    out = await sequelize.transaction(async (transaction) => {
      const all = await R.HrCandidate.findAll({ attributes: ['id', 'email', 'mobile', 'national_id', 'duplicate_of_id'], raw: true, transaction });
      const match = rules.findDuplicate(input, all);
      // M3 §20: the same person applying again keeps one candidate record. What is already on file is kept;
      // only the gaps are filled from this application.
      let cand;
      if (match) {
        cand = await R.HrCandidate.findByPk(match.duplicate_of_id || match.id, { transaction, lock: transaction.LOCK.UPDATE });
        const gaps = Object.fromEntries(Object.entries(input).filter(([k, val]) => val != null && (Array.isArray(val) ? val.length : true)
          && (cand[k] == null || cand[k] === '' || (Array.isArray(cand[k]) && !cand[k].length))));
        await cand.update({ ...gaps, archived_at: null }, { transaction });
      } else {
        cand = await R.HrCandidate.create({ ...input, branch_id: v.branch_id || null, candidate_code: await store.nextCode(R.HrCandidate, 'candidate_code', 'CAN-', transaction) }, { transaction });
      }
      if (await R.HrApplication.findOne({ where: { candidate_id: cand.id, vacancy_id: v.id }, transaction })) throw store.fail(409, 'You have already applied for this vacancy. We will be in touch.');
      const app = await R.HrApplication.create({
        candidate_id: cand.id, vacancy_id: v.id, status: 'Application Received', source: String(b.source || 'Careers Portal').slice(0, 60),
        cover_letter: String(b.cover_letter || '').slice(0, 10000) || null, applied_at: new Date(),
      }, { transaction });
      const differs = match && cand.full_name.trim().toLowerCase() !== name.toLowerCase() ? ` The form gave the name "${name}".` : '';
      await R.HrApplicationEvent.create({ application_id: app.id, kind: 'status', to_status: 'Application Received', at: new Date(), note: `Applied on the careers page${match ? ' (returning candidate)' : ''}.${differs}` }, { transaction });
      for (const [field, docType] of Object.entries(DOC_FIELDS)) {
        for (const f of (req.files && req.files[field]) || []) {
          await R.HrCandidateDocument.create({ candidate_id: cand.id, doc_type: docType, file_url: `/uploads/documents/${f.filename}`, file_name: f.originalname.slice(0, 255) }, { transaction });
        }
      }
      return { cand, app, returning: Boolean(match) };
    });
  } catch (e) {
    discard(req);
    if (e.status) return bad(res, e.status, e.message);
    throw e;
  }

  const [row] = await publicRows([store.plain(v)]);
  comms.sendEmail(email, `We received your application: ${row.title}`,
    `<p>Dear ${esc(name)},</p><p>Thank you for applying for <b>${esc(row.title)}</b> (${esc(v.vacancy_code)}) at Seventh Sky Private Ltd. Your reference is <b>${esc(out.cand.candidate_code)}</b>.</p><p>We review every application and will contact shortlisted candidates.</p><p>Human Resources, Seventh Sky Private Ltd</p>`, [], 'hr')
    .catch((e) => console.error('careers ack mail:', e.message));
  const hr = await store.usersWithHrRole(['hr_manager', 'hr_officer']);
  store.notify(hr, v.branch_id, 'New application', `${name} applied for ${row.title} (${v.vacancy_code}).`).catch(() => {});
  res.status(201).json({ message: 'Application received', reference: out.cand.candidate_code });
});

/* ── The candidate's offer (M3 §15) ───────────────────────────────────────── */

async function offerFor(token, transaction) {
  if (!/^[a-f0-9]{48}$/.test(String(token || ''))) return null;
  return R.HrOffer.findOne({ where: { token_hash: store.hashToken(token) }, transaction, ...(transaction ? { lock: transaction.LOCK.UPDATE } : {}) });
}

exports.getOffer = asyncHandler(async (req, res) => {
  const offer = await offerFor(req.params.token);
  if (!offer) return bad(res, 404, 'This offer link is not valid');
  const app = await R.HrApplication.findByPk(offer.application_id);
  const cand = await R.HrCandidate.findByPk(app.candidate_id, { attributes: ['full_name'] });
  const expired = offer.status === 'sent' && offer.token_expires_at && new Date(offer.token_expires_at) < new Date();
  res.json({
    status: expired ? 'expired' : offer.status, candidate_name: cand.full_name, letter_html: offer.letter_html,
    expires_at: offer.token_expires_at, accepted_at: offer.accepted_at, declined_at: offer.declined_at,
  });
});

exports.answerOffer = asyncHandler(async (req, res) => {
  const accept = req.params.answer === 'accept';
  if (!accept && req.params.answer !== 'decline') return bad(res, 404, 'Not found');
  const result = await sequelize.transaction(async (transaction) => {
    const offer = await offerFor(req.params.token, transaction);
    if (!offer) throw store.fail(404, 'This offer link is not valid');
    if (offer.status !== 'sent') throw store.fail(409, `You have already ${offer.status} this offer`);
    if (offer.token_expires_at && new Date(offer.token_expires_at) < new Date()) throw store.fail(410, 'This offer has expired. Please contact Human Resources.');
    const app = await R.HrApplication.findByPk(offer.application_id, { transaction, lock: transaction.LOCK.UPDATE });
    if (app.status !== 'Offer Sent') throw store.fail(409, 'This offer is no longer open');
    const ip = String(req.ip || '').slice(0, 64);
    const signed = String((req.body && req.body.full_name) || '').trim().replace(/\s+/g, ' ');
    if (accept) {
      const cand = await R.HrCandidate.findByPk(app.candidate_id, { attributes: ['full_name'], transaction });
      if (signed.toLowerCase() !== cand.full_name.trim().replace(/\s+/g, ' ').toLowerCase()) throw store.fail(400, 'Type your full name exactly as it appears on the letter');
    }
    if (accept) await offer.update({ status: 'accepted', accepted_at: new Date(), accepted_ip: ip }, { transaction });
    else await offer.update({ status: 'declined', declined_at: new Date(), decline_reason: String((req.body && req.body.reason) || '').slice(0, 2000) || null }, { transaction });
    await store.moveStatus(app, accept ? 'Offer Accepted' : 'Offer Declined', { note: accept ? `Accepted online by typing "${signed}", from ${ip}` : `Declined online${offer.decline_reason ? `: ${offer.decline_reason}` : ''}`, transaction });
    return { offer, app };
  }).catch((e) => { if (e.status) return { error: e }; throw e; });
  if (result.error) return bad(res, result.error.status, result.error.message);
  const cand = await R.HrCandidate.findByPk(result.app.candidate_id, { attributes: ['full_name', 'candidate_code'] });
  const hr = await store.usersWithHrRole(['hr_manager', 'hr_officer']);
  store.notify(hr, null, accept ? 'Offer accepted' : 'Offer declined', `${cand.full_name} (${cand.candidate_code}) ${accept ? 'accepted' : 'declined'} the offer.`).catch(() => {});
  res.json({ status: result.offer.status });
});

exports.openVacancies = openVacancies;
