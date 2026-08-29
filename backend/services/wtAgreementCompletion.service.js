/**
 * wtAgreementCompletion.service.js — when a Water Tank customer or provider
 * agreement is fully executed, email the party a secure link to their signed copy
 * and (for providers) file it under their Documents. Best-effort: a failure here
 * never blocks the signature itself.
 */
const EnvelopeSigner = require('../models/EnvelopeSigner');
const { sendEmail } = require('./communication.service');
const signedDoc = require('./wtSignedDocument.service');

let WtProviderDocument = null;
try { ({ WtProviderDocument } = require('../models/waterTankProviders')); } catch { /* providers model optional */ }

// related_type → which signer role is the party we notify and file for.
const WT_TYPES = {
  water_tank_customer_agreement: 'client',
  water_tank_provider_agreement: 'provider',
};

/** Serve-by-token link to the fully-signed copy (the party already holds the token). */
const signedLink = (baseUrl, token) => `${String(baseUrl || '').replace(/\/+$/, '')}/api/sign/${token}/signed-document`;

async function onCompleted(env, baseUrl) {
  const principalRole = WT_TYPES[env.related_type];
  if (!principalRole) return; // not a Water Tank agreement — nothing to do

  const signers = await EnvelopeSigner.findAll({ where: { envelope_id: env.id }, raw: true });
  const principal = signers.find((s) => s.role === principalRole)
    || signers.find((s) => Number(s.signer_order) === 1);

  const title = env.title || env.envelope_code;

  // Email the signed copy to BOTH principals — the customer/provider AND Seventh
  // Sky's countersigner. Witnesses only attest; they do not receive the final copy.
  // Each party gets a link carrying their OWN token to the fully-signed document
  // (signatures placed on the page — printable to PDF).
  const recipients = signers.filter((s) => (s.role === principalRole || s.role === 'staff_countersign')
    && s.email && s.access_token);
  for (const r of recipients) {
    const link = signedLink(baseUrl, r.access_token);
    const html = `
      <p>Dear ${r.name || 'Sir/Madam'},</p>
      <p>The agreement <strong>${title}</strong> (${env.envelope_code}) has been signed by all parties and is now
         fully executed.</p>
      <p>You can view, print or save the signed copy here:</p>
      <p><a href="${link}">${link}</a></p>
      <p>Thank you,<br/>Seventh Sky Property Care</p>`;
    await sendEmail(r.email, `Signed agreement — ${title}`, html).catch(() => {});
  }

  // File it under the provider's Documents (clients surface it from the agreements
  // register — there is no separate client-document store to write into).
  const link = principal?.access_token ? signedLink(baseUrl, principal.access_token) : null;
  if (principalRole === 'provider' && WtProviderDocument && env.related_id && link) {
    try {
      const [doc, created] = await WtProviderDocument.findOrCreate({
        where: { provider_id: env.related_id, category: 'agreement', doc_number: env.envelope_code },
        defaults: {
          branch_id: env.branch_id,
          provider_id: env.related_id,
          category: 'agreement',
          doc_type: 'Master Service Delivery Provider Agreement',
          doc_number: env.envelope_code,
          issuer: 'Seventh Sky Property Care',
          issue_date: new Date(),
          file_url: link,
          verified: true,
          verified_by: 'System',
          verified_date: new Date(),
          status: 'Verified',
        },
      });
      if (!created) await doc.update({ file_url: link, verified: true, status: 'Verified' });
    } catch { /* filing is a convenience; the agreement stands regardless */ }
  }
}

module.exports = { onCompleted, signedLink };
