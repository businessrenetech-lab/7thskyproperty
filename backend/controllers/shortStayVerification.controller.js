/**
 * shortStayVerification.controller.js — Guest Verification for Short Term Stay.
 * Kept as an isolated controller (separate from the main short-stay controller which is
 * under concurrent development) so the verification modal has a stable surface.
 *
 * Party = lead guest (Contact) + occupants (ShortStayBookingOccupant). Booking-level
 * verification metadata (state, risk notes, timeline, protected docs) lives in
 * ShortStayBooking.verification_meta (JSON). Per-member doc state lives on the occupant.
 */
const { asyncHandler, branchScope, resolveBranchId } = require('../utils/controllerHelpers');
const ShortStayBooking = require('../models/ShortStayBooking');
const ShortStayBookingOccupant = require('../models/ShortStayBookingOccupant');
const Contact = require('../models/Contact');
const Property = require('../models/Property');

const STATES = ['not_started', 'documents_requested', 'submitted', 'under_review', 'verified', 'more_info_required', 'rejected'];

function readMeta(booking) {
  let m = booking.verification_meta;
  if (typeof m === 'string') { try { m = JSON.parse(m); } catch { m = null; } }
  return m || { state: 'not_started', risk_notes: '', occupation: '', emergency_contact: '', timeline: [], protected_docs: [] };
}
function pushTimeline(meta, state, by) {
  meta.timeline = Array.isArray(meta.timeline) ? meta.timeline : [];
  meta.timeline.push({ state, at: new Date().toISOString(), by: by || null });
  meta.state = state;
  return meta;
}

async function loadBooking(req) {
  const where = { id: req.params.id, ...branchScope(req) };
  return ShortStayBooking.findOne({
    where,
    include: [
      { model: Property, as: 'property', attributes: ['id', 'title', 'district'] },
      { model: Contact, as: 'lead_guest', attributes: ['id', 'full_name', 'primary_phone', 'email', 'national_id', 'passport_no', 'designation'] },
      { model: ShortStayBookingOccupant, as: 'occupants' },
    ],
  });
}

// Shape the booking into the verification view the modal renders
function toView(booking) {
  const b = booking.get({ plain: true });
  const meta = readMeta(booking);
  const lead = b.lead_guest || {};
  const party = [
    {
      id: `lead-${lead.id}`, occupant_id: null, is_lead: true,
      name: lead.full_name || 'Lead guest', role_label: 'Lead guest', sub: 'signs agreement',
      phone: lead.primary_phone, email: lead.email,
      doc_type: lead.national_id ? 'National ID' : lead.passport_no ? 'Passport' : null,
      doc_status: meta.lead_doc_status || (lead.national_id || lead.passport_no ? 'submitted' : 'requested'),
      doc_url: meta.lead_doc_url || null,
    },
    ...(b.occupants || []).map((o) => ({
      id: `occ-${o.id}`, occupant_id: o.id, is_lead: false,
      name: o.full_name, role_label: o.is_contractual_signer ? 'Contractual guest' : 'Approved occupant',
      sub: o.is_contractual_signer ? 'signs agreement' : `${o.is_adult ? 'Adult' : 'Child'}${o.relationship ? ' · ' + o.relationship : ''}`,
      phone: o.phone, id_number: o.id_passport_number,
      doc_type: o.id_document_type || (o.id_passport_number ? 'ID' : null),
      doc_status: o.verification_status === 'verified' ? 'verified' : (o.id_document_url ? 'under_review' : 'requested'),
      doc_url: o.id_document_url || null,
    })),
  ];
  return {
    booking_id: b.id, booking_code: b.booking_code,
    property_title: b.property?.title || `#${b.property_id}`,
    status: b.status,
    verification_state: meta.state || 'not_started',
    party,
    risk: {
      occupation: meta.occupation || lead.designation || '',
      emergency_contact: meta.emergency_contact || '',
      risk_notes: meta.risk_notes || '',
      party_size: party.length,
    },
    timeline: STATES.map((s) => {
      const ev = (meta.timeline || []).filter((t) => t.state === s).pop();
      return { state: s, done: !!ev, at: ev?.at || null, by: ev?.by || null };
    }),
    protected_docs: meta.protected_docs || [],
  };
}

exports.getVerification = asyncHandler(async (req, res) => {
  const booking = await loadBooking(req);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  res.json(toView(booking));
});

// Attach / update a party member's identity document
exports.attachDocument = asyncHandler(async (req, res) => {
  const booking = await loadBooking(req);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  const { occupant_id, doc_url, doc_type, is_lead } = req.body;
  if (is_lead) {
    const meta = readMeta(booking);
    meta.lead_doc_url = doc_url; meta.lead_doc_status = 'under_review';
    await booking.update({ verification_meta: meta });
  } else {
    const occ = await ShortStayBookingOccupant.findOne({ where: { id: occupant_id, booking_id: booking.id } });
    if (!occ) return res.status(404).json({ error: 'Party member not found' });
    await occ.update({ id_document_url: doc_url, id_document_type: doc_type || occ.id_document_type, verification_status: 'submitted' });
  }
  const fresh = await loadBooking(req);
  res.json(toView(fresh));
});

// Verify / flag a single party member
exports.reviewMember = asyncHandler(async (req, res) => {
  const booking = await loadBooking(req);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  const { occupant_id, is_lead, status } = req.body; // status: verified | under_review | requested | rejected
  if (is_lead) {
    const meta = readMeta(booking);
    meta.lead_doc_status = status; await booking.update({ verification_meta: meta });
  } else {
    const occ = await ShortStayBookingOccupant.findOne({ where: { id: occupant_id, booking_id: booking.id } });
    if (!occ) return res.status(404).json({ error: 'Party member not found' });
    await occ.update({ verification_status: status === 'verified' ? 'verified' : status });
  }
  const fresh = await loadBooking(req);
  res.json(toView(fresh));
});

// Booking-level state transitions + risk notes + protected docs + request documents
exports.setState = asyncHandler(async (req, res) => {
  const booking = await loadBooking(req);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  const { state } = req.body;
  if (!STATES.includes(state)) return res.status(400).json({ error: `Invalid state '${state}'.` });
  const meta = pushTimeline(readMeta(booking), state, req.user?.email);
  await booking.update({ verification_meta: meta });
  const fresh = await loadBooking(req);
  res.json(toView(fresh));
});

exports.saveRisk = asyncHandler(async (req, res) => {
  const booking = await loadBooking(req);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  const meta = readMeta(booking);
  const { occupation, emergency_contact, risk_notes } = req.body;
  if (occupation != null) meta.occupation = occupation;
  if (emergency_contact != null) meta.emergency_contact = emergency_contact;
  if (risk_notes != null) meta.risk_notes = risk_notes;
  await booking.update({ verification_meta: meta });
  const fresh = await loadBooking(req);
  res.json(toView(fresh));
});

exports.addProtectedDoc = asyncHandler(async (req, res) => {
  const booking = await loadBooking(req);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  const meta = readMeta(booking);
  meta.protected_docs = Array.isArray(meta.protected_docs) ? meta.protected_docs : [];
  const { label, url, status } = req.body;
  if (!url) return res.status(400).json({ error: 'Document url is required.' });
  meta.protected_docs.push({ label: label || 'Document', url, status: status || 'under_review', at: new Date().toISOString() });
  await booking.update({ verification_meta: meta });
  const fresh = await loadBooking(req);
  res.json(toView(fresh));
});
