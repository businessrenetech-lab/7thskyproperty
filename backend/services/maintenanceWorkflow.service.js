/**
 * maintenanceWorkflow.service.js
 * ------------------------------------------------------------------
 * Business logic for the maintenance / work-order lifecycle:
 *   submitted → triaged → pending_owner_approval → approved →
 *   scheduled → in_progress → completed → invoiced → closed
 *
 * Also handles auto-generation of landlord bill (provider invoice)
 * and optional tenant recharge (client invoice) when a WO completes.
 */
const sequelize = require('../config/db.config');
const WorkOrder = require('../models/WorkOrder');
const Property = require('../models/Property');
const PropertyInvoice = require('../models/PropertyInvoice');
const InvoiceItem = require('../models/InvoiceItem');
const Tenancy = require('../models/Tenancy');
const Communication = require('../models/Communication');
const { generateCode } = require('../utils/codeGenerator');

const num = (v) => Number(v || 0);

/**
 * Triage a submitted work order. Sets severity/category if provided, computes
 * SLA due-by, decides whether owner approval is required based on
 * estimated_cost vs approval_threshold, and moves tenant_visible_status.
 */
async function triage(workOrderId, { severity, category, estimated_cost, approval_threshold, notes, user_id }) {
  const wo = await WorkOrder.findByPk(workOrderId);
  if (!wo) throw new Error('Work order not found');

  const patch = { triaged_at: new Date(), triaged_by: user_id || null };
  if (severity) patch.severity = severity;
  if (category) patch.category = category;
  if (estimated_cost != null) patch.estimated_cost = num(estimated_cost);
  if (approval_threshold != null) patch.approval_threshold = num(approval_threshold);
  if (notes) patch.category_notes = notes;

  // SLA target: emergency = 24h, urgent = 3d, normal = 7d, cosmetic = 30d
  const sev = patch.severity || wo.severity;
  const slaHours = sev === 'emergency' ? 24 : sev === 'urgent' ? 72 : sev === 'normal' ? 168 : 720;
  patch.sla_due_at = new Date(Date.now() + slaHours * 60 * 60 * 1000);

  // Threshold check for owner approval requirement
  const est = num(patch.estimated_cost ?? wo.estimated_cost);
  const threshold = num(patch.approval_threshold ?? wo.approval_threshold);
  if (est > 0 && threshold > 0 && est >= threshold) {
    patch.approval_status = 'pending_owner';
    patch.tenant_visible_status = 'triaged';
    // Status stays draft/issued until approved
  } else {
    patch.approval_status = 'not_required';
    patch.tenant_visible_status = 'triaged';
  }

  await wo.update(patch);
  return wo;
}

/** Owner (or landlord portal) decides on a pending approval. */
async function decide(workOrderId, { decision, note }) {
  if (!['approved', 'rejected'].includes(decision)) throw new Error('decision must be approved|rejected');
  const wo = await WorkOrder.findByPk(workOrderId);
  if (!wo) throw new Error('Work order not found');
  if (wo.approval_status !== 'pending_owner') throw new Error('Work order is not awaiting owner approval');

  const patch = {
    approval_status: decision,
    owner_decision_at: new Date(),
    owner_decision_note: note || null,
  };
  if (decision === 'approved') {
    patch.status = 'issued';
    patch.tenant_visible_status = 'approved';
  } else {
    patch.status = 'cancelled';
    patch.tenant_visible_status = 'cancelled';
  }
  await wo.update(patch);
  return wo;
}

/** Assign a provider and optionally schedule. */
async function assign(workOrderId, { provider_id, scheduled_date, amount }) {
  const wo = await WorkOrder.findByPk(workOrderId);
  if (!wo) throw new Error('Work order not found');
  const patch = {};
  if (provider_id) patch.provider_id = provider_id;
  if (scheduled_date) patch.scheduled_date = scheduled_date;
  if (amount != null) patch.amount = num(amount);
  patch.status = 'accepted';
  patch.tenant_visible_status = 'scheduled';
  await wo.update(patch);
  return wo;
}

async function start(workOrderId) {
  const wo = await WorkOrder.findByPk(workOrderId);
  if (!wo) throw new Error('Work order not found');
  await wo.update({ status: 'in_progress', tenant_visible_status: 'in_progress', started_at: new Date() });
  return wo;
}

/**
 * Complete a work order. If actual_cost > 0, auto-create:
 *   1. A landlord bill (provider invoice) for the cost
 *   2. If tenant_recharge=true, a tenant invoice for tenant_recharge_amount
 */
async function complete(workOrderId, { actual_cost, after_photos, provider_notes, tenant_recharge, tenant_recharge_amount, user_id }) {
  const wo = await WorkOrder.findByPk(workOrderId);
  if (!wo) throw new Error('Work order not found');
  if (!wo.property_id) throw new Error('Work order has no property');
  const property = await Property.findByPk(wo.property_id);
  if (!property) throw new Error('Property missing');

  const cost = num(actual_cost ?? wo.actual_cost ?? wo.amount ?? wo.estimated_cost);
  const rechargeFlag = tenant_recharge != null ? !!tenant_recharge : !!wo.tenant_recharge;
  const rechargeAmt = num(tenant_recharge_amount ?? wo.tenant_recharge_amount ?? cost);

  // Pre-generate invoice codes BEFORE the tx opens. generateCode() reads the
  // latest code on a fresh connection, so calling it twice inside the same
  // transaction produces duplicates (the first INSERT isn't visible yet).
  // Serialise here + sanity-check the tenant recharge is on the next number.
  const codes = { landlord: null, recharge: null };
  if (cost > 0 && property.owner_contact_id) {
    codes.landlord = await generateCode(PropertyInvoice, 'invoice_code', 'SSPC-IN-');
  }
  const rechargeFlagPre = tenant_recharge != null ? !!tenant_recharge : !!wo.tenant_recharge;
  if (rechargeFlagPre && rechargeAmt > 0) {
    if (codes.landlord) {
      // Increment the numeric tail of the landlord code by 1 so both codes are unique + ordered.
      const m = codes.landlord.match(/(\D+)(\d+)$/);
      if (m) codes.recharge = m[1] + String(parseInt(m[2], 10) + 1).padStart(m[2].length, '0');
    } else {
      codes.recharge = await generateCode(PropertyInvoice, 'invoice_code', 'SSPC-IN-');
    }
  }

  return sequelize.transaction(async (tx) => {
    // 1. Landlord bill (provider invoice) — represents money owed to the provider
    let landlordBill = null;
    if (cost > 0 && property.owner_contact_id) {
      landlordBill = await PropertyInvoice.create({
        branch_id: wo.branch_id,
        invoice_code: codes.landlord,
        invoice_kind: 'provider',
        contact_id: property.owner_contact_id,
        provider_id: wo.provider_id || null,
        property_id: wo.property_id,
        billed_to_type: 'owner',
        service_for: 'maintenance',
        title: `Maintenance — ${wo.title}`,
        subtotal: cost, total: cost, balance: cost, amount_paid: 0, status: 'sent',
        issue_date: new Date(),
        due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        created_by: user_id || null,
      }, { transaction: tx });
      await InvoiceItem.create({
        invoice_id: landlordBill.id,
        description: `${wo.category || 'Maintenance'} — ${wo.title}`,
        quantity: 1,
        unit_price: cost,
        amount: cost,
        property_id: wo.property_id,
      }, { transaction: tx });
    }

    // 2. Tenant recharge invoice (client invoice)
    let rechargeInv = null;
    if (rechargeFlag && rechargeAmt > 0) {
      // Find the active tenancy on this property
      const activeTenancy = await Tenancy.findOne({ where: { property_id: wo.property_id, status: 'active' }, transaction: tx });
      if (activeTenancy?.tenant_contact_id) {
        rechargeInv = await PropertyInvoice.create({
          branch_id: wo.branch_id,
          invoice_code: codes.recharge,
          invoice_kind: 'client',
          contact_id: activeTenancy.tenant_contact_id,
          property_id: wo.property_id,
          tenancy_id: activeTenancy.id,
          billed_to_type: 'tenant',
          service_for: 'maintenance',
          title: `Maintenance recharge — ${wo.title}`,
          subtotal: rechargeAmt, total: rechargeAmt, balance: rechargeAmt, amount_paid: 0, status: 'sent',
          issue_date: new Date(),
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          created_by: user_id || null,
        }, { transaction: tx });
        await InvoiceItem.create({
          invoice_id: rechargeInv.id,
          description: `Tenant recharge — ${wo.category || 'Maintenance'} — ${wo.title}`,
          quantity: 1,
          unit_price: rechargeAmt,
          amount: rechargeAmt,
          property_id: wo.property_id,
          tenancy_id: activeTenancy.id,
          billable_to_tenant: true,
        }, { transaction: tx });
      }
    }

    // 3. Update WO to completed + link the invoices
    await wo.update({
      status: 'completed',
      tenant_visible_status: 'completed',
      completed_date: new Date().toISOString().slice(0, 10),
      actual_cost: cost,
      amount: cost, // canonical amount
      after_photos: Array.isArray(after_photos) ? after_photos : (wo.after_photos || []),
      provider_notes: provider_notes || wo.provider_notes || null,
      tenant_recharge: rechargeFlag,
      tenant_recharge_amount: rechargeFlag ? rechargeAmt : null,
      landlord_bill_id: landlordBill?.id || null,
      tenant_recharge_invoice_id: rechargeInv?.id || null,
    }, { transaction: tx });

    // 4. Log a Communication so the property timeline captures completion
    await Communication.create({
      branch_id: wo.branch_id,
      entity_type: 'property', entity_id: wo.property_id,
      channel: 'note', direction: 'outbound',
      subject: `Work completed: ${wo.title}`,
      body: `Cost: BDT ${cost.toLocaleString()}${rechargeFlag ? ` · Tenant recharge: BDT ${rechargeAmt.toLocaleString()}` : ''}${provider_notes ? `\n${provider_notes}` : ''}`,
      user_id: user_id || null,
    }, { transaction: tx });

    return { workOrder: wo, landlordBill, tenantRechargeInvoice: rechargeInv };
  });
}

module.exports = { triage, decide, assign, start, complete };
