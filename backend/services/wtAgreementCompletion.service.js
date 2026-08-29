/**
 * wtAgreementCompletion.service.js — when a Water Tank customer or provider
 * agreement is fully executed: render the fully-signed document to a PDF, email it
 * (as an attachment) to both principals, and file it under the party's Documents.
 * Best-effort throughout: nothing here ever blocks the signature itself, and if a
 * real PDF can't be produced it falls back to a secure link to the signed HTML.
 */
const fs = require('fs');
const path = require('path');
const EnvelopeSigner = require('../models/EnvelopeSigner');
const { sendEmail } = require('./communication.service');
const signedDoc = require('./wtSignedDocument.service');
const { htmlToPdf, pdfAvailable } = require('./htmlToPdf.service');

let WtProviderDocument = null;
try { ({ WtProviderDocument } = require('../models/waterTankProviders')); } catch { /* providers model optional */ }

// related_type → which signer role is the party we notify and file for.
const WT_TYPES = {
  water_tank_customer_agreement: 'client',
  water_tank_provider_agreement: 'provider',
};

const AGREEMENTS_DIR = path.join(__dirname, '..', 'uploads', 'documents');

/** Serve-by-token link to the fully-signed copy (the party already holds the token). */
const signedLink = (baseUrl, token) => `${String(baseUrl || '').replace(/\/+$/, '')}/api/sign/${token}/signed-document`;

/** Save the signed PDF to the uploads store; returns its served URL, or null. */
function saveSignedPdf(envelopeCode, pdfBuffer) {
  try {
    fs.mkdirSync(AGREEMENTS_DIR, { recursive: true });
    const filename = `${String(envelopeCode).replace(/[^A-Za-z0-9_-]/g, '')}-signed.pdf`;
    fs.writeFileSync(path.join(AGREEMENTS_DIR, filename), pdfBuffer);
    return `/uploads/documents/${filename}`; // JWT-gated static route
  } catch { return null; }
}

async function onCompleted(env, baseUrl) {
  const principalRole = WT_TYPES[env.related_type];
  if (!principalRole) return; // not a Water Tank agreement — nothing to do

  const plainEnv = typeof env.get === 'function' ? env.get({ plain: true }) : env;
  const signers = await EnvelopeSigner.findAll({ where: { envelope_id: env.id }, raw: true });
  const principal = signers.find((s) => s.role === principalRole)
    || signers.find((s) => Number(s.signer_order) === 1);
  const title = env.title || env.envelope_code;

  // Render the fully-signed document (signatures placed in each party's box) to a
  // real PDF once, and reuse it for the emails and the Documents filing. If a PDF
  // can't be produced on this host, pdfBuffer stays null and we fall back to a link.
  let pdfBuffer = null;
  try {
    if (pdfAvailable()) {
      const built = await signedDoc.buildSignedDocument(plainEnv);
      pdfBuffer = await htmlToPdf(built.html);
    }
  } catch (e) { console.error('[wt-agreement-pdf]', e.message); pdfBuffer = null; }

  const pdfName = `${String(env.envelope_code).replace(/[^A-Za-z0-9_-]/g, '')}-signed.pdf`;
  const savedUrl = pdfBuffer ? saveSignedPdf(env.envelope_code, pdfBuffer) : null;

  // Email BOTH principals — the customer/provider AND Seventh Sky's countersigner.
  // Witnesses only attest; they do not receive the final copy.
  const recipients = signers.filter((s) => (s.role === principalRole || s.role === 'staff_countersign')
    && s.email && s.access_token);
  for (const r of recipients) {
    const link = signedLink(baseUrl, r.access_token);
    const body = pdfBuffer
      ? `
      <p>Dear ${r.name || 'Sir/Madam'},</p>
      <p>The agreement <strong>${title}</strong> (${env.envelope_code}) has been signed by all parties and is now
         fully executed. The signed PDF is attached.</p>
      <p>Thank you,<br/>Seventh Sky Property Care</p>`
      : `
      <p>Dear ${r.name || 'Sir/Madam'},</p>
      <p>The agreement <strong>${title}</strong> (${env.envelope_code}) has been signed by all parties and is now
         fully executed. You can view, print or save the signed copy here:</p>
      <p><a href="${link}">${link}</a></p>
      <p>Thank you,<br/>Seventh Sky Property Care</p>`;
    const attachments = pdfBuffer ? [{ filename: pdfName, content: pdfBuffer, contentType: 'application/pdf' }] : [];
    await sendEmail(r.email, `Signed agreement — ${title}`, body, attachments).catch(() => {});
  }

  // File it under the provider's Documents — the saved PDF where we have one,
  // otherwise the secure link. (Clients surface it from their own detail payload.)
  const fileUrl = savedUrl || (principal?.access_token ? signedLink(baseUrl, principal.access_token) : null);
  if (principalRole === 'provider' && WtProviderDocument && env.related_id && fileUrl) {
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
          file_url: fileUrl,
          verified: true,
          verified_by: 'System',
          verified_date: new Date(),
          status: 'Verified',
        },
      });
      if (!created) await doc.update({ file_url: fileUrl, verified: true, status: 'Verified' });
    } catch { /* filing is a convenience; the agreement stands regardless */ }
  }
}

module.exports = { onCompleted, signedLink };
