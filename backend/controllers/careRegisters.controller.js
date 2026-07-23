/**
 * careRegisters.controller.js — warranty / complaints / incidents registers + KPIs.
 */
const { Op } = require('sequelize');
const sequelize = require('../config/db.config');
const CareWarranty = require('../models/CareWarranty');
const CareComplaint = require('../models/CareComplaint');
const CareIncident = require('../models/CareIncident');
const CareWorkOrder = require('../models/CareWorkOrder');
const CareAmcContract = require('../models/CareAmcContract');
const { generateCode } = require('../utils/codeGenerator');
const { asyncHandler, branchScope, resolveBranchId, getPagination, pick } = require('../utils/controllerHelpers');

const num = (v) => Number(v || 0);
// Generic CRUD factory for a register model.
function crud(Model, fields, codeField, prefix) {
  return {
    list: asyncHandler(async (req, res) => {
      const { limit, offset, page } = getPagination(req);
      const where = { ...branchScope(req) };
      if (req.query.status) where.status = req.query.status;
      const { rows, count } = await Model.findAndCountAll({ where, limit, offset, order: [['created_at', 'DESC']] });
      const grp = await Model.findAll({ where: branchScope(req), attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'c']], group: ['status'], raw: true });
      res.json({ data: rows, status_counts: grp.reduce((a, r) => { a[r.status] = Number(r.c); return a; }, {}), pagination: { page, limit, total: count, pages: Math.ceil(count / limit) } });
    }),
    create: asyncHandler(async (req, res) => {
      const data = pick(req.body, fields);
      data.branch_id = resolveBranchId(req, req.body.branch_id);
      data.created_by = req.user?.id || null;
      data[codeField] = await generateCode(Model, codeField, prefix);
      const row = await Model.create(data);
      res.status(201).json({ data: row, message: 'Saved.' });
    }),
    update: asyncHandler(async (req, res) => {
      const row = await Model.findOne({ where: { id: req.params.id, ...branchScope(req) } });
      if (!row) return res.status(404).json({ error: 'Record not found.' });
      await row.update(pick(req.body, fields));
      res.json({ data: row, message: 'Updated.' });
    }),
  };
}

const warranty = crud(CareWarranty, ['work_order_id', 'customer_contact_id', 'customer_name', 'warranty_type', 'start_date', 'expiry_date', 'terms', 'status', 'notes'], 'warranty_code', 'SSPC-WR-');
const complaint = crud(CareComplaint, ['customer_contact_id', 'customer_name', 'work_order_id', 'provider_id', 'complaint_type', 'severity', 'description', 'investigation', 'resolution', 'status', 'reported_date', 'resolved_date'], 'complaint_code', 'SSPC-CMP-');
const incident = crud(CareIncident, ['work_order_id', 'provider_id', 'incident_type', 'severity', 'description', 'action_taken', 'status', 'incident_date'], 'incident_code', 'SSPC-INC2-');

exports.warranty = warranty;
exports.complaint = complaint;
exports.incident = incident;

// ─── KPIs ───────────────────────────────────────────────────────────────────
exports.kpis = asyncHandler(async (req, res) => {
  const scope = branchScope(req);
  const [total, completed, onTime, warrActive, complaintsOpen, incidentsOpen, amcActive] = await Promise.all([
    CareWorkOrder.count({ where: scope }),
    CareWorkOrder.count({ where: { ...scope, status: { [Op.in]: ['completed', 'inspected', 'invoiced', 'closed'] } } }),
    CareWorkOrder.count({ where: { ...scope, status: { [Op.in]: ['completed', 'inspected', 'invoiced', 'closed'] }, [Op.and]: [sequelize.where(sequelize.col('completed_date'), { [Op.ne]: null })] } }),
    CareWarranty.count({ where: { ...scope, status: { [Op.in]: ['active', 'expiring'] } } }),
    CareComplaint.count({ where: { ...scope, status: { [Op.in]: ['open', 'investigating', 'escalated'] } } }),
    CareIncident.count({ where: { ...scope, status: { [Op.in]: ['open', 'investigating'] } } }),
    CareAmcContract.count({ where: { ...scope, status: 'active' } }),
  ]);
  res.json({
    completion_rate: total ? Math.round((completed / total) * 100) : 0,
    jobs_total: total, jobs_completed: completed,
    warranties_active: warrActive, complaints_open: complaintsOpen, incidents_open: incidentsOpen, amc_active: amcActive,
  });
});
