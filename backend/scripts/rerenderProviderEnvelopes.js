const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const sequelize = require('../config/db.config');
const SigningEnvelope = require('../models/SigningEnvelope');
const EnvelopeSigner = require('../models/EnvelopeSigner');
const SignatureField = require('../models/SignatureField');
const providerSvc = require('../services/wtProviderAgreement.service');
const { applySignatures } = require('../services/wtSignedDocument.service');

function parseSafeJson(val) {
  if (!val) return {};
  if (typeof val === 'object' && !Array.isArray(val)) {
    const keys = Object.keys(val);
    if (keys.length > 0 && keys.every(k => !isNaN(Number(k)))) {
      const chars = [];
      for (let i = 0; i < keys.length; i++) chars.push(val[i]);
      try {
        return JSON.parse(chars.join(''));
      } catch (e) {
        return val;
      }
    }
    return val;
  }
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch (e) {
      return {};
    }
  }
  return val;
}

async function rerenderProviderEnvelope(env) {
  const id = env.id;
  console.log(`\nRe-rendering Envelope #${id} [${env.envelope_code}] - "${env.title}"`);
  const terms = parseSafeJson(env.terms);
  if (!terms || !terms.provider) {
    console.log(`  Skipping #${id}: No structured provider terms found.`);
    return;
  }

  const signers = await EnvelopeSigner.findAll({ where: { envelope_id: id } });
  const fields = await SignatureField.findAll({ where: { envelope_id: id } });

  // Map service line from related_type or terms
  let vertical = 'water_tank';
  if (env.related_type) {
    const match = env.related_type.match(/^([a-z_]+)_provider_agreement/);
    if (match) vertical = match[1];
  } else if (terms.vertical) {
    vertical = terms.vertical;
  }

  const input = {
    ...terms,
    vertical,
    provider_id: terms.provider_id || env.related_id,
    provider: terms.provider,
    bank_details: terms.bank_details || {},
    services: terms.authorised_services || [],
    checklist: terms.compliance_checklist || [],
    org: terms.org || {},
    witnesses: terms.witnesses || [{}, {}],
    pricing: {
      lines: terms.agreed_lines || [],
      summary: terms.pricing_summary || {},
      payment_schedule: terms.payment_schedule || [],
    },
    doc_no: terms.provider_agreement_code || env.envelope_code,
  };

  const built = await providerSvc.buildAgreement(input);
  const res = applySignatures(built.html, signers, fields);

  env.document_html = res.html;
  await env.save();
  console.log(`  -> Successfully updated #${id}: new HTML length ${res.html.length}, applied signatures: ${res.applied}`);

  if (env.envelope_code === 'ENV-WTSDP-391759' || id === 397) {
    fs.writeFileSync(path.join(__dirname, '../test_env397_final.html'), res.html, 'utf8');
    console.log(`  -> Wrote test_env397_final.html for verification.`);
  }
}

(async () => {
  try {
    const envs = await SigningEnvelope.findAll({
      where: {
        [Op.or]: [
          { related_type: { [Op.like]: '%provider%' } },
          { envelope_code: { [Op.like]: '%SDP%' } },
          { envelope_code: { [Op.like]: '%PSA%' } },
        ]
      },
      order: [['id', 'DESC']]
    });

    console.log(`Found ${envs.length} provider envelopes to refresh.`);
    for (const env of envs) {
      try {
        await rerenderProviderEnvelope(env);
      } catch (err) {
        console.error(`  Error refreshing envelope #${env.id}:`, err.message);
      }
    }
    console.log('\nAll provider envelopes refreshed!');
    process.exit(0);
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
})();
