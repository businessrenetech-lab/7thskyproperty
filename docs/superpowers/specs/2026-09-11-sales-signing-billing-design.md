# Sales Signing → Billing Wiring — design spec

**Date:** 2026-09-11 · **Branch:** `air-conditioning/phase-0-duplicate` (not merged)
**Plan:** `PROPERTY_SALES_SAAS_PHASED_PLAN.md` §Phase 4 (connect signing completion to activation + billing obligations, exactly once).
**Status:** design approved in brainstorming; awaiting spec review before the implementation plan.

**Phase 4, sub-project C of 4** (A = RPPS/RPSS builders ✅; B = Contracts hub ✅;
D = Contacts relationships). When an RPPS/RPSS agreement is fully signed, turn its
signed payment schedule into **draft agency-fee invoices** (never double-charged),
flag the sale engagement as agreement-signed, and log a property event — all in
the existing `handleEnvelopeCompleted` dispatch, mirroring the water-tank
customer-agreement path.

Verified against current source 2026-09-11. `signing.controller.signByToken`
calls `handleEnvelopeCompleted(envelope)` once, only when all principals have
signed and the envelope transitions to `completed`. `handleEnvelopeCompleted`
(`partyRoleActivation.service`) already dispatches by `related_type` and, for
`*_customer_agreement`, drafts invoices from `terms.payment_schedule` via
`wtInvoice.createFromSignedAgreement`, which guarantees once-only with
`count({ where: { agreement_envelope_id: envelope.id } })`. `PropertyInvoice`
(+ `InvoiceItem`) is the general client/property invoice (status enum includes
`draft`, code `SSPC-IN-`) but has **no** `agreement_envelope_id` column.
`SaleProfile.agreement_status` ENUM already includes `signed`.
`logPropertyEvent(propertyId, branchId, subject, body)` exists.
Agreement terms carry `{ payment_schedule:[{stage,amount,due}], pricing_summary,
agreed_lines, party, schedule_b }` (from `salesAgreementRender`).

---

## 1. Goal

On completion of a `sale_purchase_agreement` / `sale_sale_agreement` envelope:
1. Draft one `PropertyInvoice` per stage of the signed `terms.payment_schedule`,
   billed to the buyer/seller, linked to the envelope — **idempotently** (a repeat
   or duplicate completion never creates a second set).
2. Mark the linked `SaleProfile.agreement_status = 'signed'` (when a property is
   linked) — best-effort.
3. Log a property timeline event.
None of these ever roll back or block the signature; all are wrapped so a failure
is logged, not thrown.

## 2. Scope

**In:**
- **Migration** adding `agreement_envelope_id` (nullable INTEGER, indexed) to
  `property_invoices` — the idempotency + reporting key.
- A **sales-agreement completion service** `salesAgreementCompletion.service.js`:
  `onCompleted(envelope, { transaction })` that, for the two sales
  `related_type`s, drafts the invoices, flags the profile and logs the event.
- **Invoice drafting** from `terms.payment_schedule`: one `PropertyInvoice`
  (`invoice_kind:'client'`, `status:'draft'`, `agreement_envelope_id: env.id`,
  `contact_id` = signer.contact_id, `property_id` = env.related_id, title =
  `<Agreement title> — <stage>`, `notes` referencing the envelope_code) + one
  `InvoiceItem` (description = stage, amount). The **deposit/first** stage gets a
  `due_date` (issue + 7 days); later stages carry no due date until triggered.
  Percent/commission stages with amount 0 are drafted as a 0-value placeholder
  line noting the basis (e.g. "% of Purchase Price — as agreed"), so the whole
  billing plan is visible without inventing a number.
- **Idempotency:** skip entirely if any `PropertyInvoice` already has
  `agreement_envelope_id = env.id` (mirrors `wtInvoice.createFromSignedAgreement`).
- **Activation:** if `env.related_id` (property) resolves a `SaleProfile`, set
  `agreement_status = 'signed'` (best-effort); `logPropertyEvent(...)`.
- **Wire point:** a branch in `handleEnvelopeCompleted` for the two sales
  related_types, calling `salesAgreementCompletion.onCompleted(env, { transaction: tx })`
  inside the existing completion transaction, in a try/catch (never rolls back
  the signature) — same shape as the water-tank block.

**Out (deferred / non-goals):**
- Sending invoices (drafts only; operator reviews and sends via existing invoicing).
- Computing the percent success-fee/commission amount (left 0/as-agreed until the
  transaction price is known — that reconciliation is a later concern).
- Settlement/trust engine changes (the property transaction settlement is separate).
- A sales-specific invoice screen (the drafts appear in the existing invoicing UI,
  filterable; a dedicated view can come later).
- Contacts dedup → sub-project D.

## 3. Idempotency & correctness (the gate)

- One completion → one set of drafts, keyed by `agreement_envelope_id`. The
  guard runs first inside the service; a duplicate `handleEnvelopeCompleted`
  (re-POST, retry) finds existing rows and no-ops.
- `handleEnvelopeCompleted` only fires on the `completed` transition, and
  `signByToken` refuses to re-sign a `completed` envelope (409) — so the callback
  itself is already single-shot; the `agreement_envelope_id` guard is the
  belt-and-braces the plan's gate demands.
- Invoice figures come straight from the signed `terms` (never re-priced), so an
  invoice cannot drift from what was signed.
- The whole side-effect block is best-effort: any error is caught and logged; the
  signature/completion is never rolled back.

## 4. Testing & verification

- **Migration:** `db:migrate` adds `agreement_envelope_id` to `property_invoices`
  (+ index); `down` removes it.
- **Unit/harness (service-level):** a node script that builds a fake completed
  RPPS envelope (terms with a 3-stage payment schedule) and calls
  `onCompleted` twice → first call creates 3 draft PropertyInvoices linked to the
  envelope with the right amounts + one due date; second call creates 0 (idempotent).
  Wire it into `npm test` (like `testBusinessDays.js`).
- **Live (end-to-end):** create an RPPS agreement (wizard) with a couple of priced
  lines, open its signing link, sign as the buyer to completion → the envelope
  becomes `completed`, 3 draft invoices appear (via the invoicing list API filtered
  by `agreement_envelope_id`), the `SaleProfile.agreement_status` is `signed`, and
  a property event is logged. Re-trigger completion (or re-run the service) → no
  new invoices.
- **Non-regression:** the water-tank / tenancy / care completion branches are
  untouched; backend `npm test` (27/0 + businessDays + the new idempotency test)
  + `npm run test:full` (28/0) green; build unaffected (no UI change required).
- **Acceptance:** signing an RPPS/RPSS agreement produces exactly one set of draft
  agency-fee invoices matching the signed schedule, flags the engagement, and is
  safe against duplicate completion callbacks.

## 5. File plan

**Backend (new):** `migrations/0110-property-invoice-agreement-link.js`,
`services/salesAgreementCompletion.service.js`,
`scripts/testSalesAgreementCompletion.js` (idempotency test).
**Backend (modify):** `models/PropertyInvoice.js` (+`agreement_envelope_id`),
`services/partyRoleActivation.service.js` (`handleEnvelopeCompleted` — add the
two-sales-related_type branch), `package.json` (wire the new test into `npm test`).
**Frontend:** none (drafts surface in the existing invoicing UI).
**Schema:** migration 0110 (one nullable indexed column).

## 6. Risks & non-goals

- **Money path — drafts only.** Never auto-send; the operator sends via the
  existing invoicing flow. Amounts come verbatim from signed terms.
- **Percent/commission stages** draft as 0/as-agreed placeholders (no invented
  figure); reconciling them to the final price is out of scope.
- **Best-effort, never blocking.** The completion side effects are wrapped; a
  failure logs and continues — the signature always stands.
- **Contact linkage:** if the signer has no `contact_id`, the invoice is still
  drafted with the signer name in `notes`/title and `contact_id` null (operator
  attaches the client later) — drafting is not blocked on a missing contact.
- **Non-goals:** sending, commission reconciliation, settlement engine, a
  dedicated sales-invoice screen, contacts dedup.
