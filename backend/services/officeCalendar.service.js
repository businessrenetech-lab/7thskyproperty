/**
 * Office calendar (owner request 2026-10-17): "on Friday our office is closed ... admin can set the closed day,
 * public holidays, any other closing day ... at that point attendance should not be counted".
 *
 *   weekly off   SystemSetting ATTENDANCE_WEEKLY_OFF: JSON array of weekdays (0 = Sunday ... 6 = Saturday), every
 *                office. Default [5] (Friday).
 *   holidays     models/OfficeHoliday: a date range with a name, for every office (branch_id null) or one office.
 *   closedDays(from, to, branchId) -> Map ymd -> { kind: 'weekly' | 'public_holiday' | 'office_closed', name }
 *
 * A closed day is not a working day: no "not marked", an "absent" there is not counted. Someone who works on a
 * closed day still has their attendance recorded (it shows, and counts as worked).
 */
const { Op } = require('sequelize');
const SystemSetting = require('../models/SystemSetting');
const OfficeHoliday = require('../models/OfficeHoliday');

const KEY = 'ATTENDANCE_WEEKLY_OFF';
const DEFAULT_OFF = [5];
const KINDS = ['public_holiday', 'office_closed'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const validDate = (v) => typeof v === 'string' && DATE_RE.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));
const dateOnly = (v) => (v ? String(v instanceof Date ? v.toISOString() : v).slice(0, 10) : null);
const httpError = (status, message, field) => Object.assign(new Error(message), { status, field });
const addDays = (ymd, n) => new Date(Date.parse(`${ymd}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const weekday = (ymd) => new Date(`${ymd}T00:00:00Z`).getUTCDay();

async function getWeeklyOff() {
  const row = await SystemSetting.findOne({ where: { setting_key: KEY } }).catch(() => null);
  if (!row || row.setting_value == null || row.setting_value === '') return [...DEFAULT_OFF];
  try {
    const v = JSON.parse(row.setting_value);
    return Array.isArray(v) ? [...new Set(v.map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort() : [...DEFAULT_OFF];
  } catch { return [...DEFAULT_OFF]; }
}

async function setWeeklyOff(days) {
  if (!Array.isArray(days)) throw httpError(400, 'Choose the weekly closed days', 'days');
  const clean = [...new Set(days.map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort();
  if (clean.length > 3) throw httpError(400, 'At most 3 closed days a week', 'days');
  const [row] = await SystemSetting.findOrCreate({ where: { setting_key: KEY }, defaults: { setting_key: KEY, setting_value: '[]', is_secret: false, category: 'hrm' } });
  await row.update({ setting_value: JSON.stringify(clean) });
  return clean;
}

const scopeWhere = (branchId) => (branchId ? { [Op.or]: [{ branch_id: null }, { branch_id: branchId }] } : {});

async function listHolidays({ from = null, to = null, branchId = null } = {}) {
  const and = [scopeWhere(branchId)];
  if (from) and.push({ date_to: { [Op.gte]: from } });
  if (to) and.push({ date_from: { [Op.lte]: to } });
  return OfficeHoliday.findAll({ where: { [Op.and]: and }, order: [['date_from', 'ASC'], ['id', 'ASC']] });
}

async function addHoliday({ name, kind, date_from: from, date_to: to, branch_id: branchId = null, user = null }) {
  const n = typeof name === 'string' ? name.trim().slice(0, 120) : '';
  if (n.length < 2) throw httpError(400, 'Give the closed day a name (e.g. Victory Day)', 'name');
  const k = KINDS.includes(kind) ? kind : 'public_holiday';
  if (!validDate(from)) throw httpError(400, 'Choose the date', 'date_from');
  const end = to ? to : from;
  if (!validDate(end)) throw httpError(400, 'Choose the last date', 'date_to');
  if (end < from) throw httpError(400, 'The last date is before the first date', 'date_to');
  if (Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000) > 60) throw httpError(400, 'At most 60 days at a time', 'date_to');
  return OfficeHoliday.create({ name: n, kind: k, date_from: from, date_to: end, branch_id: branchId || null, created_by: user ? user.id : null });
}

/** Map ymd -> { kind, name } for every closed day in [from, to] (weekly off first, then holidays win). */
async function closedDays(from, to, branchId = null) {
  const out = new Map();
  if (!validDate(from) || !validDate(to) || to < from) return out;
  const off = new Set(await getWeeklyOff());
  for (let d = from; d <= to; d = addDays(d, 1)) {
    if (off.has(weekday(d))) out.set(d, { kind: 'weekly', name: DAY_NAMES[weekday(d)] });
  }
  for (const h of await listHolidays({ from, to, branchId })) {
    const a = dateOnly(h.date_from) < from ? from : dateOnly(h.date_from);
    const b = dateOnly(h.date_to) > to ? to : dateOnly(h.date_to);
    for (let d = a; d <= b; d = addDays(d, 1)) out.set(d, { kind: h.kind, name: h.name });
  }
  return out;
}

/** The one day: { kind, name } or null. */
async function closedOn(ymd, branchId = null) {
  return (await closedDays(ymd, ymd, branchId)).get(ymd) || null;
}

module.exports = { KEY, DEFAULT_OFF, KINDS, DAY_NAMES, getWeeklyOff, setWeeklyOff, listHolidays, addHoliday, closedDays, closedOn };
