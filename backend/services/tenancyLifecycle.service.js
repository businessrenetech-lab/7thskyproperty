/**
 * tenancyLifecycle.service.js
 * ------------------------------------------------------------------
 * Business logic for renewal + vacancy + deposit-settlement flows.
 *
 * RENEWAL machine (on tenancies):
 *   none → proposed → owner_approved → tenant_accepted → activated | declined
 *
 * VACANCY notice:
 *   submitted → acknowledged → exit_scheduled → exit_completed → closed
 *
 * DEPOSIT settlement:
 *   computing → pending_owner → approved | disputed → refunded → closed
 *
 * Deposit formula:
 *   refund = deposit_held + advance_rent_held
 *          − unpaid_rent − unpaid_service − damages − cleaning − utility − other
 */
const sequelize = require('../config/db.config');
const Tenancy = require('../models/Tenancy');
const Property = require('../models/Property');
const VacancyNotice = require('../models/VacancyNotice');
const DepositSettlement = require('../models/DepositSettlement');
const BondDepositRecord = require('../models/BondDepositRecord');
const { generateCode } = require('../utils/codeGenerator');
const { Op } = require('sequelize');

const num = (v) => Number(v || 0);

// ═══ RENEWAL ═══════════════════════════════════════════════════════════════

async function proposeRenewal(tenancyId, { new_rent, new_service_charge, new_lease_end, notes, user_id }) {
  const t = await Tenancy.findByPk(tenancyId);
  if (!t) throw new Error('Tenancy not found');
  if (t.status !== 'active') throw new Error('Only active tenancies can be renewed');
  await t.update({
    renewal_status: 'proposed',
    renewal_offer_rent: num(new_rent) || t.monthly_rent,
    renewal_offer_service: new_service_charge != null ? num(new_service_charge) : t.service_charge,
    renewal_offer_lease_end: new_lease_end || null,
    renewal_proposed_at: new Date(),
    renewal_notes: notes || null,
  });
  return t;
}

async function decideRenewal(tenancyId, { decision, note }) {
  if (!['approved', 'declined'].includes(decision)) throw new Error('decision must be approved|declined');
  const t = await Tenancy.findByPk(tenancyId);
  if (!t) throw new Error('Tenancy not found');
  if (t.renewal_status !== 'proposed') throw new Error('Renewal is not in proposed state');
  if (decision === 'approved') {
    await t.update({
      renewal_status: 'owner_approved',
      renewal_owner_approved_at: new Date(),
      renewal_notes: [t.renewal_notes, note && `Owner: ${note}`].filter(Boolean).join('\n'),
    });
  } else {
    await t.update({ renewal_status: 'declined', renewal_notes: [t.renewal_notes, note && `Owner declined: ${note}`].filter(Boolean).join('\n') });
  }
  return t;
}

async function tenantAcceptRenewal(tenancyId, { note }) {
  const t = await Tenancy.findByPk(tenancyId);
  if (!t) throw new Error('Tenancy not found');
  if (t.renewal_status !== 'owner_approved') throw new Error('Renewal is not in owner_approved state');
  await t.update({
    renewal_status: 'tenant_accepted',
    renewal_tenant_accepted_at: new Date(),
    renewal_notes: [t.renewal_notes, note && `Tenant: ${note}`].filter(Boolean).join('\n'),
  });
  return t;
}

async function activateRenewal(tenancyId) {
  const t = await Tenancy.findByPk(tenancyId);
  if (!t) throw new Error('Tenancy not found');
  if (t.renewal_status !== 'tenant_accepted') throw new Error('Renewal is not accepted by tenant');
  const patch = { renewal_status: 'activated', renewal_activated_at: new Date() };
  if (t.renewal_offer_rent) patch.monthly_rent = t.renewal_offer_rent;
  if (t.renewal_offer_service != null) patch.service_charge = t.renewal_offer_service;
  if (t.renewal_offer_lease_end) patch.lease_end = t.renewal_offer_lease_end;
  await t.update(patch);
  return t;
}

// ═══ VACANCY NOTICE ════════════════════════════════════════════════════════

async function submitVacancyNotice({ tenancy_id, intended_vacate_date, reason, notes, submitted_by_type = 'tenant', user_id }) {
  const t = await Tenancy.findByPk(tenancy_id);
  if (!t) throw new Error('Tenancy not found');
  if (t.status !== 'active') throw new Error('Tenancy is not active');

  const notice_received_date = new Date().toISOString().slice(0, 10);
  // Compute notice period days between receipt and intended vacate date
  const daysBetween = Math.round((new Date(intended_vacate_date) - new Date(notice_received_date)) / (1000 * 60 * 60 * 24));
  // Assume 30-day required notice period (business rule; adjust per contract later)
  const notice_period_met = daysBetween >= 30;

  return VacancyNotice.create({
    branch_id: t.branch_id,
    notice_code: await generateCode(VacancyNotice, 'notice_code', 'SSPC-VN-'),
    tenancy_id: t.id,
    property_id: t.property_id,
    tenant_contact_id: t.tenant_contact_id,
    submitted_by_type,
    intended_vacate_date,
    notice_received_date,
    notice_period_days: daysBetween,
    notice_period_met,
    reason: reason || null,
    notes: notes || null,
    status: 'submitted',
    created_by: user_id || null,
  });
}

async function scheduleExit(noticeId, { exit_inspection_date, inspection_id, user_id }) {
  const vn = await VacancyNotice.findByPk(noticeId);
  if (!vn) throw new Error('Vacancy notice not found');
  await vn.update({
    status: 'exit_scheduled',
    exit_inspection_date: exit_inspection_date || null,
    exit_inspection_id: inspection_id || null,
  });
  return vn;
}

// ═══ DEPOSIT SETTLEMENT ════════════════════════════════════════════════════

/**
 * Compute a deposit settlement from live data — unpaid invoices, damages passed in,
 * cleaning, utility dues. Returns without persisting if `persist=false`.
 */
async function computeDeposit(tenancyId, { damages_lines = [], cleaning = 0, utility_dues = 0, other_deductions = 0, other_lines = [] }) {
  const t = await Tenancy.findByPk(tenancyId);
  if (!t) throw new Error('Tenancy not found');

  const bond = await BondDepositRecord.findOne({ where: { tenancy_id: t.id } });
  const deposit_held = num(bond?.security_deposit_received || t.security_deposit);
  const advance_rent_held = num(bond?.advance_rent_received || t.advance_rent);

  // Unpaid tenant invoices (rent + service + others) for this tenancy
  const [[unpaidAgg]] = await sequelize.query(
    `SELECT
       COALESCE(SUM(CASE WHEN service_for = 'tenancy' THEN balance ELSE 0 END), 0) AS rent_service,
       COALESCE(SUM(CASE WHEN service_for = 'utility' THEN balance ELSE 0 END), 0) AS utility,
       COALESCE(SUM(CASE WHEN service_for NOT IN ('tenancy', 'utility') THEN balance ELSE 0 END), 0) AS other
       FROM invoices
      WHERE tenancy_id = :tid AND invoice_kind = 'client' AND status NOT IN ('paid','cancelled','voided')`,
    { replacements: { tid: t.id } }
  );

  // Rent+service is bundled in tenancy invoices; split proportionally isn't reliable, so treat combined
  const unpaid_rent = num(unpaidAgg?.rent_service);
  const unpaid_service_charge = 0; // rolled into unpaid_rent for our current invoice model
  const utility_from_invoices = num(unpaidAgg?.utility);
  const other_from_invoices = num(unpaidAgg?.other);

  const damages_total = damages_lines.reduce((a, l) => a + num(l.amount), 0);
  const other_total = other_deductions + other_lines.reduce((a, l) => a + num(l.amount), 0) + other_from_invoices;

  const total_deductions = unpaid_rent + unpaid_service_charge + damages_total + num(cleaning) + (num(utility_dues) + utility_from_invoices) + other_total;
  const refund_amount = Math.max(0, deposit_held + advance_rent_held - total_deductions);

  const deduction_lines = [
    ...(unpaid_rent > 0 ? [{ label: 'Unpaid rent / service charges', amount: unpaid_rent }] : []),
    ...damages_lines.map((l) => ({ label: `Damage: ${l.label}`, amount: num(l.amount) })),
    ...(cleaning > 0 ? [{ label: 'Cleaning', amount: num(cleaning) }] : []),
    ...((num(utility_dues) + utility_from_invoices) > 0 ? [{ label: 'Utility dues', amount: num(utility_dues) + utility_from_invoices }] : []),
    ...other_lines.map((l) => ({ label: l.label, amount: num(l.amount) })),
    ...(other_from_invoices > 0 ? [{ label: 'Other unpaid tenant invoices', amount: other_from_invoices }] : []),
  ];

  return {
    tenancy_id: t.id,
    property_id: t.property_id,
    tenant_contact_id: t.tenant_contact_id,
    owner_contact_id: t.owner_contact_id,
    bond_record_id: bond?.id || null,
    deposit_held,
    advance_rent_held,
    unpaid_rent,
    unpaid_service_charge,
    damages: damages_total,
    cleaning: num(cleaning),
    utility_dues: num(utility_dues) + utility_from_invoices,
    other_deductions: other_total,
    total_deductions,
    refund_amount,
    deduction_lines,
  };
}

async function createSettlement({ tenancy_id, vacancy_notice_id, damages_lines, cleaning, utility_dues, other_deductions, other_lines, notes, branch_id, user_id }) {
  const t = await Tenancy.findByPk(tenancy_id);
  if (!t) throw new Error('Tenancy not found');

  const existing = await DepositSettlement.findOne({ where: { tenancy_id } });
  if (existing) return existing;

  const computed = await computeDeposit(tenancy_id, { damages_lines, cleaning, utility_dues, other_deductions, other_lines });

  const s = await DepositSettlement.create({
    branch_id: branch_id || t.branch_id,
    settlement_code: await generateCode(DepositSettlement, 'settlement_code', 'SSPC-DS-'),
    vacancy_notice_id: vacancy_notice_id || null,
    ...computed,
    status: 'pending_owner',
    notes: notes || null,
    created_by: user_id || null,
  });

  if (vacancy_notice_id) {
    await VacancyNotice.update({ settlement_id: s.id }, { where: { id: vacancy_notice_id } });
  }
  return s;
}

async function recomputeSettlement(settlementId, { damages_lines, cleaning, utility_dues, other_deductions, other_lines }) {
  const s = await DepositSettlement.findByPk(settlementId);
  if (!s) throw new Error('Settlement not found');
  if (s.status === 'refunded' || s.status === 'closed') throw new Error('Settlement is finalised — cannot recompute');
  const computed = await computeDeposit(s.tenancy_id, { damages_lines, cleaning, utility_dues, other_deductions, other_lines });
  await s.update({ ...computed, status: 'pending_owner' });
  return s;
}

async function decideSettlement(settlementId, { decision, note }) {
  if (!['approved', 'disputed'].includes(decision)) throw new Error('decision must be approved|disputed');
  const s = await DepositSettlement.findByPk(settlementId);
  if (!s) throw new Error('Settlement not found');
  await s.update({
    status: decision,
    owner_decision_at: new Date(),
    owner_decision_note: note || null,
  });
  return s;
}

async function markRefunded(settlementId, { refund_method, refund_reference, user_id }) {
  const s = await DepositSettlement.findByPk(settlementId);
  if (!s) throw new Error('Settlement not found');
  if (s.status !== 'approved') throw new Error('Settlement must be owner-approved before refunding');
  await s.update({
    status: 'refunded',
    refunded_at: new Date(),
    refund_method: refund_method || null,
    refund_reference: refund_reference || null,
  });
  // Close the tenancy
  await Tenancy.update({ status: 'ended', move_out_date: new Date().toISOString().slice(0, 10) }, { where: { id: s.tenancy_id } });
  // Close the vacancy notice if any
  await VacancyNotice.update({ status: 'closed' }, { where: { settlement_id: s.id } });
  return s;
}

module.exports = {
  proposeRenewal, decideRenewal, tenantAcceptRenewal, activateRenewal,
  submitVacancyNotice, scheduleExit,
  computeDeposit, createSettlement, recomputeSettlement, decideSettlement, markRefunded,
};
