/**
 * /api/hr/employees: the Employee Master Database (plan Task 11; client spec Module 2).
 *
 * Every record leaves through present(), which applies the CEO's access settings: payroll only with
 * emp.view_payroll, sensitive fields only with emp.view_sensitive, other people's records only with
 * emp.view_any or (for managers) emp.view_team. People always see their own record (M2 §10).
 * Changes the spec governs (M2 §9) become change requests; everything else is written now and logged (§6).
 * Nothing is deleted: employees are deactivated (a status change) and then archived.
 */
const { Op } = require('sequelize');
const { asyncHandler, getPagination } = require('../utils/controllerHelpers');
const catalog = require('../config/hrCatalog');
const Org = require('../models/hrOrganisation');
const User = require('../models/User');
const { HrEmployee, HrEmployeeDocument, HrEmployeeNote, HrEmployeeType, HrOnboardingTask, SECTIONS, EDITABLE } = require('../models/hrEmployee');
const { HrChangeRequest, HrHistory } = require('../models/hrChange');
const { can, maskEmployee, PAYROLL_FIELDS, SENSITIVE_FIELDS, ROLE_LABELS } = require('../services/hrAccess.service');
const rules = require('../services/hrEmployee.service');
const { pendingConflict, LABELS } = require('../services/hrApproval.service');
const { raise, logHistory } = require('../services/hrRequests');
const store = require('../services/hrEmployeeStore');

const bad = (res, status, error) => res.status(status).json({ error });
const allowed = (req, a) => can(req.hrRole, a, req.hrSettings);
const myEmployeeId = (req) => (req.hrContext && req.hrContext.employee ? req.hrContext.employee.id : null);

// Documents only some people may open (M2 §10): identity and medical need sensitive access, money needs payroll.
const SENSITIVE_DOCS = ['National ID', 'Passport', 'Medical Certificate', 'Police Clearance', 'Warning Letters', 'Resignation Letter', 'Exit Documents'];
const PAYROLL_DOCS = ['Bank Details', 'Tax Documents'];
const COST_FIELDS = ['salary_grade_id', 'salary_grade_name', 'cost_centre_id', 'cost_centre_name'];

/** The viewer as maskEmployee needs it; the team is looked up only for people who need it. */
const viewerOf = async (req) => {
  if (!req.hrViewer) {
    const employeeId = myEmployeeId(req);
    const teamIds = !allowed(req, 'emp.view_any') && allowed(req, 'emp.view_team') ? await store.teamOf(employeeId) : [];
    req.hrViewer = { hrRole: req.hrRole, employeeId, teamIds };
  }
  return req.hrViewer;
};

/** One record as this viewer may see it, with names; null when they may not see it. */
const present = async (req, emp) => {
  const viewer = await viewerOf(req);
  const masked = maskEmployee(emp, viewer, req.hrSettings);
  if (!masked) return null;
  const own = viewer.employeeId != null && Number(viewer.employeeId) === Number(emp.id);
  const [out] = await store.decorate([masked]);
  if (!own && !allowed(req, 'emp.view_payroll') && !allowed(req, 'org.view_cost')) COST_FIELDS.forEach((f) => { delete out[f]; });
  out.restricted = {
    payroll: !own && !allowed(req, 'emp.view_payroll'),
    sensitive: !own && !allowed(req, 'emp.view_sensitive'),
  };
  out.own = own;
  return out;
};
const presentMany = async (req, rows) => (await Promise.all(rows.map((r) => present(req, r)))).filter(Boolean);

const docVisible = (req, doc, own) => own || allowed(req, 'emp.edit')
  || (SENSITIVE_DOCS.includes(doc.doc_type) ? allowed(req, 'emp.view_sensitive') : PAYROLL_DOCS.includes(doc.doc_type) ? allowed(req, 'emp.view_payroll') : allowed(req, 'emp.view_any'));

const findByCode = (code) => HrEmployee.findOne({ where: { employee_code: code } });
/** The employee the URL names, if this viewer may see them. Sends the error itself. */
const load = async (req, res) => {
  const row = await findByCode(req.params.code);
  if (!row) { bad(res, 404, 'Employee not found'); return null; }
  const emp = store.plain(row);
  const shown = await present(req, emp);
  if (!shown) { bad(res, 403, 'You do not have access to this'); return null; }
  return { row, emp, shown };
};

/** Positions at the top, or reporting straight to the top: appointing someone there is a senior appointment. */
const seniorPositionIds = async () => {
  const ps = await Org.HrPosition.findAll({ attributes: ['id', 'is_top', 'reports_to_position_id'], raw: true });
  const top = ps.filter((p) => p.is_top).map((p) => p.id);
  return ps.filter((p) => p.is_top || top.includes(p.reports_to_position_id)).map((p) => p.id);
};

/** Fill company and division from the department, and check the position and team belong to it. */
const fillLinks = async (data) => {
  const out = { ...data };
  if (out.department_id) {
    const dep = await Org.HrDepartment.findByPk(out.department_id);
    if (!dep || !dep.is_active) return { error: 'That department does not exist or is inactive' };
    const div = await Org.HrDivision.findByPk(dep.division_id);
    out.division_id = dep.division_id;
    out.company_id = div ? div.company_id : out.company_id;
    if (out.position_id) {
      const pos = await Org.HrPosition.findByPk(out.position_id);
      if (!pos || !pos.is_active) return { error: 'That position does not exist or is inactive' };
      if (Number(pos.department_id) !== Number(dep.id)) return { error: 'That position belongs to another department' };
      if (!out.team_id && pos.team_id) out.team_id = pos.team_id;
    }
    if (out.team_id) {
      const team = await Org.HrTeam.findByPk(out.team_id);
      if (!team || Number(team.department_id) !== Number(dep.id)) return { error: 'That team belongs to another department' };
    }
  }
  if (out.supervisor_employee_id) {
    const sup = await HrEmployee.findByPk(out.supervisor_employee_id, { attributes: ['id', 'status', 'archived_at'] });
    if (!sup || sup.archived_at || !catalog.SEAT_HOLDING_STATUSES.includes(sup.status)) return { error: 'The supervisor must be a current employee' };
  }
  return { data: out };
};
const isTop = async (positionId) => Boolean(positionId && (await Org.HrPosition.findOne({ where: { id: positionId, is_top: true }, attributes: ['id'] })));

/* ── lists ─────────────────────────────────────────────────────────────── */

// GET /api/hr/employees/meta: the lists the forms need.
exports.meta = asyncHandler(async (req, res) => {
  const types = await HrEmployeeType.findAll({ order: [['id', 'ASC']] });
  res.json({
    statuses: catalog.EMPLOYMENT_STATUSES, moves: rules.MOVES, lifecycle: catalog.LIFECYCLE_STAGES, documentTypes: catalog.DOCUMENT_TYPES,
    types: types.map((t) => t.get({ plain: true })), loginRoles: store.LOGIN_ROLES.map((r) => ({ key: r, label: r === 'employee' ? 'Employee' : ROLE_LABELS[r] })),
    genders: ['Male', 'Female', 'Other'], bloodGroups: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], maritalStatuses: ['Single', 'Married', 'Divorced', 'Widowed'],
  });
});

// GET /api/hr/employees: search with the M2 §7 filters.
exports.list = asyncHandler(async (req, res) => {
  const q = req.query;
  const { limit, offset, page } = getPagination(req, 25, 200);
  const where = {};
  if (q.archived !== '1') where.archived_at = null;
  if (q.q) where[Op.or] = [{ full_name: { [Op.like]: `%${q.q}%` } }, { preferred_name: { [Op.like]: `%${q.q}%` } }, { employee_code: { [Op.like]: `%${q.q}%` } }];
  ['department_id', 'division_id', 'position_id', 'supervisor_employee_id', 'employee_type', 'team_id'].forEach((k) => { if (q[k]) where[k] = q[k]; });
  if (q.location) where.work_location_branch_id = q.location;
  if (q.status) where.status = String(q.status).split(',');
  if (q.salary_grade_id && (allowed(req, 'emp.view_payroll') || allowed(req, 'org.view_cost'))) where.salary_grade_id = q.salary_grade_id;
  if (q.joined_from || q.joined_to) where.joining_date = { ...(q.joined_from ? { [Op.gte]: q.joined_from } : {}), ...(q.joined_to ? { [Op.lte]: q.joined_to } : {}) };
  if (q.contract_before) where.contract_end_date = { [Op.ne]: null, [Op.lte]: q.contract_before };
  const idSets = [];
  if (q.document_before) {
    idSets.push((await HrEmployeeDocument.findAll({ where: { expiry_date: { [Op.ne]: null, [Op.lte]: q.document_before } }, attributes: ['employee_id'], raw: true })).map((d) => d.employee_id));
  }
  if (q.licence) {
    const like = q.licence === 'any' ? {} : { [Op.or]: [{ notes: { [Op.like]: `%${q.licence}%` } }, { file_name: { [Op.like]: `%${q.licence}%` } }] };
    idSets.push((await HrEmployeeDocument.findAll({ where: { doc_type: ['Licence Copies', 'Professional Certificates'], verification_status: { [Op.ne]: 'rejected' }, ...like }, attributes: ['employee_id'], raw: true })).map((d) => d.employee_id));
  }
  if (q.skill) {
    const term = String(q.skill).toLowerCase();
    const ps = await Org.HrPosition.findAll({ attributes: ['id', 'skills'] });
    const ids = ps.filter((p) => (p.skills || []).some((s) => String(s).toLowerCase().includes(term))).map((p) => p.id);
    if (where.position_id && !ids.includes(Number(where.position_id))) idSets.push([]);
    else where.position_id = where.position_id || ids;
  }
  // Who this viewer may list at all.
  if (!allowed(req, 'emp.view_any')) {
    const viewer = await viewerOf(req);
    idSets.push([...(allowed(req, 'emp.view_team') ? viewer.teamIds : []), viewer.employeeId].filter(Boolean));
  }
  if (idSets.length) where.id = idSets.reduce((a, b) => a.filter((x) => b.includes(x)));

  const { rows, count } = await HrEmployee.findAndCountAll({ where, limit, offset, order: [['full_name', 'ASC']] });
  res.json({ data: await presentMany(req, rows.map(store.plain)), total: count, page });
});

/* ── one employee ──────────────────────────────────────────────────────── */

/** Supervisor → department manager → division head → CEO (M1 §4.5). */
const reportingLine = async (emp) => {
  const line = [];
  const seen = new Set([emp.id]);
  const person = async (id, role) => {
    if (!id || seen.has(Number(id))) return;
    if ((await store.uplineOf(id)).includes(emp.id)) return;   // someone below them is not in their line
    const p = await HrEmployee.findByPk(id, { attributes: ['id', 'full_name', 'employee_code', 'position_id'], raw: true });
    if (p) { seen.add(p.id); line.push({ ...p, role }); }
  };
  await person(emp.supervisor_employee_id, 'Supervisor');
  const dep = emp.department_id ? await Org.HrDepartment.findByPk(emp.department_id, { raw: true }) : null;
  await person(dep && dep.manager_employee_id, 'Department manager');
  const div = emp.division_id ? await Org.HrDivision.findByPk(emp.division_id, { raw: true }) : null;
  await person(div && div.head_employee_id, 'Division head');
  const top = await Org.HrPosition.findOne({ where: { is_top: true, is_active: true }, raw: true });
  if (top) { const ceo = await store.holderOf(top.id); if (ceo) await person(ceo.id, top.title); }
  const titles = await Org.HrPosition.findAll({ where: { id: line.map((p) => p.position_id).filter(Boolean) }, attributes: ['id', 'title'], raw: true });
  return line.map((p) => ({ ...p, position_title: (titles.find((t) => t.id === p.position_id) || {}).title || null }));
};

const typeRules = async () => Object.fromEntries((await HrEmployeeType.findAll()).map((t) => [t.name, t.required_documents || []]));

exports.get = asyncHandler(async (req, res) => {
  const found = await load(req, res);
  if (!found) return undefined;
  const { emp, shown } = found;
  const docs = (await HrEmployeeDocument.findAll({ where: { employee_id: emp.id }, order: [['uploaded_at', 'DESC']] })).map(store.plain);
  const isHr = allowed(req, 'emp.edit');
  const inTeam = (await viewerOf(req)).teamIds.includes(emp.id);
  const noteWhere = isHr ? {} : inTeam ? { visibility: 'manager' } : null;
  const [notes, onboarding, pending, line, required] = await Promise.all([
    noteWhere ? HrEmployeeNote.findAll({ where: { employee_id: emp.id, ...noteWhere }, order: [['id', 'DESC']], raw: true }) : [],
    HrOnboardingTask.findAll({ where: { employee_id: emp.id }, order: [['id', 'ASC']], raw: true }),
    HrChangeRequest.findAll({ where: { entity_type: 'employee', entity_id: emp.id, status: 'pending' }, order: [['id', 'DESC']] }),
    reportingLine(emp), typeRules(),
  ]);
  const login = emp.user_id ? await User.findByPk(emp.user_id, { attributes: ['id', 'email', 'role', 'status'], raw: true }) : null;
  return res.json({
    ...shown,
    reporting_line: line,
    documents: docs.filter((d) => docVisible(req, d, shown.own)),
    missing_documents: rules.missingDocuments(emp, docs, required),
    notes,
    onboarding,
    pending_changes: pending.map((p) => ({ id: p.id, code: p.code, kind: p.kind, label: LABELS[p.kind], fields: Object.keys(p.payload || {}), step_role: ROLE_LABELS[(p.chain[p.step] || {}).role] })),
    login: isHr || shown.own ? login : null,
    next_statuses: rules.nextStatuses(emp.status),
  });
});

exports.create = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const data = store.only(body, EDITABLE);
  const missing = ['full_name', 'employee_type', 'joining_date'].filter((k) => !data[k]);
  if (missing.length) return bad(res, 400, `Required: ${missing.join(', ')}`);
  if (data.status && !['Offer Accepted', 'Onboarding', 'Probation', 'Active'].includes(data.status)) return bad(res, 400, 'A new employee starts as Offer Accepted, Onboarding, Probation or Active');
  const type = await HrEmployeeType.findOne({ where: { name: data.employee_type, is_active: true } });
  if (!type) return bad(res, 400, 'Choose an employee type from the list');
  const filled = await fillLinks(data);
  if (filled.error) return bad(res, 400, filled.error);
  const gaps = rules.missingLinks(filled.data, { topPosition: await isTop(filled.data.position_id) });
  if (gaps.length) return bad(res, 400, `Required: ${gaps.join(', ')}`);
  const email = String(body.login_email || data.work_email || data.personal_email || '').trim().toLowerCase();
  if (email) {
    const user = await User.findOne({ where: { email }, attributes: ['id', 'role'] });
    if (user && !rules.canLinkLogin(user)) return bad(res, 409, 'That email belongs to a customer account. Use a work email for the employee.');
    if (user && await HrEmployee.findOne({ where: { user_id: user.id }, attributes: ['id'] })) return bad(res, 409, 'That email already belongs to another employee');
  }
  if (data.national_id && await HrEmployee.findOne({ where: { national_id: data.national_id }, attributes: ['id'] })) return bad(res, 409, 'An employee with that National ID already exists');
  try {
    const cr = await raise(req, {
      kind: 'emp.create', entity_type: 'employee',
      payload: { ...filled.data, login_email: email || null, login_role: store.LOGIN_ROLES.includes(body.login_role) ? body.login_role : 'employee' },
      reason: body.reason || null,
    });
    return res.status(202).json({ change_request: store.plain(cr), message: 'Sent to the HR Manager for approval' });
  } catch (err) { return bad(res, err.status || 500, err.message); }
});

exports.update = asyncHandler(async (req, res) => {
  const found = await load(req, res);
  if (!found) return undefined;
  const { emp } = found;
  if (emp.archived_at) return bad(res, 400, 'An archived record cannot be changed');
  const body = req.body || {};
  // HR edits everything; Finance may only propose payroll changes (M2 §9 Finance approvals).
  const fields = allowed(req, 'emp.edit') ? EDITABLE : allowed(req, 'emp.view_payroll') ? SECTIONS.payroll : [];
  if (!fields.length) return bad(res, 403, 'You do not have access to this');
  let after = store.only(body, fields);
  if ('department_id' in after || 'position_id' in after || 'team_id' in after) {
    const filled = await fillLinks({ ...store.only(emp, ['department_id', 'position_id', 'team_id']), ...after });
    if (filled.error) return bad(res, 400, filled.error);
    after = { ...after, ...store.only(filled.data, ['company_id', 'division_id', 'department_id', 'team_id', 'position_id']) };
  }
  if ('supervisor_employee_id' in after && after.supervisor_employee_id) {
    if (Number(after.supervisor_employee_id) === emp.id) return bad(res, 400, 'Someone cannot supervise themselves');
    const filled = await fillLinks({ supervisor_employee_id: after.supervisor_employee_id });
    if (filled.error) return bad(res, 400, filled.error);
  }
  if (after.status && after.status !== emp.status && !rules.nextStatuses(emp.status).includes(after.status)) {
    return bad(res, 400, `An employee who is ${emp.status} cannot become ${after.status}`);
  }
  if (after.employee_type && !(await HrEmployeeType.findOne({ where: { name: after.employee_type } }))) return bad(res, 400, 'Choose an employee type from the list');
  const gaps = rules.missingLinks({ ...emp, ...after }, { topPosition: await isTop(after.position_id || emp.position_id) });
  if (gaps.length && Object.keys(after).some((k) => ['company_id', 'division_id', 'department_id', 'position_id', 'supervisor_employee_id'].includes(k))) {
    return bad(res, 400, `Required: ${gaps.join(', ')}`);
  }

  const { governed, direct } = rules.groupChanges(emp, after, { promotion: Boolean(body.promotion), seniorPositionIds: await seniorPositionIds() });
  const pending = (await HrChangeRequest.findAll({ where: { entity_type: 'employee', entity_id: emp.id, status: 'pending' } })).map(store.plain);
  const clash = Object.keys(governed).map((k) => pendingConflict(k, 'employee', emp.id, pending)).find(Boolean);
  if (clash) return bad(res, 409, `A change to this is already waiting for approval (${clash.code})`);
  try {
    const requests = [];
    for (const [kind, payload] of Object.entries(governed)) {
      requests.push(store.plain(await raise(req, { kind, entity_type: 'employee', entity_id: emp.id, payload, before: store.only(emp, Object.keys(payload)), reason: body.reason || null })));
    }
    const updated = Object.keys(direct).length ? await store.updateEmployee(emp.id, direct, req) : emp;
    return res.status(requests.length ? 202 : 200).json({ employee: await present(req, updated), change_requests: requests, written: Object.keys(direct) });
  } catch (err) { return bad(res, err.status || 500, err.message); }
});

/* ── documents, notes, onboarding ──────────────────────────────────────── */

// multer has already saved the file by the time we check; a refused upload must not leave it behind.
const discard = (req) => { if (req.file) require('fs').unlink(req.file.path, () => {}); };
exports.addDocument = asyncHandler(async (req, res) => {
  const found = await load(req, res);
  if (!found) { discard(req); return undefined; }
  if (!allowed(req, 'emp.edit') && !found.shown.own) { discard(req); return bad(res, 403, 'You do not have access to this'); }
  if (!req.file) return bad(res, 400, 'Choose a file to upload');
  const { doc_type, expiry_date, notes } = req.body || {};
  if (!catalog.DOCUMENT_TYPES.includes(doc_type)) { discard(req); return bad(res, 400, 'Choose a document type from the list'); }
  const doc = await HrEmployeeDocument.create({
    employee_id: found.emp.id, doc_type, file_url: `/uploads/documents/${req.file.filename}`, file_name: req.file.originalname,
    uploaded_by: req.user.id, expiry_date: expiry_date || null, notes: notes || null,
  });
  await logHistory(req, 'employee', found.emp.id, {}, { document: `${doc_type} uploaded` });
  return res.status(201).json(store.plain(doc));
});

exports.verifyDocument = asyncHandler(async (req, res) => {
  const found = await load(req, res);
  if (!found) return undefined;
  const doc = await HrEmployeeDocument.findOne({ where: { id: req.params.id, employee_id: found.emp.id } });
  if (!doc) return bad(res, 404, 'Document not found');
  const status = (req.body || {}).status;
  if (!['verified', 'rejected'].includes(status)) return bad(res, 400, 'Status must be verified or rejected');
  if (status === 'rejected' && !String(req.body.notes || '').trim()) return bad(res, 400, 'Say why it is rejected');
  if (found.shown.own) return bad(res, 403, 'Someone else in HR must check documents on your own record');
  await doc.update({ verification_status: status, verified_by: req.user.id, verified_at: new Date(), notes: req.body.notes || doc.notes });
  await logHistory(req, 'employee', found.emp.id, {}, { document: `${doc.doc_type} ${status}` });
  return res.json(store.plain(doc));
});

exports.addNote = asyncHandler(async (req, res) => {
  const found = await load(req, res);
  if (!found) return undefined;
  const body = String((req.body || {}).body || '').trim();
  if (!body) return bad(res, 400, 'Write the note first');
  const isHr = allowed(req, 'emp.edit');
  const inTeam = (await viewerOf(req)).teamIds.includes(found.emp.id);
  if (!isHr && !inTeam) return bad(res, 403, 'You do not have access to this');
  const visibility = isHr && req.body.visibility !== 'manager' ? 'hr' : 'manager';
  const note = await HrEmployeeNote.create({ employee_id: found.emp.id, body, visibility, created_by: req.user.id });
  return res.status(201).json(store.plain(note));
});

exports.doneTask = asyncHandler(async (req, res) => {
  const found = await load(req, res);
  if (!found) return undefined;
  const task = await HrOnboardingTask.findOne({ where: { id: req.params.taskId, employee_id: found.emp.id } });
  if (!task) return bad(res, 404, 'Task not found');
  const mayDo = allowed(req, 'emp.edit') || (found.shown.own && task.owner === 'employee');
  if (!mayDo) return bad(res, 403, 'You do not have access to this');
  const done = (req.body || {}).done !== false;
  await task.update({ done_at: done ? new Date() : null, done_by: done ? req.user.id : null });
  return res.json(store.plain(task));
});

/* ── history ───────────────────────────────────────────────────────────── */

// M2 §6: field changes, approvals, leave and attendance in one timeline.
exports.history = asyncHandler(async (req, res) => {
  const found = await load(req, res);
  if (!found) return undefined;
  const { emp, shown } = found;
  const hidden = new Set([...(shown.restricted.payroll ? PAYROLL_FIELDS.concat(['salary_grade_id']) : []), ...(shown.restricted.sensitive ? SENSITIVE_FIELDS : [])]);
  const rows = (await HrHistory.findAll({ where: { entity_type: 'employee', entity_id: emp.id }, order: [['id', 'DESC']], limit: 300, raw: true }))
    .filter((h) => !hidden.has(h.field));
  const actors = await User.findAll({ where: { id: [...new Set(rows.map((h) => h.actor_id).filter(Boolean))] }, attributes: ['id', 'name'], raw: true });
  const events = rows.map((h) => ({ type: 'change', at: h.at, field: h.field, old_value: h.old_value, new_value: h.new_value, change_request_id: h.change_request_id, by: (actors.find((a) => a.id === h.actor_id) || {}).name || null }));
  if (emp.user_id) {
    const LeaveRequest = require('../models/LeaveRequest');
    const StaffAttendance = require('../models/StaffAttendance');
    const leaves = await LeaveRequest.findAll({ where: { user_id: emp.user_id }, order: [['start_date', 'DESC']], limit: 50, raw: true });
    leaves.forEach((l) => events.push({ type: 'leave', at: l.created_at || l.createdAt || l.start_date, start_date: l.start_date, end_date: l.end_date, days: Number(l.total_days), status: l.status }));
    const att = await StaffAttendance.findAll({ where: { user_id: emp.user_id }, attributes: ['date', 'status'], raw: true });
    const months = {};
    att.forEach((a) => { const m = String(a.date).slice(0, 7); months[m] = months[m] || { present: 0, late: 0, absent: 0, half_day: 0, on_leave: 0 }; months[m][a.status] = (months[m][a.status] || 0) + 1; });
    Object.entries(months).forEach(([m, c]) => events.push({ type: 'attendance', at: `${m}-28`, month: m, ...c }));
  }
  events.sort((a, b) => new Date(b.at) - new Date(a.at));
  res.json({ data: events });
});

/* ── export, deactivate, archive, login ────────────────────────────────── */

const LABEL = (k) => k.replace(/_/g, ' ').replace(/ id$/, ' ID').replace(/ no$/, ' no.').replace(/^./, (c) => c.toUpperCase());
const SKIP = ['id', 'user_id', 'branch_id', 'created_by', 'restricted', 'own', 'createdAt', 'updatedAt', 'company_id', 'division_id', 'department_id', 'team_id', 'position_id',
  'supervisor_employee_id', 'work_location_branch_id', 'cost_centre_id', 'salary_grade_id', 'photo_url'];
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

exports.exportRecord = asyncHandler(async (req, res) => {
  const found = await load(req, res);
  if (!found) return undefined;
  const pairs = Object.entries(found.shown).filter(([k, v]) => !SKIP.includes(k) && v != null && v !== '' && typeof v !== 'object')
    .map(([k, v]) => [LABEL(k), typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v)]);
  await logHistory(req, 'employee', found.emp.id, {}, { exported: req.query.format === 'csv' ? 'CSV' : 'printable record' });
  if (req.query.format === 'csv') {
    const cell = (s) => { let t = String(s); if (/^[=+\-@]/.test(t)) t = `'${t}`; return /[",\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${found.emp.employee_code}.csv"`);
    return res.send(`﻿Field,Value\r\n${pairs.map(([a, b]) => `${cell(a)},${cell(b)}`).join('\r\n')}\r\n`);
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(found.emp.employee_code)}</title>
<style>body{font:13px/1.5 system-ui,sans-serif;color:#0F172A;margin:32px}h1{font-size:20px;margin:0}p{color:#64748B;margin:4px 0 20px}
table{border-collapse:collapse;width:100%}td{padding:6px 8px;border-bottom:1px solid #E2E8F0;vertical-align:top}td:first-child{color:#64748B;width:38%}</style></head>
<body onload="window.print()"><h1>${esc(found.shown.full_name)}</h1><p>${esc(found.emp.employee_code)} · Employee record · printed ${new Date().toLocaleDateString('en-GB')}</p>
<table>${pairs.map(([a, b]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join('')}</table></body></html>`);
});

exports.deactivate = asyncHandler(async (req, res) => {
  const found = await load(req, res);
  if (!found) return undefined;
  const { emp } = found;
  if (!rules.nextStatuses(emp.status).includes('Inactive')) return bad(res, 400, `Record the resignation, termination or retirement first; an employee who is ${emp.status} cannot go straight to Inactive`);
  try {
    const cr = await raise(req, { kind: 'emp.status', entity_type: 'employee', entity_id: emp.id, payload: { status: 'Inactive' }, before: { status: emp.status }, reason: (req.body || {}).reason || null });
    return res.status(202).json({ change_request: store.plain(cr), message: 'Sent to the HR Manager for approval' });
  } catch (err) { return bad(res, err.status || 500, err.message); }
});

exports.archive = asyncHandler(async (req, res) => {
  const found = await load(req, res);
  if (!found) return undefined;
  if (found.emp.status !== 'Inactive') return bad(res, 400, 'Only inactive employees can be archived');
  if (found.emp.archived_at) return bad(res, 400, 'It is already archived');
  return res.json(await present(req, await store.updateEmployee(found.emp.id, { archived_at: new Date() }, req)));
});

// POST /:code/send-login: (re)send the set-password email, creating the login if there is none yet.
exports.sendLogin = asyncHandler(async (req, res) => {
  const found = await load(req, res);
  if (!found) return undefined;
  const { emp, row } = found;
  let user = emp.user_id ? await User.findByPk(emp.user_id) : null;
  if (!user) {
    const email = String((req.body || {}).email || emp.work_email || emp.personal_email || '').trim().toLowerCase();
    if (!email) return bad(res, 400, 'Add a work or personal email first');
    user = await User.findOne({ where: { email } });
    if (user && !rules.canLinkLogin(user)) return bad(res, 409, 'That email belongs to a customer account. Use a work email for the employee.');
    if (user && await HrEmployee.findOne({ where: { user_id: user.id }, attributes: ['id'] })) return bad(res, 409, 'That email already belongs to another employee');
    if (!user) {
      const crypto = require('crypto');
      const bcrypt = require('bcryptjs');
      user = await User.create({ name: emp.full_name, email, branch_id: emp.branch_id, role: 'employee', status: 'active', must_change_password: true, password: await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10) });
    }
    await row.update({ user_id: user.id });
    await logHistory(req, 'employee', emp.id, { user_id: null }, { user_id: user.id });
  }
  if (user.status !== 'active') return bad(res, 400, 'This login is switched off');
  const out = await require('../services/wtPortalAccount.service').requestReset(user.email);
  return res.json({ email: user.email, sent: Boolean(out && out.sent) });
});

/* ── manager view (M2 §13) ─────────────────────────────────────────────── */

exports.team = asyncHandler(async (req, res) => {
  const viewer = await viewerOf(req);
  const all = allowed(req, 'emp.view_any') && req.query.scope === 'all';
  const ids = all ? null : allowed(req, 'emp.view_any') ? await store.teamOf(viewer.employeeId) : viewer.teamIds;
  const rows = await HrEmployee.findAll({ where: { archived_at: null, status: { [Op.notIn]: ['Inactive'] }, ...(ids ? { id: ids } : {}) }, order: [['full_name', 'ASC']] });
  const shown = await presentMany(req, rows.map(store.plain));
  const StaffAttendance = require('../models/StaffAttendance');
  const leaveSvc = require('../services/leave.service');
  const month = new Date().toISOString().slice(0, 7);
  const pending = await HrChangeRequest.findAll({ where: { entity_type: 'employee', entity_id: shown.map((e) => e.id), status: 'pending' }, attributes: ['entity_id'], raw: true });
  const out = [];
  for (const e of shown) {
    let attendanceRate = null;
    let leaveRemaining = null;
    if (e.user_id) {
      const att = await StaffAttendance.findAll({ where: { user_id: e.user_id, date: { [Op.like]: `${month}%` } }, attributes: ['status'], raw: true });
      if (att.length) attendanceRate = Math.round((att.filter((a) => ['present', 'late', 'half_day'].includes(a.status)).length / att.length) * 100);
      leaveRemaining = (await leaveSvc.balances(e.user_id).catch(() => null))?.annual?.remaining ?? null;
    }
    out.push({
      id: e.id, employee_code: e.employee_code, full_name: e.full_name, preferred_name: e.preferred_name, position_title: e.position_title,
      department_name: e.department_name, status: e.status, probation_end_date: e.probation_end_date, contract_end_date: e.contract_end_date,
      supervisor_name: e.supervisor_name, attendance_rate: attendanceRate, leave_remaining: leaveRemaining,
      training_status: null, next_review_date: null, pending_approvals: pending.filter((p) => p.entity_id === e.id).length,
    });
  }
  res.json({ data: out });
});

/* ── employee types (M2 §2) ────────────────────────────────────────────── */

exports.updateType = asyncHandler(async (req, res) => {
  const t = await HrEmployeeType.findByPk(req.params.id);
  if (!t) return bad(res, 404, 'Employee type not found');
  const body = store.only(req.body || {}, ['required_documents', 'leave_type_ids', 'attendance_required', 'benefits_note', 'is_active']);
  if (body.required_documents && (!Array.isArray(body.required_documents) || body.required_documents.some((d) => !catalog.DOCUMENT_TYPES.includes(d)))) return bad(res, 400, 'Required documents must come from the document list');
  const before = t.get({ plain: true });
  await t.update(body);
  await logHistory(req, 'employee_type', t.id, store.only(before, Object.keys(body)), body);
  return res.json(t.get({ plain: true }));
});

/* ── self-service (M2 §12; plan Task 14) ───────────────────────────────── */

const ownCode = async (req, res) => {
  const id = myEmployeeId(req);
  const row = id ? await HrEmployee.findByPk(id, { attributes: ['employee_code'] }) : null;
  if (!row) { bad(res, 404, 'Your employee record is not set up yet. Ask HR.'); return null; }
  return row.employee_code;
};
/** Run a per-employee handler on the signed-in person's own record. */
const asMe = (handler) => asyncHandler(async (req, res, next) => {
  const code = await ownCode(req, res);
  if (!code) return undefined;
  req.params.code = code;
  return handler(req, res, next);
});

exports.me = asMe(exports.get);
exports.myHistory = asMe(exports.history);
exports.myDocument = asMe(exports.addDocument);
exports.myTask = asMe(exports.doneTask);

// PATCH /me: address and emergency contact, as a request to the HR Manager (M2 §12).
exports.updateMe = asyncHandler(async (req, res) => {
  const id = myEmployeeId(req);
  if (!id) return bad(res, 404, 'Your employee record is not set up yet. Ask HR.');
  const emp = store.plain(await HrEmployee.findByPk(id));
  const asked = store.only(req.body || {}, SECTIONS.contact);
  const payload = Object.fromEntries(Object.entries(asked).filter(([k, v]) => !rules.sameValue(v, emp[k])).map(([k, v]) => [k, v === '' ? null : v]));
  if (!Object.keys(payload).length) return bad(res, 400, 'Nothing changed');
  try {
    const cr = await raise(req, { kind: 'emp.self_service', entity_type: 'employee', entity_id: id, payload, before: store.only(emp, Object.keys(payload)), reason: (req.body || {}).reason || null });
    return res.status(202).json({ change_request: store.plain(cr), message: 'Sent to HR for approval' });
  } catch (err) { return bad(res, err.status || 500, err.message); }
});

// GET /me/requests: changes about me, and changes I asked for.
exports.myRequests = asyncHandler(async (req, res) => {
  const id = myEmployeeId(req);
  const rows = await HrChangeRequest.findAll({
    where: { [Op.or]: [{ requested_by: req.user.id }, ...(id ? [{ entity_type: 'employee', entity_id: id }] : [])] }, order: [['id', 'DESC']], limit: 100,
  });
  res.json({
    data: rows.map(store.plain).map((r) => ({
      id: r.id, code: r.code, kind: r.kind, label: LABELS[r.kind] || r.kind, status: r.status, created_at: r.created_at || r.createdAt,
      fields: Object.keys(r.payload || {}), waiting_for: r.status === 'pending' ? ROLE_LABELS[(r.chain[r.step] || {}).role] : null,
      comment: [...(r.chain || [])].reverse().map((s) => s.comment).find(Boolean) || null,
    })),
  });
});

// GET /me/policies: the company policies to read and acknowledge.
exports.myPolicies = asyncHandler(async (req, res) => {
  const id = myEmployeeId(req);
  const emp = id ? await HrEmployee.findByPk(id, { attributes: ['company_id'] }) : null;
  const company = emp && emp.company_id ? await Org.HrCompany.findByPk(emp.company_id) : await Org.HrCompany.findOne({ where: { is_active: true } });
  const ack = id ? await HrOnboardingTask.findOne({ where: { employee_id: id, task: 'policy_ack' }, raw: true }) : null;
  res.json({ company: company ? company.name : null, policies: company ? company.policies || [] : [], acknowledgement: ack });
});
