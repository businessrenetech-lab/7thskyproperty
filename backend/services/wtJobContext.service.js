/**
 * wtJobContext.service.js — one place that answers "what job is this about?"
 *
 * Service reports, warranties, complaints and incidents are all records ABOUT a
 * job, and all four used to ask for client, work order and project as free text
 * with no property field at all. So each could name a client who was not the
 * client on the job it referred to.
 *
 * The lookup and the resolution live here rather than in each controller for a
 * plain reason: four copies of "which client does this work order belong to" is
 * four chances for them to answer differently, and the whole point of resolving
 * server-side is that the answer is the same everywhere.
 */
const { Op } = require('sequelize');
const M = require('../models/waterTankOps');
const P = require('../models/waterTankProviders');

/**
 * Search work orders, returning each with its client, project, site and provider
 * already resolved — plus what has already been raised against it, so an
 * operator can see they are not about to duplicate something.
 */
async function search({ scope, q, provider_id, limit = 40 }) {
  const where = { ...scope };
  if (provider_id) where.provider_id = provider_id;
  if (q) {
    const like = { [Op.like]: `%${q}%` };
    where[Op.or] = [
      { code: like }, { client_name: like }, { project_id: like },
      { provider_name: like }, { site_address: like }, { category: like },
    ];
  }

  const workOrders = await M.WtWorkOrder.findAll({
    where, order: [['id', 'DESC']], limit, raw: true,
  }).catch(() => []);
  if (!workOrders.length) return [];

  const codes = workOrders.map((w) => w.code).filter(Boolean);
  const inCodes = { [Op.in]: codes };

  const [projects, clients, providers, reports, warranties, complaints, incidents] = await Promise.all([
    M.WtProject.findAll({ where: scope, attributes: ['code', 'name', 'site_address', 'client_code'], raw: true }).catch(() => []),
    M.WtClient.findAll({ where: scope, attributes: ['code', 'name', 'service_address', 'district', 'email', 'mobile'], raw: true }).catch(() => []),
    /*
     * Providers are loaded to resolve the id BY NAME. Most work orders here
     * carry `provider_name` with a null `provider_id`, so keying on the id alone
     * made every job look unassigned.
     */
    M.WtProvider.findAll({ where: scope, attributes: ['id', 'business_name'], raw: true }).catch(() => []),
    P.WtServiceReport.findAll({ where: { ...scope, work_order_code: inCodes }, attributes: ['work_order_code', 'report_type'], raw: true }).catch(() => []),
    M.WtWarranty.findAll({ where: { ...scope, work_order_code: inCodes }, attributes: ['work_order_code', 'warranty_type', 'status'], raw: true }).catch(() => []),
    M.WtComplaint.findAll({ where: { ...scope, work_order_code: inCodes }, attributes: ['work_order_code', 'status'], raw: true }).catch(() => []),
    M.WtIncident.findAll({ where: { ...scope, work_order_code: inCodes }, attributes: ['work_order_code', 'incident_type'], raw: true }).catch(() => []),
  ]);

  const projectBy = Object.fromEntries(projects.map((p) => [p.code, p]));
  const clientByCode = Object.fromEntries(clients.map((c) => [c.code, c]));
  const clientByName = Object.fromEntries(clients.map((c) => [c.name, c]));
  const providerByName = Object.fromEntries(providers.map((p) => [p.business_name, p]));
  const countFor = (list, code) => list.filter((r) => r.work_order_code === code).length;

  return workOrders.map((w) => {
    const project = w.project_id ? projectBy[w.project_id] : null;
    const client = (w.client_code && clientByCode[w.client_code]) || clientByName[w.client_name] || null;

    return {
      id: w.id,
      code: w.code,
      status: w.status,
      category: w.category,
      scope: w.scope,
      target_date: w.target_date,
      scheduled_date: w.scheduled_date,
      completed_at: w.completed_at,
      verified_at: w.verified_at,
      client: client
        ? { code: client.code, name: client.name, district: client.district, email: client.email, mobile: client.mobile }
        : { code: w.client_code, name: w.client_name },
      project: project ? { code: project.code, name: project.name } : (w.project_id ? { code: w.project_id, name: null } : null),
      // The work order's own site wins, then the project's, then the client's
      // registered address — most specific first.
      site_address: w.site_address || project?.site_address || client?.service_address || null,
      provider: w.provider_id || w.provider_name
        ? { id: w.provider_id || providerByName[w.provider_name]?.id || null, name: w.provider_name }
        : null,
      // what already exists against this job
      existing: {
        reports: countFor(reports, w.code),
        report_types: reports.filter((r) => r.work_order_code === w.code).map((r) => r.report_type),
        warranties: countFor(warranties, w.code),
        warranty_types: warranties.filter((r) => r.work_order_code === w.code).map((r) => r.warranty_type),
        complaints: countFor(complaints, w.code),
        incidents: countFor(incidents, w.code),
      },
    };
  });
}

/**
 * Resolve one work order into the fields every "about a job" record stores.
 *
 * Called on WRITE, so what is saved comes from the job rather than the request.
 * Throws rather than guessing: a record whose job cannot be found should not be
 * created with half its context missing.
 */
async function resolve({ branch_id, work_order }) {
  if (!work_order) {
    const e = new Error('Choose the job this is about.');
    e.status = 400;
    throw e;
  }

  const wo = await M.WtWorkOrder.findOne({
    where: {
      branch_id,
      [Op.or]: [
        { code: String(work_order) },
        { id: Number.isNaN(Number(work_order)) ? -1 : Number(work_order) },
      ],
    },
  });
  if (!wo) {
    const e = new Error('That work order was not found.');
    e.status = 404;
    throw e;
  }

  const [project, client] = await Promise.all([
    wo.project_id
      ? M.WtProject.findOne({ where: { branch_id, code: wo.project_id }, raw: true }).catch(() => null)
      : null,
    wo.client_code
      ? M.WtClient.findOne({ where: { branch_id, code: wo.client_code }, raw: true }).catch(() => null)
      : M.WtClient.findOne({ where: { branch_id, name: wo.client_name }, raw: true }).catch(() => null),
  ]);

  return {
    workOrder: wo,
    context: {
      work_order_id: wo.id,
      work_order_code: wo.code,
      project_id: wo.project_id || null,
      client_code: client?.code || wo.client_code || null,
      client_name: client?.name || wo.client_name || null,
      site_address: wo.site_address || project?.site_address || client?.service_address || null,
      provider_name: wo.provider_name || null,
    },
  };
}

module.exports = { search, resolve };
