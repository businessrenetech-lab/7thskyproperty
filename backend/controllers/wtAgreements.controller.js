/**
 * Water Tank customer and provider agreements.
 * Provider agreements are versioned operational records backed by the canonical
 * 63-clause template and become active only after both ordered signers complete.
 */
const crypto = require('crypto');
const { Op } = require('sequelize');
const { asyncHandler, branchScope, resolveBranchId, pick, catalogueVertical, resolveServiceLine } = require('../utils/controllerHelpers');
const { getServiceLine } = require('../config/serviceLines');
const customerSvc = require('../services/wtCustomerAgreement.service');

// The agreement's related_type is what ties an envelope to its service line
// (water_tank_* / air_conditioning_*), so listing, signing completion and the
// downstream work-order/invoice creation all stay in the right service.
const relatedTypeFor = (req, kind) => getServiceLine(resolveServiceLine(req)).related_type[kind];
const envPrefixFor = (req, kind) => {
  const sl = resolveServiceLine(req);
  const tag = kind === 'customer' ? 'CSA' : 'PSA';
  return sl === 'air_conditioning' ? `ENV-ACS${tag}` : `ENV-WT${tag}`;
};
const providerSvc = require('../services/wtProviderAgreement.service');
const SigningEnvelope = require('../models/SigningEnvelope');
const EnvelopeSigner = require('../models/EnvelopeSigner');
const SignatureField = require('../models/SignatureField');
const M = require('../models/waterTankOps');
const P = require('../models/waterTankProviders');
const { generateCode } = require('../utils/codeGenerator');
const sequelize = require('../config/db.config');

const asObject = (value, fallback = {}) => {
  let out = value;
  for (let i = 0; i < 3 && typeof out === 'string'; i++) { try { out = JSON.parse(out); } catch { return fallback; } }
  return out && typeof out === 'object' && !Array.isArray(out) ? out : fallback;
};
const asArray = (value) => {
  let out = value;
  for (let i = 0; i < 3 && typeof out === 'string'; i++) { try { out = JSON.parse(out); } catch { return []; } }
  return Array.isArray(out) ? out : [];
};
const addMonths = (date, months) => {
  const d = date ? new Date(`${date}T00:00:00Z`) : new Date();
  d.setUTCMonth(d.getUTCMonth() + Number(months || 0));
  return d.toISOString().slice(0, 10);
};

async function listEnvelopes(req, relatedType) {
  const rows = await SigningEnvelope.findAll({
    where: { ...branchScope(req), related_type: relatedType },
    include: [{ model: EnvelopeSigner, as: 'signers', attributes: ['id', 'name', 'email', 'role', 'status', 'signer_order', 'signed_at'] }],
    order: [['id', 'DESC']],
  });
  return rows.map((row) => {
    const envelope = row.get({ plain: true });
    const terms = asObject(envelope.terms);
    return {
      id: envelope.id, envelope_code: envelope.envelope_code, title: envelope.title,
      status: envelope.status, created_at: envelope.createdAt, sent_at: envelope.sent_at,
      completed_at: envelope.completed_at, signers: envelope.signers || [],
      signer: (envelope.signers || [])[0] || null,
      total_contract_value: terms?.pricing_summary?.total_contract_value || null,
    };
  });
}

/* Customer agreement behavior remains compatible with the quotation flow. */
const customer = {
  getCatalog: asyncHandler(async (req, res) => res.json(await customerSvc.getCatalog(branchScope(req).branch_id, { vertical: catalogueVertical(req) }))),
  /*
   * Everything the agreement builder needs to populate its selects from real
   * data rather than hardcoded lists — the AMC package tiers and billing cycles
   * come from the AMC service (Schedule A + Clause 9), and the live AMC
   * contracts so an agreement can be tied to one that already exists.
   */
  getMeta: asyncHandler(async (req, res) => {
    const amcSvc = require('../services/wtAmc.service');
    const amcContracts = await M.WtAmcContract.findAll({
      where: { ...branchScope(req), status: 'Active' },
      attributes: ['code', 'client_name', 'package', 'package_tier', 'frequency',
        'payment_frequency', 'start_date', 'end_date', 'contract_value'],
      order: [['id', 'DESC']], limit: 100, raw: true,
    }).catch(() => []);

    const content = customerSvc.contentFor(catalogueVertical(req));
    res.json({
      service_groups: content.service_groups,
      // The catalogue-code → Schedule A map, so a builder can show which Schedule A
      // services a priced line already covers (Clause 3) without re-deriving it.
      code_to_schedule_a: content.code_to_schedule_a,
      checklist_groups: content.checklist_groups,
      role: 'Client',
      // Schedule A AMC tiers
      amc_packages: amcSvc.PACKAGES.map((p) => ({
        key: p.key, label: p.label, client_type: p.client_type, blurb: p.blurb,
        visits_per_year: Object.values(p.visits).reduce((s, n) => s + n, 0),
      })),
      // Clause 9 — "payment may be made monthly, quarterly, half-yearly or annually"
      amc_frequencies: amcSvc.PAYMENT_FREQUENCIES.map((f) => f.key),
      amc_visit_frequencies: ['Monthly', 'Quarterly', 'Half Yearly', 'Annual'],
      amc_contracts: amcContracts,
      // drives which party details the agreement asks for
      client_types: ['Residential', 'Commercial', 'Industrial', 'Institutional'],
      business_client_types: ['Commercial', 'Industrial', 'Institutional'],
    });
  }),
  preview: asyncHandler(async (req, res) => {
    const branchId = branchScope(req).branch_id;
    const vertical = catalogueVertical(req);
    const pricing = await customerSvc.computePricing(req.body?.pricing_input || {}, branchId, { vertical });
    res.json({ ...customerSvc.buildAgreement({ ...(req.body || {}), vertical, pricing }), pricing });
  }),
  listAgreements: asyncHandler(async (req, res) => res.json(await listEnvelopes(req, relatedTypeFor(req, 'customer')))),
  createAgreement: asyncHandler(async (req, res) => {
    const branchId = resolveBranchId(req);
    const vertical = catalogueVertical(req);
    const body = req.body || {};
    const party = body.client || {};
    if (!party.full_name) return res.status(400).json({ error: 'Client name is required.' });
    if (!party.email) return res.status(400).json({ error: 'Client email is required to send for signature.' });
    const pricing = await customerSvc.computePricing(body.pricing_input || {}, branchId, { vertical });
    const built = customerSvc.buildAgreement({ ...body, vertical, pricing });
    const expires = new Date(Date.now() + 30 * 864e5);
    const out = await sequelize.transaction(async (transaction) => {
      const envelope = await SigningEnvelope.create({
        branch_id: branchId, envelope_code: `${envPrefixFor(req, 'customer')}-${Date.now().toString().slice(-6)}`,
        title: `${built.title} — ${party.full_name}`, document_html: built.html,
        related_type: relatedTypeFor(req, 'customer'), related_id: body.related_id || null,
        status: 'sent', sent_at: new Date(), expires_at: expires,
        // Ordered: client, then Seventh Sky countersigns, then the witnesses
        // attest — a witness cannot meaningfully attest a signature not yet made.
        signing_order_enforced: true, kyc_role: 'client', kyc_policy: 'none',
        terms: built.terms, created_by: req.user?.id || null,
      }, { transaction });
      /*
       * Every party the execution block names gets its own signer and its own
       * signature + date fields: the client, Seventh Sky as countersigner, and
       * each witness supplied. Previously only the client signed, so the
       * document carried "Signature: __________" lines for Seventh Sky and the
       * witnesses that nobody could ever fill — the agreement could complete
       * while three of its four signature blocks stayed blank.
       *
       * Order is enforced: the client signs first, Seventh Sky countersigns,
       * then the witnesses attest what they have just seen signed.
       */
      const org = body.org || {};
      // The document states both parties must sign, so Seventh Sky's countersigner
      // is REQUIRED — otherwise an agreement could be "fully executed" on the
      // client's signature alone, contradicting the executed document.
      const countersignEmail = org.email || req.user?.email || null;
      if (!countersignEmail) {
        const err = new Error('A Seventh Sky countersigner email is required — the agreement must be signed by both parties.');
        err.status = 400;
        throw err;
      }
      const signerDefs = [
        { role: 'client', order: 1, name: party.full_name, email: party.email, phone: party.phone || null, label: 'Client' },
        {
          role: 'staff_countersign', order: 2,
          name: org.represented_by || req.user?.name || 'Seventh Sky Property Care',
          email: countersignEmail, label: 'Seventh Sky', user_id: req.user?.id || null,
        },
      ];
      (body.witnesses || []).forEach((w, i) => {
        if (!w?.name || !w?.email) return; // a witness without an email cannot be sent to
        signerDefs.push({
          role: 'witness', order: signerDefs.length + 1,
          name: w.name, email: w.email, label: `Witness ${i + 1}`,
        });
      });

      const links = [];
      for (const def of signerDefs) {
        const token = crypto.randomBytes(24).toString('hex');
        const signer = await EnvelopeSigner.create({
          envelope_id: envelope.id, signer_order: def.order, role: def.role,
          name: def.name, email: def.email, phone: def.phone || null,
          contact_id: def.role === 'client' ? (body.contact_id || null) : null,
          user_id: def.user_id || null,
          access_token: token, token_expires_at: expires,
          status: def.order === 1 ? 'sent' : 'pending',
        }, { transaction });
        await SignatureField.bulkCreate([
          { envelope_id: envelope.id, signer_id: signer.id, field_type: 'signature', page: 1, required: true, label: `${def.label} signature` },
          { envelope_id: envelope.id, signer_id: signer.id, field_type: 'date_signed', page: 1, required: true, label: `${def.label} — date signed` },
        ], { transaction });
        links.push({ name: def.name, email: def.email, role: def.role, order: def.order, label: def.label, token });
      }
      return { envelope, links };
    });

    const first = out.links[0];
    // Actually email the first signer their link. The envelope is marked "sent", so
    // NOT emailing would make the UI's "Agreement sent to customer" a silent lie.
    try {
      if (first?.email) {
        const { sendEmail } = require('../services/communication.service');
        const url = `${req.protocol}://${req.get('host')}/admin/sign/${first.token}`;
        await sendEmail(first.email, `Please sign: ${out.envelope.title}`,
          `<p>Dear ${first.name || 'Sir/Madam'},</p>`
          + `<p>Please review and sign your agreement <strong>${out.envelope.title}</strong> (${out.envelope.envelope_code}):</p>`
          + `<p><a href="${url}">${url}</a></p><p>This link expires in 30 days.</p>`
          + `<p>Thank you,<br/>Seventh Sky Property Care</p>`);
      }
    } catch (e) { console.error('[wt-customer-agreement-send]', e.message); }

    res.status(201).json({
      id: out.envelope.id, envelope_code: out.envelope.envelope_code, status: out.envelope.status,
      signing_token: first.token, signing_path: `/admin/sign/${first.token}`,
      signers: out.links.map((l) => ({
        name: l.name, email: l.email, role: l.role, order: l.order, label: l.label,
        signing_path: `/admin/sign/${l.token}`,
      })),
    });
  }),
};

const AGREEMENT_FIELDS = [
  'effective_date', 'term_months', 'notice_days', 'commission_pct', 'payment_model',
  'payout_trigger', 'payment_due_days', 'payment_terms', 'fee_notes', 'bank_details',
  'services', 'checklist', 'cumilla_exclusive', 'witnesses', 'template_values', 'org',
  'pricing_input', 'supersedes_id',
];

async function loadProvider(req, input) {
  const key = input?.provider_id || input?.related_id || req.query.provider;
  if (!key) return null;
  return M.WtProvider.findOne({
    where: {
      ...branchScope(req),
      [Op.or]: [{ id: Number.isNaN(Number(key)) ? -1 : Number(key) }, { code: String(key) }],
    },
  });
}

function providerParty(provider, body = {}) {
  const supplied = body.provider || {};
  return {
    business_name: provider.business_name,
    legal_name: provider.legal_name || '',
    company_reg: provider.registration_no || '',
    trade_licence: supplied.trade_licence || '', tin: supplied.tin || '', bin: supplied.bin || '',
    address: provider.address || '', phone: provider.contact_phone || '', email: provider.contact_email || '',
    represented_by: supplied.represented_by || provider.contact_person || '',
    position: supplied.position || '', contact_person: provider.contact_person || '',
  };
}

async function renderProvider(req, body, provider) {
  const branchId = branchScope(req).branch_id || resolveBranchId(req);
  const input = {
    ...body,
    provider_id: provider.id, related_id: provider.id,
    provider: providerParty(provider, body),
    bank_details: asObject(body.bank_details, asObject(provider.bank_details)),
    services: asArray(body.services).length ? asArray(body.services) : asArray(provider.service_categories),
    org: {
      name: 'Seventh Sky Property Care', represented_by: req.user?.name || 'Seventh Sky',
      email: req.user?.email || '', ...(body.org || {}),
    },
  };
  const pricing = await providerSvc.computePricing(input.pricing_input || {}, branchId);
  const built = await providerSvc.buildAgreement({ ...input, pricing });
  return { input, pricing, built };
}

async function replaceRates(agreement, pricing, req, transaction) {
  await P.WtProviderAgreementRate.destroy({ where: { agreement_id: agreement.id }, transaction });
  const rows = (pricing.lines || []).map((line) => ({
    branch_id: agreement.branch_id, agreement_id: agreement.id, provider_id: agreement.provider_id,
    service_item_id: line.id || null, service_code: line.code, service_name: line.name,
    rate_group: line.group || 'service', unit: line.unit || null,
    standard_rate: Number(line.standard_price || 0), proposed_rate: Number(line.agreed_price || 0),
    agreed_rate: Number(line.agreed_price || 0), rate_status: 'Approved',
    effective_from: agreement.effective_date, effective_to: agreement.expiry_date,
    approved_by: req.user?.id || null, approved_at: new Date(),
  }));
  if (rows.length) await P.WtProviderAgreementRate.bulkCreate(rows, { transaction });
}

async function saveDraft(req, body, provider) {
  const branchId = resolveBranchId(req);
  const existing = body.agreement_id
    ? await P.WtProviderAgreement.findOne({ where: { id: body.agreement_id, ...branchScope(req), provider_id: provider.id } })
    : null;
  if (existing && String(existing.status).toLowerCase() !== 'draft') {
    const error = new Error('Only draft agreements can be edited. Void and reissue a sent agreement, or create an amendment for a completed agreement.');
    error.status = 409;
    throw error;
  }
  const { input, pricing, built } = await renderProvider(req, body, provider);
  const effectiveDate = input.effective_date || new Date().toISOString().slice(0, 10);
  const expiryDate = addMonths(effectiveDate, input.term_months || 12);
  const clean = pick(input, AGREEMENT_FIELDS);
  const row = await sequelize.transaction(async (transaction) => {
    let agreement = existing;
    if (!agreement) {
      const count = await P.WtProviderAgreement.count({ where: { ...branchScope(req), provider_id: provider.id }, transaction });
      agreement = await P.WtProviderAgreement.create({
        branch_id: branchId, code: await generateCode(P.WtProviderAgreement, 'code', 'WTPA-', 6),
        provider_id: provider.id, version_no: count + 1, supersedes_id: clean.supersedes_id || null,
        status: 'Draft', drafted_by: req.user?.id || null,
      }, { transaction });
    }
    await agreement.update({
      effective_date: effectiveDate, expiry_date: expiryDate,
      term_months: Number(input.term_months || 12), notice_days: Number(input.notice_days || 30),
      commission_pct: Number(input.commission_pct || 0), payment_model: input.payment_model || 'Project Based',
      payout_trigger: input.payout_trigger || 'Completion Verified', payment_due_days: Number(input.payment_due_days || 7),
      payment_terms: input.payment_terms || null, fee_notes: input.fee_notes || null,
      bank_details: input.bank_details || {}, authorised_services: input.services || [],
      compliance_checklist: input.checklist || [], territory_terms: { cumilla_exclusive: !!input.cumilla_exclusive },
      terms_snapshot: { ...clean, provider_id: provider.id, provider: input.provider, org: input.org, pricing_input: input.pricing_input || { selected: [] } },
    }, { transaction });
    await replaceRates(agreement, pricing, req, transaction);
    return agreement;
  });
  return { agreement: row, input, pricing, built };
}

async function sendSavedAgreement(req, agreement, provider) {
  if (String(agreement.status).toLowerCase() !== 'draft') {
    const error = new Error('Only a draft agreement can be sent.'); error.status = 409; throw error;
  }
  const body = asObject(agreement.terms_snapshot);
  const { built } = await renderProvider(req, body, provider);
  const expires = new Date(Date.now() + 30 * 864e5);
  const result = await sequelize.transaction(async (transaction) => {
    const envelope = await SigningEnvelope.create({
      branch_id: agreement.branch_id,
      envelope_code: await generateCode(SigningEnvelope, 'envelope_code', 'ENV-WTSDP-', 6),
      agreement_template_id: built.template_id,
      title: `${built.title} — ${provider.business_name} — v${agreement.version_no}`,
      document_html: built.html, related_type: 'water_tank_provider_agreement', related_id: provider.id,
      status: 'sent', sent_at: new Date(), expires_at: expires, signing_order_enforced: true,
      kyc_role: 'provider', kyc_policy: 'none',
      terms: { ...built.terms, provider_agreement_id: agreement.id, provider_agreement_code: agreement.code },
      created_by: req.user?.id || null,
    }, { transaction });
    const signerDefs = [
      { role: 'provider', order: 1, label: 'Service Provider', name: provider.contact_person || provider.business_name, email: provider.contact_email },
      { role: 'staff_countersign', order: 2, label: 'Seventh Sky', name: body.org?.represented_by || req.user?.name || 'Seventh Sky', email: body.org?.email || req.user?.email },
    ];
    if (signerDefs.some((s) => !s.email)) {
      const error = new Error('Provider and Seventh Sky countersigner email addresses are required.'); error.status = 400; throw error;
    }
    // Witnesses attest after both principals have signed. One without an email is
    // skipped rather than given a signature block nobody can reach.
    (body.witnesses || []).forEach((w, i) => {
      if (!w?.name || !w?.email) return;
      signerDefs.push({ role: 'witness', order: signerDefs.length + 1, label: `Witness ${i + 1}`, name: w.name, email: w.email });
    });

    const links = [];
    for (const signerDef of signerDefs) {
      const token = crypto.randomBytes(24).toString('hex');
      const signer = await EnvelopeSigner.create({
        envelope_id: envelope.id, signer_order: signerDef.order, role: signerDef.role,
        name: signerDef.name, email: signerDef.email, access_token: token,
        token_expires_at: expires, status: signerDef.order === 1 ? 'sent' : 'pending',
        user_id: signerDef.role === 'staff_countersign' ? req.user?.id || null : null,
      }, { transaction });
      await SignatureField.bulkCreate([
        { envelope_id: envelope.id, signer_id: signer.id, field_type: 'signature', page: 1, required: true, label: `${signerDef.label} signature` },
        { envelope_id: envelope.id, signer_id: signer.id, field_type: 'date_signed', page: 1, required: true, label: `${signerDef.label} — date signed` },
      ], { transaction });
      links.push({ name: signerDef.name, email: signerDef.email, role: signerDef.role, order: signerDef.order, label: signerDef.label, token });
    }
    await agreement.update({ envelope_id: envelope.id, status: 'Sent', sent_at: new Date() }, { transaction });
    await provider.update({
      agreement_status: 'Sent', agreement_envelope_id: envelope.id, agreement_code: agreement.code,
      onboarding_stage: 'Agreement Signing', stage_updated_at: new Date(),
    }, { transaction });
    return { envelope, links };
  });

  const base = process.env.SIGN_BASE_URL || `${req.protocol}://${req.get('host')}/admin/sign`;
  try {
    const { sendEmail } = require('../services/communication.service');
    const first = result.links[0];
    await sendEmail(first.email, `Please sign: ${result.envelope.title}`, `<p>Dear ${first.name},</p><p>Please review and sign your Water Tank Service Provider Master Agreement:</p><p><a href="${base}/${first.token}">${base}/${first.token}</a></p><p>This link expires in 30 days.</p>`).catch(() => {});
  } catch { /* best effort */ }
  return {
    id: agreement.id, code: agreement.code, envelope_id: result.envelope.id,
    envelope_code: result.envelope.envelope_code, status: 'Sent',
    links: result.links.map((link) => ({ ...link, signing_path: `/admin/sign/${link.token}` })),
  };
}

const provider = {
  getCatalog: asyncHandler(async (req, res) => res.json(await providerSvc.getCatalog(branchScope(req).branch_id, { vertical: catalogueVertical(req) }))),
  getMeta: asyncHandler(async (req, res) => res.json({
    service_groups: providerSvc.SERVICE_GROUPS, checklist_groups: providerSvc.CHECKLIST_GROUPS,
    template_fields: await providerSvc.getTemplateFields(), role: 'Service Provider',
    payment_models: ['Project Based', 'AMC', 'Emergency / Call-Out'],
    payout_triggers: ['Completion Verified', 'Client Payment Received', 'Approved Milestone'],
  })),
  preview: asyncHandler(async (req, res) => {
    const providerRow = await loadProvider(req, req.body || {});
    if (!providerRow) return res.status(404).json({ error: 'Select a Water Tank provider before previewing the agreement.' });
    const rendered = await renderProvider(req, req.body || {}, providerRow);
    res.json({ ...rendered.built, pricing: rendered.pricing });
  }),
  listAgreements: asyncHandler(async (req, res) => {
    const where = { ...branchScope(req) };
    if (req.query.provider_id) where.provider_id = req.query.provider_id;
    const agreements = await P.WtProviderAgreement.findAll({ where, order: [['id', 'DESC']], raw: true });
    const providerIds = [...new Set(agreements.map((a) => a.provider_id))];
    const providers = providerIds.length ? await M.WtProvider.findAll({ where: { ...branchScope(req), id: { [Op.in]: providerIds } }, raw: true }) : [];
    const providerById = Object.fromEntries(providers.map((p) => [p.id, p]));
    const envelopeIds = agreements.map((a) => a.envelope_id).filter(Boolean);
    const signers = envelopeIds.length ? await EnvelopeSigner.findAll({ where: { envelope_id: { [Op.in]: envelopeIds } }, order: [['signer_order', 'ASC']], raw: true }) : [];
    res.json(agreements.map((agreement) => ({
      ...agreement, provider: providerById[agreement.provider_id] || null,
      signers: signers.filter((s) => s.envelope_id === agreement.envelope_id).map((s) => ({ id: s.id, role: s.role, name: s.name, email: s.email, status: s.status, signed_at: s.signed_at })),
    })));
  }),
  detailAgreement: asyncHandler(async (req, res) => {
    const agreement = await P.WtProviderAgreement.findOne({ where: { ...branchScope(req), [Op.or]: [{ id: Number.isNaN(Number(req.params.id)) ? -1 : Number(req.params.id) }, { code: req.params.id }] } });
    if (!agreement) return res.status(404).json({ error: 'Provider agreement not found.' });
    const [providerRow, rates, envelope] = await Promise.all([
      M.WtProvider.findOne({ where: { ...branchScope(req), id: agreement.provider_id }, raw: true }),
      P.WtProviderAgreementRate.findAll({ where: { agreement_id: agreement.id, ...branchScope(req) }, order: [['rate_group', 'ASC'], ['service_code', 'ASC']], raw: true }),
      agreement.envelope_id ? SigningEnvelope.findByPk(agreement.envelope_id, { include: [{ model: EnvelopeSigner, as: 'signers' }] }) : null,
    ]);
    const rendered = !envelope && providerRow ? await renderProvider(req, asObject(agreement.terms_snapshot), providerRow) : null;
    res.json({ agreement, provider: providerRow, rates, envelope, html: envelope?.document_html || rendered?.built?.html || '' });
  }),
  createAgreement: asyncHandler(async (req, res) => {
    const body = req.body || {};
    const providerRow = await loadProvider(req, body);
    if (!providerRow) return res.status(404).json({ error: 'Select a Water Tank provider.' });
    const saved = await saveDraft(req, body, providerRow);
    if (body.send === true) return res.status(201).json(await sendSavedAgreement(req, saved.agreement, providerRow));
    res.status(201).json({ agreement: saved.agreement, pricing: saved.pricing, html: saved.built.html });
  }),
  updateAgreement: asyncHandler(async (req, res) => {
    const existing = await P.WtProviderAgreement.findOne({ where: { ...branchScope(req), [Op.or]: [{ id: Number.isNaN(Number(req.params.id)) ? -1 : Number(req.params.id) }, { code: req.params.id }] } });
    if (!existing) return res.status(404).json({ error: 'Provider agreement not found.' });
    const providerRow = await M.WtProvider.findOne({ where: { ...branchScope(req), id: existing.provider_id } });
    const saved = await saveDraft(req, { ...asObject(existing.terms_snapshot), ...(req.body || {}), agreement_id: existing.id, provider_id: existing.provider_id }, providerRow);
    res.json({ agreement: saved.agreement, pricing: saved.pricing, html: saved.built.html });
  }),
  sendAgreement: asyncHandler(async (req, res) => {
    const agreement = await P.WtProviderAgreement.findOne({ where: { ...branchScope(req), [Op.or]: [{ id: Number.isNaN(Number(req.params.id)) ? -1 : Number(req.params.id) }, { code: req.params.id }] } });
    if (!agreement) return res.status(404).json({ error: 'Provider agreement not found.' });
    const providerRow = await M.WtProvider.findOne({ where: { ...branchScope(req), id: agreement.provider_id } });
    res.json(await sendSavedAgreement(req, agreement, providerRow));
  }),
};

module.exports = { customer, provider };
