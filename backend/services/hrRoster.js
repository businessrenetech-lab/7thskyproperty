/**
 * M2 §18: the Employee Master Database is the source of truth for who is staff. Once HR has started the master
 * (any hr_employees row), attendance, leave and the staff pickers only include logins linked to an employee who
 * is still on the roster (hrEmployee.service onRoster). Before that, they keep the old staff-user rule so a
 * deploy does not empty the attendance screens.
 *
 * staff_profiles (the Hadi port's per-user record) is kept in step from the master: code, designation,
 * department, joining date.
 */
const { Op } = require('sequelize');
const { HrEmployee } = require('../models/hrEmployee');
const { OFF_ROSTER } = require('./hrEmployee.service');

/** The user ids on the roster, or null while the master is empty (no gate yet). */
const rosterUserIds = async () => {
  if (!(await HrEmployee.count())) return null;
  const rows = await HrEmployee.findAll({
    where: { user_id: { [Op.ne]: null }, archived_at: null, status: { [Op.notIn]: OFF_ROSTER } }, attributes: ['user_id'], raw: true,
  });
  return rows.map((r) => r.user_id);
};

/** Add to a User where clause: only people on the roster. */
const rosterWhere = async (where = {}) => {
  const ids = await rosterUserIds();
  if (!ids) return where;
  const keep = where.id != null ? [].concat(where.id).map(Number).filter((id) => ids.includes(id)) : ids;
  return { ...where, id: keep };
};

/** Express middleware for /api/hrm/me: refuse people the master does not (or no longer) list. */
const onRosterOnly = async (req, res, next) => {
  try {
    const ids = await rosterUserIds();
    if (ids && !ids.includes(Number(req.user.id))) return res.status(403).json({ error: 'Your employee record is not set up yet. Ask HR.' });
    return next();
  } catch (err) { return next(err); }
};

/** Copy the master's basics onto staff_profiles for the screens that still read it. */
const syncStaffProfile = async (emp, { transaction } = {}) => {
  if (!emp || !emp.user_id) return;
  const StaffProfile = require('../models/StaffProfile');
  const Org = require('../models/hrOrganisation');
  const [pos, dep] = await Promise.all([
    emp.position_id ? Org.HrPosition.findByPk(emp.position_id, { attributes: ['title'], transaction }) : null,
    emp.department_id ? Org.HrDepartment.findByPk(emp.department_id, { attributes: ['name'], transaction }) : null,
  ]);
  const fields = {
    employee_id: emp.employee_code, designation: (pos && pos.title) || 'Employee', department: dep ? dep.name : null,
    joining_date: emp.joining_date || null, exit_date: emp.exit_date || null,
  };
  const row = await StaffProfile.findOne({ where: { user_id: emp.user_id }, transaction });
  if (row) await row.update(fields, { transaction });
  else if (emp.branch_id) await StaffProfile.create({ user_id: emp.user_id, branch_id: emp.branch_id, ...fields }, { transaction });
};

module.exports = { rosterUserIds, rosterWhere, onRosterOnly, syncStaffProfile };
