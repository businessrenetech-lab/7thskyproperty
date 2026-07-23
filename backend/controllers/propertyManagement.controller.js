/**
 * propertyManagement.controller.js
 * ------------------------------------------------------------------
 * Command Center for the rental-management operating model.
 * Every cohort here is computed from live data — no hardcoded rows.
 *
 * GET /api/property-management/action-center
 *   → returns { <cohort_key>: { count, top: [...] } } for each operational bucket.
 *
 * A "cohort" is one bucket of work that a property manager needs to act on today.
 * Each row is trimmed to the fields the dashboard card needs — no extra joins.
 */
const sequelize = require('../config/db.config');
const { asyncHandler, branchScope } = require('../utils/controllerHelpers');

// Build a branch filter fragment for raw queries. Super admins see all branches.
function branchWhere(req, alias = null) {
  const scope = branchScope(req);
  if (!scope.branch_id) return { sql: '', params: {} };
  const col = alias ? `${alias}.branch_id` : 'branch_id';
  return { sql: ` AND ${col} = :branch_id`, params: { branch_id: scope.branch_id } };
}

// Helper: given a base SELECT (may include ORDER BY), returns { count, top: [...] }.
// - top: the base query truncated to `limit`
// - count: same query wrapped in a subquery (ORDER BY stripped) — robust to JOINs.
async function cohort(sql, params, limit = 5) {
  const [rows] = await sequelize.query(`${sql} LIMIT ${limit}`, { replacements: params });
  const forCount = sql.replace(/ORDER BY[\s\S]*$/i, '');
  const [countRows] = await sequelize.query(`SELECT COUNT(*) AS c FROM (${forCount}) x`, { replacements: params });
  return { count: Number(countRows[0]?.c || 0), top: rows };
}

exports.actionCenter = asyncHandler(async (req, res) => {
  const bw = branchWhere(req);

  // ── 1. Overdue rent — rental_ledger rows with outstanding + past due_date ──
  const overdueRent = await cohort(
    `SELECT rl.id, rl.property_id, rl.tenant_contact_id, rl.owner_contact_id,
            rl.period_label, rl.due_date, rl.rent_due, rl.rent_received,
            (rl.rent_due - rl.rent_received) AS outstanding,
            DATEDIFF(CURDATE(), rl.due_date) AS days_overdue,
            p.title AS property_title, p.property_code,
            tc.full_name AS tenant_name
       FROM rental_ledger rl
       LEFT JOIN properties p ON p.id = rl.property_id
       LEFT JOIN contacts tc ON tc.id = rl.tenant_contact_id
      WHERE (rl.rent_due - rl.rent_received) > 0
        AND rl.due_date < CURDATE()
        ${bw.sql.replace('branch_id', 'rl.branch_id')}
      ORDER BY rl.due_date ASC`,
    bw.params
  );

  // ── 2. Rent due in next 7 days (not overdue yet) ──
  const rentDue7d = await cohort(
    `SELECT rl.id, rl.property_id, rl.tenant_contact_id, rl.period_label, rl.due_date, rl.rent_due,
            p.title AS property_title, p.property_code,
            tc.full_name AS tenant_name
       FROM rental_ledger rl
       LEFT JOIN properties p ON p.id = rl.property_id
       LEFT JOIN contacts tc ON tc.id = rl.tenant_contact_id
      WHERE (rl.rent_due - rl.rent_received) > 0
        AND rl.due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
        ${bw.sql.replace('branch_id', 'rl.branch_id')}
      ORDER BY rl.due_date ASC`,
    bw.params
  );

  // ── 3. Applications awaiting owner approval ──
  const appsAwaitingOwner = await cohort(
    `SELECT ta.id, ta.application_code, ta.applicant_name, ta.property_id, ta.application_date,
            ta.recommendation, p.title AS property_title, p.property_code
       FROM tenant_applications ta
       LEFT JOIN properties p ON p.id = ta.property_id
      WHERE ta.status = 'awaiting_owner_approval'
        ${bw.sql.replace('branch_id', 'ta.branch_id')}
      ORDER BY ta.created_at ASC`,
    bw.params
  );

  // ── 4. Applications awaiting tenant documents ──
  const appsAwaitingDocs = await cohort(
    `SELECT ta.id, ta.application_code, ta.applicant_name, ta.property_id, ta.application_date,
            p.title AS property_title, p.property_code
       FROM tenant_applications ta
       LEFT JOIN properties p ON p.id = ta.property_id
      WHERE ta.status = 'awaiting_documents'
        ${bw.sql.replace('branch_id', 'ta.branch_id')}
      ORDER BY ta.created_at ASC`,
    bw.params
  );

  // ── 5. Properties blocked from marketing ──
  const blockedMarketing = await cohort(
    `SELECT p.id, p.property_code, p.title, p.area, p.district, p.pm_status,
            p.rental_readiness_status, p.approved_monthly_rent
       FROM properties p
      WHERE p.listing_type = 'rent'
        AND p.pm_status IN ('onboarding', 'assessment_pending')
        AND (p.rental_readiness_status IS NULL OR p.rental_readiness_status <> 'ready_for_marketing')
        ${bw.sql.replace('branch_id', 'p.branch_id')}
      ORDER BY p.updated_at DESC`,
    bw.params
  );

  // ── 6/7/8. Leases expiring in 30 / 60 / 90 days ──
  async function expiringLeases(fromDays, toDays) {
    return cohort(
      `SELECT t.id, t.tenancy_code, t.property_id, t.tenant_contact_id, t.lease_end,
              DATEDIFF(t.lease_end, CURDATE()) AS days_remaining,
              p.title AS property_title, p.property_code,
              tc.full_name AS tenant_name
         FROM tenancies t
         LEFT JOIN properties p ON p.id = t.property_id
         LEFT JOIN contacts tc ON tc.id = t.tenant_contact_id
        WHERE t.status = 'active'
          AND t.lease_end BETWEEN DATE_ADD(CURDATE(), INTERVAL ${fromDays} DAY) AND DATE_ADD(CURDATE(), INTERVAL ${toDays} DAY)
          ${bw.sql.replace('branch_id', 't.branch_id')}
        ORDER BY t.lease_end ASC`,
      bw.params
    );
  }
  const expiring30 = await expiringLeases(0, 30);
  const expiring60 = await expiringLeases(31, 60);
  const expiring90 = await expiringLeases(61, 90);

  // ── 9. Work orders overdue (past scheduled_date, not completed) ──
  const woOverdue = await cohort(
    `SELECT wo.id, wo.work_order_code, wo.title, wo.status, wo.property_id, wo.scheduled_date,
            DATEDIFF(CURDATE(), wo.scheduled_date) AS days_overdue,
            p.title AS property_title, p.property_code
       FROM work_orders wo
       LEFT JOIN properties p ON p.id = wo.property_id
      WHERE wo.status IN ('draft', 'issued', 'accepted', 'in_progress')
        AND wo.scheduled_date IS NOT NULL
        AND wo.scheduled_date < CURDATE()
        ${bw.sql.replace('branch_id', 'wo.branch_id')}
      ORDER BY wo.scheduled_date ASC`,
    bw.params
  );

  // ── 10. Properties with owner KYC incomplete ──
  const kycIncomplete = await cohort(
    `SELECT p.id, p.property_code, p.title, p.area,
            pop.owner_type, pop.lawful_authority_confirmed, pop.bank_details_collected,
            oc.full_name AS owner_name
       FROM properties p
       LEFT JOIN property_owner_profiles pop ON pop.property_id = p.id
       LEFT JOIN contacts oc ON oc.id = p.owner_contact_id
      WHERE p.listing_type = 'rent'
        AND p.owner_contact_id IS NOT NULL
        AND (pop.id IS NULL
             OR pop.nid_number IS NULL
             OR pop.lawful_authority_confirmed = 0
             OR pop.bank_details_collected = 0)
        ${bw.sql.replace('branch_id', 'p.branch_id')}
      ORDER BY p.created_at DESC`,
    bw.params
  );

  // ── 11. Properties without a signed rental management agreement ──
  const missingAgreement = await cohort(
    `SELECT p.id, p.property_code, p.title,
            pop.agreement_status,
            oc.full_name AS owner_name
       FROM properties p
       LEFT JOIN property_owner_profiles pop ON pop.property_id = p.id
       LEFT JOIN contacts oc ON oc.id = p.owner_contact_id
      WHERE p.listing_type = 'rent'
        AND p.pm_status <> 'not_managed'
        AND (pop.agreement_status IS NULL OR pop.agreement_status <> 'signed')
        ${bw.sql.replace('branch_id', 'p.branch_id')}
      ORDER BY p.created_at DESC`,
    bw.params
  );

  // ── 12. Properties missing bank details (blocks disbursement) ──
  const missingBank = await cohort(
    `SELECT p.id, p.property_code, p.title,
            oc.full_name AS owner_name
       FROM properties p
       LEFT JOIN property_owner_profiles pop ON pop.property_id = p.id
       LEFT JOIN contacts oc ON oc.id = p.owner_contact_id
      WHERE p.listing_type = 'rent'
        AND p.pm_status <> 'not_managed'
        AND (pop.id IS NULL OR pop.bank_account_number IS NULL OR pop.bank_account_number = '')
        ${bw.sql.replace('branch_id', 'p.branch_id')}
      ORDER BY p.created_at DESC`,
    bw.params
  );

  // ── 13. Properties missing access contact (blocks inspections/handover) ──
  const missingAccess = await cohort(
    `SELECT p.id, p.property_code, p.title, p.pm_status
       FROM properties p
      WHERE p.listing_type = 'rent'
        AND p.pm_status <> 'not_managed'
        AND (p.access_contact IS NULL OR p.access_contact = '')
        ${bw.sql.replace('branch_id', 'p.branch_id')}
      ORDER BY p.created_at DESC`,
    bw.params
  );

  // ── 14. Owner statements not sent this month ──
  // (owner_statements table lands in Phase 3; return an empty cohort until then.)
  let statementsNotSent = { count: 0, top: [] };
  try {
    const [ex] = await sequelize.query("SHOW TABLES LIKE 'owner_statements'");
    if (ex.length) {
      statementsNotSent = await cohort(
        `SELECT os.id, os.owner_contact_id, os.property_id, os.period_label AS period, os.net_disbursement,
                p.title AS property_title,
                oc.full_name AS owner_name
           FROM owner_statements os
           LEFT JOIN properties p ON p.id = os.property_id
           LEFT JOIN contacts oc ON oc.id = os.owner_contact_id
          WHERE os.status = 'ready' AND os.sent_at IS NULL
            ${bw.sql.replace('branch_id', 'os.branch_id')}
          ORDER BY os.period_label DESC`,
        bw.params
      );
    }
  } catch { /* table absent — nothing to send */ }

  const utilityBillsDue = await cohort(
    `SELECT ub.id, ub.utility_code, ub.property_id, ub.utility_type, ub.bill_period, ub.amount, ub.due_date, ub.payment_status,
            p.title AS property_title, p.property_code
       FROM utility_bills ub
       LEFT JOIN properties p ON p.id = ub.property_id
      WHERE ub.payment_status IN ('pending','overdue','disputed')
        AND (ub.due_date IS NULL OR ub.due_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY))
        ${bw.sql.replace('branch_id', 'ub.branch_id')}
      ORDER BY ub.due_date ASC`,
    bw.params
  ).catch(() => ({ count: 0, top: [] }));

  const tenantRequestsOpen = await cohort(
    `SELECT tr.id, tr.request_code, tr.property_id, tr.request_type, tr.priority, tr.status, tr.request_date,
            p.title AS property_title, p.property_code, tc.full_name AS tenant_name
       FROM tenant_requests tr
       LEFT JOIN properties p ON p.id = tr.property_id
       LEFT JOIN contacts tc ON tc.id = tr.tenant_contact_id
      WHERE tr.status IN ('open','in_progress','waiting_owner','waiting_tenant')
        ${bw.sql.replace('branch_id', 'tr.branch_id')}
      ORDER BY FIELD(tr.priority, 'critical','high','medium','low'), tr.created_at ASC`,
    bw.params
  ).catch(() => ({ count: 0, top: [] }));

  const arrearsEscalations = await cohort(
    `SELECT aa.id, aa.arrears_code, aa.property_id, aa.outstanding_amount, aa.days_overdue, aa.escalation_level, aa.action_required,
            p.title AS property_title, p.property_code, tc.full_name AS tenant_name
       FROM arrears_actions aa
       LEFT JOIN properties p ON p.id = aa.property_id
       LEFT JOIN contacts tc ON tc.id = aa.tenant_contact_id
      WHERE aa.status IN ('open','in_progress')
        ${bw.sql.replace('branch_id', 'aa.branch_id')}
      ORDER BY aa.days_overdue DESC, aa.created_at ASC`,
    bw.params
  ).catch(() => ({ count: 0, top: [] }));

  const expenseApprovalsPending = await cohort(
    `SELECT ea.id, ea.expense_code, ea.property_id, ea.expense_type, ea.estimated_amount, ea.status,
            p.title AS property_title, p.property_code, oc.full_name AS owner_name
       FROM expense_approvals ea
       LEFT JOIN properties p ON p.id = ea.property_id
       LEFT JOIN contacts oc ON oc.id = ea.owner_contact_id
      WHERE ea.status = 'pending'
        ${bw.sql.replace('branch_id', 'ea.branch_id')}
      ORDER BY ea.created_at ASC`,
    bw.params
  ).catch(() => ({ count: 0, top: [] }));

  const risksDue = await cohort(
    `SELECT pr.id, pr.risk_code, pr.property_id, pr.risk_category, pr.risk_rating, pr.review_date, pr.status,
            p.title AS property_title, p.property_code
       FROM property_risks pr
       LEFT JOIN properties p ON p.id = pr.property_id
      WHERE pr.status IN ('open','monitoring')
        AND (pr.review_date IS NULL OR pr.review_date <= DATE_ADD(CURDATE(), INTERVAL 14 DAY))
        ${bw.sql.replace('branch_id', 'pr.branch_id')}
      ORDER BY FIELD(pr.risk_rating, 'critical','high','medium','low'), pr.review_date ASC`,
    bw.params
  ).catch(() => ({ count: 0, top: [] }));

  const moveInsBlocked = await cohort(
    `SELECT mic.tenancy_id AS id, mic.tenancy_id, mic.property_id, COUNT(*) AS pending_items,
            p.title AS property_title, p.property_code, tc.full_name AS tenant_name
       FROM move_in_checklist_items mic
       LEFT JOIN properties p ON p.id = mic.property_id
       LEFT JOIN contacts tc ON tc.id = mic.tenant_contact_id
      WHERE mic.required = 1 AND mic.status NOT IN ('done','na')
        ${bw.sql.replace('branch_id', 'mic.branch_id')}
      GROUP BY mic.tenancy_id, mic.property_id, p.title, p.property_code, tc.full_name
      ORDER BY pending_items DESC`,
    bw.params
  ).catch(() => ({ count: 0, top: [] }));

  // ── HEADLINE totals for the top strip ──
  const headline = {
    overdue_rent_amount: overdueRent.top.reduce((a, r) => a + Number(r.outstanding || 0), 0),
    open_action_count:
      overdueRent.count + rentDue7d.count + appsAwaitingOwner.count + appsAwaitingDocs.count +
      blockedMarketing.count + expiring30.count + woOverdue.count + statementsNotSent.count +
      utilityBillsDue.count + tenantRequestsOpen.count + arrearsEscalations.count + expenseApprovalsPending.count + risksDue.count + moveInsBlocked.count,
    setup_blocker_count:
      kycIncomplete.count + missingAgreement.count + missingBank.count + missingAccess.count,
    expiring_all_count: expiring30.count + expiring60.count + expiring90.count,
  };

  res.json({
    headline,
    cohorts: {
      overdue_rent: overdueRent,
      rent_due_7d: rentDue7d,
      applications_awaiting_owner: appsAwaitingOwner,
      applications_awaiting_docs: appsAwaitingDocs,
      properties_blocked_marketing: blockedMarketing,
      leases_expiring_30d: expiring30,
      leases_expiring_60d: expiring60,
      leases_expiring_90d: expiring90,
      work_orders_overdue: woOverdue,
      statements_not_sent: statementsNotSent,
      utility_bills_due: utilityBillsDue,
      tenant_requests_open: tenantRequestsOpen,
      arrears_escalations: arrearsEscalations,
      expense_approvals_pending: expenseApprovalsPending,
      risks_due: risksDue,
      move_ins_blocked: moveInsBlocked,
      kyc_incomplete: kycIncomplete,
      missing_agreement: missingAgreement,
      missing_bank: missingBank,
      missing_access: missingAccess,
    },
    generated_at: new Date().toISOString(),
  });
});

// ─── DASHBOARD METRICS (for the redesigned cockpit) ─────────────────────────
// GET /api/property-management/dashboard-metrics
// Everything the cockpit charts need, from live data: occupancy split,
// 12-month rent-collection trend, arrears aging, owner held balance + income.
exports.dashboardMetrics = asyncHandler(async (req, res) => {
  const bw = branchWhere(req);
  const q = (sql, extra = {}) => sequelize.query(sql, { replacements: { ...bw.params, ...extra } }).then(([r]) => r);

  // Occupancy — managed rental properties split by state.
  const [occ] = await q(
    `SELECT
       COUNT(*) AS managed,
       COALESCE(SUM(CASE WHEN status IN ('occupied','rented') THEN 1 ELSE 0 END),0) AS occupied,
       COALESCE(SUM(CASE WHEN status='available' THEN 1 ELSE 0 END),0) AS vacant
     FROM properties WHERE listing_type='rent'${bw.sql}`);
  const [[notice]] = [await q(
    `SELECT COUNT(DISTINCT vn.property_id) AS c FROM vacancy_notices vn WHERE vn.status IN ('submitted','acknowledged','scheduled')${bw.sql ? bw.sql.replace('branch_id', 'vn.branch_id') : ''}`)];
  const managed = Number(occ?.managed || 0);
  const occupied = Number(occ?.occupied || 0);
  const underNotice = Number(notice?.c || 0);
  const vacant = Math.max(0, managed - occupied);
  const occupancy = {
    managed, occupied: Math.max(0, occupied - underNotice), under_notice: underNotice, vacant,
    rate: managed ? Math.round((occupied / managed) * 100) : 0,
  };

  // 12-month rent-collection trend from the rental ledger.
  const trendRows = await q(
    `SELECT period_label AS period,
            COALESCE(SUM(rent_due),0) AS billed,
            COALESCE(SUM(rent_received),0) AS collected
       FROM rental_ledger
      WHERE period_label IS NOT NULL${bw.sql}
      GROUP BY period_label ORDER BY period_label DESC LIMIT 12`);
  const rent_trend = trendRows.reverse().map((r) => ({ period: r.period, billed: Number(r.billed), collected: Number(r.collected) }));

  // Arrears aging (outstanding rent by age of due date).
  const [aging] = await q(
    `SELECT
       COALESCE(SUM(CASE WHEN DATEDIFF(CURDATE(), due_date) <= 30 THEN (rent_due-rent_received) ELSE 0 END),0) AS b0_30,
       COALESCE(SUM(CASE WHEN DATEDIFF(CURDATE(), due_date) BETWEEN 31 AND 60 THEN (rent_due-rent_received) ELSE 0 END),0) AS b31_60,
       COALESCE(SUM(CASE WHEN DATEDIFF(CURDATE(), due_date) BETWEEN 61 AND 90 THEN (rent_due-rent_received) ELSE 0 END),0) AS b61_90,
       COALESCE(SUM(CASE WHEN DATEDIFF(CURDATE(), due_date) > 90 THEN (rent_due-rent_received) ELSE 0 END),0) AS b90
     FROM rental_ledger WHERE (rent_due-rent_received) > 0 AND due_date IS NOT NULL${bw.sql}`);
  const arrears_aging = {
    b0_30: Number(aging?.b0_30 || 0), b31_60: Number(aging?.b31_60 || 0),
    b61_90: Number(aging?.b61_90 || 0), b90: Number(aging?.b90 || 0),
  };

  // Owner held balance + our earned income.
  const [held] = await q(`SELECT COALESCE(SUM(current_balance),0) AS t, COUNT(*) AS n FROM folios WHERE folio_type='landlord'${bw.sql}`);
  const [inc] = await q(`SELECT COALESCE(SUM(amount),0) AS t FROM pm_income_entries WHERE 1=1${bw.sql}`);

  // This-month collected vs billed.
  const [month] = await q(
    `SELECT COALESCE(SUM(rent_due),0) AS billed, COALESCE(SUM(rent_received),0) AS collected
       FROM rental_ledger WHERE period_label = DATE_FORMAT(CURDATE(),'%Y-%m')${bw.sql}`);

  res.json({
    occupancy, rent_trend, arrears_aging,
    held_for_owners: Number(held?.t || 0), owner_folios: Number(held?.n || 0),
    income_total: Number(inc?.t || 0),
    this_month: { billed: Number(month?.billed || 0), collected: Number(month?.collected || 0) },
    generated_at: new Date().toISOString(),
  });
});
