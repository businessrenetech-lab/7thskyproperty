// backend/services/salesAgreementCompletion.service.js
//
// On RPPS/RPSS signing completion: draft one agency-fee PropertyInvoice per
// stage of the signed payment schedule (idempotently, keyed by the envelope),
// and flag the sale engagement as agreement-signed. Figures come verbatim from
// the signed terms — never re-priced. Drafts only; never sent.
const PropertyInvoice = require('../models/PropertyInvoice');
const InvoiceItem = require('../models/InvoiceItem');
const { SaleProfile } = require('../models/SalesModels');
const EnvelopeSigner = require('../models/EnvelopeSigner');
const { generateCode } = require('../utils/codeGenerator');

const SALE_RELATED = ['sale_purchase_agreement', 'sale_sale_agreement'];
const asObj = (v) => { if (v && typeof v === 'object') return v; try { return JSON.parse(v || '{}'); } catch { return {}; } };
const asArr = (v) => { if (Array.isArray(v)) return v; try { const p = JSON.parse(v || '[]'); return Array.isArray(p) ? p : []; } catch { return []; } };
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

async function onCompleted(envelope, { transaction } = {}) {
  if (!envelope || !SALE_RELATED.includes(envelope.related_type)) return { invoices: [] };
  // Idempotency: one completion → one set of drafts, keyed by the envelope.
  const existing = await PropertyInvoice.count({ where: { branch_id: envelope.branch_id, agreement_envelope_id: envelope.id }, transaction });
  if (existing) return { invoices: [] };

  const terms = asObj(envelope.terms);
  const stages = asArr(terms.payment_schedule);
  const signer = await EnvelopeSigner.findOne({ where: { envelope_id: envelope.id }, order: [['signer_order', 'ASC']], transaction });
  const label = terms.doc_no ? `${terms.doc_no} agreement fee` : 'Agreement fee';

  const invoices = [];
  for (let i = 0; i < stages.length; i++) {
    const s = stages[i] || {};
    const amount = num(s.amount);
    const inv = await PropertyInvoice.create({
      branch_id: envelope.branch_id,
      invoice_code: await generateCode(PropertyInvoice, 'invoice_code', 'SSPC-IN-'),
      invoice_kind: 'client', invoice_type: 'agreement_fee',
      agreement_envelope_id: envelope.id,
      contact_id: signer?.contact_id || null, property_id: envelope.related_id || null,
      title: `${label} — ${s.stage || `Stage ${i + 1}`}`,
      status: 'draft',
      subtotal: amount, total: amount, balance: amount, amount_paid: 0,
      issue_date: new Date(),
      // Only the first (deposit) stage gets a due date; later stages wait for their trigger.
      due_date: i === 0 && amount > 0 ? new Date(Date.now() + 7 * 864e5) : null,
      notes: `Auto-drafted from signed ${envelope.envelope_code} (${signer?.name || 'client'}). Stage: ${s.stage || ''}. Due: ${s.due || 'as scheduled'}.`,
      created_by: null,
    }, { transaction });
    await InvoiceItem.create({
      invoice_id: inv.id, description: s.stage || `Stage ${i + 1}`, quantity: 1,
      unit_price: amount, amount, property_id: envelope.related_id || null,
    }, { transaction });
    invoices.push(inv);
  }

  // Activation (best-effort): flag the sale engagement as signed.
  if (envelope.related_id) {
    try {
      const profile = await SaleProfile.findOne({ where: { property_id: envelope.related_id, branch_id: envelope.branch_id }, transaction });
      if (profile) await profile.update({ agreement_status: 'signed' }, { transaction });
    } catch { /* best-effort */ }
  }
  return { invoices };
}

module.exports = { onCompleted, SALE_RELATED };
