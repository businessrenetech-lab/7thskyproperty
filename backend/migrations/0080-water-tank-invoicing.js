'use strict';

/**
 * Migration 0080: Water Tank — invoicing.
 *
 * wt_invoices was a summary row (code, client, amount, due_date, outstanding,
 * status). An invoice a client actually receives has to itemise what they are
 * being charged for, and the numbers on it have to reconcile with the contract
 * that was signed. So this adds:
 *
 *   lines            the priced services, exactly as agreed — the client should
 *                    recognise them from Schedule C of their agreement
 *   the breakdown    subtotal, discount, VAT, advance applied, balance
 *   the lifecycle    Draft → Sent → Part Paid → Paid → Void, because the user's
 *                    requirement is that a signed contract DRAFTS an invoice
 *                    which is then edited and only then sent
 *   provenance       which agreement / AMC / project / quotation it came from
 *   AMC instalments  an AMC bills on a schedule, so each invoice knows which
 *                    instalment of how many it represents and the period covered
 *
 * The balance is deliberately NOT stored — it is total − advance_applied − paid.
 * A stored balance is one that eventually disagrees with the rows above it.
 *
 * Idempotent.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const S = Sequelize;
    const hasCol = async (t, c) => { try { return !!(await queryInterface.describeTable(t))[c]; } catch { return false; } };
    const add = async (t, c, spec) => { if (!(await hasCol(t, c))) await queryInterface.addColumn(t, c, spec); };

    const cols = {
      // ── what is being charged ──
      // [{ code, name, description, qty, unit, unit_price, line_total, group }]
      lines: S.JSON,
      subtotal: { type: S.DECIMAL(15, 2), defaultValue: 0 },
      discount: { type: S.DECIMAL(15, 2), defaultValue: 0 },
      discount_note: S.STRING(200),
      transport: { type: S.DECIMAL(15, 2), defaultValue: 0 },
      govt_fees: { type: S.DECIMAL(15, 2), defaultValue: 0 },
      other_charges: { type: S.DECIMAL(15, 2), defaultValue: 0 },
      vat_percent: { type: S.DECIMAL(5, 2), defaultValue: 0 },
      vat_amount: { type: S.DECIMAL(15, 2), defaultValue: 0 },
      // advance already taken on the contract and credited against this invoice
      advance_applied: { type: S.DECIMAL(15, 2), defaultValue: 0 },
      advance_note: S.STRING(200),

      // ── lifecycle ──
      // Draft | Sent | Viewed | Part Paid | Paid | Overdue | Void
      issue_date: S.DATEONLY,
      sent_at: S.DATE, viewed_at: S.DATE, paid_at: S.DATE,
      voided_at: S.DATE, void_reason: S.TEXT,
      sent_to: S.STRING(160), sent_by: S.STRING(120),

      // ── who it is for ──
      client_code: S.STRING(30), client_id: S.INTEGER,
      bill_to_name: S.STRING(200), bill_to_address: S.STRING(255),
      bill_to_phone: S.STRING(40), bill_to_email: S.STRING(160),
      site_address: S.STRING(255),

      // ── where it came from ──
      // Agreement | AMC | Project | Work Order | Quotation | Manual
      source_type: { type: S.STRING(40), defaultValue: 'Manual' },
      agreement_code: S.STRING(40), agreement_envelope_id: S.INTEGER,
      amc_code: S.STRING(30), quotation_code: S.STRING(30), work_order_code: S.STRING(30),

      // ── AMC instalment context ──
      instalment_no: S.INTEGER, instalment_of: S.INTEGER,
      period_start: S.DATEONLY, period_end: S.DATEONLY,

      // ── presentation / terms ──
      currency: { type: S.STRING(8), defaultValue: 'BDT' },
      payment_terms: S.STRING(255),
      notes: S.TEXT,
      footer_note: S.TEXT,
      reference: S.STRING(80),
      prepared_by: S.STRING(120),
      // frozen at send time — the client's copy must never change afterwards
      document_html: S.TEXT('long'),
      issued_snapshot: S.JSON,
    };
    for (const [c, spec] of Object.entries(cols)) await add('wt_invoices', c, spec);

    for (const [name, fields] of Object.entries({
      wt_inv_client_code: ['client_code'],
      wt_inv_source: ['source_type'],
      wt_inv_amc: ['amc_code'],
      wt_inv_status: ['status'],
    })) {
      try { await queryInterface.addIndex('wt_invoices', fields, { name }); } catch { /* exists */ }
    }
  },

  down: async (queryInterface) => {
    const rm = async (t, c) => { try { await queryInterface.removeColumn(t, c); } catch { /* not present */ } };
    const cols = [
      'lines', 'subtotal', 'discount', 'discount_note', 'transport', 'govt_fees',
      'other_charges', 'vat_percent', 'vat_amount', 'advance_applied', 'advance_note',
      'issue_date', 'sent_at', 'viewed_at', 'paid_at', 'voided_at', 'void_reason',
      'sent_to', 'sent_by',
      'client_code', 'client_id', 'bill_to_name', 'bill_to_address', 'bill_to_phone',
      'bill_to_email', 'site_address',
      'source_type', 'agreement_code', 'agreement_envelope_id', 'amc_code',
      'quotation_code', 'work_order_code',
      'instalment_no', 'instalment_of', 'period_start', 'period_end',
      'currency', 'payment_terms', 'notes', 'footer_note', 'reference', 'prepared_by',
      'document_html', 'issued_snapshot',
    ];
    for (const c of cols) await rm('wt_invoices', c);
  },
};
