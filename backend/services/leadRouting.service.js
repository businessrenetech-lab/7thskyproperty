/**
 * leadRouting.service.js
 * ------------------------------------------------------------------
 * Assign a new SalesEnquiry to a sales officer. Active LeadRoutingRules are
 * evaluated by priority (lowest first); the first whose non-null match_*
 * fields all equal the enquiry's values wins. The rule targets a single
 * officer or round-robins across its pool. With no matching rule, a global
 * round-robin over active sales_executives (fallback branch_admin) picks the
 * least-recently-assigned officer. An enquiry that already carries an
 * assigned_officer_id is never overridden.
 */
const { Op } = require('sequelize');
const sequelize = require('../config/db.config');
const LeadRoutingRule = require('../models/LeadRoutingRule');
const User = require('../models/User');

const arr = (v) => { if (Array.isArray(v)) return v; try { const p = JSON.parse(v || '[]'); return Array.isArray(p) ? p : []; } catch { return []; } };

// Least-recently-assigned pick over a set of candidate user ids: officers with
// zero enquiries sort first, then by oldest most-recent assignment.
async function leastRecentlyAssigned(branchId, candidateIds, transaction) {
  if (!candidateIds.length) return null;
  const [rows] = await sequelize.query(
    `SELECT assigned_officer_id AS uid, MAX(created_at) AS last_at
       FROM sales_enquiries
      WHERE branch_id = :branchId AND assigned_officer_id IN (:ids)
      GROUP BY assigned_officer_id`,
    { replacements: { branchId, ids: candidateIds }, transaction },
  );
  const lastByUid = new Map(rows.map((r) => [Number(r.uid), new Date(r.last_at).getTime()]));
  // Never-assigned first (−Infinity), then oldest last assignment.
  return [...candidateIds].sort((a, b) => (lastByUid.get(a) ?? -Infinity) - (lastByUid.get(b) ?? -Infinity))[0];
}

async function activePool(branchId, transaction) {
  const where = (role) => ({ branch_id: branchId, status: 'active', role });
  let users = await User.findAll({ where: where('sales_executive'), attributes: ['id'], raw: true, transaction });
  if (!users.length) users = await User.findAll({ where: where('branch_admin'), attributes: ['id'], raw: true, transaction });
  return users.map((u) => u.id);
}

function matchRule(enquiry, category, rules) {
  return rules.find((r) => {
    if (r.match_category && r.match_category !== category) return false;
    if (r.match_area && r.match_area !== (enquiry.preferred_area || null)) return false;
    if (r.match_source && r.match_source !== (enquiry.source || null)) return false;
    return true;
  }) || null;
}

/**
 * routeEnquiry(enquiry, { category, transaction }) — mutates + saves
 * assigned_officer_id + routing_rule_id on the enquiry. `category` is the
 * enquiry's property category (optional); pass it when available to match
 * category rules. Returns { officerId, ruleId, sequenceId } (sequenceId is the
 * matched rule's default_sequence_id, for the caller to enrol).
 */
async function routeEnquiry(enquiry, { category = null, transaction = null } = {}) {
  if (enquiry.assigned_officer_id) {
    return { officerId: enquiry.assigned_officer_id, ruleId: enquiry.routing_rule_id || null, sequenceId: null };
  }
  const rules = await LeadRoutingRule.findAll({
    where: { branch_id: enquiry.branch_id, active: true },
    order: [['priority', 'ASC'], ['id', 'ASC']], transaction,
  });
  const rule = matchRule(enquiry, category, rules);

  let officerId = null;
  let sequenceId = null;
  if (rule) {
    sequenceId = rule.default_sequence_id || null;
    if (rule.assign_to) officerId = rule.assign_to;
    else officerId = await leastRecentlyAssigned(enquiry.branch_id, arr(rule.assign_pool).map(Number).filter(Boolean), transaction);
  }
  if (!officerId) {
    officerId = await leastRecentlyAssigned(enquiry.branch_id, await activePool(enquiry.branch_id, transaction), transaction);
  }

  await enquiry.update({ assigned_officer_id: officerId || null, routing_rule_id: rule ? rule.id : null }, { transaction });
  return { officerId: officerId || null, ruleId: rule ? rule.id : null, sequenceId };
}

module.exports = { routeEnquiry, matchRule, leastRecentlyAssigned, activePool };
