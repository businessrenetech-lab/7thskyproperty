// backend/services/pmAgreementCompletion.service.js
//
// On RPRM (property management service agreement) signing completion: draft an
// agency-fee PropertyInvoice per ONE-TIME stage of the signed payment schedule
// (onboarding / leasing / setup fees), idempotently keyed by the envelope.
// Figures come verbatim from the signed terms — never re-priced.
//
// The RECURRING monthly management fee is deliberately NOT invoiced here: it is
// captured as an OwnerFeeSchedule at agreement creation and flows into the
// monthly owner statement as a management-fee deduction. Invoicing it too would
// double-count the agency's income.
const PropertyInvoice = require('../models/PropertyInvoice');
const InvoiceItem = require('../models/InvoiceItem');
const EnvelopeSigner = require('../models/EnvelopeSigner');
const { generateCode } = require('../utils/codeGenerator');

const PM_RELATED = ['property_management_agreement'];
const asObj = (v) => { if (v && typeof v === 'object') return v; try { return JSON.parse(v || '{}'); } catch { return {}; } };
const asArr = (v) => { if (Array.isArray(v)) return v; try { const p = JSON.parse(v || '[]'); return Array.isArray(p) ? p : []; } catch { return []; } };
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
// A stage is recurring (skip it) when its due text or label marks it so.
const isRecurring = (s) => /recurring|per period|monthly management/i.test(`${s.stage || ''} ${s.due || ''}`);

async function onCompleted(envelope, { transaction } = {}) {
  if (!envelope || !PM_RELATED.includes(envelope.related_type)) return { invoices: [] };
  // Idempotency: one completion → one set of drafts, keyed by the envelope.
  const existing = await PropertyInvoice.count({ where: { branch_id: envelope.branch_id, agreement_envelope_id: envelope.id }, transaction });
  if (existing) return { invoices: [] };

  const terms = asObj(envelope.terms);
  const stages = asArr(terms.payment_schedule).filter((s) => !isRecurring(s) && num(s.amount) > 0);
  if (!stages.length) return { invoices: [] };

  const signer = await EnvelopeSigner.findOne({ where: { envelope_id: envelope.id }, order: [['signer_order', 'ASC']], transaction });
  const label = terms.doc_no ? `${terms.doc_no} management fee` : 'Management agreement fee';

  // One base code, then increment locally (the batch's inserts aren't visible to
  // generateCode inside the same uncommitted transaction).
  const baseCode = await generateCode(PropertyInvoice, 'invoice_code', 'SSPC-IN-');
  const m = String(baseCode).match(/^(.*?)(\d+)$/);
  const codePrefix = m ? m[1] : 'SSPC-IN-';
  const codeWidth = m ? m[2].length : 6;
  const baseNum = m ? parseInt(m[2], 10) : 1;
  const codeFor = (i) => `${codePrefix}${String(baseNum + i).padStart(codeWidth, '0')}`;

  const invoices = [];
  for (let i = 0; i < stages.length; i++) {
    const s = stages[i] || {};
    const amount = num(s.amount);
    const inv = await PropertyInvoice.create({
      branch_id: envelope.branch_id,
      invoice_code: codeFor(i),
      invoice_kind: 'client', invoice_type: 'agreement_fee',
      agreement_envelope_id: envelope.id,
      contact_id: signer?.contact_id || null, property_id: envelope.related_id || null,
      title: `${label} — ${s.stage || `Stage ${i + 1}`}`,
      status: 'draft',
      subtotal: amount, total: amount, balance: amount, amount_paid: 0,
      issue_date: new Date(),
      due_date: i === 0 ? new Date(Date.now() + 7 * 864e5) : null,
      notes: `Auto-drafted from signed ${envelope.envelope_code} (${signer?.name || 'landlord'}). Stage: ${s.stage || ''}. Due: ${s.due || 'as scheduled'}.`,
      created_by: null,
    }, { transaction });
    await InvoiceItem.create({
      invoice_id: inv.id, description: s.stage || `Stage ${i + 1}`, quantity: 1,
      unit_price: amount, amount, property_id: envelope.related_id || null,
    }, { transaction });
    invoices.push(inv);
  }
  return { invoices };
}

module.exports = { onCompleted, PM_RELATED };
