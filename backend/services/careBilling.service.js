/**
 * careBilling.service.js — the money automation for Property Care work orders.
 *
 *  client pays  → book our fee as income + accrue the provider's charge to their folio
 *  pay provider → credit the provider folio (partial/milestone allowed)
 *  both legs done → work order settles.
 */
const { Op } = require('sequelize');
const PmIncomeEntry = require('../models/PmIncomeEntry');
const ServiceProvider = require('../models/ServiceProvider');
const FolioTransaction = require('../models/FolioTransaction');
const { generateCode } = require('../utils/codeGenerator');
const { postFolioTransaction } = require('./folio.service');

const num = (v) => Number(v || 0);
const period = () => new Date().toISOString().slice(0, 7);

// Book Seventh Sky's service fee as income (once per work order).
async function bookServiceIncome(wo, opts = {}) {
  if (wo.income_posted || num(wo.sspc_fee) <= 0) return;
  await PmIncomeEntry.create({
    branch_id: wo.branch_id,
    entry_code: await generateCode(PmIncomeEntry, 'entry_code', 'SSPC-INC-'),
    category: 'maintenance_admin', source_type: 'invoice', source_id: wo.id,
    property_id: wo.property_id, tenancy_id: wo.tenancy_id, period_label: period(),
    fee_name: `Service fee · ${wo.service_name || wo.work_order_code}`,
    amount: num(wo.sspc_fee), notes: wo.work_order_code,
  }, { transaction: opts.transaction });
  await wo.update({ income_posted: true }, { transaction: opts.transaction });
}

// Accrue the provider's charge onto their folio (once) — makes it payable.
async function accrueProviderPayable(wo, opts = {}) {
  if (!wo.assigned_provider_id || num(wo.provider_charge) <= 0) return;
  const provider = await ServiceProvider.findByPk(wo.assigned_provider_id, { transaction: opts.transaction });
  if (!provider?.folio_id) return;
  const existing = await FolioTransaction.findOne({
    where: { folio_id: provider.folio_id, bucket: 'supplier_bill', description: { [Op.like]: `Payable · ${wo.work_order_code}%` } },
    transaction: opts.transaction,
  });
  if (existing) return;
  await postFolioTransaction({
    folio_id: provider.folio_id, transaction_type: 'charge', bucket: 'supplier_bill',
    property_id: wo.property_id, description: `Payable · ${wo.work_order_code} (${wo.service_name || 'service'})`,
    debit: num(wo.provider_charge), created_by: opts.user_id || null,
  }, { transaction: opts.transaction });
}

// Derive payment_status from the two legs.
function settlementPatch(wo) {
  const clientPaid = num(wo.service_value) > 0 && num(wo.client_paid_amount) >= num(wo.service_value) - 0.001;
  const providerNA = num(wo.provider_charge) <= 0 || !wo.assigned_provider_id;
  const providerPaid = !providerNA && num(wo.provider_paid_amount) >= num(wo.provider_charge) - 0.001;
  if (clientPaid && (providerPaid || providerNA)) return { payment_status: 'settled', settled_at: new Date() };
  if (providerPaid) return { payment_status: 'provider_paid' };
  if (clientPaid) return { payment_status: 'paid' };
  return { payment_status: wo.invoice_id ? 'invoiced' : 'unbilled' };
}

/** Called when a service invoice receives a payment. */
async function onClientPayment(wo, invoiceAmountPaid, opts = {}) {
  await wo.update({ client_paid_amount: num(invoiceAmountPaid) }, { transaction: opts.transaction });
  const fullyPaid = num(invoiceAmountPaid) >= num(wo.service_value) - 0.001;
  if (fullyPaid) {
    await bookServiceIncome(wo, opts);
    await accrueProviderPayable(wo, opts);
  }
  await wo.reload({ transaction: opts.transaction });
  await wo.update(settlementPatch(wo), { transaction: opts.transaction });
}

module.exports = { bookServiceIncome, accrueProviderPayable, settlementPatch, onClientPayment };
