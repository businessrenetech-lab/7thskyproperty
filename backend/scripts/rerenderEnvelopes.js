const SigningEnvelope = require('../models/SigningEnvelope');
const SignatureField = require('../models/SignatureField');
const EnvelopeSigner = require('../models/EnvelopeSigner');
const { buildTenancyMgmtAgreement } = require('../services/rptmAgreement.service');
const { buildResidentialPMAgreement } = require('../services/rprmAgreement.service');
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

async function rerenderEnvelope(id) {
  const env = await SigningEnvelope.findByPk(id);
  if (!env) return;
  console.log(`Processing Envelope #${id} (${env.envelope_code}) - Title: ${env.title}`);
  const terms = parseSafeJson(env.terms);
  
  const signers = await EnvelopeSigner.findAll({ where: { envelope_id: id } });
  const clientSigner = signers.find(s => ['tenant', 'landlord', 'client'].includes(s.role));
  const orgSigner = signers.find(s => ['staff_countersign', 'manager'].includes(s.role));
  const witnessSigners = signers.filter(s => s.role === 'witness');

  const inputData = {
    client: {
      full_name: clientSigner?.name || 'Client',
      email: clientSigner?.email || '',
      phone: clientSigner?.phone || '',
      property_address: terms.schedule_b?.property_address || 'Dhaka',
    },
    org: {
      represented_by: orgSigner?.name || 'SS Rep',
      position: 'PM Director',
      email: orgSigner?.email || 'rep@ss.com',
    },
    witnesses: witnessSigners.map(w => ({ name: w.name, email: w.email, phone: w.phone })),
    services: terms.selected_services || [],
    pricing_input: {
      monthly_rent: terms.schedule_b?.monthly_rent || 35000,
      selected: terms.agreed_lines || [],
    },
    schedule_b: terms.schedule_b || {},
    pricing: {
      summary: terms.pricing_summary || {},
      payment_schedule: terms.payment_schedule || {},
      lines: terms.agreed_lines || [],
    }
  };

  let built;
  if (env.envelope_code && env.envelope_code.startsWith('ENV-RPTM')) {
    built = buildTenancyMgmtAgreement(inputData);
  } else if (env.envelope_code && env.envelope_code.startsWith('ENV-RPRM')) {
    built = buildResidentialPMAgreement(inputData);
  } else {
    console.log(`Skipping unknown prefix for #${id}: ${env.envelope_code}`);
    return;
  }

  const fields = await SignatureField.findAll({ where: { envelope_id: id } });
  const res = applySignatures(built.html, signers, fields);

  env.document_html = res.html;
  await env.save();
  console.log(`Successfully re-rendered Envelope #${id}! HTML length: ${res.html.length}, applied signatures: ${res.applied}`);
}

(async () => {
  try {
    for (let id = 300; id <= 320; id++) {
      await rerenderEnvelope(id);
    }
    console.log('All recent envelopes refreshed!');
    process.exit(0);
  } catch (err) {
    console.error('Error re-rendering:', err);
    process.exit(1);
  }
})();
