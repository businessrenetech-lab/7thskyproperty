// backend/scripts/testSalesAgreementCompletion.js
// Idempotency check for signing→billing: a completed sales envelope with a
// 3-stage payment schedule drafts 3 invoices on the first onCompleted and 0 on
// the second. Self-cleaning.
const assert = require('assert');
const SigningEnvelope = require('../models/SigningEnvelope');
const EnvelopeSigner = require('../models/EnvelopeSigner');
const PropertyInvoice = require('../models/PropertyInvoice');
const svc = require('../services/salesAgreementCompletion.service');

(async () => {
  const env = await SigningEnvelope.create({
    branch_id: 1, envelope_code: `TEST-RPPS-${Date.now().toString().slice(-6)}`,
    title: 'Test RPPS', document_html: '<p>x</p>', related_type: 'sale_purchase_agreement', related_id: null,
    status: 'completed', terms: {
      doc_no: 'SSPC-RPPS-01', payment_schedule: [
        { stage: 'Deposit', amount: 1000, due: 'On acceptance' },
        { stage: 'Balance', amount: 2000, due: 'On completion' },
        { stage: 'Success fee', amount: 0, due: 'As agreed' },
      ],
    },
  });
  await EnvelopeSigner.create({ envelope_id: env.id, signer_order: 1, role: 'client', name: 'Test Buyer', email: 't@x.com', status: 'signed' });

  const a = await svc.onCompleted(env, {});
  const b = await svc.onCompleted(env, {});
  const rows = await PropertyInvoice.findAll({ where: { agreement_envelope_id: env.id } });
  const total = rows.reduce((s, r) => s + Number(r.total || 0), 0);
  const withDue = rows.filter((r) => r.due_date).length;

  // cleanup
  await PropertyInvoice.destroy({ where: { agreement_envelope_id: env.id } });
  await EnvelopeSigner.destroy({ where: { envelope_id: env.id } });
  await env.destroy();

  let pass = 0; const ok = (c, m) => { assert.ok(c, m); pass++; };
  ok(a.invoices.length === 3, 'first call drafts 3 invoices');
  ok(b.invoices.length === 0, 'second call is idempotent (0)');
  ok(rows.length === 3, 'exactly 3 invoices persisted');
  ok(total === 3000, 'totals match the signed schedule (1000+2000+0)');
  ok(withDue === 1, 'only the deposit stage carries a due date');
  console.log(`${pass} PASS / 0 FAIL (salesAgreementCompletion)`);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
