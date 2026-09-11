// backend/scripts/testLeadAutomation.js
// Lead automation checks: (routing) rule match, in-pool round-robin, and
// never-override; (sequences) added in Task 4. Self-cleaning on a throwaway
// branch so it never touches live data.
const assert = require('assert');
const { Op } = require('sequelize');
const SalesEnquiry = require('../models/SalesEnquiry');
const LeadRoutingRule = require('../models/LeadRoutingRule');
const LeadSequence = require('../models/LeadSequence');
const MessageTemplate = require('../models/MessageTemplate');
const Contact = require('../models/Contact');
const Communication = require('../models/Communication');
const Branch = require('../models/Branch');
const { routeEnquiry } = require('../services/leadRouting.service');
const { runLeadSequences } = require('../services/leadSequence.scheduler');

const TB = 990001; // throwaway branch id
let pass = 0; const ok = (c, m) => { assert.ok(c, m); pass++; };

async function cleanup() {
  await Communication.destroy({ where: { branch_id: TB } });
  await SalesEnquiry.destroy({ where: { branch_id: TB } });
  await LeadRoutingRule.destroy({ where: { branch_id: TB } });
  await LeadSequence.destroy({ where: { branch_id: TB } });
  await MessageTemplate.destroy({ where: { branch_id: TB } });
  await Contact.destroy({ where: { branch_id: TB } });
  await Branch.destroy({ where: { id: TB } });
}

const mkEnq = (n, extra = {}) => SalesEnquiry.create({
  branch_id: TB, enquiry_code: `LEAD-TEST-${Date.now()}-${n}`, enquirer_name: `T${n}`, stage: 'new', ...extra,
});

(async () => {
  await cleanup();
  await Branch.create({ id: TB, name: 'Lead Test Branch', code: `LEADTEST${TB}`, slug: `lead-test-${TB}` });

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

  // ── sequences ──────────────────────────────────────────────────────────────
  const tpl = await MessageTemplate.create({ branch_id: TB, name: 'nudge', channel: 'email', subject: 'Hi {{first_name}}', body: 'Following up, {{name}}.' });
  const seq = await LeadSequence.create({ branch_id: TB, name: 'buyer nurture', active: true, steps: [
    { day_offset: 0, channel: 'email', template_id: tpl.id },
    { day_offset: 5, channel: 'email', template_id: tpl.id },
  ] });
  const ct = await Contact.create({ branch_id: TB, contact_code: `LEAD-TEST-CT-${Date.now()}`, full_name: 'Seq Buyer', email: 'seq@test.local' });

  // D) due step sends once, and re-run is a no-op (marker idempotency); the
  //    second (day 5) step keeps the sequence active.
  const eD = await mkEnq('D', { contact_id: ct.id, email: 'seq@test.local', sequence_id: seq.id, sequence_status: 'active', sequence_enrolled_at: new Date() });
  const run1 = await runLeadSequences({ enquiry_id: eD.id });
  const run2 = await runLeadSequences({ enquiry_id: eD.id });
  const mk0 = await Communication.count({ where: { entity_type: 'sales_enquiry', entity_id: eD.id, subject: { [Op.like]: `%[SEQ:${seq.id}:0]%` } } });
  await eD.reload();
  ok(run1.sent >= 1, 'first run sends the due step');
  ok(mk0 === 1, 'step-0 recorded exactly once across both runs (idempotent)');
  ok(eD.sequence_status === 'active', 'sequence stays active while a later step is pending');

  // E) advancing the stage past the nurture window stops the sequence.
  const eE = await mkEnq('E', { contact_id: ct.id, email: 'seq@test.local', sequence_id: seq.id, sequence_status: 'active', sequence_enrolled_at: new Date(), stage: 'viewed' });
  await runLeadSequences({ enquiry_id: eE.id });
  await eE.reload();
  const eESends = await Communication.count({ where: { entity_type: 'sales_enquiry', entity_id: eE.id } });
  ok(eE.sequence_status === 'completed', 'stage past viewing_scheduled completes the sequence');
  ok(eESends === 0, 'no message sent to an already-advanced lead');

  // F) a do-not-email contact is suppressed (recorded, not dispatched, not retried).
  const ctS = await Contact.create({ branch_id: TB, contact_code: `LEAD-TEST-CTS-${Date.now()}`, full_name: 'No Email', email: 'no@test.local', do_not_email: true });
  const seq1 = await LeadSequence.create({ branch_id: TB, name: 'single', active: true, steps: [{ day_offset: 0, channel: 'email', template_id: tpl.id }] });
  const eF = await mkEnq('F', { contact_id: ctS.id, email: 'no@test.local', sequence_id: seq1.id, sequence_status: 'active', sequence_enrolled_at: new Date() });
  await runLeadSequences({ enquiry_id: eF.id });
  const suppressed = await Communication.findOne({ where: { entity_type: 'sales_enquiry', entity_id: eF.id, subject: { [Op.like]: `%[SEQ:${seq1.id}:0]%` } } });
  ok(suppressed && suppressed.delivery_status === 'suppressed', 'do-not-email contact is suppressed, not sent');

  await cleanup();
  console.log(`${pass} PASS / 0 FAIL (leadAutomation)`);
  process.exit(0);
})().catch(async (e) => { try { await cleanup(); } catch {} console.error(e); process.exit(1); });
