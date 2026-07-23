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
const PartyRoleProfile = require('../models/PartyRoleProfile');
const PropertyInvoice = require('../models/PropertyInvoice');
const { generateCode } = require('../utils/codeGenerator');
const { ensureFoliosForTenancy, findTenantFolioForTenancy, findBestLandlordFolio, postFolioTransaction } = require('./folio.service');
const { Op } = require('sequelize');

const num = (v) => Number(v || 0);

// ═══ RENEWAL ═══════════════════════════════════════════════════════════════

async function proposeRenewal(tenancyId, { new_rent, new_service_charge, new_lease_end, effective_date, notes, user_id }) {
  const t = await Tenancy.findByPk(tenancyId);
  if (!t) throw new Error('Tenancy not found');
  if (t.status !== 'active') throw new Error('Only active tenancies can be renewed');
  if (!new_lease_end || Number.isNaN(new Date(new_lease_end).getTime())) throw new Error('A valid new lease end date is required');
  if (t.lease_end && new Date(new_lease_end) <= new Date(t.lease_end)) throw new Error('New lease end must be after the current lease end');
  const defaultEffective = t.lease_end ? new Date(new Date(t.lease_end).getTime() + 86400000).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  const renewalEffective = effective_date || defaultEffective;
  if (new Date(renewalEffective) >= new Date(new_lease_end)) throw new Error('Renewal effective date must be before the new lease end');
  if (!['none', 'declined'].includes(t.renewal_status || 'none')) throw new Error(`A renewal is already ${String(t.renewal_status).replace(/_/g, ' ')}`);
  await t.update({
    renewal_status: 'proposed',
    renewal_offer_rent: num(new_rent) || t.monthly_rent,
    renewal_offer_service: new_service_charge != null ? num(new_service_charge) : t.service_charge,
    renewal_offer_lease_end: new_lease_end || null,
    renewal_effective_date: renewalEffective,
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

// Quick renew — extend the lease at the SAME terms, no re-signing.
// Advances lease_start to the old lease_end and pushes lease_end out by `months`.
async function quickRenewal(tenancyId, { months, new_lease_end } = {}) {
  const t = await Tenancy.findByPk(tenancyId);
  if (!t) throw new Error('Tenancy not found');
  if (t.status !== 'active') throw new Error('Only active tenancies can be renewed');
  const term = Number(months || t.minimum_lease_period_months || 12);
  if (!Number.isFinite(term) || term <= 0) throw new Error('Renewal term must be greater than zero months');
  const oldEnd = t.lease_end ? new Date(t.lease_end) : new Date();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const base = oldEnd > today ? oldEnd : today;
  let end = new_lease_end ? new Date(new_lease_end) : new Date(base);
  if (!new_lease_end) end.setMonth(end.getMonth() + term);
  if (Number.isNaN(end.getTime()) || end <= base) throw new Error('New lease end must be after the current renewal start');
  await t.update({
    lease_end: end.toISOString().slice(0, 10),
    renewal_status: 'none',
    renewal_effective_date: base.toISOString().slice(0, 10),
    renewal_activated_at: new Date(),
    renewal_notes: [t.renewal_notes, `Quick-renewed ${new Date().toISOString().slice(0, 10)} for ${term} months at the same terms.`].filter(Boolean).join('\n'),
  });
  return t;
}

async function activateRenewal(tenancyId) {
  const t = await Tenancy.findByPk(tenancyId);
  if (!t) throw new Error('Tenancy not found');
  if (t.renewal_status !== 'tenant_accepted') throw new Error('Renewal is not accepted by tenant');
  const patch = { renewal_status: 'none', renewal_activated_at: new Date() };
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

  const notice = await VacancyNotice.create({
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

  // Progressive SOP: a vacancy notice unlocks the exit phase (renewal/termination,
  // exit inspection, service closure).
  if (t.property_id) { try { await require('./progressiveSop.service').unlockForEvent(t.property_id, 'vacating'); } catch {} }

  return notice;
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
  // Signed net: positive → refund to tenant; negative → collect the shortfall.
  const net_position = deposit_held + advance_rent_held - total_deductions;
  const refund_amount = Math.max(0, net_position);
  const amount_to_collect = Math.max(0, -net_position);
  const settlement_direction = net_position >= 0 ? 'refund' : 'collect';

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
    net_position,
    amount_to_collect,
    settlement_direction,
    deduction_lines,
  };
}

async function createSettlement({ tenancy_id, vacancy_notice_id, damages_lines, cleaning, utility_dues, other_deductions, other_lines, notes, branch_id, user_id }) {
  const t = await Tenancy.findByPk(tenancy_id);
  if (!t) throw new Error('Tenancy not found');

  const existing = await DepositSettlement.findOne({ where: { tenancy_id, status: { [Op.notIn]: ['refunded', 'closed'] } } });
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

/* ── Settlement controls: submit → independent review → approval → final lock ──
   Separation of duties is enforced by user id: the reviewer cannot be the person
   who submitted it, and the approver can be neither. A super_admin may override a
   separation block only with a written reason, which is recorded on the record. */

// Stages a settlement can still be edited/submitted from.
const SETTLEMENT_DRAFT = ['computing', 'pending_owner', 'disputed'];

function assertUnlocked(s) {
  if (s.is_locked || s.status === 'refunded' || s.status === 'closed') {
    throw new Error('Settlement is finalised and locked — no further changes are possible.');
  }
}

// Guards separation of duties. `actor` must differ from `other`; a super_admin can
// override with a reason (recorded), anyone else is blocked.
function assertDifferentPerson(actorId, otherId, { role, override, override_reason, message }) {
  if (!otherId || !actorId || actorId !== otherId) return null;
  if (override && role === 'super_admin' && String(override_reason || '').trim()) {
    return `Separation of duties overridden by super admin: ${String(override_reason).trim()}`;
  }
  throw new Error(message);
}

async function loadSettlement(settlementId) {
  const s = await DepositSettlement.findByPk(settlementId);
  if (!s) throw new Error('Settlement not found');
  return s;
}

// Step 1 — Submit the prepared settlement for independent review.
async function submitSettlement(settlementId, { user_id, notes } = {}) {
  const s = await loadSettlement(settlementId);
  assertUnlocked(s);
  if (!SETTLEMENT_DRAFT.includes(s.status)) {
    throw new Error(`Settlement is already at '${s.status}' — it cannot be submitted again.`);
  }
  await s.update({
    status: 'pending_review',
    submitted_by: user_id || null,
    submitted_at: new Date(),
    notes: notes ?? s.notes,
    // A fresh submission voids any earlier review/approval stamps.
    reviewed_by: null, reviewed_at: null, review_notes: null, approved_by: null, approved_at: null,
  });
  return s;
}

// Step 2 — Independent review. Must NOT be the person who submitted it.
async function reviewSettlement(settlementId, { user_id, role, decision = 'reviewed', notes, override, override_reason } = {}) {
  if (!['reviewed', 'rejected'].includes(decision)) throw new Error('decision must be reviewed|rejected');
  const s = await loadSettlement(settlementId);
  assertUnlocked(s);
  if (s.status !== 'pending_review') {
    throw new Error(`Independent review needs a submitted settlement (this one is '${s.status}').`);
  }
  // Send it back to the preparer — no separation check needed to reject.
  if (decision === 'rejected') {
    await s.update({ status: 'computing', reviewed_by: null, reviewed_at: null, review_notes: notes || null });
    return s;
  }
  const overrideNote = assertDifferentPerson(user_id, s.submitted_by, {
    role, override, override_reason,
    message: 'Independent review must be done by someone other than the person who submitted this settlement.',
  });
  await s.update({
    status: 'reviewed', reviewed_by: user_id || null, reviewed_at: new Date(),
    review_notes: notes || null, ...(overrideNote ? { override_reason: overrideNote } : {}),
  });
  return s;
}

// Step 3 — Approval. Must NOT be the reviewer, nor the person who submitted it.
async function approveSettlement(settlementId, { user_id, role, note, override, override_reason } = {}) {
  const s = await loadSettlement(settlementId);
  assertUnlocked(s);
  if (s.status !== 'reviewed') {
    throw new Error(`Approval needs an independently reviewed settlement (this one is '${s.status}').`);
  }
  const o1 = assertDifferentPerson(user_id, s.reviewed_by, {
    role, override, override_reason,
    message: 'Approval must be given by someone other than the person who reviewed this settlement.',
  });
  const o2 = assertDifferentPerson(user_id, s.submitted_by, {
    role, override, override_reason,
    message: 'Approval must be given by someone other than the person who submitted this settlement.',
  });
  const overrideNote = o1 || o2;
  await s.update({
    status: 'approved', approved_by: user_id || null, approved_at: new Date(),
    owner_decision_note: note || s.owner_decision_note,
    ...(overrideNote ? { override_reason: overrideNote } : {}),
  });
  return s;
}

// Recall a settlement that has been reviewed or approved back to draft — the only
// way to correct the figures once it is under review. Always needs a written reason
// and always voids the review/approval stamps, so the chain must run again.
async function reopenSettlement(settlementId, { user_id, reason } = {}) {
  const s = await loadSettlement(settlementId);
  assertUnlocked(s);
  if (!String(reason || '').trim()) throw new Error('A reason is required to reopen a settlement that has been reviewed or approved.');
  if (!['pending_review', 'reviewed', 'approved'].includes(s.status)) {
    throw new Error(`Only a submitted, reviewed or approved settlement can be reopened (this one is '${s.status}').`);
  }
  const stamp = `[reopened from '${s.status}' on ${new Date().toISOString().slice(0, 10)}] ${String(reason).trim()}`;
  await s.update({
    status: 'computing',
    submitted_by: null, submitted_at: null,
    reviewed_by: null, reviewed_at: null, review_notes: null,
    approved_by: null, approved_at: null,
    notes: s.notes ? `${s.notes}\n${stamp}` : stamp,
  });
  return s;
}

async function recomputeSettlement(settlementId, { damages_lines, cleaning, utility_dues, other_deductions, other_lines }) {
  const s = await loadSettlement(settlementId);
  assertUnlocked(s);
  if (['reviewed', 'approved'].includes(s.status)) {
    throw new Error(`Settlement is already ${s.status} — reopen it for changes first (the figures cannot be edited under review).`);
  }
  const computed = await computeDeposit(s.tenancy_id, { damages_lines, cleaning, utility_dues, other_deductions, other_lines });
  // Editing the figures voids a pending review — it goes back to draft.
  await s.update({ ...computed, status: 'computing', reviewed_by: null, reviewed_at: null, review_notes: null });
  return s;
}

// The OWNER's external decision (landlord portal). This records the owner's
// sign-off or dispute — it does NOT approve the settlement internally, so it can
// never bypass the review/approval chain.
async function decideSettlement(settlementId, { decision, note }) {
  if (!['approved', 'disputed'].includes(decision)) throw new Error('decision must be approved|disputed');
  const s = await loadSettlement(settlementId);
  assertUnlocked(s);
  if (decision === 'disputed') {
    await s.update({ status: 'disputed', owner_approved: false, owner_decision_at: new Date(), owner_decision_note: note || null });
    return s;
  }
  await s.update({ owner_approved: true, owner_decision_at: new Date(), owner_decision_note: note || null });
  return s;
}

// Finalize the settlement: MOVE MONEY, then end the tenancy. Handles both
// directions — refund the net to the tenant (funded from the owner's held
// balance) OR collect the shortfall from the tenant into the owner's balance.
async function markRefunded(settlementId, { refund_method, refund_reference, collection_method, collection_reference, user_id }) {
  const s = await DepositSettlement.findByPk(settlementId);
  if (!s) throw new Error('Settlement not found');
  if (s.is_locked) throw new Error('Settlement is already finalised and locked.');
  if (s.status !== 'approved') {
    throw new Error(`Settlement must complete review and approval before money can move (this one is '${s.status}').`);
  }
  const t = await Tenancy.findByPk(s.tenancy_id);
  if (!t) throw new Error('Tenancy not found');
  const moveOut = t.planned_move_out_date || t.termination_effective_date || new Date().toISOString().slice(0, 10);

  await sequelize.transaction(async (tx) => {
    await ensureFoliosForTenancy(t, { transaction: tx });
    const tenantFolio = await findTenantFolioForTenancy(t.id, { transaction: tx });
    const landlordFolio = await findBestLandlordFolio(t.owner_contact_id, t.property_id, { transaction: tx });

    // These invoice balances were included in the approved settlement. Close
    // them as settlement offsets so they cannot remain in arrears or be charged twice.
    const settledInvoices = await PropertyInvoice.findAll({
      where: {
        tenancy_id: t.id,
        invoice_kind: 'client',
        status: { [Op.notIn]: ['paid', 'cancelled', 'voided'] },
        created_at: { [Op.lte]: s.created_at },
      },
      order: [['due_date', 'ASC'], ['id', 'ASC']],
      transaction: tx,
      lock: tx.LOCK.UPDATE,
    });
    for (const invoice of settledInvoices) {
      const balance = num(invoice.balance);
      if (balance <= 0) continue;
      await invoice.update({
        amount_paid: num(invoice.amount_paid) + balance,
        balance: 0,
        status: 'paid',
        notes: [invoice.notes, `Settled through ${s.settlement_code}`].filter(Boolean).join('\n'),
      }, { transaction: tx });
    }

    if (s.settlement_direction === 'collect' && num(s.amount_to_collect) > 0) {
      // Tenant pays the shortfall → it lands in the owner's balance.
      const amt = num(s.amount_to_collect);
      if (tenantFolio) await postFolioTransaction({ folio_id: tenantFolio.id, transaction_type: 'payment', bucket: 'adjustment', debit: 0, credit: amt, tenancy_id: t.id, property_id: t.property_id, description: `End-of-tenancy dues collected — ${s.settlement_code}`, created_by: user_id }, { transaction: tx });
      if (landlordFolio) await postFolioTransaction({ folio_id: landlordFolio.id, transaction_type: 'payment', bucket: 'rent', debit: amt, credit: 0, tenancy_id: t.id, property_id: t.property_id, description: `Tenant end-of-tenancy dues → owner balance — ${s.settlement_code}`, created_by: user_id }, { transaction: tx });
      await s.update({ status: 'closed', collected_at: new Date(), collection_method: collection_method || refund_method || null, collection_reference: collection_reference || refund_reference || null, is_locked: true, locked_by: user_id || null, locked_at: new Date() }, { transaction: tx });
    } else {
      // Refund the net to the tenant, funded from the owner's held balance.
      const amt = num(s.refund_amount);
      if (amt > 0) {
        if (!landlordFolio) throw new Error('Owner folio is required before funding a tenant refund');
        const [[held]] = await sequelize.query(
          `SELECT COALESCE(SUM(debit - credit),0) AS balance
             FROM folio_transactions
            WHERE folio_id = :folioId AND property_id = :propertyId`,
          { replacements: { folioId: landlordFolio.id, propertyId: t.property_id }, transaction: tx }
        );
        if (num(held?.balance) + 0.001 < amt) throw new Error(`Owner held balance is insufficient for this refund (available ${num(held?.balance).toLocaleString()})`);
        if (landlordFolio) await postFolioTransaction({ folio_id: landlordFolio.id, transaction_type: 'owner_payout', bucket: 'owner_payout', debit: 0, credit: amt, tenancy_id: t.id, property_id: t.property_id, description: `Deposit refund funded from owner — ${s.settlement_code}`, created_by: user_id }, { transaction: tx });
        if (tenantFolio) await postFolioTransaction({ folio_id: tenantFolio.id, transaction_type: 'credit', bucket: 'deposit', debit: 0, credit: amt, tenancy_id: t.id, property_id: t.property_id, description: `Deposit refunded to tenant — ${s.settlement_code}`, created_by: user_id }, { transaction: tx });
      }
      await s.update({ status: 'refunded', refunded_at: new Date(), owner_funded: true, refund_method: refund_method || null, refund_reference: refund_reference || null, is_locked: true, locked_by: user_id || null, locked_at: new Date() }, { transaction: tx });
    }

    // Write back the bond record.
    if (s.bond_record_id) {
      await BondDepositRecord.update(
        { bond_status: s.settlement_direction === 'refund' ? 'refunded' : 'adjusted', total_deductions: s.total_deductions, refund_amount: s.refund_amount, refund_status: 'completed' },
        { where: { id: s.bond_record_id }, transaction: tx });
    }

    // End the tenancy — status off 'active' stops recurring rent generation.
    const terminated = t.end_type === 'termination';
    await t.update({
      status: terminated ? 'terminated' : 'ended',
      lease_status: terminated ? 'terminated' : 'expired',
      move_out_date: moveOut,
      planned_move_out_date: null,
    }, { transaction: tx });

    // Free the property + deactivate the tenant role.
    if (t.property_id) {
      await Property.update({ tenant_contact_id: null, status: 'available', occupancy_status: 'vacant', listing_status: 'not_listed', pm_status: 'assessment_pending' }, { where: { id: t.property_id }, transaction: tx });
    }
    await PartyRoleProfile.update({ next_action: 'Tenancy ended', status: 'expired' }, { where: { tenancy_id: t.id, role_type: 'tenant' }, transaction: tx });
    const Folio = require('../models/Folio');
    await Folio.update({ status: 'closed' }, { where: { tenancy_id: t.id, folio_type: 'tenant' }, transaction: tx });
  });

  await VacancyNotice.update({ status: 'closed' }, { where: { settlement_id: s.id } });
  try { if (t.property_id) await require('./progressiveSop.service').unlockForEvent(t.property_id, 'vacating'); } catch { /* non-fatal */ }
  return s;
}

module.exports = {
  proposeRenewal, decideRenewal, tenantAcceptRenewal, activateRenewal, quickRenewal,
  submitVacancyNotice, scheduleExit,
  computeDeposit, createSettlement, recomputeSettlement, decideSettlement, markRefunded,
  submitSettlement, reviewSettlement, approveSettlement, reopenSettlement,
};
