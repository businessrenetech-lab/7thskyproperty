// Business NDA lifecycle: website request → staff approve & send (eSign) →
// signed (introduction recorded) → staff release (tokenised full-details link).
const crypto = require('crypto');
const { Op } = require('sequelize');
const sequelize = require('../config/db.config');
const BusinessNda = require('../models/BusinessNda');
const Property = require('../models/Property');
const PropertyMedia = require('../models/PropertyMedia');
const Contact = require('../models/Contact');
const SalesEnquiry = require('../models/SalesEnquiry');
const { generateCode } = require('../utils/codeGenerator');
const SigningEnvelope = require('../models/SigningEnvelope');
const NonCircumventionRecord = require('../models/NonCircumventionRecord');
const PropertyBusinessProfile = require('../models/PropertyBusinessProfile');
const { renderNdaHtml } = require('./ndaDocument.service');
const { buildSignerDefs, persistSigners, dispatchEnvelope, emailFirstSigner } = require('./agreementSigners.service');
const { pickPublic } = require('./publicPropertyShape');
const { fullBusinessDetails } = require('./businessTeaser.service');

const TOKEN_DAYS = 30;
const OPEN = ['requested', 'approved', 'sent', 'signed', 'released'];

function tokenState(nda, now = new Date()) {
  if (!nda || nda.status !== 'released' || !nda.release_token) return 'invalid';
  return new Date(nda.token_expires_at) > now ? 'valid' : 'expired';
}

async function findBusinessProperty(idOrSlug) {
  const or = [{ property_code: String(idOrSlug) }, { slug: String(idOrSlug) }];
  if (/^\d+$/.test(String(idOrSlug))) or.push({ id: Number(idOrSlug) });
  return Property.findOne({ where: { [Op.or]: or, category: 'business', is_published: true } });
}

// Public: a buyer asks for full details. Idempotent per (buyer email, property).
async function requestNda({ propertyIdOrSlug, form }) {
  const property = await findBusinessProperty(propertyIdOrSlug);
  if (!property) { const e = new Error('Listing not found.'); e.status = 404; throw e; }
  const email = String(form.email || '').trim().toLowerCase();
  const name = String(form.full_name || '').trim();
  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { const e = new Error('Name and a valid email are required.'); e.status = 400; throw e; }

  return sequelize.transaction(async (t) => {
    let contact = await Contact.findOne({ where: { email, branch_id: property.branch_id }, transaction: t });
    if (!contact) {
      contact = await Contact.create({
        branch_id: property.branch_id, full_name: name, email, primary_phone: form.phone || null,
        company_name: form.company || null, contact_type: 'individual', category: 'business', looking_for: 'buy', lead_status: 'new',
      }, { transaction: t });
    }
    const existing = await BusinessNda.findOne({ where: { property_id: property.id, contact_id: contact.id, status: { [Op.in]: OPEN } }, transaction: t });
    if (existing) return { nda: existing, created: false };
    const enquiry = await SalesEnquiry.create({
      enquiry_code: await generateCode(SalesEnquiry, 'enquiry_code', 'SSPC-BEQ-'),
      branch_id: property.branch_id, property_id: property.id, contact_id: contact.id, enquirer_name: name,
      email, phone: form.phone || null, source: 'website', stage: 'new', next_action: 'Verify buyer & send NDA',
    }, { transaction: t });
    const nda = await BusinessNda.create({
      branch_id: property.branch_id, property_id: property.id, contact_id: contact.id, enquiry_id: enquiry.id,
      buyer_company: form.company || null, status: 'requested',
    }, { transaction: t });
    return { nda, created: true };
  });
}

// Staff: identity checked → create the eSign envelope and send it.
async function approveAndSend(nda, req) {
  if (!['requested', 'approved'].includes(nda.status)) { const e = new Error(`Cannot send an NDA that is ${nda.status}.`); e.status = 409; throw e; }
  const [property, contact] = await Promise.all([Property.findByPk(nda.property_id), Contact.findByPk(nda.contact_id)]);
  const org = { name: 'Seventh Sky Private Limited (Seventh Sky Property Care)', represented_by: req.user?.name || req.user?.full_name || 'Authorised signatory', email: req.user?.email || null };
  const buyer = { full_name: contact.full_name, email: contact.email, phone: contact.primary_phone, company: nda.buyer_company, contact_id: contact.id };
  await nda.update({ status: 'approved', approved_by: req.user?.id || null, approved_at: new Date(), last_error: null });
  try {
    const out = await sequelize.transaction(async (t) => {
      const env = await SigningEnvelope.create({
        branch_id: nda.branch_id, envelope_code: `ENV-NDA-${Date.now().toString().slice(-6)}`,
        title: `Business Confidentiality Agreement — ${contact.full_name} — ${property.property_code || property.id}`,
        document_html: renderNdaHtml({ buyer, property, org, effectiveDate: new Date().toISOString().slice(0, 10) }),
        related_type: 'business_nda', related_id: nda.id, status: 'draft',
        expires_at: new Date(Date.now() + 30 * 864e5), signing_order_enforced: true, kyc_role: 'buyer',
        terms: { doc_no: 'SSPC-BNDA-01', nda_id: nda.id, property_id: property.id }, created_by: req.user?.id || null,
      }, { transaction: t });
      await persistSigners(env, buildSignerDefs({ clients: [buyer], org, witnesses: [], user: req.user || {} }), t);
      const links = await dispatchEnvelope(env, t);
      return { env, links };
    });
    await emailFirstSigner(out.env, out.links, req);
    await nda.update({ status: 'sent', envelope_id: out.env.id });
  } catch (e) {
    await nda.update({ last_error: e.message });
    throw e;
  }
  return nda;
}

// Called from handleEnvelopeCompleted for related_type 'business_nda'.
async function onSigned(envelope, { transaction } = {}) {
  const nda = await BusinessNda.findByPk(envelope.related_id, { transaction });
  if (!nda || nda.status === 'signed' || nda.status === 'released') return;
  await nda.update({ status: 'signed', signed_at: new Date() }, { transaction });
  const property = await Property.findByPk(nda.property_id, { transaction });
  await NonCircumventionRecord.create({
    branch_id: nda.branch_id, context: 'sale', property_id: nda.property_id,
    owner_contact_id: property?.owner_contact_id || null, tenant_contact_id: nda.contact_id,
    protected_relationship: 'Buyer introduced to confidential business (NDA signed)',
    introduction_date: new Date().toISOString().slice(0, 10), protection_basis: 'Business Confidentiality Agreement (NDA)',
    status: 'active', introduced_by: nda.approved_by || null, created_by: nda.approved_by || null,
  }, { transaction });
}

// Staff: release full details → tokenised link emailed to the buyer.
async function release(nda, req) {
  if (nda.status !== 'signed' && nda.status !== 'released') { const e = new Error('Only a signed NDA can be released.'); e.status = 409; throw e; }
  const token = crypto.randomBytes(32).toString('hex');
  await nda.update({ status: 'released', released_by: req.user?.id || null, released_at: new Date(), release_token: token, token_expires_at: new Date(Date.now() + TOKEN_DAYS * 864e5) });
  const base = (process.env.PUBLIC_SITE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
  const link = `${base}/business-details/${token}`;
  const contact = await Contact.findByPk(nda.contact_id);
  try {
    const { sendEmail } = require('./communication.service');
    await sendEmail(contact.email, 'Business details — Seventh Sky Property Care',
      `<p>Dear ${contact.full_name},</p><p>Thank you for signing the confidentiality agreement. The full details of the business are available at the link below for ${TOKEN_DAYS} days:</p><p><a href="${link}">${link}</a></p><p>Please keep them confidential, as agreed.</p><p>Seventh Sky Property Care</p>`);
  } catch (e) { console.warn('[business-nda] release email failed:', e.message); }
  return { nda, link };
}

async function decline(nda, reason, req) {
  if (['released', 'declined'].includes(nda.status)) { const e = new Error(`Cannot decline an NDA that is ${nda.status}.`); e.status = 409; throw e; }
  await nda.update({ status: 'declined', decline_reason: String(reason || '').trim() || null, approved_by: req.user?.id || nda.approved_by });
  return nda;
}

// Public: full details for a released, unexpired token — otherwise null.
async function fullDetailsByToken(token) {
  if (!/^[a-f0-9]{64}$/.test(String(token || ''))) return null;
  const nda = await BusinessNda.findOne({ where: { release_token: token } });
  if (tokenState(nda) !== 'valid') return null;
  const property = await Property.findByPk(nda.property_id, { include: [{ model: PropertyMedia, as: 'media', attributes: ['id', 'file_url', 'media_type', 'caption', 'sort_order'] }] });
  if (!property) return null;
  const plain = property.get({ plain: true });
  const profile = await PropertyBusinessProfile.findOne({ where: { property_id: nda.property_id }, raw: true });
  return fullBusinessDetails({ ...pickPublic(plain), media: plain.media || [] }, profile);
}

module.exports = { tokenState, requestNda, approveAndSend, onSigned, release, decline, fullDetailsByToken };
