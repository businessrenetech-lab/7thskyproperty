/**
 * wtSignedDocument.service.js — put the captured signatures INTO the document.
 *
 * The gap this closes: signing stores each field's value on `signature_fields`,
 * but the envelope's `document_html` is never updated. So downloading a "signed
 * agreement" produced the original document with empty signature boxes — the
 * signatures existed in the database and nowhere on the page the client would
 * actually keep.
 *
 * The agreement renderers emit anchored slots:
 *     <div data-sign-field="signature"   data-sign-party="Client"></div>
 *     <div data-sign-field="date_signed" data-sign-party="Client"></div>
 * and the envelope's SignatureField rows are labelled "Client signature" and
 * "Client — date signed". Matching on the party name joins the two.
 *
 * A signature value is either a data: URL from a drawn signature pad or typed
 * text; both are handled. Anything left unsigned keeps its ruled line, so a
 * partially-signed document reads honestly rather than looking complete.
 */
const EnvelopeSigner = require('../models/EnvelopeSigner');
const SignatureField = require('../models/SignatureField');

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const dateText = (v) => (v
  ? new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  : '');

/** "Client signature" / "Witness 1 — date signed" → "Client" / "Witness 1". */
function partyFromLabel(label) {
  return String(label || '')
    .replace(/\s*[—-]\s*date signed\s*$/i, '')
    .replace(/\s+signature\s*$/i, '')
    .trim();
}

const isImage = (v) => /^data:image\//i.test(String(v || '').trim());

/** The rendered mark for a signature value. */
function signatureMark(value, signer) {
  const v = String(value || '').trim();
  if (isImage(v)) {
    return `<img src="${esc(v)}" alt="Signature of ${esc(signer?.name || '')}" `
      + 'style="max-height:44px;max-width:230px;display:block;" />';
  }
  if (v) {
    // A typed signature is rendered in a script face so it reads as a signature
    // rather than as body copy.
    return `<span style="font-family:'Segoe Script','Brush Script MT',cursive;font-size:22px;color:#12305c;">${esc(v)}</span>`;
  }
  return '';
}

/**
 * Inject every captured value into its anchor.
 *
 * @param html      the document as issued
 * @param signers   EnvelopeSigner rows
 * @param fields    SignatureField rows
 * @returns { html, applied, unsigned }
 */
function applySignatures(html, signers = [], fields = []) {
  let out = String(html || '');
  if (!out) return { html: out, applied: 0, unsigned: [] };

  const signerById = Object.fromEntries(signers.map((s) => [s.id, s]));
  // party → { signature, date_signed, signer }
  const byParty = {};
  fields.forEach((f) => {
    const party = partyFromLabel(f.label);
    if (!party) return;
    byParty[party] = byParty[party] || { signer: signerById[f.signer_id] || null };
    byParty[party][f.field_type] = f.value;
    if (!byParty[party].signer) byParty[party].signer = signerById[f.signer_id] || null;
  });

  let applied = 0;
  const unsigned = [];

  // Replace the CONTENT of each anchored div, leaving its styling intact.
  out = out.replace(
    /(<div[^>]*data-sign-field="(signature|date_signed)"[^>]*data-sign-party="([^"]+)"[^>]*>)(\s*)(<\/div>)/gi,
    (match, open, kind, party, _ws, close) => {
      const rec = byParty[party];
      const signer = rec?.signer;
      const signed = signer && String(signer.status).toLowerCase() === 'signed';
      if (!rec || !signed) {
        if (!unsigned.includes(party)) unsigned.push(party);
        return match; // keep the ruled line — this party has not signed
      }
      if (kind === 'signature') {
        const mark = signatureMark(rec.signature, signer);
        if (!mark) { if (!unsigned.includes(party)) unsigned.push(party); return match; }
        applied += 1;
        return `${open}${mark}${close}`;
      }
      const when = rec.date_signed || (signer.signed_at ? String(signer.signed_at).slice(0, 10) : '');
      if (!when) return match;
      applied += 1;
      return `${open}<span style="font-size:12.5px;color:#1f2430;">${esc(dateText(when))}</span>${close}`;
    },
  );

  return { html: out, applied, unsigned };
}

/**
 * The signed copy of an envelope, with an execution banner at the top so anyone
 * opening the file can see its status without reading to the end.
 */
async function buildSignedDocument(envelope) {
  const [signers, fields] = await Promise.all([
    EnvelopeSigner.findAll({ where: { envelope_id: envelope.id }, order: [['signer_order', 'ASC']], raw: true }),
    SignatureField.findAll({ where: { envelope_id: envelope.id }, raw: true }),
  ]);

  const { html, applied, unsigned } = applySignatures(envelope.document_html, signers, fields);
  const signedCount = signers.filter((s) => String(s.status).toLowerCase() === 'signed').length;
  const complete = signers.length > 0 && signedCount === signers.length;

  const banner = `
  <div style="font-family:Georgia,'Times New Roman',serif;max-width:820px;margin:0 auto 14px;
       border:1px solid ${complete ? '#a7f3d0' : '#fde68a'};background:${complete ? '#ecfdf5' : '#fffbeb'};
       border-radius:10px;padding:12px 16px;">
    <div style="font-weight:bold;color:${complete ? '#047857' : '#92400e'};font-size:13px;">
      ${complete ? 'FULLY EXECUTED' : `PARTIALLY SIGNED — ${signedCount} of ${signers.length} parties`}
    </div>
    <div style="font-size:12px;color:#4b5563;margin-top:4px;">
      ${signers.map((s) => {
    const ok = String(s.status).toLowerCase() === 'signed';
    return `${ok ? '☑' : '☐'} ${esc(s.name || s.email)}${s.role ? ` (${esc(String(s.role).replace(/_/g, ' '))})` : ''}`
          + `${ok && s.signed_at ? ` — signed ${esc(dateText(s.signed_at))}` : ' — awaiting signature'}`;
  }).join(' &nbsp;·&nbsp; ')}
    </div>
    ${envelope.content_hash ? `<div style="font-size:10.5px;color:#6b7280;margin-top:6px;">Content hash: ${esc(envelope.content_hash)}</div>` : ''}
  </div>`;

  return {
    html: banner + html,
    complete,
    signed_count: signedCount,
    total_signers: signers.length,
    signatures_applied: applied,
    unsigned_parties: unsigned,
    signers,
  };
}

module.exports = { applySignatures, buildSignedDocument, partyFromLabel, signatureMark };
