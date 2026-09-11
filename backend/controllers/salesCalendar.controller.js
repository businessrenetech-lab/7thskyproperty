// backend/controllers/salesCalendar.controller.js
//
// Read-only aggregation of the dated items staff act on across all sale
// properties: SOP stage deadlines, offer expiries, buyer viewings, follow-ups.
// No new data — just a union of existing date fields for a date window.
const { Op } = require('sequelize');
const { SaleOffer } = require('../models/SalesModels');
const ProjectStage = require('../models/ProjectStage');
const Project = require('../models/Project');
const SalesEnquiry = require('../models/SalesEnquiry');
const Property = require('../models/Property');
const { asyncHandler, branchScope } = require('../utils/controllerHelpers');

const monthBounds = () => {
  const d = new Date();
  const iso = (x) => x.toISOString().slice(0, 10);
  return { from: iso(new Date(d.getFullYear(), d.getMonth(), 1)), to: iso(new Date(d.getFullYear(), d.getMonth() + 1, 0)) };
};
// DATEONLY columns come back as 'YYYY-MM-DD' strings; DATE columns come back as
// JS Date objects (raw:true) — format those by local components to avoid a
// timezone day-shift and a mangled String(Date).
const pad = (n) => String(n).padStart(2, '0');
const dpart = (v) => {
  if (!v) return null;
  if (v instanceof Date) return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`;
  return String(v).slice(0, 10);
};

exports.calendar = asyncHandler(async (req, res) => {
  const def = monthBounds();
  const from = req.query.from || def.from;
  const to = req.query.to || def.to;
  const between = { [Op.between]: [from, to] };
  const scope = branchScope(req);
  const catProps = req.query.category
    ? (await Property.findAll({ where: { ...scope, listing_type: 'sale', category: req.query.category }, attributes: ['id'], raw: true })).map((p) => p.id)
    : null;
  const propFilter = catProps ? { [Op.in]: catProps } : undefined;
  const events = [];

  // sop_deadline — active SOP stages with a due date in range.
  const stages = await ProjectStage.findAll({
    where: { due_date: between, status: { [Op.in]: ['pending', 'in_progress'] } },
    include: [{ model: Project, required: true, where: { vertical_key: 'properties_sale', ...scope, ...(propFilter ? { property_id: propFilter } : {}) } }],
  }).catch(() => []);
  for (const s of stages) {
    const pj = s.Project || s.project;
    if (pj) events.push({ date: dpart(s.due_date), type: 'sop_deadline', label: s.stage_name, property_id: pj.property_id, ref_id: s.id });
  }

  // offer_expiry — open offers expiring in range.
  const offers = await SaleOffer.findAll({ where: { ...scope, expiry_date: between, status: { [Op.in]: ['submitted', 'countered'] }, ...(propFilter ? { property_id: propFilter } : {}) }, raw: true });
  for (const o of offers) events.push({ date: dpart(o.expiry_date), type: 'offer_expiry', label: o.offer_code, property_id: o.property_id, ref_id: o.id });

  // viewing + follow_up — from enquiries.
  const enq = await SalesEnquiry.findAll({ where: { ...scope, ...(propFilter ? { property_id: propFilter } : {}), [Op.or]: [{ viewing_date: between }, { follow_up_date: between }] }, raw: true });
  for (const e of enq) {
    const vd = dpart(e.viewing_date);
    const fd = dpart(e.follow_up_date);
    if (vd && vd >= from && vd <= to) events.push({ date: vd, type: 'viewing', label: e.enquirer_name || 'Viewing', property_id: e.property_id, ref_id: e.id });
    if (fd && fd >= from && fd <= to) events.push({ date: fd, type: 'follow_up', label: e.enquirer_name || 'Follow-up', property_id: e.property_id, ref_id: e.id });
  }

  // resolve property codes in one query
  const ids = [...new Set(events.map((e) => e.property_id).filter(Boolean))];
  const props = new Map((ids.length ? await Property.findAll({ where: { id: ids }, attributes: ['id', 'property_code', 'title'], raw: true }) : []).map((p) => [Number(p.id), p]));
  for (const e of events) { const p = props.get(Number(e.property_id)); e.property_code = p ? p.property_code : null; }

  res.json({ events: events.filter((e) => e.date) });
});
