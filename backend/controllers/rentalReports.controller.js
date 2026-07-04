/**
 * rentalReports.controller.js
 * ------------------------------------------------------------------
 * Management reporting for the rental operation. Every metric is
 * computed live — no denormalised aggregates to keep in sync.
 *
 * Endpoints under /api/rental-reports/*:
 *   GET /overview            — the "one-page" management report
 *   GET /occupancy           — occupancy rate + vacancy days
 *   GET /rent-roll           — active tenancies + monthly rent
 *   GET /arrears-aging       — 0-30 / 31-60 / 61-90 / 90+ buckets
 *   GET /collection-rate     — collected / due for period
 *   GET /maintenance-cost    — spend per property
 *   GET /expiring-leases     — 30/60/90-day buckets
 *   GET /application-funnel  — counts at each stage
 *   GET /avg-days-to-rent    — pipeline speed
 */
const sequelize = require('../config/db.config');
const { asyncHandler, branchScope } = require('../utils/controllerHelpers');

function branchClause(req, alias) {
  const scope = branchScope(req);
  if (!scope.branch_id) return { sql: '', params: {} };
  const col = alias ? `${alias}.branch_id` : 'branch_id';
  return { sql: ` AND ${col} = :branch_id`, params: { branch_id: scope.branch_id } };
}

const num = (v) => Number(v || 0);

// ═══ OCCUPANCY ═════════════════════════════════════════════════════════════
exports.occupancy = asyncHandler(async (req, res) => {
  const bw = branchClause(req, 'p');

  const [[total]] = await sequelize.query(
    `SELECT COUNT(*) AS c FROM properties p WHERE p.listing_type = 'rent' AND p.pm_status <> 'not_managed' ${bw.sql}`,
    { replacements: bw.params }
  );
  const [[occupied]] = await sequelize.query(
    `SELECT COUNT(DISTINCT t.property_id) AS c FROM tenancies t
      JOIN properties p ON p.id = t.property_id
     WHERE t.status = 'active' ${bw.sql}`,
    { replacements: bw.params }
  );
  const [[vacant]] = await sequelize.query(
    `SELECT COUNT(*) AS c FROM properties p
      WHERE p.listing_type = 'rent' AND p.pm_status <> 'not_managed'
        AND p.id NOT IN (SELECT property_id FROM tenancies WHERE status='active' AND property_id IS NOT NULL)
        ${bw.sql}`,
    { replacements: bw.params }
  );

  // Average vacancy days = days since last ended tenancy for currently-vacant properties
  const [avgVacancy] = await sequelize.query(
    `SELECT AVG(DATEDIFF(CURDATE(), IFNULL(last_end, p.created_at))) AS avg_days
       FROM (
         SELECT p.id, p.created_at, (SELECT MAX(move_out_date) FROM tenancies WHERE property_id = p.id AND status IN ('ended','terminated')) AS last_end
           FROM properties p
          WHERE p.listing_type = 'rent' AND p.pm_status <> 'not_managed'
            AND p.id NOT IN (SELECT property_id FROM tenancies WHERE status='active' AND property_id IS NOT NULL)
            ${bw.sql}
       ) p`,
    { replacements: bw.params }
  );

  const total_c = num(total?.c);
  const occupied_c = num(occupied?.c);
  const vacant_c = num(vacant?.c);
  res.json({
    data: {
      total_managed: total_c,
      occupied: occupied_c,
      vacant: vacant_c,
      occupancy_rate_pct: total_c ? Math.round((occupied_c / total_c) * 100) : 0,
      avg_vacancy_days: Math.round(num(avgVacancy?.[0]?.avg_days)),
    },
  });
});

// ═══ RENT ROLL ═════════════════════════════════════════════════════════════
exports.rentRoll = asyncHandler(async (req, res) => {
  const bw = branchClause(req, 't');
  const [rows] = await sequelize.query(
    `SELECT t.id, t.tenancy_code, t.monthly_rent, t.service_charge, t.lease_end,
            p.property_code, p.title AS property_title,
            tc.full_name AS tenant_name
       FROM tenancies t
       LEFT JOIN properties p ON p.id = t.property_id
       LEFT JOIN contacts tc ON tc.id = t.tenant_contact_id
      WHERE t.status = 'active' ${bw.sql}
      ORDER BY t.monthly_rent DESC`,
    { replacements: bw.params }
  );
  const total_rent = rows.reduce((a, r) => a + num(r.monthly_rent), 0);
  const total_service = rows.reduce((a, r) => a + num(r.service_charge), 0);
  res.json({
    data: {
      tenancies: rows,
      total_rent, total_service, total_recurring: total_rent + total_service,
      count: rows.length,
    },
  });
});

// ═══ ARREARS AGING ═════════════════════════════════════════════════════════
exports.arrearsAging = asyncHandler(async (req, res) => {
  const bw = branchClause(req, 'rl');
  const [buckets] = await sequelize.query(
    `SELECT
       SUM(CASE WHEN DATEDIFF(CURDATE(), rl.due_date) BETWEEN 0 AND 30 THEN (rl.rent_due - rl.rent_received) ELSE 0 END) AS d0_30,
       SUM(CASE WHEN DATEDIFF(CURDATE(), rl.due_date) BETWEEN 31 AND 60 THEN (rl.rent_due - rl.rent_received) ELSE 0 END) AS d31_60,
       SUM(CASE WHEN DATEDIFF(CURDATE(), rl.due_date) BETWEEN 61 AND 90 THEN (rl.rent_due - rl.rent_received) ELSE 0 END) AS d61_90,
       SUM(CASE WHEN DATEDIFF(CURDATE(), rl.due_date) > 90 THEN (rl.rent_due - rl.rent_received) ELSE 0 END) AS d90_plus,
       SUM(rl.rent_due - rl.rent_received) AS total
       FROM rental_ledger rl
      WHERE rl.rent_due > rl.rent_received AND rl.due_date <= CURDATE() ${bw.sql}`,
    { replacements: bw.params }
  );
  const b = buckets[0] || {};
  res.json({
    data: {
      d0_30: num(b.d0_30), d31_60: num(b.d31_60), d61_90: num(b.d61_90), d90_plus: num(b.d90_plus),
      total: num(b.total),
    },
  });
});

// ═══ COLLECTION RATE ═══════════════════════════════════════════════════════
exports.collectionRate = asyncHandler(async (req, res) => {
  const bw = branchClause(req, 'rl');
  const period = req.query.period || new Date().toISOString().slice(0, 7); // YYYY-MM
  const [row] = await sequelize.query(
    `SELECT
       COALESCE(SUM(rl.rent_due), 0) AS due,
       COALESCE(SUM(rl.rent_received), 0) AS received
       FROM rental_ledger rl
      WHERE rl.period_label = :period ${bw.sql}`,
    { replacements: { ...bw.params, period } }
  );
  const due = num(row[0]?.due);
  const received = num(row[0]?.received);
  res.json({
    data: {
      period,
      due, received,
      outstanding: Math.max(0, due - received),
      rate_pct: due > 0 ? Math.round((received / due) * 100) : 0,
    },
  });
});

// ═══ MAINTENANCE COST BY PROPERTY ══════════════════════════════════════════
exports.maintenanceCost = asyncHandler(async (req, res) => {
  const bw = branchClause(req, 'wo');
  const [rows] = await sequelize.query(
    `SELECT wo.property_id, p.title, p.property_code,
            COUNT(*) AS total_orders,
            COUNT(CASE WHEN wo.status = 'completed' THEN 1 END) AS completed,
            COALESCE(SUM(wo.actual_cost), 0) AS total_cost,
            COALESCE(AVG(wo.actual_cost), 0) AS avg_cost
       FROM work_orders wo
       LEFT JOIN properties p ON p.id = wo.property_id
      WHERE wo.property_id IS NOT NULL ${bw.sql}
      GROUP BY wo.property_id, p.title, p.property_code
      ORDER BY total_cost DESC LIMIT 20`,
    { replacements: bw.params }
  );
  const total = rows.reduce((a, r) => a + num(r.total_cost), 0);
  res.json({ data: { properties: rows, total_spend: total } });
});

// ═══ EXPIRING LEASES ═══════════════════════════════════════════════════════
exports.expiringLeases = asyncHandler(async (req, res) => {
  const bw = branchClause(req, 't');
  const [rows] = await sequelize.query(
    `SELECT t.id, t.tenancy_code, t.lease_end, t.monthly_rent,
            DATEDIFF(t.lease_end, CURDATE()) AS days_remaining,
            p.title AS property_title, p.property_code,
            tc.full_name AS tenant_name
       FROM tenancies t
       LEFT JOIN properties p ON p.id = t.property_id
       LEFT JOIN contacts tc ON tc.id = t.tenant_contact_id
      WHERE t.status = 'active' AND t.lease_end BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 90 DAY)
        ${bw.sql}
      ORDER BY t.lease_end ASC`,
    { replacements: bw.params }
  );
  const buckets = { d30: [], d60: [], d90: [] };
  for (const r of rows) {
    if (r.days_remaining <= 30) buckets.d30.push(r);
    else if (r.days_remaining <= 60) buckets.d60.push(r);
    else buckets.d90.push(r);
  }
  res.json({ data: { ...buckets, total: rows.length } });
});

// ═══ APPLICATION FUNNEL ════════════════════════════════════════════════════
exports.applicationFunnel = asyncHandler(async (req, res) => {
  const bw = branchClause(req, 'ta');
  const stages = ['submitted', 'screening', 'verification', 'awaiting_documents', 'awaiting_owner_approval', 'approved', 'rejected', 'converted'];
  const counts = {};
  for (const s of stages) {
    const [row] = await sequelize.query(
      `SELECT COUNT(*) AS c FROM tenant_applications ta WHERE ta.status = :s ${bw.sql}`,
      { replacements: { ...bw.params, s } }
    );
    counts[s] = num(row[0]?.c);
  }
  const total_created = Object.values(counts).reduce((a, b) => a + b, 0);
  const converted = counts.converted || 0;
  res.json({
    data: {
      counts,
      total_created,
      conversion_rate_pct: total_created > 0 ? Math.round((converted / total_created) * 100) : 0,
    },
  });
});

// ═══ AVG DAYS TO RENT ══════════════════════════════════════════════════════
exports.avgDaysToRent = asyncHandler(async (req, res) => {
  // For each activated tenancy, days between property.created_at (or last vacancy) and tenancy.lease_start
  const bw = branchClause(req, 't');
  const [row] = await sequelize.query(
    `SELECT AVG(DATEDIFF(t.lease_start, p.created_at)) AS avg_days,
            COUNT(*) AS sample_size
       FROM tenancies t
       JOIN properties p ON p.id = t.property_id
      WHERE t.status IN ('active','ended','terminated') AND t.lease_start IS NOT NULL AND t.lease_start >= p.created_at
        ${bw.sql}`,
    { replacements: bw.params }
  );
  res.json({ data: { avg_days: Math.round(num(row[0]?.avg_days)), sample_size: num(row[0]?.sample_size) } });
});

// ═══ OVERVIEW (all in one) ═════════════════════════════════════════════════
exports.overview = asyncHandler(async (req, res) => {
  const bw = branchClause(req, null);
  const safeCount = async (table, whereSql) => {
    try {
      const [rows] = await sequelize.query(`SELECT COUNT(*) AS c FROM ${table} WHERE 1=1 ${whereSql || ''} ${bw.sql}`, { replacements: bw.params });
      return num(rows[0]?.c);
    } catch { return 0; }
  };
  const [occupancy, rentRoll, arrears, collection, maintenance, expiring, funnel, avgDays] = await Promise.all([
    (async () => (await exports.occupancy._callInline(req)))(),
    (async () => (await exports.rentRoll._callInline(req)))(),
    (async () => (await exports.arrearsAging._callInline(req)))(),
    (async () => (await exports.collectionRate._callInline(req)))(),
    (async () => (await exports.maintenanceCost._callInline(req)))(),
    (async () => (await exports.expiringLeases._callInline(req)))(),
    (async () => (await exports.applicationFunnel._callInline(req)))(),
    (async () => (await exports.avgDaysToRent._callInline(req)))(),
  ]);
  const controls = {
    open_tenant_requests: await safeCount('tenant_requests', "AND status IN ('open','in_progress','waiting_owner','waiting_tenant')"),
    pending_utilities: await safeCount('utility_bills', "AND payment_status IN ('pending','overdue','disputed')"),
    pending_expense_approvals: await safeCount('expense_approvals', "AND status = 'pending'"),
    active_risks: await safeCount('property_risks', "AND status IN ('open','monitoring')"),
    open_arrears_actions: await safeCount('arrears_actions', "AND status IN ('open','in_progress')"),
  };
  res.json({ data: { occupancy, rentRoll, arrears, collection, maintenance, expiring, funnel, avgDays, controls } });
});

// Small helper to reuse the endpoint bodies as data producers for /overview.
function inlinable(fn) {
  fn._callInline = async (req) => new Promise((resolve, reject) => {
    fn(req, { json: (payload) => resolve(payload.data), status: () => ({ json: (p) => reject(p) }) }, reject).catch(reject);
  });
  return fn;
}
inlinable(exports.occupancy);
inlinable(exports.rentRoll);
inlinable(exports.arrearsAging);
inlinable(exports.collectionRate);
inlinable(exports.maintenanceCost);
inlinable(exports.expiringLeases);
inlinable(exports.applicationFunnel);
inlinable(exports.avgDaysToRent);
