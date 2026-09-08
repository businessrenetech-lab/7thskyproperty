/**
 * waterTankResources.controller.js — internal Team & Fleet for delivery-by-own-team
 * lines (manifest `team_fleet: true`; Removal & Relocation). Crew members and
 * vehicles you pick from the DB (or add inline) at the work-order Resource
 * Allocation step. Availability checks a date against work orders' move_date +
 * allocated crew/vehicle ids so a crew or truck isn't double-booked. Scoped by
 * branch + service_line; refuses lines without team_fleet.
 */
const { Op } = require('sequelize');
const { asyncHandler, branchScope, serviceScope, resolveServiceLine, serviceUi } = require('../utils/controllerHelpers');
const { getServiceLine } = require('../config/serviceLines');
const { generateCode } = require('../utils/codeGenerator');
const { WtCrew, WtVehicle } = require('../models/waterTankResources');
const M = require('../models/waterTankOps');

const scoped = (req) => ({ ...branchScope(req), ...serviceScope(req) });

function ensureTeamFleet(req, res) {
  if (!getServiceLine(resolveServiceLine(req)).team_fleet) {
    res.status(404).json({ error: 'Team & Fleet is not enabled for this service line.' });
    return false;
  }
  return true;
}

exports.reference = asyncHandler(async (req, res) => {
  if (!ensureTeamFleet(req, res)) return;
  const ui = serviceUi(req);
  res.json({
    crew_roles: ui.crew_roles || ['Team Leader', 'Driver', 'Mover', 'Packer'],
    vehicle_types: ui.vehicle_types || ['Truck (Large)', 'Truck (Medium)', 'Van', 'Pickup'],
    crew_statuses: ['Active', 'On Leave', 'Inactive'],
    vehicle_statuses: ['Available', 'In Use', 'Maintenance'],
  });
});

/* ── Crew ─────────────────────────────────────────────────────────────── */
exports.listCrew = asyncHandler(async (req, res) => {
  if (!ensureTeamFleet(req, res)) return;
  const where = { ...scoped(req) };
  if (req.query.status) where.status = req.query.status;
  if (req.query.q) {
    const like = { [Op.like]: `%${req.query.q}%` };
    where[Op.or] = [{ name: like }, { role: like }, { phone: like }, { code: like }];
  }
  res.json(await WtCrew.findAll({ where, order: [['name', 'ASC']], raw: true }));
});

exports.createCrew = asyncHandler(async (req, res) => {
  if (!ensureTeamFleet(req, res)) return;
  const b = req.body || {};
  if (!b.name) return res.status(400).json({ error: 'Name is required.' });
  const code = await generateCode(WtCrew, 'code', 'CREW-', 4);
  const row = await WtCrew.create({
    ...scoped(req), code,
    name: b.name, role: b.role || null, phone: b.phone || null, email: b.email || null,
    skills: b.skills || null, status: b.status || 'Active', notes: b.notes || null,
  });
  res.status(201).json(row);
});

exports.updateCrew = asyncHandler(async (req, res) => {
  if (!ensureTeamFleet(req, res)) return;
  const row = await WtCrew.findOne({ where: { ...scoped(req), id: req.params.id } });
  if (!row) return res.status(404).json({ error: 'Crew member not found.' });
  const b = req.body || {}; const patch = {};
  ['name', 'role', 'phone', 'email', 'skills', 'status', 'notes'].forEach((k) => { if (b[k] !== undefined) patch[k] = b[k]; });
  await row.update(patch);
  res.json(row);
});

exports.removeCrew = asyncHandler(async (req, res) => {
  if (!ensureTeamFleet(req, res)) return;
  const row = await WtCrew.findOne({ where: { ...scoped(req), id: req.params.id } });
  if (!row) return res.status(404).json({ error: 'Crew member not found.' });
  await row.destroy();
  res.json({ ok: true });
});

/* ── Vehicles ─────────────────────────────────────────────────────────── */
exports.listVehicles = asyncHandler(async (req, res) => {
  if (!ensureTeamFleet(req, res)) return;
  const where = { ...scoped(req) };
  if (req.query.status) where.status = req.query.status;
  if (req.query.q) {
    const like = { [Op.like]: `%${req.query.q}%` };
    where[Op.or] = [{ reg_no: like }, { vehicle_type: like }, { code: like }];
  }
  res.json(await WtVehicle.findAll({ where, order: [['vehicle_type', 'ASC']], raw: true }));
});

exports.createVehicle = asyncHandler(async (req, res) => {
  if (!ensureTeamFleet(req, res)) return;
  const b = req.body || {};
  if (!b.reg_no && !b.vehicle_type) return res.status(400).json({ error: 'Registration or vehicle type is required.' });
  const code = await generateCode(WtVehicle, 'code', 'VH-', 4);
  const row = await WtVehicle.create({
    ...scoped(req), code,
    reg_no: b.reg_no || null, vehicle_type: b.vehicle_type || null, capacity: b.capacity || null,
    status: b.status || 'Available', notes: b.notes || null,
  });
  res.status(201).json(row);
});

exports.updateVehicle = asyncHandler(async (req, res) => {
  if (!ensureTeamFleet(req, res)) return;
  const row = await WtVehicle.findOne({ where: { ...scoped(req), id: req.params.id } });
  if (!row) return res.status(404).json({ error: 'Vehicle not found.' });
  const b = req.body || {}; const patch = {};
  ['reg_no', 'vehicle_type', 'capacity', 'status', 'notes'].forEach((k) => { if (b[k] !== undefined) patch[k] = b[k]; });
  await row.update(patch);
  res.json(row);
});

exports.removeVehicle = asyncHandler(async (req, res) => {
  if (!ensureTeamFleet(req, res)) return;
  const row = await WtVehicle.findOne({ where: { ...scoped(req), id: req.params.id } });
  if (!row) return res.status(404).json({ error: 'Vehicle not found.' });
  await row.destroy();
  res.json({ ok: true });
});

/**
 * GET /availability?date=YYYY-MM-DD — which crew ids and vehicle ids are already
 * committed to a move on that date (from work orders' move_date + crew_ids/vehicle_ids),
 * so the allocation UI can flag double-bookings.
 */
exports.availability = asyncHandler(async (req, res) => {
  if (!ensureTeamFleet(req, res)) return;
  const date = req.query.date;
  if (!date) return res.status(400).json({ error: 'A date is required.' });
  const wos = await M.WtWorkOrder.findAll({
    where: { ...scoped(req), move_date: date, status: { [Op.notIn]: ['Cancelled', 'Completed', 'Verified'] } },
    attributes: ['code', 'crew_ids', 'vehicle_ids', 'client_name'], raw: true,
  });
  const parse = (v) => { if (Array.isArray(v)) return v; if (typeof v === 'string') { try { return JSON.parse(v) || []; } catch { return []; } } return []; };
  const busyCrew = new Set(); const busyVehicles = new Set();
  wos.forEach((w) => { parse(w.crew_ids).forEach((id) => busyCrew.add(id)); parse(w.vehicle_ids).forEach((id) => busyVehicles.add(id)); });
  res.json({ date, busy_crew_ids: [...busyCrew], busy_vehicle_ids: [...busyVehicles], jobs: wos.length });
});
