// backend/scripts/testLeadAutomation.js
// Lead automation checks: (routing) rule match, in-pool round-robin, and
// never-override; (sequences) added in Task 4. Self-cleaning on a throwaway
// branch so it never touches live data.
const assert = require('assert');
const { Op } = require('sequelize');
const SalesEnquiry = require('../models/SalesEnquiry');
const LeadRoutingRule = require('../models/LeadRoutingRule');
const { routeEnquiry } = require('../services/leadRouting.service');

const TB = 990001; // throwaway branch id
let pass = 0; const ok = (c, m) => { assert.ok(c, m); pass++; };

async function cleanup() {
  await SalesEnquiry.destroy({ where: { branch_id: TB } });
  await LeadRoutingRule.destroy({ where: { branch_id: TB } });
}

const mkEnq = (n, extra = {}) => SalesEnquiry.create({
  branch_id: TB, enquiry_code: `LEAD-TEST-${Date.now()}-${n}`, enquirer_name: `T${n}`, stage: 'new', ...extra,
});

(async () => {
  await cleanup();

  // ── routing ──────────────────────────────────────────────────────────────
  // A) a matching rule with a fixed officer assigns that officer.
  const ruleA = await LeadRoutingRule.create({ branch_id: TB, name: 'walkins', priority: 10, match_source: 'walk_in', assign_to: 777, active: true });
  const eA = await mkEnq('A', { source: 'walk_in' });
  const rA = await routeEnquiry(eA, {});
  ok(rA.officerId === 777 && eA.assigned_officer_id === 777, 'rule match assigns the rule officer');
  ok(rA.ruleId === ruleA.id && eA.routing_rule_id === ruleA.id, 'routing_rule_id records the matched rule');
  await ruleA.update({ active: false }); // retire it so it stops matching below

  // B) a pool rule round-robins least-recently-assigned across the pool.
  const ruleB = await LeadRoutingRule.create({ branch_id: TB, name: 'pool', priority: 20, assign_pool: [801, 802], active: true });
  const eB1 = await mkEnq('B1'); await routeEnquiry(eB1, {});
  const eB2 = await mkEnq('B2'); await routeEnquiry(eB2, {});
  ok([801, 802].includes(eB1.assigned_officer_id), 'pool route picks a pool member');
  ok(eB2.assigned_officer_id !== eB1.assigned_officer_id, 'second pool route picks the other (round-robin)');
  await ruleB.update({ active: false });

  // C) an enquiry that already has an officer is never overridden.
  const eC = await mkEnq('C', { assigned_officer_id: 802 });
  const rC = await routeEnquiry(eC, {});
  ok(rC.officerId === 802 && eC.assigned_officer_id === 802, 'explicit officer is preserved');
  ok(!eC.routing_rule_id, 'no rule attributed when officer pre-set');

  await cleanup();
  console.log(`${pass} PASS / 0 FAIL (leadAutomation)`);
  process.exit(0);
})().catch(async (e) => { try { await cleanup(); } catch {} console.error(e); process.exit(1); });
