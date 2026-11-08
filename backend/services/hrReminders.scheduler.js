/**
 * hrReminders.scheduler.js (plan Task 12; M2 §11, M1 §9)
 * ------------------------------------------------------------------
 * Daily job: probation ending, contracts and documents running out, missing documents, and departments or
 * positions with nobody above them. What is due comes from hrEmployee.service dueReminders (unit-tested);
 * this file loads the rows, notifies the HR manager and the employee's manager, and records each reminder in
 * hr_reminders_sent so it is sent once. It only alerts; it never changes a record.
 *
 * Hourly job (plan Task 20; M3 §12): interviews starting within 24 hours get one reminder email, with the
 * calendar invite, to the candidate and the panel. Which ones are due comes from hrRecruitment.service.
 */
const { Op } = require('sequelize');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Org = require('../models/hrOrganisation');
const { HrEmployee, HrEmployeeDocument, HrEmployeeType, HrReminderSent } = require('../models/hrEmployee');
const { dueReminders } = require('./hrEmployee.service');
const { orgAlerts } = require('./hrOrg.service');
const { hrRoleOf } = require('./hrAccess.service');

const TEXT = {
  probation_end: (r, e) => [`Probation ends ${r.dueOn}`, `${e.full_name} (${e.employee_code}): confirm, extend or end the probation.`],
  contract_expiry: (r, e) => [`Contract ends ${r.dueOn}`, `${e.full_name} (${e.employee_code}): renew or plan the exit.`],
  document_expiry: (r, e) => [`${r.docType} ${r.expired ? 'expired' : 'expires'} ${r.dueOn}`, `${e.full_name} (${e.employee_code}) needs a new ${r.docType}.`],
  missing_documents: (r, e) => ['Documents missing', `${e.full_name} (${e.employee_code}): ${r.missing.join(', ')}.`],
  department_without_manager: (r, o) => ['Department without a manager', `${o.name} (${o.code}) has no manager.`],
  position_without_supervisor: (r, o) => ['Position without a supervisor', `${o.title} (${o.code}) reports to no position.`],
};

async function runHrReminders(now = new Date()) {
  const [employees, documents, types, departments, positions, sent] = await Promise.all([
    HrEmployee.findAll({ where: { archived_at: null }, raw: true }),
    HrEmployeeDocument.findAll({ raw: true }),
    HrEmployeeType.findAll({ where: { is_active: true } }),
    Org.HrDepartment.findAll({ raw: true }),
    Org.HrPosition.findAll({ raw: true }),
    HrReminderSent.findAll({ where: { due_on: { [Op.gte]: new Date(now.getTime() - 120 * 86400000) } }, raw: true }),
  ]);
  const requiredByType = Object.fromEntries(types.map((t) => [t.name, t.required_documents || []]));
  const due = dueReminders({ employees, documents, orgAlerts: orgAlerts({ departments, positions }), requiredByType, sent, now });
  if (!due.length) return { sent: 0 };

  const users = await User.findAll({ where: { status: 'active' }, attributes: ['id', 'role', 'branch_id'], raw: true });
  const hrManagers = users.filter((u) => hrRoleOf(u) === 'hr_manager').map((u) => u.id);
  const empById = new Map(employees.map((e) => [Number(e.id), e]));
  const userOf = (empId) => (empById.get(Number(empId)) || {}).user_id;

  let count = 0;
  for (const r of due) {
    const emp = r.employeeId ? empById.get(Number(r.employeeId)) : null;
    const subject = emp || (r.kind === 'department_without_manager' ? departments : positions).find((x) => Number(x.id) === Number(r.entityId));
    if (!subject) continue;
    const to = new Set(hrManagers);
    if (emp && r.recipients.includes('manager')) {
      const dep = departments.find((d) => Number(d.id) === Number(emp.department_id));
      [userOf(emp.supervisor_employee_id), dep && userOf(dep.manager_employee_id)].filter(Boolean).forEach((id) => to.add(id));
    }
    // Claim the reminder first: the unique index stops a second server sending it too.
    try {
      await HrReminderSent.create({ kind: r.kind, employee_id: r.employeeId || null, entity_id: r.entityId || null, due_on: r.dueOn });
    } catch (err) { continue; }
    const [title, message] = TEXT[r.kind](r, subject);
    await Promise.all([...to].map((user_id) => Notification.create({ user_id, branch_id: subject.branch_id || null, title, message, type: 'warning' })));
    count++;
  }
  return { sent: count };
}

async function runInterviewReminders(now = new Date()) {
  const R = require('../models/hrRecruitment');
  const { dueInterviewReminders } = require('./hrRecruitment.service');
  const soon = await R.HrInterview.findAll({ where: { status: 'scheduled', reminder_sent_at: null, scheduled_at: { [Op.gt]: now, [Op.lte]: new Date(now.getTime() + 24 * 3600 * 1000) } } });
  let count = 0;
  for (const iv of soon.filter((i) => dueInterviewReminders([i.get({ plain: true })], now).length)) {
    // Claim it first, so a second server or an overlapping run does not send it again.
    const [claimed] = await R.HrInterview.update({ reminder_sent_at: now }, { where: { id: iv.id, reminder_sent_at: null } });
    if (!claimed) continue;
    const app = await R.HrApplication.findByPk(iv.application_id);
    if (!app) continue;
    await require('../controllers/hrRecruitment.controller').sendInvites(iv, app, { reminder: true });
    count++;
  }
  return { sent: count };
}

function startHrRemindersScheduler() {
  const run = async () => {
    try { const r = await runHrReminders(); if (r.sent) console.log(`[HrReminders] sent=${r.sent}`); }
    catch (err) { console.warn(`[HrReminders] skipped: ${err.message}`); }
  };
  run();
  setInterval(run, 24 * 60 * 60 * 1000);
  const interviews = async () => {
    try { const r = await runInterviewReminders(); if (r.sent) console.log(`[HrReminders] interview reminders=${r.sent}`); }
    catch (err) { console.warn(`[HrReminders] interview reminders skipped: ${err.message}`); }
  };
  interviews();
  setInterval(interviews, 60 * 60 * 1000);
}

module.exports = { runHrReminders, runInterviewReminders, startHrRemindersScheduler };
