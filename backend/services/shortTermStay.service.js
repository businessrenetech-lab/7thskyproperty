/**
 * shortTermStay.service.js — Core Business Logic Service for Short Term Stay Management.
 * Implements status-gating, double-booking collision protection, real-time dynamic property status,
 * website public listings, eSign envelope creation, check-in/out workflows, housekeeping & finance.
 */
const crypto = require('crypto');
const { Op } = require('sequelize');
const sequelize = require('../config/db.config');
const Property = require('../models/Property');
const Contact = require('../models/Contact');
const PropertyMedia = require('../models/PropertyMedia');
const PropertyDocument = require('../models/PropertyDocument');
const Tenancy = require('../models/Tenancy');
const AgreementTemplate = require('../models/AgreementTemplate');
const SigningEnvelope = require('../models/SigningEnvelope');
const EnvelopeSigner = require('../models/EnvelopeSigner');
const SignatureField = require('../models/SignatureField');
const Folio = require('../models/Folio');
const FolioTransaction = require('../models/FolioTransaction');
const OwnerStatement = require('../models/OwnerStatement');
const KycDocument = require('../models/KycDocument');

const ShortStayPropertyProfile = require('../models/ShortStayPropertyProfile');
const ShortStayOwnerManagement = require('../models/ShortStayOwnerManagement');
const ShortStayBooking = require('../models/ShortStayBooking');
const ShortStayBookingOccupant = require('../models/ShortStayBookingOccupant');
const ShortStayAvailabilityBlock = require('../models/ShortStayAvailabilityBlock');
const ShortStayReadinessCheck = require('../models/ShortStayReadinessCheck');
const ShortStayHousekeepingTask = require('../models/ShortStayHousekeepingTask');
const ShortStayIncident = require('../models/ShortStayIncident');
const ShortStayEnquiry = require('../models/ShortStayEnquiry');
const ShortStayRatePlan = require('../models/ShortStayRatePlan');
const ServiceProvider = require('../models/ServiceProvider');
const WorkOrder = require('../models/WorkOrder');
const SystemSetting = require('../models/SystemSetting');
const User = require('../models/User');

const { generateCode } = require('../utils/codeGenerator');
const { merge } = require('./docTemplate.service');
const { sendEmail } = require('./communication.service');
const { evaluate: evaluateKyc } = require('./kycRequirements.service');

// Module defaults used when no saved Short Term Stay settings exist yet.
const STR_SETTINGS_KEY = 'short_stay_settings';
const settingsKeyFor = (branchId) => `${STR_SETTINGS_KEY}:${branchId}`;
const STR_DEFAULT_SETTINGS = {
  rates: {
    base_nightly_rate: 3500, weekend_rate: 4000, weekly_rate: 21000, monthly_rate: 75000,
    cleaning_fee: 500, security_deposit: 5000, extra_guest_fee: 500,
    early_checkin_fee: 500, late_checkout_fee: 500,
  },
  policy: {
    checkin_time: '14:00', checkout_time: '11:00', min_nights: 1,
    cancellation_policy: 'Free cancellation up to 48 hours before check-in; one night charged thereafter.',
  },
  house_rules: ['No smoking indoors', 'No parties or events', 'Quiet hours 10pm–8am', 'No unregistered guests', 'Pets on request only'],
  turnover_checklist: ['Strip & replace all linen', 'Clean & sanitise bathrooms', 'Kitchen wipe-down & restock', 'Restock welcome amenities', 'Test Wi-Fi & utilities', 'Photograph final condition'],
  checkin_checklist: ['Identity documents verified', 'Lead guest matches booking', 'Payment balance settled', 'Security deposit collected', 'Keys & access cards issued', 'House rules acknowledged', 'Wi-Fi & utilities working', 'Welcome pack placed'],
  checkout_checklist: ['Keys & access cards returned', 'Property inspected for damage', 'Meter readings recorded', 'Personal belongings cleared', 'Final condition photos captured', 'Security deposit reconciled'],
  property_readiness_checklist: ['Ownership and management authority verified', 'Property address and guest capacity confirmed', 'Utilities and Wi-Fi tested', 'Fire and electrical safety checked', 'Furniture, linen and essential inventory ready', 'Access and key handover process tested', 'Public photos and listing copy approved', 'House rules and emergency contacts confirmed'],
};
const READINESS_TYPE = { in: 'pre_arrival', out: 'exit_inspection' };
const PUBLIC_MEDIA_TYPES = ['image', 'video', 'drone', 'floor_plan'];
const OCCUPANT_FIELDS = ['full_name', 'is_adult', 'relationship', 'phone', 'id_passport_number', 'is_contractual_signer'];

/** Generate clean URL slug for public listing */
const slugify = (text) => String(text || '').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-');
const branchWhere = (branchId) => (branchId ? { branch_id: branchId } : {});
const numberOrZero = (value) => Number(value || 0);
const REVENUE_STATUSES = ['confirmed', 'ready_checkin', 'checked_in', 'checked_out', 'inspection_pending', 'closed'];

const overlapNights = (startDate, endDate, periodStart, periodEnd) => {
  const start = new Date(`${startDate > periodStart ? startDate : periodStart}T00:00:00Z`);
  const end = new Date(`${endDate < periodEnd ? endDate : periodEnd}T00:00:00Z`);
  return Math.max(0, Math.round((end - start) / 864e5));
};

const recognizedBookingRevenue = (booking, periodStart, periodEnd) => {
  if (!REVENUE_STATUSES.includes(booking.status)) return 0;
  const stayNights = Math.max(1, numberOrZero(booking.nights_count));
  const earnedNights = overlapNights(booking.check_in_date, booking.check_out_date, periodStart, periodEnd);
  if (!earnedNights) return 0;
  const accommodation = numberOrZero(booking.total_accommodation_amount) * (earnedNights / stayNights);
  const checkInRevenue = booking.check_in_date >= periodStart && booking.check_in_date < periodEnd
    ? numberOrZero(booking.cleaning_fee) + numberOrZero(booking.extra_services_amount) + numberOrZero(booking.tax_amount) - numberOrZero(booking.discount_amount)
    : 0;
  const totalValue = numberOrZero(booking.total_booking_value);
  const collectionRatio = totalValue > 0 ? Math.min(1, numberOrZero(booking.paid_amount) / totalValue) : 0;
  return Math.max(0, (accommodation + checkInRevenue) * collectionRatio);
};

const httpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const parseJsonArray = (value) => {
  let parsed = value;
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch { return []; }
  }
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object') {
    return Object.keys(parsed).every((key) => /^\d+$/.test(key)) ? Object.values(parsed) : [];
  }
  return [];
};

const parseJsonObject = (value) => {
  let parsed = value;
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch { return {}; }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
  return Object.fromEntries(Object.entries(parsed).filter(([key]) => !/^\d+$/.test(key)));
};

const isPublicMediaUrl = (value) => {
  const url = String(value || '').trim();
  if (!url) return false;
  if (/^https?:\/\//i.test(url)) return !/\/uploads\/(documents|private|kyc)\//i.test(url);
  return /^\/?uploads\/(properties|website|assets)\//i.test(url);
};

const validateStayDates = (checkIn, checkOut) => {
  const validDate = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false;
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  };
  if (!validDate(checkIn) || !validDate(checkOut)) throw httpError(400, 'Valid check_in_date and check_out_date are required.');
  const nights = Math.round((new Date(`${checkOut}T00:00:00Z`) - new Date(`${checkIn}T00:00:00Z`)) / 864e5);
  if (nights <= 0) throw httpError(400, 'check_out_date must be after check_in_date.');
  if (nights > 365) throw httpError(400, 'A short stay cannot exceed 365 nights.');
  return nights;
};

const validateProfileData = (data) => {
  const wholeNumberFields = ['bedrooms', 'bathrooms', 'max_guests', 'max_adults', 'max_children', 'min_nights'];
  const moneyFields = ['base_nightly_rate', 'weekend_rate', 'weekly_rate', 'monthly_rate', 'cleaning_fee', 'security_deposit', 'extra_guest_fee', 'early_checkin_fee', 'late_checkout_fee'];
  for (const field of wholeNumberFields) {
    if (data[field] === undefined) continue;
    const value = Number(data[field]);
    if (!Number.isInteger(value) || value < (['max_children', 'bedrooms', 'bathrooms'].includes(field) ? 0 : 1)) throw httpError(400, `${field} has an invalid value.`);
    data[field] = value;
  }
  for (const field of moneyFields) {
    if (data[field] === undefined) continue;
    const value = Number(data[field]);
    if (!Number.isFinite(value) || value < 0) throw httpError(400, `${field} must be a non-negative number.`);
    data[field] = value;
  }
  if (data.max_guests !== undefined && data.max_adults !== undefined && data.max_adults > data.max_guests) throw httpError(400, 'max_adults cannot exceed max_guests.');
  return data;
};

const tenancyOverlaps = (tenancy, startDate, endDate) => {
  const start = tenancy.move_in_date || tenancy.lease_start || '0000-01-01';
  const end = tenancy.move_out_date || tenancy.planned_move_out_date || tenancy.termination_effective_date || tenancy.lease_end || '9999-12-31';
  return start < endDate && end >= startDate;
};

const addSignatureFields = async (envelopeId, signerId, transaction) => SignatureField.bulkCreate([
  { envelope_id: envelopeId, signer_id: signerId, field_type: 'signature', label: 'Signature', required: true },
  { envelope_id: envelopeId, signer_id: signerId, field_type: 'date_signed', label: 'Date signed', required: false },
], { transaction });

const emailSigningLinks = async (links, title, flow = 'sign') => {
  const configuredOrigin = process.env.PUBLIC_ADMIN_URL
    || process.env.PUBLIC_BASE_URL
    || (process.env.PUBLIC_API_URL ? `${process.env.PUBLIC_API_URL.replace(/\/$/, '')}/admin` : null);
  const origin = (configuredOrigin || 'http://localhost:3000/admin').replace(/\/$/, '');
  await Promise.all(links.filter((link) => link.email).map((link) => {
    const url = `${origin}/${link.flow || flow}/${link.token}`;
    return sendEmail(link.email, `Please review and sign: ${title}`, `<p>Dear ${link.name},</p><p>Please review the agreement and complete the secure signing process:</p><p><a href="${url}">${url}</a></p>`).catch(() => null);
  }));
};

const publicListingDto = (row) => {
  const profile = row.get ? row.get({ plain: true }) : row;
  const property = profile.property || {};
  return {
    profile_id: profile.id,
    public_slug: profile.public_slug,
    public_headline: profile.public_headline,
    public_description: profile.public_description,
    accommodation_type: profile.accommodation_type,
    bedrooms: profile.bedrooms,
    bathrooms: profile.bathrooms,
    max_guests: profile.max_guests,
    max_adults: profile.max_adults,
    max_children: profile.max_children,
    furnishing_status: profile.furnishing_status,
    amenities: parseJsonArray(profile.amenities),
    base_nightly_rate: profile.base_nightly_rate,
    weekend_rate: profile.weekend_rate,
    weekly_rate: profile.weekly_rate,
    monthly_rate: profile.monthly_rate,
    cleaning_fee: profile.cleaning_fee,
    security_deposit: profile.security_deposit,
    extra_guest_fee: profile.extra_guest_fee,
    early_checkin_fee: profile.early_checkin_fee,
    late_checkout_fee: profile.late_checkout_fee,
    min_nights: profile.min_nights,
    cancellation_policy: profile.cancellation_policy,
    house_rules: parseJsonArray(profile.house_rules),
    checkin_time: profile.checkin_time,
    checkout_time: profile.checkout_time,
    is_featured: !!profile.is_featured_on_website,
    seo_title: profile.seo_title,
    seo_description: profile.seo_description,
    currency: property.currency || 'BDT',
    property: {
      title: property.title,
      category: property.category,
      property_type: property.property_type,
      area: property.area,
      city: property.city,
      district: property.district,
      country: property.country,
      nearby_places: parseJsonArray(property.nearby_places),
      balconies: property.balconies,
      parking: property.parking,
      building_size: property.building_size,
      floor_number: property.floor_number,
      total_floors: property.total_floors,
      year_built: property.year_built,
      features: parseJsonArray(property.features),
      description: property.description,
      featured_image_url: isPublicMediaUrl(property.featured_image_url) ? property.featured_image_url : null,
      video_tour_url: isPublicMediaUrl(property.video_tour_url) ? property.video_tour_url : null,
      drone_video_url: isPublicMediaUrl(property.drone_video_url) ? property.drone_video_url : null,
      floor_plan_url: isPublicMediaUrl(property.floor_plan_url) ? property.floor_plan_url : null,
      virtual_tour_url: isPublicMediaUrl(property.virtual_tour_url) ? property.virtual_tour_url : null,
    },
    media: (property.media || []).filter((item) => PUBLIC_MEDIA_TYPES.includes(item.media_type) && isPublicMediaUrl(item.file_url)).map((item) => ({
      media_type: item.media_type,
      file_url: item.file_url,
      caption: item.caption,
      sort_order: item.sort_order,
    })),
  };
};

class ShortTermStayService {
  /** Full operational dashboard: KPI tiles, the booking pipeline funnel, the next-48h
      arrivals/departures board, and a prioritised "today's operations" feed. Everything is
      computed from real records and branch-scoped; volumes are small so we load-and-reduce
      in JS rather than firing dozens of COUNT queries. */
  async getDashboardSummary(branchId) {
    const whereBranch = branchId ? { branch_id: branchId } : {};
    const today = new Date().toISOString().slice(0, 10);
    const plus2 = new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10);
    const num = (v) => Number(v || 0);

    const [profiles, managements, bookings, housekeeping, incidents] = await Promise.all([
      ShortStayPropertyProfile.findAll({ where: whereBranch, raw: true }),
      ShortStayOwnerManagement.findAll({ where: whereBranch, raw: true }),
      ShortStayBooking.findAll({
        where: whereBranch,
        include: [
          { model: Property, as: 'property', attributes: ['id', 'title', 'property_code', 'district'] },
          { model: Contact, as: 'lead_guest', attributes: ['id', 'full_name', 'primary_phone'] },
        ],
        order: [['check_in_date', 'ASC']],
      }),
      ShortStayHousekeepingTask.findAll({ where: whereBranch, include: [{ model: Property, as: 'property', attributes: ['id', 'title'] }] }),
      ShortStayIncident.findAll({ where: whereBranch, include: [{ model: Property, as: 'property', attributes: ['id', 'title'] }] }),
    ]);

    const b = bookings.map((x) => x.get({ plain: true }));
    const byStatus = (s) => b.filter((x) => (Array.isArray(s) ? s.includes(x.status) : x.status === s));
    const active = b.filter((x) => x.status !== 'cancelled');

    // ── KPI tiles ─────────────────────────────────────────────
    const guestReady = profiles.filter((p) => ['ready', 'active'].includes(p.status));
    const arrivalsToday = active.filter((x) => x.check_in_date === today && ['confirmed', 'ready_checkin', 'pending_payment', 'pending_agreement', 'pending_verification'].includes(x.status));
    const departuresToday = active.filter((x) => x.check_out_date === today && x.status === 'checked_in');
    const inHouse = byStatus('checked_in');
    const pendingGuestAgreements = byStatus('pending_agreement').length;
    const pendingOwnerAgreements = managements.filter((m) => m.status === 'pending_signature').length;
    const pendingPaymentBookings = byStatus('pending_payment');
    const paymentsDue = pendingPaymentBookings.reduce((s, x) => s + (num(x.total_booking_value) - num(x.paid_amount)), 0);
    const hkPending = housekeeping.filter((h) => h.status === 'pending');
    const hkOverdue = hkPending.filter((h) => h.scheduled_date && h.scheduled_date < today);
    const openIncidents = incidents.filter((i) => ['reported', 'investigating'].includes(i.status));
    const criticalIncidents = openIncidents.filter((i) => i.severity === 'critical');

    const kpi = {
      total_properties: profiles.length,
      onboarding_count: profiles.filter((p) => ['draft', 'readiness_pending'].includes(p.status)).length,
      guest_ready: guestReady.length,
      not_live_count: profiles.filter((p) => !p.is_website_listed).length,
      arrivals_today: arrivalsToday.length,
      arrivals_unverified: arrivalsToday.filter((x) => ['pending_verification', 'pending_agreement'].includes(x.status)).length,
      departures_today: departuresToday.length,
      inspections_due: departuresToday.length,
      active_stays: inHouse.length,
      in_house_guests: inHouse.reduce((s, x) => s + num(x.adults_count) + num(x.children_count), 0),
      pending_agreements: pendingGuestAgreements + pendingOwnerAgreements,
      pending_owner_agreements: pendingOwnerAgreements,
      pending_guest_agreements: pendingGuestAgreements,
      pending_payments: pendingPaymentBookings.length,
      payments_due_amount: paymentsDue,
      housekeeping_due: hkPending.length,
      housekeeping_overdue: hkOverdue.length,
      open_incidents: openIncidents.length,
      critical_incidents: criticalIncidents.length,
    };

    // ── Booking pipeline funnel (status-based, no overlap) ────
    const stageDef = [
      { key: 'enquiry', label: 'Enquiry', statuses: ['enquiry', 'hold'] },
      { key: 'pending_verification', label: 'Pending Verification', statuses: ['pending_verification'], blocking: true },
      { key: 'pending_agreement', label: 'Pending Agreement', statuses: ['pending_agreement'], blocking: true },
      { key: 'pending_payment', label: 'Pending Payment', statuses: ['pending_payment'], blocking: true },
      { key: 'confirmed', label: 'Confirmed', statuses: ['confirmed'] },
      { key: 'pre_arrival', label: 'Pre-Arrival', statuses: ['ready_checkin'] },
      { key: 'checked_in', label: 'Checked In', statuses: ['checked_in'] },
      { key: 'checked_out', label: 'Check-Out Due', statuses: ['checked_out'] },
      { key: 'closure_pending', label: 'Closure Pending', statuses: ['inspection_pending'], blocking: true },
    ];
    const pipeline = stageDef.map((s) => {
      const rows = byStatus(s.statuses);
      let note = null;
      if (s.key === 'pending_payment') { const due = rows.reduce((t, x) => t + (num(x.total_booking_value) - num(x.paid_amount)), 0); if (due) note = `৳${Math.round(due).toLocaleString('en-BD')} due`; }
      if (s.key === 'checked_out') note = rows.length ? 'awaiting inspection' : null;
      return { key: s.key, label: s.label, count: rows.length, blocking: !!s.blocking, note };
    });
    const totalBlocked = pipeline.filter((s) => s.blocking).reduce((t, s) => t + s.count, 0);

    // ── Arrivals & departures board (next 48h) ───────────────
    const paymentStatus = (x) => {
      const paid = num(x.paid_amount), total = num(x.total_booking_value);
      if (total > 0 && paid >= total) return { status: 'paid', due: 0 };
      if (paid > 0) return { status: 'part_paid', due: total - paid };
      return { status: 'unpaid', due: total };
    };
    const verifyStatus = (x) => (['confirmed', 'ready_checkin', 'checked_in', 'pending_payment'].includes(x.status) ? 'verified'
      : x.status === 'pending_verification' ? 'under_review' : 'submitted');
    const agreementStatus = (x) => (['confirmed', 'ready_checkin', 'checked_in', 'checked_out'].includes(x.status) ? 'signed'
      : x.agreement_envelope_id ? 'sent' : 'draft');
    const movementRow = (x, movement, when) => {
      const pay = paymentStatus(x);
      return {
        booking_id: x.id, booking_code: x.booking_code,
        guest_name: x.lead_guest?.full_name || `Guest #${x.lead_guest_contact_id}`,
        pax: `${num(x.adults_count)} adult${num(x.adults_count) === 1 ? '' : 's'}${num(x.children_count) ? ` · ${num(x.children_count)} kid${num(x.children_count) === 1 ? '' : 's'}` : ''}`,
        property_title: x.property?.title || `Property #${x.property_id}`,
        area: x.property?.district || '',
        movement, when,
        verify_status: verifyStatus(x), agreement_status: agreementStatus(x),
        payment_status: pay.status, amount_due: pay.due,
      };
    };
    const arrivals = active.filter((x) => x.check_in_date >= today && x.check_in_date <= plus2 && !['checked_in', 'checked_out', 'closed'].includes(x.status))
      .map((x) => movementRow(x, 'check_in', x.check_in_date));
    const departures = byStatus('checked_in').filter((x) => x.check_out_date >= today && x.check_out_date <= plus2)
      .map((x) => movementRow(x, 'check_out', x.check_out_date));
    const movements = [...arrivals, ...departures].sort((a, b2) => a.when.localeCompare(b2.when));

    // ── Today's operations feed (prioritised) ────────────────
    const P = { critical: 0, blocker: 1, high: 2, medium: 3, low: 4 };
    const ops = [];
    for (const i of openIncidents) ops.push({ priority: i.severity === 'critical' ? 'critical' : i.severity === 'high' ? 'blocker' : 'high', category: 'Incident', title: i.description || 'Incident reported', sub: i.property?.title || `Property #${i.property_id}`, action: 'Escalate' });
    for (const h of hkOverdue) ops.push({ priority: 'high', category: 'Housekeeping', title: `${(h.task_type || 'turnover').replace(/_/g, ' ')} overdue`, sub: h.property?.title || `Property #${h.property_id}`, action: 'Start' });
    for (const p of profiles.filter((p2) => p2.status === 'readiness_pending')) ops.push({ priority: 'blocker', category: 'Readiness', title: 'STR readiness incomplete — cannot go live', sub: p.public_headline || `Property #${p.property_id}`, action: 'Assign' });
    for (const x of pendingPaymentBookings) ops.push({ priority: 'high', category: 'Payment', title: `Payment outstanding — ৳${Math.round(num(x.total_booking_value) - num(x.paid_amount)).toLocaleString('en-BD')}`, sub: `${x.booking_code} · ${x.property?.title || ''}`, action: 'Request' });
    for (const m of managements.filter((m2) => m2.status === 'pending_signature')) ops.push({ priority: 'low', category: 'Agreement', title: 'Owner agreement unsigned — reminder due', sub: `Property #${m.property_id}`, action: 'Remind' });
    ops.sort((a, c) => P[a.priority] - P[c.priority]);
    const operations = ops.slice(0, 12);

    return {
      kpi,
      pipeline,
      total_blocked: totalBlocked,
      movements,
      operations,
      ops_open: ops.length,
      ops_urgent: ops.filter((o) => ['critical', 'blocker'].includes(o.priority)).length,
    };
  }

  /** Retrieve short stay properties, enriched with owner-agreement status, primary owner
      name and the next upcoming booking — everything the Properties list/cards view renders. */
  async getProperties(branchId, query = {}) {
    const where = branchId ? { branch_id: branchId } : {};
    const today = new Date().toISOString().slice(0, 10);

    const [profiles, managements, upcoming] = await Promise.all([
      ShortStayPropertyProfile.findAll({
        where,
        include: [{ model: Property, as: 'property', include: [{ model: PropertyMedia, as: 'media' }] }],
        order: [['id', 'DESC']],
      }),
      ShortStayOwnerManagement.findAll({
        where,
        include: [{ model: Contact, as: 'primary_owner', attributes: ['id', 'full_name', 'company_name'] }],
        raw: false,
      }).catch(() => []),
      ShortStayBooking.findAll({
        where: { ...where, check_in_date: { [Op.gte]: today }, status: { [Op.notIn]: ['cancelled', 'closed'] } },
        include: [{ model: Contact, as: 'lead_guest', attributes: ['id', 'full_name'] }],
        order: [['check_in_date', 'ASC']],
      }).catch(() => []),
    ]);

    const mgmtByProp = {};
    for (const m of managements) {
      const plain = m.get ? m.get({ plain: true }) : m;
      mgmtByProp[plain.property_id] = plain;
    }
    const nextByProp = {};
    for (const bk of upcoming) {
      const plain = bk.get ? bk.get({ plain: true }) : bk;
      if (!nextByProp[plain.property_id]) nextByProp[plain.property_id] = plain;
    }
    const agreementLabel = (m) => {
      if (!m) return 'missing_owner';
      return { active: 'signed', pending_signature: 'sent', draft: 'draft', terminated: 'void' }[m.status] || m.status;
    };

    return profiles.map((p) => {
      const plain = p.get({ plain: true });
      const { access_instructions, wifi_name, wifi_password, ...safeProfile } = plain;
      if (safeProfile.property?.media) {
        safeProfile.property.media = safeProfile.property.media.filter((item) => PUBLIC_MEDIA_TYPES.includes(item.media_type) && isPublicMediaUrl(item.file_url));
      }
      const m = mgmtByProp[plain.property_id];
      const next = nextByProp[plain.property_id];
      return {
        ...safeProfile,
        owner_name: m?.primary_owner?.full_name || m?.primary_owner?.company_name || null,
        owner_agreement_status: agreementLabel(m),
        revenue_share_percent: m?.revenue_share_percent ?? null,
        next_booking: next ? { booking_code: next.booking_code, check_in_date: next.check_in_date, guest_name: next.lead_guest?.full_name || null } : null,
      };
    });
  }

  /** Upsert STR Property Profile */
  async upsertPropertyProfile(branchId, data) {
    const { property_id, ...rawProfileData } = data;
    const profileData = validateProfileData(rawProfileData);
    if (!property_id) throw httpError(400, 'property_id is required.');
    const property = await Property.findOne({ where: { id: property_id, ...branchWhere(branchId) } });
    if (!property) throw httpError(404, 'Master property record not found.');

    if (!profileData.public_slug && property.title) {
      profileData.public_slug = `${slugify(property.title)}-${property.id}`;
    }

    let profile = await ShortStayPropertyProfile.findOne({ where: { property_id, ...branchWhere(branchId) } });
    if (profile) {
      validateProfileData({
        max_guests: profileData.max_guests ?? profile.max_guests,
        max_adults: profileData.max_adults ?? profile.max_adults,
      });
      await profile.update(profileData);
    } else {
      profile = await ShortStayPropertyProfile.create({
        branch_id: property.branch_id,
        property_id,
        ...profileData,
      });
    }
    return profile;
  }

  async applyProfileDefaults(profileData, branchId) {
    const settings = await this.getSettings(branchId);
    const defaults = {
      ...settings.rates,
      checkin_time: settings.policy.checkin_time,
      checkout_time: settings.policy.checkout_time,
      min_nights: settings.policy.min_nights,
      cancellation_policy: settings.policy.cancellation_policy,
      house_rules: settings.house_rules,
    };
    const merged = { ...profileData };
    for (const [key, value] of Object.entries(defaults)) {
      if (merged[key] === undefined || merged[key] === null || merged[key] === '') merged[key] = value;
    }
    return merged;
  }

  async generatePublicSlug(property, transaction) {
    const base = `${slugify(property.title) || 'short-stay'}-${property.id}`;
    for (let suffix = 0; suffix < 100; suffix++) {
      const candidate = suffix ? `${base}-${suffix + 1}` : base;
      const existing = await ShortStayPropertyProfile.findOne({ where: { public_slug: candidate }, attributes: ['id'], transaction });
      if (!existing) return candidate;
    }
    throw httpError(409, 'Could not generate a unique public listing slug.');
  }

  async onboardProperty(branchId, userId, { mode, property_id, property: propertyData = {}, profile: profileData = {} }) {
    if (!['new', 'existing'].includes(mode)) throw httpError(400, "mode must be 'new' or 'existing'.");
    if (!branchId && mode === 'new') throw httpError(400, 'A branch is required to create a property.');

    const preparedProfile = validateProfileData(await this.applyProfileDefaults(profileData, branchId));
    validateProfileData({ max_guests: preparedProfile.max_guests ?? 2, max_adults: preparedProfile.max_adults ?? 2 });
    return sequelize.transaction(async (transaction) => {
      let property;
      if (mode === 'new') {
        if (!propertyData.title || !propertyData.category) throw httpError(400, 'property.title and property.category are required.');
        property = await Property.create({
          ...propertyData,
          branch_id: branchId,
          property_code: await generateCode(Property, 'property_code', 'SSPC-PR-'),
          listing_type: 'short_term',
          status: 'draft',
          is_published: false,
          created_by: userId || null,
        }, { transaction });
      } else {
        if (!property_id) throw httpError(400, 'property_id is required for existing mode.');
        property = await Property.findOne({ where: { id: property_id, ...branchWhere(branchId) }, transaction });
        if (!property) throw httpError(404, 'Property not found.');
        const linked = await ShortStayPropertyProfile.findOne({ where: { property_id: property.id }, transaction });
        if (linked) throw httpError(409, 'Property already has a Short Term Stay profile.');
        const canonicalUpdates = { ...propertyData };
        delete canonicalUpdates.listing_type;
        if (Object.keys(canonicalUpdates).length) await property.update(canonicalUpdates, { transaction });
      }

      const linked = await ShortStayPropertyProfile.findOne({ where: { property_id: property.id }, transaction });
      if (linked) throw httpError(409, 'Property already has a Short Term Stay profile.');
      const profile = await ShortStayPropertyProfile.create({
        ...preparedProfile,
        branch_id: property.branch_id,
        property_id: property.id,
        public_slug: await this.generatePublicSlug(property, transaction),
        status: 'draft',
        is_website_listed: false,
      }, { transaction });

      return ShortStayPropertyProfile.findByPk(profile.id, {
        include: [{ model: Property, as: 'property', include: [{ model: PropertyMedia, as: 'media' }] }],
        transaction,
      });
    });
  }

  async updatePropertyProfile(branchId, profileId, { profile: profileData = {}, property: propertyData = {} }) {
    return sequelize.transaction(async (transaction) => {
      const profile = await ShortStayPropertyProfile.findOne({
        where: { id: profileId, ...branchWhere(branchId) },
        include: [{ model: Property, as: 'property' }],
        transaction,
      });
      if (!profile) throw httpError(404, 'Short stay profile not found.');
      const validatedProfile = validateProfileData(profileData);
      validateProfileData({
        max_guests: validatedProfile.max_guests ?? profile.max_guests,
        max_adults: validatedProfile.max_adults ?? profile.max_adults,
      });
      await profile.update(validatedProfile, { transaction });
      if (Object.keys(propertyData).length) await profile.property.update(propertyData, { transaction });
      return ShortStayPropertyProfile.findByPk(profile.id, {
        include: [{ model: Property, as: 'property', include: [{ model: PropertyMedia, as: 'media' }] }],
        transaction,
      });
    });
  }

  /** Move an STR property profile through its lifecycle (draft → ready → active → suspended).
      Activation is gated on an owner-management record existing for the property, unless a
      super-admin override reason is supplied — mirrors the sales "override with reason" rule. */
  async setPropertyStatus(branchId, profileId, { status, override_reason } = {}, { canOverride = false } = {}) {
    const allowed = ['draft', 'readiness_pending', 'ready', 'active', 'suspended'];
    if (!allowed.includes(status)) throw httpError(400, `Invalid status '${status}'. Allowed: ${allowed.join(', ')}`);
    const profile = await ShortStayPropertyProfile.findOne({ where: { id: profileId, ...branchWhere(branchId) } });
    if (!profile) throw httpError(404, 'Short stay profile not found.');
    if (override_reason && !canOverride) throw httpError(403, 'Only a super admin can provide an activation override reason.');

    if (['ready', 'active'].includes(status)) {
      const mgmt = await ShortStayOwnerManagement.findOne({ where: { property_id: profile.property_id, ...branchWhere(branchId) } });
      const readiness = await ShortStayReadinessCheck.findOne({ where: { property_id: profile.property_id, branch_id: profile.branch_id, booking_id: null, check_type: 'str_readiness', is_passed: true } });
      const blockers = [];
      if (!mgmt) blockers.push('owner_management_missing');
      else if (mgmt.status !== 'active' && !override_reason) blockers.push('owner_agreement_not_active');
      if (!readiness) blockers.push('property_readiness_not_passed');
      if (blockers.length && !(canOverride && String(override_reason || '').trim())) {
        throw httpError(409, `Cannot mark property ${status}: ${blockers.join(', ')}. A super admin can override with a written reason.`);
      }
    }
    await profile.update({ status });
    return profile;
  }

  /** Toggle website public listing status */
  async toggleWebsiteListing(branchId, profileId, isListed) {
    const profile = await ShortStayPropertyProfile.findOne({
      where: { id: profileId, ...branchWhere(branchId) },
      include: [{ model: Property, as: 'property' }],
    });
    if (!profile) throw httpError(404, 'Short stay profile not found.');

    if (isListed && !['ready', 'active'].includes(profile.status)) {
      throw httpError(409, 'Property listing cannot be published on website until STS-Owner agreement and readiness checks are completed.');
    }

    await profile.update({ is_website_listed: isListed });
    return profile;
  }

  /** Public API: Fetch published listings for website visitors */
  async getPublicListings(query = {}) {
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const filterNumber = (name) => {
      if (query[name] === undefined || query[name] === '') return null;
      const value = Number(query[name]);
      if (!Number.isFinite(value) || value < 0) throw httpError(400, `${name} must be a non-negative number.`);
      return value;
    };
    const bedrooms = filterNumber('bedrooms');
    const bathrooms = filterNumber('bathrooms');
    const guests = filterNumber('guests');
    const minRate = filterNumber('min_rate');
    const maxRate = filterNumber('max_rate');
    if (minRate !== null && maxRate !== null && minRate > maxRate) throw httpError(400, 'min_rate cannot exceed max_rate.');
    const where = {
        is_website_listed: true,
        status: { [Op.in]: ['ready', 'active'] },
    };
    if (query.accommodation_type) where.accommodation_type = query.accommodation_type;
    if (bedrooms !== null) where.bedrooms = { [Op.gte]: bedrooms };
    if (bathrooms !== null) where.bathrooms = { [Op.gte]: bathrooms };
    if (guests !== null) where.max_guests = { [Op.gte]: guests };
    if (minRate !== null || maxRate !== null) {
      where.base_nightly_rate = {};
      if (minRate !== null) where.base_nightly_rate[Op.gte] = minRate;
      if (maxRate !== null) where.base_nightly_rate[Op.lte] = maxRate;
    }
    if (query.featured !== undefined) {
      if (!['true', 'false', '1', '0', true, false, 1, 0].includes(query.featured)) throw httpError(400, 'featured must be true or false.');
      where.is_featured_on_website = ['true', '1', true, 1].includes(query.featured);
    }
    if (query.q) {
      const q = `%${query.q}%`;
      where[Op.or] = [
        { public_headline: { [Op.like]: q } }, { public_description: { [Op.like]: q } },
        { '$property.title$': { [Op.like]: q } }, { '$property.area$': { [Op.like]: q } },
        { '$property.city$': { [Op.like]: q } }, { '$property.district$': { [Op.like]: q } },
      ];
    }
    if (query.area) where['$property.area$'] = query.area;
    if (query.city) where['$property.city$'] = query.city;
    if (query.district) where['$property.district$'] = query.district;
    if (query.check_in || query.check_out) {
      validateStayDates(query.check_in, query.check_out);
      const [blocked, tenancies] = await Promise.all([
        ShortStayAvailabilityBlock.findAll({
          where: {
            start_date: { [Op.lt]: query.check_out },
            end_date: { [Op.gt]: query.check_in },
          },
          attributes: ['property_id'],
          group: ['property_id'],
          raw: true,
        }),
        Tenancy.findAll({
          where: { status: { [Op.in]: ['active', 'upcoming'] } },
          attributes: ['property_id', 'lease_start', 'move_in_date', 'lease_end', 'move_out_date', 'planned_move_out_date', 'termination_effective_date'],
          raw: true,
        }),
      ]);
      const blockedIds = [...new Set([
        ...blocked.map((row) => row.property_id),
        ...tenancies.filter((row) => tenancyOverlaps(row, query.check_in, query.check_out)).map((row) => row.property_id),
      ].filter(Boolean))];
      if (blockedIds.length) where.property_id = { [Op.notIn]: blockedIds };
    }

    const { rows, count } = await ShortStayPropertyProfile.findAndCountAll({
      where,
      include: [
        {
          model: Property,
          as: 'property',
          required: true,
          include: [{
            model: PropertyMedia,
            as: 'media',
            required: false,
            separate: true,
            where: { media_type: { [Op.in]: PUBLIC_MEDIA_TYPES } },
            attributes: ['media_type', 'file_url', 'caption', 'sort_order'],
            order: [['sort_order', 'ASC'], ['id', 'ASC']],
          }],
        },
      ],
      distinct: true,
      limit,
      offset: (page - 1) * limit,
      subQuery: false,
      order: [['is_featured_on_website', 'DESC'], ['id', 'DESC']],
    });
    return { data: rows.map(publicListingDto), pagination: { page, limit, total: count, pages: Math.ceil(count / limit) } };
  }

  /** Public API: Single listing detail by slug */
  async getPublicListingBySlug(slug) {
    const profile = await ShortStayPropertyProfile.findOne({
      where: { public_slug: slug, is_website_listed: true, status: { [Op.in]: ['ready', 'active'] } },
      include: [
        {
          model: Property,
          as: 'property',
          include: [{
            model: PropertyMedia,
            as: 'media',
            required: false,
            separate: true,
            where: { media_type: { [Op.in]: PUBLIC_MEDIA_TYPES } },
            attributes: ['media_type', 'file_url', 'caption', 'sort_order'],
            order: [['sort_order', 'ASC'], ['id', 'ASC']],
          }],
        },
      ],
    });
    if (!profile) throw httpError(404, 'Listing not found or unavailable.');
    return publicListingDto(profile);
  }

  async getPublicAvailability(slug, { check_in, check_out } = {}) {
    const nights = validateStayDates(check_in, check_out);
    const profile = await ShortStayPropertyProfile.findOne({
      where: { public_slug: slug, is_website_listed: true, status: { [Op.in]: ['ready', 'active'] } },
    });
    if (!profile) throw httpError(404, 'Listing not found or unavailable.');
    const [conflicts, tenancyConflict] = await Promise.all([
      ShortStayAvailabilityBlock.findAll({
        where: {
          property_id: profile.property_id,
          start_date: { [Op.lt]: check_out },
          end_date: { [Op.gt]: check_in },
        },
        attributes: ['start_date', 'end_date', 'block_type'],
        order: [['start_date', 'ASC']],
        raw: true,
      }),
      this.hasTenancyCollision(profile.property_id, check_in, check_out),
    ]);
    if (tenancyConflict) conflicts.push({ start_date: check_in, end_date: check_out, block_type: 'long_term_tenancy' });
    const quote = await this.calculateStayQuote(profile, check_in, check_out);
    const minNights = quote.min_nights;
    return {
      available: conflicts.length === 0 && nights >= minNights,
      min_nights: minNights,
      quote,
    };
  }

  async createPublicEnquiry(data) {
    const slug = data.public_slug || data.slug;
    const guestName = data.guest_name || data.full_name;
    const guestEmail = data.guest_email || data.email;
    const guestPhone = data.guest_phone || data.phone;
    if (!slug && !data.profile_id) throw httpError(400, 'public_slug is required.');
    if (!String(guestName || '').trim()) throw httpError(400, 'guest_name is required.');
    if (!String(guestEmail || '').trim() && !String(guestPhone || '').trim()) {
      throw httpError(400, 'guest_email or guest_phone is required.');
    }
    const nights = validateStayDates(data.check_in_date, data.check_out_date);
    const profile = await ShortStayPropertyProfile.findOne({
      where: {
        ...(slug ? { public_slug: slug } : { id: data.profile_id }),
        is_website_listed: true,
        status: { [Op.in]: ['ready', 'active'] },
      },
    });
    if (!profile) throw httpError(404, 'Listing not found or unavailable.');
    const adults = Number(data.adults_count == null ? 1 : data.adults_count);
    const children = Number(data.children_count || 0);
    if (!Number.isInteger(adults) || adults < 1 || !Number.isInteger(children) || children < 0) throw httpError(400, 'Guest counts are invalid.');
    if (adults > Number(profile.max_adults || profile.max_guests) || children > Number(profile.max_children || 0) || adults + children > Number(profile.max_guests || 0)) {
      throw httpError(400, 'Guest counts exceed the property capacity.');
    }
    if (nights < Number(profile.min_nights || 1)) throw httpError(400, `This property requires a minimum stay of ${profile.min_nights || 1} nights.`);
    if (await this.checkAvailabilityCollision(profile.property_id, data.check_in_date, data.check_out_date)) {
      throw httpError(409, 'Those dates are no longer available. Please choose another stay period.');
    }
    if (await this.hasTenancyCollision(profile.property_id, data.check_in_date, data.check_out_date)) {
      throw httpError(409, 'Those dates overlap a residential tenancy and are not available for short stay.');
    }

    const quote = await this.calculateStayQuote(profile, data.check_in_date, data.check_out_date);
    const enquiry = await ShortStayEnquiry.create({
      branch_id: profile.branch_id,
      property_id: profile.property_id,
      profile_id: profile.id,
      guest_name: String(guestName).trim(),
      guest_email: guestEmail ? String(guestEmail).trim() : null,
      guest_phone: guestPhone ? String(guestPhone).trim() : null,
      check_in_date: data.check_in_date,
      check_out_date: data.check_out_date,
      adults_count: adults,
      children_count: children,
      message: data.message || null,
      quoted_amount: quote.total,
      status: 'new',
      source: 'website',
    });
    return { id: enquiry.id, status: enquiry.status, quoted_amount: enquiry.quoted_amount };
  }

  async validateOperationalReferences(branchId, { property_id, booking_id, assigned_provider_id, work_order_id } = {}) {
    if (!property_id) throw httpError(400, 'property_id is required.');
    const property = await Property.findOne({ where: { id: property_id, ...branchWhere(branchId) } });
    if (!property) throw httpError(404, 'Property not found.');
    const profile = await ShortStayPropertyProfile.findOne({ where: { property_id, branch_id: property.branch_id } });
    if (!profile) throw httpError(400, 'Property has no Short Term Stay profile.');
    if (booking_id) {
      const booking = await ShortStayBooking.findOne({ where: { id: booking_id, property_id, branch_id: property.branch_id } });
      if (!booking) throw httpError(400, 'Booking does not belong to this property and branch.');
    }
    if (assigned_provider_id) {
      const provider = await ServiceProvider.findOne({ where: { id: assigned_provider_id, branch_id: property.branch_id } });
      if (!provider) throw httpError(400, 'Assigned provider does not belong to this property branch.');
    }
    if (work_order_id) {
      const workOrder = await WorkOrder.findOne({ where: { id: work_order_id, property_id, branch_id: property.branch_id } });
      if (!workOrder) throw httpError(400, 'Work order does not belong to this property and branch.');
    }
    return property;
  }

  async updateIncident(branchId, userId, incidentId, data) {
    return sequelize.transaction(async (transaction) => {
      const incident = await ShortStayIncident.findOne({
        where: { id: incidentId, ...branchWhere(branchId) },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!incident) throw httpError(404, 'Incident not found.');
      await this.validateOperationalReferences(branchId, {
        property_id: incident.property_id,
        booking_id: incident.booking_id,
        assigned_provider_id: data.assigned_provider_id,
        work_order_id: data.work_order_id,
      });
      const currentDeduction = numberOrZero(incident.deduct_from_deposit_amount);
      const requestedDeduction = data.deduct_from_deposit_amount === undefined ? currentDeduction : Number(data.deduct_from_deposit_amount);
      if (!Number.isFinite(requestedDeduction) || requestedDeduction < currentDeduction) throw httpError(400, 'A recorded deposit deduction cannot be reduced or made negative. Use a separate refund adjustment.');
      const deductionDelta = requestedDeduction - currentDeduction;
      if (!deductionDelta) {
        await incident.update(data, { transaction });
        return incident;
      }
      if (!incident.booking_id) throw httpError(409, 'Link the incident to a booking before charging the guest deposit.');

      const booking = await ShortStayBooking.findOne({
        where: { id: incident.booking_id, property_id: incident.property_id, branch_id: incident.branch_id },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!booking?.folio_id) throw httpError(409, 'The linked booking has no guest folio.');
      const folio = await Folio.findOne({
        where: { id: booking.folio_id, branch_id: booking.branch_id },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!folio) throw httpError(409, 'The linked guest folio was not found.');
      if (deductionDelta > numberOrZero(folio.deposit_held)) throw httpError(409, 'The requested deduction exceeds the deposit currently held.');

      const chargedBalance = numberOrZero(folio.current_balance) + deductionDelta;
      await FolioTransaction.create({
        branch_id: booking.branch_id,
        folio_id: folio.id,
        transaction_type: 'charge',
        bucket: 'deposit_deduction',
        property_id: booking.property_id,
        description: `Damage charge - incident #${incident.id}`,
        debit: deductionDelta,
        credit: 0,
        balance_after: chargedBalance,
        transaction_date: new Date(),
        created_by: userId || null,
      }, { transaction });
      await FolioTransaction.create({
        branch_id: booking.branch_id,
        folio_id: folio.id,
        transaction_type: 'payment',
        bucket: 'deposit',
        property_id: booking.property_id,
        description: `Security deposit applied - incident #${incident.id}`,
        debit: 0,
        credit: deductionDelta,
        balance_after: chargedBalance - deductionDelta,
        transaction_date: new Date(),
        created_by: userId || null,
      }, { transaction });
      await folio.update({
        current_balance: chargedBalance - deductionDelta,
        deposit_held: numberOrZero(folio.deposit_held) - deductionDelta,
      }, { transaction });
      await incident.update({ ...data, deduct_from_deposit_amount: requestedDeduction }, { transaction });
      return incident;
    });
  }

  async createAvailabilityBlock(branchId, data) {
    validateStayDates(data.start_date, data.end_date);
    if (!['owner_hold', 'maintenance', 'cleaning', 'blocked'].includes(data.block_type || 'blocked')) {
      throw httpError(400, 'Manual availability blocks cannot use the booking block type.');
    }
    const property = await this.validateOperationalReferences(branchId, data);
    return sequelize.transaction(async (transaction) => {
      await ShortStayPropertyProfile.findOne({
        where: { property_id: property.id, branch_id: property.branch_id },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (await this.checkAvailabilityCollision(property.id, data.start_date, data.end_date, { transaction })) {
        throw httpError(409, 'The requested date range overlaps an existing booking or block.');
      }
      return ShortStayAvailabilityBlock.create({
        branch_id: property.branch_id,
        property_id: property.id,
        start_date: data.start_date,
        end_date: data.end_date,
        block_type: data.block_type || 'blocked',
        notes: data.notes || null,
      }, { transaction });
    });
  }

  async getRatePlans(branchId, profileId) {
    const profile = await ShortStayPropertyProfile.findOne({ where: { id: profileId, ...branchWhere(branchId) } });
    if (!profile) throw httpError(404, 'Short stay profile not found.');
    return ShortStayRatePlan.findAll({
      where: { property_id: profile.property_id, branch_id: profile.branch_id },
      order: [['priority', 'DESC'], ['start_date', 'ASC']],
    });
  }

  validateRatePlan(data, current = {}) {
    const merged = { ...current, ...data };
    if (!String(merged.name || '').trim()) throw httpError(400, 'Rate plan name is required.');
    validateStayDates(merged.start_date, merged.end_date);
    const nightlyRate = Number(merged.nightly_rate);
    const weekendRate = merged.weekend_rate === null || merged.weekend_rate === '' || merged.weekend_rate === undefined ? null : Number(merged.weekend_rate);
    const minNights = Number(merged.min_nights || 1);
    const priority = Number(merged.priority || 0);
    if (!Number.isFinite(nightlyRate) || nightlyRate < 0) throw httpError(400, 'nightly_rate must be a non-negative number.');
    if (weekendRate !== null && (!Number.isFinite(weekendRate) || weekendRate < 0)) throw httpError(400, 'weekend_rate must be a non-negative number.');
    if (!Number.isInteger(minNights) || minNights < 1) throw httpError(400, 'min_nights must be at least 1.');
    if (!Number.isInteger(priority)) throw httpError(400, 'priority must be a whole number.');
    return { ...data, name: String(merged.name).trim(), nightly_rate: nightlyRate, weekend_rate: weekendRate, min_nights: minNights, priority };
  }

  async createRatePlan(branchId, profileId, data) {
    const profile = await ShortStayPropertyProfile.findOne({ where: { id: profileId, ...branchWhere(branchId) } });
    if (!profile) throw httpError(404, 'Short stay profile not found.');
    return ShortStayRatePlan.create({
      ...this.validateRatePlan(data),
      branch_id: profile.branch_id,
      property_id: profile.property_id,
    });
  }

  async updateRatePlan(branchId, ratePlanId, data) {
    const plan = await ShortStayRatePlan.findOne({ where: { id: ratePlanId, ...branchWhere(branchId) } });
    if (!plan) throw httpError(404, 'Rate plan not found.');
    const patch = this.validateRatePlan(data, plan.get({ plain: true }));
    await plan.update(patch);
    return plan;
  }

  async deleteRatePlan(branchId, ratePlanId) {
    const plan = await ShortStayRatePlan.findOne({ where: { id: ratePlanId, ...branchWhere(branchId) } });
    if (!plan) throw httpError(404, 'Rate plan not found.');
    await plan.destroy();
  }

  async calculateStayQuote(profile, checkIn, checkOut) {
    const nights = validateStayDates(checkIn, checkOut);
    const plans = await ShortStayRatePlan.findAll({
      where: {
        property_id: profile.property_id,
        branch_id: profile.branch_id,
        is_active: true,
        start_date: { [Op.lt]: checkOut },
        end_date: { [Op.gt]: checkIn },
      },
      order: [['priority', 'DESC'], ['id', 'DESC']],
      raw: true,
    }).catch(() => []);
    const applicableMinimum = Math.max(Number(profile.min_nights || 1), ...plans.map((plan) => Number(plan.min_nights || 1)));
    if (nights < applicableMinimum) throw httpError(400, `This stay requires a minimum of ${applicableMinimum} nights.`);

    const daily = [];
    for (let offset = 0; offset < nights; offset++) {
      const date = new Date(`${checkIn}T00:00:00Z`);
      date.setUTCDate(date.getUTCDate() + offset);
      const dateString = date.toISOString().slice(0, 10);
      const plan = plans.find((candidate) => candidate.start_date <= dateString && candidate.end_date > dateString);
      const weekend = [5, 6].includes(date.getUTCDay());
      let rate;
      if (plan) rate = weekend && plan.weekend_rate != null ? Number(plan.weekend_rate) : Number(plan.nightly_rate);
      else if (nights >= 28 && numberOrZero(profile.monthly_rate) > 0) rate = numberOrZero(profile.monthly_rate) / 30;
      else if (nights >= 7 && numberOrZero(profile.weekly_rate) > 0) rate = numberOrZero(profile.weekly_rate) / 7;
      else rate = weekend && numberOrZero(profile.weekend_rate) > 0 ? numberOrZero(profile.weekend_rate) : numberOrZero(profile.base_nightly_rate);
      daily.push({ date: dateString, rate: Math.round(rate * 100) / 100, rate_plan: plan?.name || null });
    }
    const accommodationAmount = Math.round(daily.reduce((sum, row) => sum + row.rate, 0) * 100) / 100;
    const cleaningFee = numberOrZero(profile.cleaning_fee);
    return {
      nights,
      min_nights: applicableMinimum,
      daily,
      accommodation_amount: accommodationAmount,
      cleaning_fee: cleaningFee,
      total: Math.round((accommodationAmount + cleaningFee) * 100) / 100,
      currency: 'BDT',
    };
  }

  async updateAvailabilityBlock(branchId, blockId, data) {
    const candidate = await ShortStayAvailabilityBlock.findOne({ where: { id: blockId, ...branchWhere(branchId) }, attributes: ['id', 'property_id', 'branch_id'] });
    if (!candidate) throw httpError(404, 'Availability block not found.');
    return sequelize.transaction(async (transaction) => {
      await ShortStayPropertyProfile.findOne({ where: { property_id: candidate.property_id, branch_id: candidate.branch_id }, transaction, lock: transaction.LOCK.UPDATE });
      const block = await ShortStayAvailabilityBlock.findOne({ where: { id: blockId, ...branchWhere(branchId) }, transaction, lock: transaction.LOCK.UPDATE });
      if (!block) throw httpError(404, 'Availability block not found.');
      if (block.booking_id || block.block_type === 'booking') throw httpError(409, 'Booking-generated blocks cannot be edited through the manual block endpoint.');
      const startDate = data.start_date || block.start_date;
      const endDate = data.end_date || block.end_date;
      validateStayDates(startDate, endDate);
      if (data.block_type && !['owner_hold', 'maintenance', 'cleaning', 'blocked'].includes(data.block_type)) throw httpError(400, 'Manual availability blocks cannot use the booking block type.');
      if (await this.checkAvailabilityCollision(block.property_id, startDate, endDate, { excludeBlockId: block.id, transaction })) throw httpError(409, 'The requested date range overlaps an existing booking or block.');
      await block.update({ ...data, start_date: startDate, end_date: endDate }, { transaction });
      return block;
    });
  }

  async deleteAvailabilityBlock(branchId, blockId) {
    const block = await ShortStayAvailabilityBlock.findOne({ where: { id: blockId, ...branchWhere(branchId) } });
    if (!block) throw httpError(404, 'Availability block not found.');
    if (block.booking_id || block.block_type === 'booking') throw httpError(409, 'Booking-generated blocks cannot be deleted through the manual block endpoint.');
    await block.destroy();
  }

  async getPropertyDashboard(branchId, profileId) {
    const profile = await ShortStayPropertyProfile.findOne({
      where: { id: profileId, ...branchWhere(branchId) },
      include: [{ model: Property, as: 'property', include: [{ model: PropertyMedia, as: 'media' }] }],
    });
    if (!profile) throw httpError(404, 'Short stay profile not found.');
    const propertyId = profile.property_id;
    const scoped = { branch_id: profile.branch_id, property_id: propertyId };
    const optional = async (label, fallback, work) => {
      try { return await work(); } catch (error) {
        console.warn(`[ShortStayDashboard] ${label} skipped: ${error.message}`);
        return fallback;
      }
    };
    const [documents, ownerManagement, bookings, availability, ratePlans, readiness, housekeeping, incidents, folios, transactions, tenancies, settings] = await Promise.all([
      optional('documents', [], () => PropertyDocument.findAll({ where: { property_id: propertyId }, order: [['created_at', 'DESC']] })),
      optional('owner management', null, () => ShortStayOwnerManagement.findOne({
        where: scoped,
        include: [
          { model: Contact, as: 'primary_owner', attributes: ['id', 'full_name', 'company_name', 'primary_phone', 'email'] },
          { model: SigningEnvelope, as: 'envelope', attributes: ['id', 'envelope_code', 'title', 'status', 'sent_at', 'completed_at'] },
        ],
      })),
      ShortStayBooking.findAll({
        where: scoped,
        include: [
          { model: Contact, as: 'lead_guest', attributes: ['id', 'full_name', 'primary_phone', 'email'] },
          { model: ShortStayBookingOccupant, as: 'occupants' },
          { model: Folio, as: 'folio' },
        ],
        order: [['check_in_date', 'DESC']],
      }),
      ShortStayAvailabilityBlock.findAll({ where: scoped, order: [['start_date', 'ASC']] }),
      ShortStayRatePlan.findAll({ where: scoped, order: [['priority', 'DESC'], ['start_date', 'ASC']] }).catch(() => []),
      ShortStayReadinessCheck.findAll({ where: scoped, order: [['id', 'DESC']] }),
      optional('housekeeping', [], () => ShortStayHousekeepingTask.findAll({ where: scoped, order: [['scheduled_date', 'DESC']] })),
      optional('incidents', [], () => ShortStayIncident.findAll({ where: scoped, order: [['id', 'DESC']] })),
      optional('folios', [], () => Folio.findAll({ where: scoped, order: [['id', 'DESC']] })),
      optional('folio transactions', [], () => FolioTransaction.findAll({ where: scoped, order: [['transaction_date', 'DESC'], ['id', 'DESC']] })),
      optional('tenancies', [], () => Tenancy.findAll({
        where: { property_id: propertyId, status: { [Op.in]: ['active', 'upcoming'] } },
        attributes: ['id', 'tenancy_code', 'status', 'lease_start', 'move_in_date', 'lease_end', 'move_out_date', 'planned_move_out_date', 'termination_effective_date'],
        raw: true,
      })),
      this.getSettings(profile.branch_id),
    ]);

    const bookingRows = bookings.map((row) => row.get({ plain: true }));
    const activeBookings = bookingRows.filter((booking) => booking.status !== 'cancelled');
    const revenue = activeBookings.reduce((sum, booking) => sum + numberOrZero(booking.total_booking_value), 0);
    const collected = activeBookings.reduce((sum, booking) => sum + numberOrZero(booking.paid_amount), 0);
    const media = profile.property?.media || [];
    const management = ownerManagement?.get ? ownerManagement.get({ plain: true }) : ownerManagement;
    const readinessBlockers = [];
    if (!management) readinessBlockers.push('owner_management_missing');
    else if (management.status !== 'active') readinessBlockers.push('owner_agreement_not_active');
    if (numberOrZero(profile.base_nightly_rate) <= 0) readinessBlockers.push('base_nightly_rate_missing');
    if (Number(profile.max_guests || 0) < 1) readinessBlockers.push('guest_capacity_missing');
    if (!media.some((item) => item.media_type === 'image' && isPublicMediaUrl(item.file_url))) readinessBlockers.push('public_image_missing');
    if (tenancies.length) readinessBlockers.push('residential_tenancy_active');
    const savedPropertyReadiness = readiness.find((row) => row.check_type === 'str_readiness' && !row.booking_id);
    if (!savedPropertyReadiness?.is_passed) readinessBlockers.push('property_readiness_not_passed');
    let propertyChecklist = savedPropertyReadiness?.checklist_data || {};
    if (typeof propertyChecklist === 'string') { try { propertyChecklist = JSON.parse(propertyChecklist); } catch { propertyChecklist = {}; } }
    const propertyReadiness = {
      id: savedPropertyReadiness?.id || null,
      items: Array.isArray(propertyChecklist.items) && propertyChecklist.items.length
        ? propertyChecklist.items
        : settings.property_readiness_checklist.map((label) => ({ label, done: false })),
      notes: propertyChecklist.notes || '',
      photos: parseJsonArray(savedPropertyReadiness?.photos),
      is_passed: !!savedPropertyReadiness?.is_passed,
      completed_at: savedPropertyReadiness?.completed_at || null,
    };
    const publishBlockers = [...readinessBlockers];
    if (!profile.public_slug) publishBlockers.push('public_slug_missing');
    if (!['ready', 'active'].includes(profile.status)) publishBlockers.push('profile_not_ready');

    const dashboardKpis = {
      total_bookings: bookingRows.length,
      active_bookings: activeBookings.length,
      upcoming_bookings: activeBookings.filter((booking) => booking.check_in_date >= new Date().toISOString().slice(0, 10)).length,
      in_house: bookingRows.filter((booking) => booking.status === 'checked_in').length,
      occupancy_rate: bookingRows.some((booking) => booking.status === 'checked_in') ? 100 : 0,
      booked_revenue: revenue,
      revenue,
      collected,
      open_incidents: incidents.filter((incident) => ['reported', 'investigating'].includes(incident.status)).length,
      pending_housekeeping: housekeeping.filter((task) => task.status !== 'completed').length,
      readiness_percent: readinessBlockers.length ? Math.max(0, 100 - readinessBlockers.length * 20) : 100,
    };
    const blockerRows = [...new Set([...readinessBlockers, ...publishBlockers])].map((key) => ({
      key,
      title: key.replace(/_/g, ' '),
    }));
    const finance = {
      kpis: {
        booked_revenue: revenue,
        collected,
        outstanding: Math.max(0, revenue - collected),
        current_balance: folios.reduce((sum, folio) => sum + numberOrZero(folio.current_balance), 0),
        deposits_held: folios.reduce((sum, folio) => sum + numberOrZero(folio.deposit_held), 0),
      },
      transactions,
    };

    return {
      property: profile.property,
      media,
      documents,
      profile,
      owner_management: management,
      owner_agreement: management?.envelope || null,
      bookings,
      availability_blocks: availability,
      rate_plans: ratePlans,
      readiness,
      property_readiness: propertyReadiness,
      housekeeping,
      incidents,
      residential_tenancies: tenancies,
      payments: {
        transactions,
        booked_revenue: revenue,
        collected,
        outstanding: Math.max(0, revenue - collected),
      },
      folios: {
        rows: folios,
        current_balance: folios.reduce((sum, folio) => sum + numberOrZero(folio.current_balance), 0),
        deposits_held: folios.reduce((sum, folio) => sum + numberOrZero(folio.deposit_held), 0),
      },
      finance,
      kpi: dashboardKpis,
      kpis: dashboardKpis,
      blockers: blockerRows,
      blocker_groups: { readiness: readinessBlockers, publish: publishBlockers },
    };
  }

  async savePropertyReadiness(branchId, userId, profileId, { items = [], notes = '', photos = [], is_passed = false } = {}) {
    if (!Array.isArray(items) || !items.length) throw httpError(400, 'The property readiness checklist is required.');
    if (is_passed && items.some((item) => !item.done)) throw httpError(400, 'Every readiness item must be completed before the property can pass.');
    return sequelize.transaction(async (transaction) => {
      const profile = await ShortStayPropertyProfile.findOne({
        where: { id: profileId, ...branchWhere(branchId) },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!profile) throw httpError(404, 'Short stay profile not found.');
      const existing = await ShortStayReadinessCheck.findOne({
        where: { property_id: profile.property_id, branch_id: profile.branch_id, booking_id: null, check_type: 'str_readiness' },
        order: [['id', 'DESC']],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      const values = {
        branch_id: profile.branch_id,
        property_id: profile.property_id,
        booking_id: null,
        check_type: 'str_readiness',
        checklist_data: { items, notes },
        photos: Array.isArray(photos) ? photos : [],
        completed_by_user_id: userId || null,
        is_passed: !!is_passed,
        completed_at: is_passed ? new Date() : null,
      };
      const row = existing
        ? await existing.update(values, { transaction })
        : await ShortStayReadinessCheck.create(values, { transaction });
      if (!is_passed && profile.is_website_listed) await profile.update({ is_website_listed: false, status: 'readiness_pending' }, { transaction });
      if (is_passed && profile.status === 'draft') await profile.update({ status: 'readiness_pending' }, { transaction });
      return row;
    });
  }

  /** Double-booking collision detector */
  async hasTenancyCollision(propertyId, startDate, endDate) {
    const tenancies = await Tenancy.findAll({
      where: { property_id: propertyId, status: { [Op.in]: ['active', 'upcoming'] } },
      attributes: ['lease_start', 'move_in_date', 'lease_end', 'move_out_date', 'planned_move_out_date', 'termination_effective_date'],
      raw: true,
    });
    return tenancies.some((tenancy) => tenancyOverlaps(tenancy, startDate, endDate));
  }

  async checkAvailabilityCollision(propertyId, startDate, endDate, { excludeBookingId = null, excludeBlockId = null, transaction = null } = {}) {
    const where = {
      property_id: propertyId,
      start_date: { [Op.lt]: endDate },
      end_date: { [Op.gt]: startDate },
    };
    if (excludeBookingId) {
      where[Op.or] = [{ booking_id: { [Op.ne]: excludeBookingId } }, { booking_id: null }];
    }
    if (excludeBlockId) where.id = { [Op.ne]: excludeBlockId };

    const collision = await ShortStayAvailabilityBlock.findOne({
      where,
      transaction,
      ...(transaction ? { lock: transaction.LOCK.UPDATE } : {}),
    });
    return !!collision;
  }

  /** Create booking or enquiry */
  async createBooking(branchId, userId, data) {
    const { property_id, lead_guest_contact_id, check_in_date, check_out_date, occupants = [], ...bookingData } = data;
    const nights = validateStayDates(check_in_date, check_out_date);

    // Check property readiness & owner agreement gate
    const profile = await ShortStayPropertyProfile.findOne({ where: { property_id, ...branchWhere(branchId) } });
    if (!profile) throw httpError(404, 'Property has no Short Term Stay profile.');
    const property = await Property.findOne({ where: { id: property_id, branch_id: profile.branch_id } });
    if (!property) throw httpError(404, 'Property not found in the Short Term Stay profile branch.');
    const leadGuest = await Contact.findOne({ where: { id: lead_guest_contact_id, branch_id: profile.branch_id } });
    if (!leadGuest) throw httpError(400, 'Lead guest contact was not found in the property branch.');
    if (profile.status === 'draft' || profile.status === 'suspended') {
      throw new Error(`Property is currently ${profile.status}. Completed STS-Owner agreement and readiness assessment required.`);
    }
    const adults = Number(bookingData.adults_count == null ? 1 : bookingData.adults_count);
    const children = Number(bookingData.children_count || 0);
    if (!Number.isInteger(adults) || adults < 1 || !Number.isInteger(children) || children < 0) throw httpError(400, 'Guest counts must be non-negative whole numbers and include at least one adult.');
    if (adults > Number(profile.max_adults || profile.max_guests) || children > Number(profile.max_children || 0) || adults + children > Number(profile.max_guests || 0)) {
      throw httpError(400, 'Guest counts exceed the property capacity.');
    }
    if (nights < Number(profile.min_nights || 1)) throw httpError(400, `This property requires a minimum stay of ${profile.min_nights || 1} nights.`);

    // Check double-booking collision
    const hasCollision = await this.checkAvailabilityCollision(property_id, check_in_date, check_out_date);
    if (hasCollision) {
      throw httpError(409, `Date collision detected for property between ${check_in_date} and ${check_out_date}. Date range is already booked or blocked.`);
    }
    if (await this.hasTenancyCollision(property_id, check_in_date, check_out_date)) {
      throw httpError(409, 'Date collision detected with an active or upcoming residential tenancy.');
    }

    const quote = await this.calculateStayQuote(profile, check_in_date, check_out_date);
    const manualNightlyRate = bookingData.nightly_rate === undefined || bookingData.nightly_rate === null || bookingData.nightly_rate === '' ? null : Number(bookingData.nightly_rate);
    const nightlyRate = manualNightlyRate ?? numberOrZero(profile.base_nightly_rate);
    const cleaningFee = bookingData.cleaning_fee === undefined || bookingData.cleaning_fee === null || bookingData.cleaning_fee === '' ? quote.cleaning_fee : Number(bookingData.cleaning_fee);
    const securityDeposit = bookingData.security_deposit_amount === undefined || bookingData.security_deposit_amount === null || bookingData.security_deposit_amount === '' ? numberOrZero(profile.security_deposit) : Number(bookingData.security_deposit_amount);
    if (![nightlyRate, cleaningFee, securityDeposit].every((value) => Number.isFinite(value) && value >= 0)) {
      throw httpError(400, 'Booking rates, fees, and deposits must be non-negative numbers.');
    }

    const accommodationTotal = manualNightlyRate === null ? quote.accommodation_amount : nightlyRate * nights;
    const totalValue = accommodationTotal + cleaningFee;

    const bookingCode = await this.generateUniqueBookingCode();

    const transaction = await sequelize.transaction();
    try {
      await ShortStayPropertyProfile.findOne({
        where: { id: profile.id, branch_id: profile.branch_id },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (await this.checkAvailabilityCollision(property_id, check_in_date, check_out_date, { transaction })) {
        throw httpError(409, `Date collision detected for property between ${check_in_date} and ${check_out_date}. Date range is already booked or blocked.`);
      }
      // Create the guest folio. Short-stay guests are short-term tenants, so we reuse
      // the tenant folio type/scope; columns match the shared Folio model exactly.
      const folio = await Folio.create({
        branch_id: profile.branch_id,
        folio_code: `FOL-${bookingCode}`,
        folio_type: 'tenant',
        folio_scope: 'tenancy',
        property_id,
        contact_id: lead_guest_contact_id,
        tenant_contact_id: lead_guest_contact_id,
        status: 'active',
        opening_balance: 0,
        current_balance: totalValue,
      }, { transaction });

      const booking = await ShortStayBooking.create({
        branch_id: profile.branch_id,
        booking_code: bookingCode,
        property_id,
        lead_guest_contact_id,
        check_in_date,
        check_out_date,
        nights_count: nights,
        total_accommodation_amount: accommodationTotal,
        cleaning_fee: cleaningFee,
        security_deposit_amount: securityDeposit,
        total_booking_value: totalValue,
        folio_id: folio.id,
        ...bookingData,
        status: 'hold',
        adults_count: adults,
        children_count: children,
      }, { transaction });

      if (totalValue > 0) {
        await FolioTransaction.create({
          branch_id: profile.branch_id,
          folio_id: folio.id,
          transaction_type: 'charge',
          bucket: 'rent',
          property_id,
          description: `Short-stay booking charge - ${bookingCode}`,
          debit: totalValue,
          credit: 0,
          balance_after: totalValue,
          transaction_date: new Date(),
          created_by: userId || null,
        }, { transaction });
      }

      // Create occupants
      if (occupants && occupants.length > 0) {
        for (const occ of occupants) {
          const safeOccupant = {};
          for (const field of OCCUPANT_FIELDS) if (occ && occ[field] !== undefined) safeOccupant[field] = occ[field];
          if (!safeOccupant.full_name) throw httpError(400, 'Each occupant must have a full_name.');
          await ShortStayBookingOccupant.create({
            booking_id: booking.id,
            ...safeOccupant,
            verification_status: 'pending',
          }, { transaction });
        }
      }

      // Create availability block
      await ShortStayAvailabilityBlock.create({
        branch_id: profile.branch_id,
        property_id,
        start_date: check_in_date,
        end_date: check_out_date,
        block_type: 'booking',
        booking_id: booking.id,
        notes: `Booking ${bookingCode}`,
      }, { transaction });

      await transaction.commit();
      return booking;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  async generateUniqueBookingCode() {
    for (let attempt = 0; attempt < 5; attempt++) {
      const day = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const code = `STB-${day}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      if (!await ShortStayBooking.findOne({ where: { booking_code: code }, attributes: ['id'] })) return code;
    }
    throw httpError(503, 'Could not generate a unique booking code. Please retry.');
  }

  /** Confirm a booking — records the guest payment and security deposit against the folio
      and advances the booking to 'confirmed' (check-in ready). Returns a clear blocker list
      instead of a generic error, matching the sales-settlement gating pattern. */
  async confirmBooking(branchId, userId, { booking_id, paid_amount, security_deposit_paid }) {
    const booking = await ShortStayBooking.findOne({
      where: { id: booking_id, ...branchWhere(branchId) },
      include: [{ model: Property, as: 'property' }],
    });
    if (!booking) throw httpError(404, 'Booking not found.');
    if (booking.status !== 'pending_payment') throw httpError(409, `Booking cannot be confirmed while it is '${booking.status}'.`);

    const nights = validateStayDates(booking.check_in_date, booking.check_out_date);
    const profile = await ShortStayPropertyProfile.findOne({ where: { property_id: booking.property_id, branch_id: booking.branch_id } });
    const blockers = [];
    if (!profile) blockers.push('property_profile_missing');
    else if (!['ready', 'active'].includes(profile.status)) blockers.push('property_not_active');
    const property = await Property.findOne({ where: { id: booking.property_id, branch_id: booking.branch_id } });
    if (!property) blockers.push('property_branch_mismatch');
    const leadGuest = await Contact.findOne({ where: { id: booking.lead_guest_contact_id, branch_id: booking.branch_id } });
    if (!leadGuest) blockers.push('guest_contact_branch_mismatch');
    if (await this.checkAvailabilityCollision(booking.property_id, booking.check_in_date, booking.check_out_date, { excludeBookingId: booking.id })) blockers.push('availability_conflict');
    if (profile && nights < Number(profile.min_nights || 1)) blockers.push('minimum_stay_not_met');
    if (profile && (Number(booking.adults_count || 0) > Number(profile.max_adults || profile.max_guests)
      || Number(booking.children_count || 0) > Number(profile.max_children || 0)
      || Number(booking.adults_count || 0) + Number(booking.children_count || 0) > Number(profile.max_guests || 0))) blockers.push('property_capacity_exceeded');
    if (!booking.agreement_envelope_id) blockers.push('guest_agreement_missing');
    else {
      const envelope = await SigningEnvelope.findOne({ where: { id: booking.agreement_envelope_id, branch_id: booking.branch_id } });
      if (!envelope || envelope.status !== 'completed') blockers.push('guest_agreement_not_completed');
    }
    const guestKyc = evaluateKyc('guest', await KycDocument.findAll({
      where: { related_type: 'short_stay_booking', related_id: booking.id, role: 'guest' },
      raw: true,
    }));
    if (!guestKyc.all_verified) blockers.push('guest_kyc_not_verified');

    const currentPaid = Number(booking.paid_amount || 0);
    const paid = Number(paid_amount != null ? paid_amount : currentPaid);
    const deposit = Number(security_deposit_paid != null ? security_deposit_paid : booking.security_deposit_paid || 0);
    if (!Number.isFinite(paid) || !Number.isFinite(deposit) || paid < currentPaid || deposit < Number(booking.security_deposit_paid || 0)) {
      throw httpError(400, 'Recorded payment and deposit totals must be valid and cannot decrease.');
    }
    if (paid < Number(booking.total_booking_value)) blockers.push('booking_payment_incomplete');
    if (Number(booking.security_deposit_amount) > 0 && deposit < Number(booking.security_deposit_amount)) blockers.push('security_deposit_unpaid');
    if (blockers.length) {
      const err = new Error(`Booking cannot be confirmed: ${blockers.join(', ')}`);
      err.status = 409;
      err.blockers = blockers;
      throw err;
    }

    const tx = await sequelize.transaction();
    try {
      const lockedBooking = await ShortStayBooking.findOne({
        where: { id: booking.id, branch_id: booking.branch_id },
        transaction: tx,
        lock: tx.LOCK.UPDATE,
      });
      if (!lockedBooking || lockedBooking.status !== 'pending_payment') throw httpError(409, 'Booking state changed before confirmation. Refresh and try again.');
      const lockedCurrentPaid = numberOrZero(lockedBooking.paid_amount);
      const lockedCurrentDeposit = numberOrZero(lockedBooking.security_deposit_paid);
      if (paid < lockedCurrentPaid || deposit < lockedCurrentDeposit) throw httpError(409, 'Booking payment totals changed before confirmation. Refresh and try again.');
      // Post the guest payment to the folio (credit reduces what the guest owes).
      if (lockedBooking.folio_id) {
        const folio = await Folio.findOne({ where: { id: lockedBooking.folio_id, branch_id: lockedBooking.branch_id }, transaction: tx, lock: tx.LOCK.UPDATE });
        if (folio) {
          const paymentDelta = paid - lockedCurrentPaid;
          const newBalance = Number(folio.current_balance) - paymentDelta;
          if (paymentDelta > 0) {
            await FolioTransaction.create({
              branch_id: booking.branch_id, folio_id: folio.id, transaction_type: 'payment',
              property_id: booking.property_id, description: `Guest payment - ${booking.booking_code}`,
              debit: 0, credit: paymentDelta, balance_after: newBalance,
              transaction_date: new Date(), created_by: userId,
            }, { transaction: tx });
          }
          await folio.update({ current_balance: newBalance, deposit_held: deposit }, { transaction: tx });
        }
      }
      await lockedBooking.update({ status: 'confirmed', paid_amount: paid, security_deposit_paid: deposit }, { transaction: tx });
      await tx.commit();
      return lockedBooking;
    } catch (err) {
      await tx.rollback();
      throw err;
    }
  }

  async cancelBooking(branchId, userId, bookingId, { reason, refund_amount = 0, deposit_refunded_amount = 0 } = {}) {
    if (!String(reason || '').trim()) throw httpError(400, 'A cancellation reason is required.');
    const refund = Number(refund_amount || 0);
    const depositRefund = Number(deposit_refunded_amount || 0);
    if (!Number.isFinite(refund) || refund < 0 || !Number.isFinite(depositRefund) || depositRefund < 0) throw httpError(400, 'Refund totals must be non-negative numbers.');

    return sequelize.transaction(async (transaction) => {
      const booking = await ShortStayBooking.findOne({
        where: { id: bookingId, ...branchWhere(branchId) },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!booking) throw httpError(404, 'Booking not found.');
      if (['checked_in', 'checked_out', 'inspection_pending', 'closed'].includes(booking.status)) throw httpError(409, `A booking in '${booking.status}' state cannot be cancelled through the pre-arrival cancellation flow.`);
      if (booking.status === 'cancelled') throw httpError(409, 'Booking is already cancelled.');
      if (refund > numberOrZero(booking.paid_amount)) throw httpError(400, 'refund_amount cannot exceed the recorded guest payment.');
      if (depositRefund > numberOrZero(booking.security_deposit_paid)) throw httpError(400, 'deposit_refunded_amount cannot exceed the recorded security deposit.');
      const folio = booking.folio_id ? await Folio.findOne({
        where: { id: booking.folio_id, branch_id: booking.branch_id },
        transaction,
        lock: transaction.LOCK.UPDATE,
      }) : null;
      let balance = numberOrZero(folio?.current_balance);
      if (folio && numberOrZero(booking.total_booking_value) > 0) {
        balance -= numberOrZero(booking.total_booking_value);
        await FolioTransaction.create({
          branch_id: booking.branch_id,
          folio_id: folio.id,
          transaction_type: 'credit',
          bucket: 'rent',
          property_id: booking.property_id,
          description: `Cancelled booking charge reversal - ${booking.booking_code}`,
          debit: 0,
          credit: numberOrZero(booking.total_booking_value),
          balance_after: balance,
          transaction_date: new Date(),
          created_by: userId || null,
        }, { transaction });
      }
      if (folio && refund > 0) {
        balance += refund;
        await FolioTransaction.create({
          branch_id: booking.branch_id,
          folio_id: folio.id,
          transaction_type: 'adjustment',
          bucket: 'adjustment',
          property_id: booking.property_id,
          description: `Guest refund on cancellation - ${booking.booking_code}`,
          debit: refund,
          credit: 0,
          balance_after: balance,
          transaction_date: new Date(),
          created_by: userId || null,
        }, { transaction });
      }
      if (folio) await folio.update({ current_balance: balance, deposit_held: Math.max(0, numberOrZero(folio.deposit_held) - depositRefund) }, { transaction });
      await ShortStayAvailabilityBlock.destroy({ where: { booking_id: booking.id, branch_id: booking.branch_id }, transaction });
      await booking.update({
        status: 'cancelled',
        cancellation_reason: String(reason).trim(),
        cancelled_at: new Date(),
        refund_amount: numberOrZero(booking.refund_amount) + refund,
        deposit_refunded_amount: numberOrZero(booking.deposit_refunded_amount) + depositRefund,
        paid_amount: Math.max(0, numberOrZero(booking.paid_amount) - refund),
        security_deposit_paid: Math.max(0, numberOrZero(booking.security_deposit_paid) - depositRefund),
      }, { transaction });
      return booking;
    });
  }

  async amendBooking(branchId, userId, bookingId, data) {
    if (!String(data.reason || '').trim()) throw httpError(400, 'An amendment reason is required.');
    const allowedStates = ['hold', 'pending_verification', 'pending_agreement', 'pending_payment', 'confirmed', 'ready_checkin'];
    return sequelize.transaction(async (transaction) => {
      const booking = await ShortStayBooking.findOne({
        where: { id: bookingId, ...branchWhere(branchId) },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!booking) throw httpError(404, 'Booking not found.');
      if (!allowedStates.includes(booking.status)) throw httpError(409, `A booking in '${booking.status}' state cannot be rescheduled.`);
      const checkIn = data.check_in_date || booking.check_in_date;
      const checkOut = data.check_out_date || booking.check_out_date;
      const nights = validateStayDates(checkIn, checkOut);
      const profile = await ShortStayPropertyProfile.findOne({
        where: { property_id: booking.property_id, branch_id: booking.branch_id },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!profile || !['ready', 'active'].includes(profile.status)) throw httpError(409, 'The property is not active for amended bookings.');
      const adults = Number(data.adults_count ?? booking.adults_count);
      const children = Number(data.children_count ?? booking.children_count);
      if (!Number.isInteger(adults) || adults < 1 || !Number.isInteger(children) || children < 0) throw httpError(400, 'Guest counts are invalid.');
      if (adults > Number(profile.max_adults || profile.max_guests) || children > Number(profile.max_children || 0) || adults + children > Number(profile.max_guests || 0)) throw httpError(400, 'Guest counts exceed the property capacity.');
      if (await this.checkAvailabilityCollision(booking.property_id, checkIn, checkOut, { excludeBookingId: booking.id, transaction })) throw httpError(409, 'The amended dates overlap another booking or block.');
      if (await this.hasTenancyCollision(booking.property_id, checkIn, checkOut)) throw httpError(409, 'The amended dates overlap a residential tenancy.');

      const quote = await this.calculateStayQuote(profile, checkIn, checkOut);
      const newTotal = numberOrZero(quote.total);
      const oldTotal = numberOrZero(booking.total_booking_value);
      const amountDelta = newTotal - oldTotal;
      const folio = booking.folio_id ? await Folio.findOne({
        where: { id: booking.folio_id, branch_id: booking.branch_id },
        transaction,
        lock: transaction.LOCK.UPDATE,
      }) : null;
      if (folio && amountDelta !== 0) {
        const newBalance = numberOrZero(folio.current_balance) + amountDelta;
        await FolioTransaction.create({
          branch_id: booking.branch_id,
          folio_id: folio.id,
          transaction_type: amountDelta > 0 ? 'charge' : 'credit',
          bucket: 'rent',
          property_id: booking.property_id,
          description: `Booking amendment - ${booking.booking_code}: ${String(data.reason).trim()}`,
          debit: amountDelta > 0 ? amountDelta : 0,
          credit: amountDelta < 0 ? Math.abs(amountDelta) : 0,
          balance_after: newBalance,
          transaction_date: new Date(),
          created_by: userId || null,
        }, { transaction });
        await folio.update({ current_balance: newBalance }, { transaction });
      }
      const block = await ShortStayAvailabilityBlock.findOne({
        where: { booking_id: booking.id, branch_id: booking.branch_id },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (block) await block.update({ start_date: checkIn, end_date: checkOut, notes: `Booking ${booking.booking_code} amended` }, { transaction });
      else await ShortStayAvailabilityBlock.create({ branch_id: booking.branch_id, property_id: booking.property_id, booking_id: booking.id, start_date: checkIn, end_date: checkOut, block_type: 'booking', notes: `Booking ${booking.booking_code} amended` }, { transaction });
      if (booking.agreement_envelope_id) {
        await SigningEnvelope.update({ status: 'voided', voided_reason: `Booking amended: ${String(data.reason).trim()}` }, { where: { id: booking.agreement_envelope_id, branch_id: booking.branch_id }, transaction });
      }
      await booking.update({
        check_in_date: checkIn,
        check_out_date: checkOut,
        nights_count: nights,
        adults_count: adults,
        children_count: children,
        total_accommodation_amount: quote.accommodation_amount,
        cleaning_fee: quote.cleaning_fee,
        total_booking_value: newTotal,
        agreement_envelope_id: null,
        status: 'hold',
      }, { transaction });
      return booking;
    });
  }

  /** Build STS-Owner Agreement Envelope */
  async buildOwnerAgreement(branchId, userId, data) {
    const { property_id, primary_owner_contact_id, joint_owner_contact_ids = [], revenue_share_percent = 15 } = data;
    const template = await AgreementTemplate.findOne({ where: { name: 'Short Term Rental Management Service Agreement' } });
    if (!template) throw new Error('Short Term Rental Management Service Agreement template not seeded.');

    const property = await Property.findOne({ where: { id: property_id, ...branchWhere(branchId) } });
    if (!property) throw httpError(404, 'Property not found.');
    const primaryOwner = await Contact.findOne({ where: { id: primary_owner_contact_id, branch_id: property.branch_id } });
    if (!primaryOwner) throw httpError(400, 'Primary STS-Owner contact not found in the property branch.');
    if (!primaryOwner.email) throw httpError(400, 'The primary owner must have an email address before an agreement can be sent.');
    const profile = await ShortStayPropertyProfile.findOne({ where: { property_id, branch_id: property.branch_id } });
    if (!profile) throw httpError(400, 'Property has no Short Term Stay profile.');

    const jointOwners = joint_owner_contact_ids.length ? await Contact.findAll({
      where: { id: { [Op.in]: joint_owner_contact_ids }, branch_id: property.branch_id },
    }) : [];
    if (jointOwners.length !== joint_owner_contact_ids.length) throw httpError(400, 'One or more joint owners were not found in the property branch.');
    if (jointOwners.some((owner) => !owner.email)) throw httpError(400, 'Every joint owner must have an email address before the agreement can be sent.');
    const agencySigner = await User.findOne({ where: { id: userId, status: 'active' } });
    if (!agencySigner?.email) throw httpError(400, 'An active agency user with an email address is required to countersign the agreement.');
    const terms = {
      agreement_date: new Date().toISOString().slice(0, 10),
      agency_name: 'Seventh Sky Properties',
      agency_rep_name: agencySigner.name,
      owner_full_name: primaryOwner.full_name || primaryOwner.company_name || 'Owner',
      owner_nid: primaryOwner.national_id || primaryOwner.passport_no || '',
      owner_address: [primaryOwner.address_line1, primaryOwner.address_line2, primaryOwner.area, primaryOwner.city, primaryOwner.district].filter(Boolean).join(', '),
      owner_phone: primaryOwner.primary_phone || '',
      owner_email: primaryOwner.email || '',
      joint_owner_names: jointOwners.map((owner) => owner.full_name || owner.company_name).filter(Boolean).join(', '),
      property_address: [property.address, property.area, property.city, property.district].filter(Boolean).join(', '),
      accommodation_type: profile.accommodation_type,
      max_guests_capacity: profile.max_guests,
      commencement_date: new Date().toISOString().slice(0, 10),
      management_package: 'Full Management Package',
      selected_services: ['Property Setup & Readiness Assessment', 'Professional Photography & Listing Creation', 'Guest Verification & Booking Management', 'Check-in & Check-out Coordination', 'Turnover Housekeeping & Linen Service', 'Monthly Owner Revenue Statements & Payouts'],
      revenue_share_percent,
      cleaning_fee_setting: profile.cleaning_fee,
      security_deposit_setting: profile.security_deposit,
    };
    const envCode = await generateCode(SigningEnvelope, 'envelope_code', 'SSPC-ENV-');
    const tx = await sequelize.transaction();
    const links = [];

    try {
      await ShortStayPropertyProfile.findOne({
        where: { id: profile.id, branch_id: profile.branch_id },
        transaction: tx,
        lock: tx.LOCK.UPDATE,
      });
      const envelope = await SigningEnvelope.create({
        branch_id: property.branch_id,
        envelope_code: envCode,
        agreement_template_id: template.id,
        related_type: 'short_stay_management',
        related_id: property_id,
        title: `STS-Owner Agreement — ${property.title}`,
        document_html: merge(template.content_html || '', terms),
        status: 'sent',
        sent_at: new Date(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        terms,
        kyc_role: 'sts_owner',
        kyc_policy: 'flexible',
        created_by: userId,
      }, { transaction: tx });

      const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      // Primary Owner Signer (first signer is 'sent', the rest 'pending')
      const primarySigner = await EnvelopeSigner.create({
        envelope_id: envelope.id,
        contact_id: primaryOwner.id,
        role: 'landlord',
        name: primaryOwner.full_name || primaryOwner.company_name || 'Owner',
        email: primaryOwner.email,
        access_token: crypto.randomBytes(24).toString('hex'),
        token_expires_at: expires,
        signer_order: 1,
        status: 'sent',
      }, { transaction: tx });
      await addSignatureFields(envelope.id, primarySigner.id, tx);
      links.push({ name: primarySigner.name, email: primarySigner.email, token: primarySigner.access_token, flow: 'intake' });

      // Joint Owners
      let order = 2;
      for (const jc of jointOwners) {
        if (jc) {
          const jointSigner = await EnvelopeSigner.create({
            envelope_id: envelope.id,
            contact_id: jc.id,
            role: 'landlord',
            name: jc.full_name || jc.company_name || 'Joint Owner',
            email: jc.email,
            access_token: crypto.randomBytes(24).toString('hex'),
            token_expires_at: expires,
            signer_order: order,
            status: 'pending',
          }, { transaction: tx });
          await addSignatureFields(envelope.id, jointSigner.id, tx);
          links.push({ name: jointSigner.name, email: jointSigner.email, token: jointSigner.access_token, flow: 'intake' });
          order++;
        }
      }

      const agencyCounterSigner = await EnvelopeSigner.create({
        envelope_id: envelope.id,
        user_id: agencySigner.id,
        role: 'staff_countersign',
        name: agencySigner.name,
        email: agencySigner.email,
        access_token: crypto.randomBytes(24).toString('hex'),
        token_expires_at: expires,
        signer_order: order,
        status: 'pending',
      }, { transaction: tx });
      await addSignatureFields(envelope.id, agencyCounterSigner.id, tx);
      links.push({ name: agencyCounterSigner.name, email: agencyCounterSigner.email, token: agencyCounterSigner.access_token, flow: 'sign' });

      // Owner Management Record
      const [mgmt] = await ShortStayOwnerManagement.findOrCreate({
        where: { property_id },
        defaults: {
          branch_id: property.branch_id,
          property_id,
          primary_owner_contact_id,
          joint_owner_contact_ids,
          revenue_share_percent,
          agreement_envelope_id: envelope.id,
          status: 'pending_signature',
        },
        transaction: tx,
      });

      await mgmt.update({
        primary_owner_contact_id,
        joint_owner_contact_ids,
        revenue_share_percent,
        agreement_envelope_id: envelope.id,
        status: 'pending_signature',
      }, { transaction: tx });

      await tx.commit();
      await emailSigningLinks(links, envelope.title, 'intake');
      return { envelope, owner_management: mgmt };
    } catch (err) {
      await tx.rollback();
      throw err;
    }
  }

  /** Build Guest Tenancy Agreement Envelope */
  async buildGuestAgreement(branchId, userId, bookingId) {
    const booking = await ShortStayBooking.findOne({
      where: { id: bookingId, ...branchWhere(branchId) },
      include: [
        { model: Property, as: 'property' },
        { model: Contact, as: 'lead_guest' },
        { model: ShortStayBookingOccupant, as: 'occupants' },
      ],
    });
    if (!booking) throw httpError(404, 'Booking record not found.');
    if (!booking.lead_guest?.email) throw httpError(400, 'The lead guest must have an email address before an agreement can be sent.');

    const template = await AgreementTemplate.findOne({ where: { name: 'Short-Term Rental Tenancy Management Service Agreement' } });
    if (!template) throw new Error('Guest Tenancy Agreement template not seeded.');

    const agencySigner = await User.findOne({ where: { id: userId, status: 'active' } });
    if (!agencySigner?.email) throw httpError(400, 'An active agency user with an email address is required to countersign the agreement.');
    const terms = {
      agreement_date: new Date().toISOString().slice(0, 10),
      ss_rep_name: agencySigner.name,
      guest_full_name: booking.lead_guest.full_name || 'Guest',
      guest_phone: booking.lead_guest.primary_phone || '',
      guest_email: booking.lead_guest.email || '',
      guest_nid: booking.lead_guest.national_id || booking.lead_guest.passport_no || '',
      guest_address: [booking.lead_guest.address_line1, booking.lead_guest.address_line2, booking.lead_guest.area, booking.lead_guest.city, booking.lead_guest.district].filter(Boolean).join(', '),
      approved_occupants: (booking.occupants || []).map((occupant) => occupant.full_name).filter(Boolean).join(', '),
      booking_code: booking.booking_code,
      property_address: [booking.property.address, booking.property.area, booking.property.city, booking.property.district].filter(Boolean).join(', '),
      check_in_date: booking.check_in_date,
      check_out_date: booking.check_out_date,
      nights_count: booking.nights_count,
      adults_count: booking.adults_count,
      children_count: booking.children_count,
      accommodation_amount: booking.total_accommodation_amount,
      cleaning_fee: booking.cleaning_fee,
      security_deposit_amount: booking.security_deposit_amount,
      total_booking_value: booking.total_booking_value,
      guest_services: ['Furnished Short-Stay Accommodation', 'High-Speed Wi-Fi & Utilities', 'Assisted Check-In & Access Handover', 'Scheduled Turnover Housekeeping', 'Emergency Support & Maintenance Line'],
    };
    const envCode = await generateCode(SigningEnvelope, 'envelope_code', 'SSPC-ENV-');
    const tx = await sequelize.transaction();
    let signingLink = null;

    try {
      const envelope = await SigningEnvelope.create({
        branch_id: booking.branch_id,
        envelope_code: envCode,
        agreement_template_id: template.id,
        related_type: 'short_stay_booking',
        related_id: booking.id,
        title: `Guest Tenancy Agreement — ${booking.booking_code}`,
        document_html: merge(template.content_html || '', terms),
        status: 'sent',
        sent_at: new Date(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        terms,
        kyc_role: 'guest',
        kyc_policy: 'flexible',
        created_by: userId,
      }, { transaction: tx });

      const signer = await EnvelopeSigner.create({
        envelope_id: envelope.id,
        contact_id: booking.lead_guest.id,
        role: 'tenant',
        name: booking.lead_guest.full_name || 'Guest',
        email: booking.lead_guest.email,
        access_token: crypto.randomBytes(24).toString('hex'),
        token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        signer_order: 1,
        status: 'sent',
      }, { transaction: tx });
      await addSignatureFields(envelope.id, signer.id, tx);
      signingLink = { name: signer.name, email: signer.email, token: signer.access_token, flow: 'intake' };

      const agencyCounterSigner = await EnvelopeSigner.create({
        envelope_id: envelope.id,
        user_id: agencySigner.id,
        role: 'staff_countersign',
        name: agencySigner.name,
        email: agencySigner.email,
        access_token: crypto.randomBytes(24).toString('hex'),
        token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        signer_order: 2,
        status: 'pending',
      }, { transaction: tx });
      await addSignatureFields(envelope.id, agencyCounterSigner.id, tx);

      await booking.update({ agreement_envelope_id: envelope.id, status: 'pending_agreement' }, { transaction: tx });

      await tx.commit();
      await emailSigningLinks([
        signingLink,
        { name: agencyCounterSigner.name, email: agencyCounterSigner.email, token: agencyCounterSigner.access_token, flow: 'sign' },
      ], envelope.title, 'intake');
      return envelope;
    } catch (err) {
      await tx.rollback();
      throw err;
    }
  }

  /** Guided Check-In Execution */
  async executeCheckIn(branchId, userId, { booking_id, house_rules_acknowledged, access_notes }) {
    const booking = await ShortStayBooking.findOne({ where: { id: booking_id, ...branchWhere(branchId) } });
    if (!booking) throw httpError(404, 'Booking not found.');
    if (house_rules_acknowledged !== true) throw httpError(400, 'Guest must acknowledge the house rules before check-in.');
    if (!['confirmed', 'ready_checkin'].includes(booking.status)) {
      throw httpError(409, `Cannot execute check-in. Booking status is '${booking.status}' — must be confirmed.`);
    }
    const readiness = await ShortStayReadinessCheck.findOne({ where: { booking_id: booking.id, branch_id: booking.branch_id, check_type: 'pre_arrival', is_passed: true } });
    if (!readiness) throw httpError(409, 'The pre-arrival readiness checklist must be completed before check-in.');

    const tx = await sequelize.transaction();
    try {
      await booking.update({ status: 'checked_in', checkin_notes: access_notes || null }, { transaction: tx });

      // Update property dynamic occupancy status to 'occupied'
      const profile = await ShortStayPropertyProfile.findOne({ where: { property_id: booking.property_id, branch_id: booking.branch_id } });
      if (profile && !profile.is_manual_status_override) {
        await profile.update({ current_occupancy_status: 'occupied' }, { transaction: tx });
      }

      await tx.commit();
      return booking;
    } catch (err) {
      await tx.rollback();
      throw err;
    }
  }

  /** Guided Check-Out Execution */
  async executeCheckOut(branchId, userId, { booking_id, keys_returned, checkout_notes }) {
    const booking = await ShortStayBooking.findOne({ where: { id: booking_id, ...branchWhere(branchId) } });
    if (!booking) throw httpError(404, 'Booking not found.');
    if (booking.status !== 'checked_in') {
      throw httpError(409, `Cannot check out. Booking status is '${booking.status}' — the guest must be checked in first.`);
    }
    if (keys_returned !== true) throw httpError(400, 'Keys and access cards must be confirmed returned before check-out.');
    const readiness = await ShortStayReadinessCheck.findOne({ where: { booking_id: booking.id, branch_id: booking.branch_id, check_type: 'exit_inspection', is_passed: true } });
    if (!readiness) throw httpError(409, 'The exit inspection checklist must be completed before check-out.');

    const tx = await sequelize.transaction();
    try {
      await booking.update({ status: 'checked_out', checkout_notes: checkout_notes || null }, { transaction: tx });

      // Update property dynamic occupancy status to 'available' or 'cleaning'
      const profile = await ShortStayPropertyProfile.findOne({ where: { property_id: booking.property_id, branch_id: booking.branch_id } });
      if (profile && !profile.is_manual_status_override) {
        await profile.update({ current_occupancy_status: 'maintenance_blocked' }, { transaction: tx });
      }

      // Auto-schedule turnover housekeeping task
      await ShortStayHousekeepingTask.create({
        branch_id: booking.branch_id,
        property_id: booking.property_id,
        booking_id: booking.id,
        task_type: 'turnover',
        scheduled_date: new Date().toISOString().split('T')[0],
        status: 'pending',
        cost: profile ? profile.cleaning_fee : 0,
        charge_to: 'owner',
      }, { transaction: tx });

      await tx.commit();
      return booking;
    } catch (err) {
      await tx.rollback();
      throw err;
    }
  }

  /** Availability timeline: every stay property with its blocks/bookings across a date window.
      Powers the Gantt-style calendar — confirmed bookings, owner holds, maintenance/cleaning
      resets and external-platform blocks — plus overlap conflict detection. */
  async getAvailability(branchId, { start, end, property_id } = {}) {
    const whereBranch = branchId ? { branch_id: branchId } : {};
    const startDate = start || new Date().toISOString().slice(0, 10);
    const endDate = end || new Date(Date.now() + 13 * 864e5).toISOString().slice(0, 10);

    const profileWhere = { ...whereBranch };
    if (property_id) profileWhere.property_id = property_id;

    const [profiles, blocks] = await Promise.all([
      ShortStayPropertyProfile.findAll({
        where: profileWhere,
        include: [{ model: Property, as: 'property', attributes: ['id', 'title', 'property_code', 'district'] }],
        order: [['id', 'ASC']],
        raw: false,
      }),
      ShortStayAvailabilityBlock.findAll({
        where: {
          ...whereBranch,
          ...(property_id ? { property_id } : {}),
          // Half-open overlap: block.start < window.end AND block.end > window.start.
          start_date: { [Op.lt]: endDate },
          end_date: { [Op.gt]: startDate },
        },
        include: [{ model: ShortStayBooking, as: 'booking', attributes: ['id', 'booking_code', 'status', 'booking_source', 'adults_count', 'children_count'], include: [{ model: Contact, as: 'lead_guest', attributes: ['id', 'full_name'] }] }],
        order: [['start_date', 'ASC']],
      }),
    ]);

    // Build the day axis
    const days = [];
    for (let d = new Date(startDate); d.toISOString().slice(0, 10) <= endDate; d.setDate(d.getDate() + 1)) {
      days.push(d.toISOString().slice(0, 10));
    }

    const blocksByProp = {};
    for (const raw of blocks) {
      const bl = raw.get({ plain: true });
      const pid = bl.property_id;
      (blocksByProp[pid] = blocksByProp[pid] || []).push({
        id: bl.id,
        start_date: bl.start_date,
        end_date: bl.end_date,
        block_type: bl.block_type,
        booking_id: bl.booking_id,
        booking_code: bl.booking?.booking_code || null,
        booking_status: bl.booking?.status || null,
        source: bl.booking?.booking_source || null,
        guest_name: bl.booking?.lead_guest?.full_name || null,
        pax: bl.booking ? (Number(bl.booking.adults_count || 0) + Number(bl.booking.children_count || 0)) : null,
        notes: bl.notes || null,
      });
    }

    // Overlap conflicts (same property, ranges intersect)
    const conflicts = [];
    for (const pid of Object.keys(blocksByProp)) {
      const arr = blocksByProp[pid].slice().sort((a, b) => a.start_date.localeCompare(b.start_date));
      for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
          if (arr[j].start_date < arr[i].end_date && arr[j].end_date > arr[i].start_date) {
            conflicts.push({ property_id: Number(pid), a: arr[i], b: arr[j] });
          }
        }
      }
    }

    const properties = profiles.map((p) => {
      const plain = p.get({ plain: true });
      return {
        profile_id: plain.id,
        property_id: plain.property_id,
        title: plain.public_headline || plain.property?.title || `Property #${plain.property_id}`,
        area: plain.property?.district || '',
        max_guests: plain.max_guests,
        status: plain.status,
        blocks: blocksByProp[plain.property_id] || [],
      };
    });

    return { start: startDate, end: endDate, days, properties, conflicts };
  }

  /** Booking detail for the guided check-in / check-out desk: occupants, the property
      profile (rules, deposit, times), readiness checks, and the four gating positions
      (verification / payment / agreement / deposit) the front-end renders as blockers. */
  async getBookingDetail(branchId, bookingId) {
    const whereBranch = branchId ? { branch_id: branchId } : {};
    const booking = await ShortStayBooking.findOne({
      where: { id: bookingId, ...whereBranch },
      include: [
        { model: Property, as: 'property', attributes: ['id', 'title', 'property_code', 'district'] },
        { model: Contact, as: 'lead_guest', attributes: ['id', 'full_name', 'primary_phone', 'email'] },
        { model: ShortStayBookingOccupant, as: 'occupants' },
        { model: Folio, as: 'folio', attributes: ['id', 'current_balance', 'deposit_held'] },
      ],
    });
    if (!booking) throw new Error('Booking not found');
    const b = booking.get({ plain: true });

    const [profile, readiness] = await Promise.all([
      ShortStayPropertyProfile.findOne({ where: { property_id: b.property_id, branch_id: b.branch_id }, raw: true }),
      ShortStayReadinessCheck.findAll({ where: { booking_id: b.id, branch_id: b.branch_id }, order: [['id', 'DESC']], raw: true }),
    ]);

    const num = (v) => Number(v || 0);
    const paid = num(b.paid_amount), total = num(b.total_booking_value);
    const depReq = num(b.security_deposit_amount), depPaid = num(b.security_deposit_paid);
    const occVerified = (b.occupants || []).filter((o) => o.verification_status === 'verified').length;

    const gates = {
      verification: ['confirmed', 'ready_checkin', 'checked_in', 'checked_out', 'closed', 'pending_payment'].includes(b.status)
        ? 'verified' : b.status === 'pending_verification' ? 'under_review' : 'submitted',
      payment: { paid, total, due: Math.max(0, total - paid), status: total > 0 && paid >= total ? 'paid' : paid > 0 ? 'part_paid' : 'unpaid' },
      agreement: ['confirmed', 'ready_checkin', 'checked_in', 'checked_out', 'closed'].includes(b.status)
        ? 'signed' : b.agreement_envelope_id ? 'sent' : 'draft',
      deposit: { required: depReq, paid: depPaid, held: num(b.folio?.deposit_held), satisfied: depReq === 0 || depPaid >= depReq },
      occupants: { total: (b.occupants || []).length, verified: occVerified },
    };

    return { ...b, profile, readiness, gates };
  }

  /** Short Term Stay module settings — default rates/fees, check-in policy, house rules and the
      turnover checklist template that new listings prefill from. Stored as one JSON blob in
      system_settings so no extra table is needed; merged over module defaults on read. */
  async getSettings(branchId) {
    const row = (branchId ? await SystemSetting.findOne({ where: { setting_key: settingsKeyFor(branchId) } }) : null)
      || await SystemSetting.findOne({ where: { setting_key: STR_SETTINGS_KEY } });
    const saved = parseJsonObject(row?.setting_value);
    return {
      rates: { ...STR_DEFAULT_SETTINGS.rates, ...parseJsonObject(saved.rates) },
      policy: { ...STR_DEFAULT_SETTINGS.policy, ...parseJsonObject(saved.policy) },
      house_rules: Array.isArray(saved.house_rules) ? saved.house_rules : STR_DEFAULT_SETTINGS.house_rules,
      turnover_checklist: Array.isArray(saved.turnover_checklist) ? saved.turnover_checklist : STR_DEFAULT_SETTINGS.turnover_checklist,
      checkin_checklist: Array.isArray(saved.checkin_checklist) ? saved.checkin_checklist : STR_DEFAULT_SETTINGS.checkin_checklist,
      checkout_checklist: Array.isArray(saved.checkout_checklist) ? saved.checkout_checklist : STR_DEFAULT_SETTINGS.checkout_checklist,
      property_readiness_checklist: Array.isArray(saved.property_readiness_checklist) ? saved.property_readiness_checklist : STR_DEFAULT_SETTINGS.property_readiness_checklist,
    };
  }

  async saveSettings(branchId, payload = {}) {
    if (!branchId) throw httpError(400, 'A branch is required for Short Term Stay settings.');
    const current = await this.getSettings(branchId);
    const merged = {
      rates: { ...current.rates, ...parseJsonObject(payload.rates) },
      policy: { ...current.policy, ...parseJsonObject(payload.policy) },
      house_rules: Array.isArray(payload.house_rules) ? payload.house_rules : current.house_rules,
      turnover_checklist: Array.isArray(payload.turnover_checklist) ? payload.turnover_checklist : current.turnover_checklist,
      checkin_checklist: Array.isArray(payload.checkin_checklist) ? payload.checkin_checklist : current.checkin_checklist,
      checkout_checklist: Array.isArray(payload.checkout_checklist) ? payload.checkout_checklist : current.checkout_checklist,
      property_readiness_checklist: Array.isArray(payload.property_readiness_checklist) ? payload.property_readiness_checklist : current.property_readiness_checklist,
    };
    const value = JSON.stringify(merged);
    const settingKey = settingsKeyFor(branchId);
    const row = await SystemSetting.findOne({ where: { setting_key: settingKey } });
    if (row) await row.update({ setting_value: value });
    else await SystemSetting.create({ setting_key: settingKey, setting_value: value, description: `Short Term Stay defaults for branch ${branchId}`, category: 'short_stay' });
    return merged;
  }

  /** Qualify an enquiry — advance a raw enquiry to a held reservation ready for conversion. */
  async qualifyEnquiry(branchId, { booking_id, source_record }) {
    const whereBranch = branchId ? { branch_id: branchId } : {};
    if (source_record === 'website_enquiry') {
      const enquiry = await ShortStayEnquiry.findOne({ where: { id: booking_id, ...whereBranch } });
      if (!enquiry) throw httpError(404, 'Website enquiry not found.');
      if (!['new', 'contacted', 'quoted'].includes(enquiry.status)) throw httpError(409, `Cannot qualify an enquiry in '${enquiry.status}' state.`);
      if (enquiry.status === 'new') await enquiry.update({ status: 'contacted' });
      return enquiry;
    }
    const booking = await ShortStayBooking.findOne({ where: { id: booking_id, ...whereBranch } });
    if (!booking) throw new Error('Enquiry not found');
    if (!['enquiry', 'hold'].includes(booking.status)) throw new Error(`Cannot qualify a booking in '${booking.status}' state.`);
    await booking.update({ status: 'hold' });
    return booking;
  }

  async convertPublicEnquiry(branchId, userId, enquiryId) {
    const enquiry = await ShortStayEnquiry.findOne({
      where: { id: enquiryId, ...branchWhere(branchId), status: { [Op.in]: ['new', 'contacted', 'quoted'] } },
      include: [{ model: ShortStayPropertyProfile, as: 'profile' }],
    });
    if (!enquiry) throw httpError(404, 'Open website enquiry not found.');
    if (!enquiry.profile || !enquiry.property_id) throw httpError(409, 'The requested short-stay property is no longer available.');

    const contactWhere = [];
    if (enquiry.guest_email) contactWhere.push({ email: enquiry.guest_email });
    if (enquiry.guest_phone) contactWhere.push({ primary_phone: enquiry.guest_phone });
    let contact = contactWhere.length ? await Contact.findOne({
      where: { branch_id: enquiry.branch_id, [Op.or]: contactWhere },
    }) : null;
    if (!contact) {
      contact = await Contact.create({
        branch_id: enquiry.branch_id,
        contact_code: await generateCode(Contact, 'contact_code', 'SSPC-CT-'),
        contact_type: 'individual',
        full_name: enquiry.guest_name,
        primary_phone: enquiry.guest_phone || null,
        email: enquiry.guest_email || null,
        source: 'short_stay_website',
        source_detail: `Website enquiry WEB-${String(enquiry.id).padStart(6, '0')}`,
        tags: ['short_stay_guest'],
        status: 'active',
        created_by: userId || null,
      });
    }

    const booking = await this.createBooking(enquiry.branch_id, userId, {
      property_id: enquiry.property_id,
      lead_guest_contact_id: contact.id,
      booking_source: 'website',
      external_reference: `WEB-${String(enquiry.id).padStart(6, '0')}`,
      check_in_date: enquiry.check_in_date,
      check_out_date: enquiry.check_out_date,
      adults_count: enquiry.adults_count,
      children_count: enquiry.children_count,
    });
    await enquiry.update({ status: 'converted' });
    return booking;
  }

  /** One readiness row per (booking, check_type). Returns saved checklist + photos, or a fresh
      checklist built from the admin-managed template when nothing is saved yet. */
  async getReadiness(branchId, bookingId, checkType = 'pre_arrival') {
    const whereBranch = branchId ? { branch_id: branchId } : {};
    const booking = await ShortStayBooking.findOne({
      where: { id: bookingId, ...whereBranch },
      include: [
        { model: Property, as: 'property', attributes: ['id', 'title', 'district'] },
        { model: Contact, as: 'lead_guest', attributes: ['id', 'full_name'] },
      ],
    });
    if (!booking) throw new Error('Booking not found');
    // NB: no raw:true — the model's JSON getters must run so checklist_data/photos come back parsed.
    const row = await ShortStayReadinessCheck.findOne({ where: { booking_id: bookingId, check_type: checkType, branch_id: booking.branch_id }, order: [['id', 'DESC']] });

    let items, notes = '', photos = [], is_passed = false, id = null;
    if (row) {
      let cd = row.checklist_data || {};
      if (typeof cd === 'string') { try { cd = JSON.parse(cd); } catch { cd = {}; } }
      items = Array.isArray(cd.items) ? cd.items : [];
      notes = cd.notes || '';
      photos = Array.isArray(row.photos) ? row.photos : [];
      is_passed = !!row.is_passed;
      id = row.id;
    }
    // No saved items yet → seed from the settings template (all unchecked)
    if (!items || !items.length) {
      const settings = await this.getSettings(booking.branch_id);
      const template = checkType === 'exit_inspection' ? settings.checkout_checklist : settings.checkin_checklist;
      items = template.map((label) => ({ label, done: false }));
    }
    return {
      id, booking_id: booking.id, booking_code: booking.booking_code, check_type: checkType,
      guest_name: booking.lead_guest?.full_name || `Guest #${booking.lead_guest_contact_id}`,
      property_title: booking.property?.title || `#${booking.property_id}`,
      check_in_date: booking.check_in_date, check_out_date: booking.check_out_date, status: booking.status,
      items, notes, photos, is_passed,
    };
  }

  /** Upsert the readiness snapshot for a (booking, check_type) — powers checklist toggles,
      photo uploads and "Save progress". */
  async saveReadiness(branchId, userId, { booking_id, check_type = 'pre_arrival', items = [], notes = '', photos = [], is_passed = false }) {
    if (is_passed && (!Array.isArray(items) || !items.length || items.some((item) => !item.done))) {
      throw httpError(400, 'Every checklist item must be completed before the readiness check can pass.');
    }
    return sequelize.transaction(async (transaction) => {
      const booking = await ShortStayBooking.findOne({
        where: { id: booking_id, ...branchWhere(branchId) },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!booking) throw httpError(404, 'Booking not found.');
      const existing = await ShortStayReadinessCheck.findOne({
        where: { booking_id, check_type, branch_id: booking.branch_id },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      const values = {
        branch_id: booking.branch_id,
        property_id: booking.property_id,
        booking_id,
        check_type,
        checklist_data: { items, notes },
        photos,
        completed_by_user_id: userId || null,
        is_passed: !!is_passed,
        completed_at: is_passed ? new Date() : null,
      };
      if (existing) return existing.update(values, { transaction });
      return ShortStayReadinessCheck.create(values, { transaction });
    });
  }

  /** The check-in / check-out board — every operational booking with its arrival & departure
      completion state and checklist progress. */
  async getCheckInOutBoard(branchId, propertyId) {
    const whereBranch = branchId ? { branch_id: branchId } : {};
    const propertyWhere = propertyId ? { property_id: propertyId } : {};
    const OPS = ['confirmed', 'ready_checkin', 'checked_in', 'checked_out', 'inspection_pending'];
    const [bookings, checks, settings] = await Promise.all([
      ShortStayBooking.findAll({
        where: { ...whereBranch, ...propertyWhere, status: { [Op.in]: OPS } },
        include: [
          { model: Property, as: 'property', attributes: ['id', 'title', 'district'] },
          { model: Contact, as: 'lead_guest', attributes: ['id', 'full_name'] },
        ],
        order: [['check_in_date', 'ASC']],
      }),
      ShortStayReadinessCheck.findAll({ where: { ...whereBranch, ...propertyWhere }, order: [['id', 'DESC']] }),
      this.getSettings(branchId),
    ]);
    const inTotal = settings.checkin_checklist.length;
    const outTotal = settings.checkout_checklist.length;
    const parseCd = (row) => { let cd = row?.checklist_data || {}; if (typeof cd === 'string') { try { cd = JSON.parse(cd); } catch { cd = {}; } } return cd; };
    const latest = {}; // `${booking}:${type}` → row (first seen = newest due to DESC order)
    for (const c of checks) { const k = `${c.booking_id}:${c.check_type}`; if (!latest[k]) latest[k] = c; }
    const prog = (row, fallbackTotal) => {
      const items = parseCd(row).items || [];
      const total = items.length || fallbackTotal;
      const done = items.filter((i) => i.done).length;
      const photos = Array.isArray(row?.photos) ? row.photos.length : 0;
      return { done, total, photos, saved: !!row };
    };
    return bookings.map((r) => {
      const b = r.get({ plain: true });
      const ci = latest[`${b.id}:pre_arrival`];
      const co = latest[`${b.id}:exit_inspection`];
      return {
        booking_id: b.id, booking_code: b.booking_code,
        guest_name: b.lead_guest?.full_name || `Guest #${b.lead_guest_contact_id}`,
        property_title: b.property?.title || `#${b.property_id}`, area: b.property?.district || '',
        check_in_date: b.check_in_date, check_out_date: b.check_out_date, status: b.status,
        pax: Number(b.adults_count || 0) + Number(b.children_count || 0),
        checkin: { complete: ['checked_in', 'checked_out', 'inspection_pending', 'closed'].includes(b.status), ...prog(ci, inTotal) },
        checkout: { complete: ['checked_out', 'inspection_pending', 'closed'].includes(b.status), applicable: b.status !== 'confirmed' && b.status !== 'ready_checkin', ...prog(co, outTotal) },
      };
    });
  }

  // ── Phase 2 read models ──────────────────────────────────────

  /** Enquiries: bookings still in the enquiry / hold pre-qualification stage. */
  async getEnquiries(branchId, propertyId) {
    const whereBranch = branchId ? { branch_id: branchId } : {};
    const [rows, websiteRows] = await Promise.all([
      ShortStayBooking.findAll({
        where: { ...whereBranch, ...(propertyId ? { property_id: propertyId } : {}), status: { [Op.in]: ['enquiry', 'hold'] } },
        include: [
          { model: Property, as: 'property', attributes: ['id', 'title', 'district'] },
          { model: Contact, as: 'lead_guest', attributes: ['id', 'full_name', 'primary_phone', 'email'] },
        ],
        order: [['id', 'DESC']],
      }),
      ShortStayEnquiry.findAll({
        where: { ...whereBranch, ...(propertyId ? { property_id: propertyId } : {}), status: { [Op.in]: ['new', 'contacted', 'quoted'] } },
        include: [{ model: Property, as: 'property', attributes: ['id', 'title', 'district'] }],
        order: [['id', 'DESC']],
      }).catch(() => []),
    ]);
    const bookingRows = rows.map((r) => {
      const b = r.get({ plain: true });
      return {
        id: b.id, booking_code: b.booking_code,
        guest_name: b.lead_guest?.full_name || `Guest #${b.lead_guest_contact_id}`,
        contact: b.lead_guest?.primary_phone || b.lead_guest?.email || '—',
        check_in_date: b.check_in_date, check_out_date: b.check_out_date,
        adults_count: b.adults_count, children_count: b.children_count,
        property_interest: b.property?.title || null,
        source: b.booking_source, status: b.status,
        total_booking_value: b.total_booking_value, security_deposit_amount: b.security_deposit_amount,
        source_record: 'booking',
      };
    });
    const publicRows = websiteRows.map((r) => {
      const enquiry = r.get({ plain: true });
      return {
        id: enquiry.id,
        booking_code: `WEB-${String(enquiry.id).padStart(6, '0')}`,
        guest_name: enquiry.guest_name,
        contact: enquiry.guest_phone || enquiry.guest_email || '—',
        check_in_date: enquiry.check_in_date,
        check_out_date: enquiry.check_out_date,
        adults_count: enquiry.adults_count,
        children_count: enquiry.children_count,
        property_interest: enquiry.property?.title || null,
        source: 'website',
        status: enquiry.status,
        total_booking_value: enquiry.quoted_amount,
        security_deposit_amount: 0,
        source_record: 'website_enquiry',
        message: enquiry.message,
      };
    });
    return [...publicRows, ...bookingRows];
  }

  /** Guests directory: the party behind each live booking, with its verification position. */
  async getGuests(branchId) {
    const whereBranch = branchId ? { branch_id: branchId } : {};
    const rows = await ShortStayBooking.findAll({
      where: { ...whereBranch, status: { [Op.notIn]: ['cancelled', 'closed', 'enquiry'] } },
      include: [
        { model: Property, as: 'property', attributes: ['id', 'title', 'district'] },
        { model: Contact, as: 'lead_guest', attributes: ['id', 'full_name', 'primary_phone', 'email'] },
        { model: ShortStayBookingOccupant, as: 'occupants', attributes: ['id', 'verification_status', 'is_adult'] },
      ],
      order: [['check_in_date', 'ASC']],
    });
    return rows.map((r) => {
      const b = r.get({ plain: true });
      const verified = (b.occupants || []).filter((o) => o.verification_status === 'verified').length;
      const verification = ['confirmed', 'ready_checkin', 'checked_in', 'checked_out', 'pending_payment'].includes(b.status)
        ? 'verified' : b.status === 'pending_verification' ? 'under_review' : 'submitted';
      return {
        booking_id: b.id, booking_code: b.booking_code,
        guest_name: b.lead_guest?.full_name || `Guest #${b.lead_guest_contact_id}`,
        contact: b.lead_guest?.primary_phone || b.lead_guest?.email || '—',
        property_title: b.property?.title || `#${b.property_id}`,
        party_size: Number(b.adults_count || 0) + Number(b.children_count || 0),
        occupants_total: (b.occupants || []).length, occupants_verified: verified,
        verification, status: b.status, stay: { check_in: b.check_in_date, check_out: b.check_out_date },
      };
    });
  }

  // Map an envelope's signer rows + a lifecycle status to the 6-step signing progress the cards render
  _stepper(status, signers) {
    const STAGES = ['draft', 'prepared', 'sent', 'viewed', 'partially_signed', 'completed'];
    const anySigned = signers.some((s) => s.status === 'signed');
    const allSigned = signers.length > 0 && signers.every((s) => s.status === 'signed');
    const anyViewed = signers.some((s) => ['viewed', 'signed'].includes(s.status));
    let stage = 'draft';
    if (allSigned || status === 'active' || status === 'completed') stage = 'completed';
    else if (anySigned) stage = 'partially_signed';
    else if (anyViewed) stage = 'viewed';
    else if (status === 'pending_signature' || status === 'sent' || signers.some((s) => s.status === 'sent')) stage = 'sent';
    else if (status === 'draft') stage = 'draft';
    return { stage, index: STAGES.indexOf(stage), stages: STAGES };
  }

  /** Owner (management) agreements with their signing progress. */
  async getOwnerAgreements(branchId) {
    const whereBranch = branchId ? { branch_id: branchId } : {};
    const rows = await ShortStayOwnerManagement.findAll({
      where: whereBranch,
      include: [
        { model: Property, as: 'property', attributes: ['id', 'title'] },
        { model: Contact, as: 'primary_owner', attributes: ['id', 'full_name', 'company_name'] },
        { model: SigningEnvelope, as: 'envelope', include: [{ model: EnvelopeSigner, as: 'signers' }] },
      ],
      order: [['id', 'DESC']],
    });
    return rows.map((r) => {
      const m = r.get({ plain: true });
      const signers = (m.envelope?.signers || []).map((s) => ({ name: s.name, role: s.role, status: s.status, signed_at: s.signed_at, viewed_at: s.viewed_at }));
      return {
        id: m.id, envelope_id: m.envelope?.id || null,
        code: m.envelope?.envelope_code || `OA-${String(m.id).padStart(4, '0')}`,
        title: `Owner Management Agreement · ${m.property?.title || `#${m.property_id}`}`,
        subtitle: `${m.primary_owner?.full_name || m.primary_owner?.company_name || 'Owner'} · ${m.revenue_share_percent}% management fee`,
        owner_name: m.primary_owner?.full_name || m.primary_owner?.company_name || null,
        status: m.status, signers, sent_at: m.envelope?.sent_at || null,
        progress: this._stepper(m.status, signers),
      };
    });
  }

  /** Guest stay agreements with their signing progress. */
  async getGuestAgreements(branchId) {
    const whereBranch = branchId ? { branch_id: branchId } : {};
    const rows = await ShortStayBooking.findAll({
      where: { ...whereBranch, agreement_envelope_id: { [Op.ne]: null } },
      include: [
        { model: Property, as: 'property', attributes: ['id', 'title'] },
        { model: Contact, as: 'lead_guest', attributes: ['id', 'full_name'] },
        { model: SigningEnvelope, as: 'envelope', include: [{ model: EnvelopeSigner, as: 'signers' }] },
      ],
      order: [['id', 'DESC']],
    });
    return rows.map((r) => {
      const b = r.get({ plain: true });
      const signers = (b.envelope?.signers || []).map((s) => ({ name: s.name, role: s.role, status: s.status, signed_at: s.signed_at, viewed_at: s.viewed_at }));
      const envStatus = ['confirmed', 'ready_checkin', 'checked_in', 'checked_out', 'closed'].includes(b.status) ? 'active' : (b.envelope?.status || 'sent');
      return {
        id: b.id, envelope_id: b.envelope?.id || null,
        code: b.envelope?.envelope_code || `GA-${String(b.id).padStart(4, '0')}`,
        title: `Guest Stay Agreement · ${b.booking_code} ${b.property?.title || ''}`.trim(),
        subtitle: `${b.lead_guest?.full_name || 'Guest'} · ${b.check_in_date} → ${b.check_out_date}`,
        guest_name: b.lead_guest?.full_name || null,
        status: envStatus, signers, sent_at: b.envelope?.sent_at || null,
        progress: this._stepper(envStatus, signers),
      };
    });
  }

  /** Payments & charges: KPI band + a settlement table derived from bookings and their folios. */
  async getPayments(branchId, propertyId) {
    const whereBranch = branchId ? { branch_id: branchId } : {};
    const num = (v) => Number(v || 0);
    const monthStart = new Date(); monthStart.setDate(1); const ms = monthStart.toISOString().slice(0, 10);
    const bookings = await ShortStayBooking.findAll({
      where: { ...whereBranch, ...(propertyId ? { property_id: propertyId } : {}) },
      include: [{ model: Property, as: 'property', attributes: ['id', 'title'] }, { model: Contact, as: 'lead_guest', attributes: ['id', 'full_name'] }],
      order: [['id', 'DESC']],
    });
    const b = bookings.map((x) => x.get({ plain: true }));
    const active = b.filter((x) => x.status !== 'cancelled');

    const kpi = {
      due_from_guests: active.reduce((s, x) => s + Math.max(0, num(x.total_booking_value) - num(x.paid_amount)), 0),
      due_count: active.filter((x) => num(x.paid_amount) < num(x.total_booking_value)).length,
      deposits_held: b.filter((x) => ['confirmed', 'ready_checkin', 'checked_in'].includes(x.status)).reduce((s, x) => s + num(x.security_deposit_paid), 0),
      deposits_count: b.filter((x) => ['confirmed', 'ready_checkin', 'checked_in'].includes(x.status) && num(x.security_deposit_paid) > 0).length,
      collected_this_month: b.filter((x) => (x.check_in_date || '') >= ms).reduce((s, x) => s + num(x.paid_amount), 0),
      refunds_pending: b.filter((x) => x.status === 'cancelled').reduce((s, x) => s + num(x.paid_amount) + num(x.security_deposit_paid), 0),
      refunds_count: b.filter((x) => x.status === 'cancelled' && (num(x.paid_amount) + num(x.security_deposit_paid)) > 0).length,
      owner_payouts_due: 0, // filled from statements aggregate below
    };

    const charges = [];
    for (const x of active) {
      const due = Math.max(0, num(x.total_booking_value) - num(x.paid_amount));
      charges.push({
        booking_code: x.booking_code, guest: x.lead_guest?.full_name || `#${x.lead_guest_contact_id}`, property: x.property?.title || `#${x.property_id}`,
        charge_type: 'Accommodation balance', amount: num(x.total_booking_value),
        status: due === 0 ? 'paid' : num(x.paid_amount) > 0 ? 'part_paid' : 'unpaid', settled: due === 0, due,
      });
      if (num(x.security_deposit_amount) > 0) {
        charges.push({
          booking_code: x.booking_code, guest: x.lead_guest?.full_name || `#${x.lead_guest_contact_id}`, property: x.property?.title || `#${x.property_id}`,
          charge_type: 'Security deposit', amount: num(x.security_deposit_amount),
          status: num(x.security_deposit_paid) >= num(x.security_deposit_amount) ? 'held' : 'unpaid', settled: num(x.security_deposit_paid) >= num(x.security_deposit_amount), due: Math.max(0, num(x.security_deposit_amount) - num(x.security_deposit_paid)),
        });
      }
    }
    const statements = await this.getOwnerStatements(branchId, propertyId);
    kpi.owner_payouts_due = statements.reduce((s, st) => s + Math.max(0, num(st.owner_payable)), 0);
    return { kpi, charges };
  }

  /** Owner statements: revenue, fees and payable per owner for the current period. */
  async getOwnerStatements(branchId, propertyId, { start, end } = {}) {
    const whereBranch = branchId ? { branch_id: branchId } : {};
    const whereProperty = propertyId ? { property_id: propertyId } : {};
    const num = (v) => Number(v || 0);
    const now = new Date();
    const defaultStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
    const defaultEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);
    const periodStart = start || defaultStart;
    const periodEnd = end || defaultEnd;
    validateStayDates(periodStart, periodEnd);
    const periodLabel = `${periodStart} to ${periodEnd}`;

    const [managements, bookings, housekeeping, incidents, persisted] = await Promise.all([
      ShortStayOwnerManagement.findAll({ where: { ...whereBranch, ...whereProperty }, include: [{ model: Contact, as: 'primary_owner', attributes: ['id', 'full_name', 'company_name'] }, { model: Property, as: 'property', attributes: ['id', 'title'] }] }),
      ShortStayBooking.findAll({ where: { ...whereBranch, ...whereProperty, status: { [Op.notIn]: ['cancelled', 'enquiry', 'hold'] }, check_in_date: { [Op.lt]: periodEnd }, check_out_date: { [Op.gt]: periodStart } }, raw: true }),
      ShortStayHousekeepingTask.findAll({ where: { ...whereBranch, ...whereProperty, charge_to: 'owner', scheduled_date: { [Op.gte]: periodStart, [Op.lt]: periodEnd } }, raw: true }),
      ShortStayIncident.findAll({ where: { ...whereBranch, ...whereProperty, createdAt: { [Op.gte]: new Date(`${periodStart}T00:00:00Z`), [Op.lt]: new Date(`${periodEnd}T00:00:00Z`) } }, raw: true }),
      OwnerStatement.findAll({
        where: { ...whereBranch, period_start: periodStart, period_end: periodEnd, notes: 'Short Term Stay owner statement' },
        raw: true,
      }),
    ]);

    const revByProp = {}, hkByProp = {}, incByProp = {};
    for (const bk of bookings) revByProp[bk.property_id] = (revByProp[bk.property_id] || 0) + recognizedBookingRevenue(bk, periodStart, periodEnd);
    for (const h of housekeeping) hkByProp[h.property_id] = (hkByProp[h.property_id] || 0) + num(h.cost);
    for (const i of incidents) incByProp[i.property_id] = (incByProp[i.property_id] || 0) + (num(i.deduct_from_deposit_amount) === 0 ? num(i.estimated_cost) : 0);

    // group by owner
    const byOwner = {};
    for (const r of managements) {
      const m = r.get({ plain: true });
      const key = m.primary_owner_contact_id;
      const revenue = revByProp[m.property_id] || 0;
      const expenses = (hkByProp[m.property_id] || 0) + (incByProp[m.property_id] || 0);
      const fee = revenue * (num(m.revenue_share_percent) / 100);
      const payable = revenue - fee - expenses;
      if (!byOwner[key]) byOwner[key] = { owner_contact_id: key, owner_name: m.primary_owner?.full_name || m.primary_owner?.company_name || 'Owner', properties: [], property_ids: [], revenue: 0, expenses: 0, fees: 0, owner_payable: 0, revenue_share_percent: num(m.revenue_share_percent) };
      const o = byOwner[key];
      o.properties.push(m.property?.title || `#${m.property_id}`);
      o.property_ids.push(m.property_id);
      o.revenue += revenue; o.expenses += expenses; o.fees += fee; o.owner_payable += payable;
    }
    return Object.values(byOwner).map((o) => {
      const saved = persisted.find((statement) => Number(statement.owner_contact_id) === Number(o.owner_contact_id)
        && (!propertyId || Number(statement.property_id) === Number(propertyId)));
      return {
       owner_contact_id: o.owner_contact_id,
       property_ids: o.property_ids,
       owner_name: o.owner_name,
       property_label: o.properties.length === 1 ? o.properties[0] : `${o.properties.length} properties`,
       period: periodLabel, booking_revenue: o.revenue, expenses: o.expenses, management_fees: o.fees,
       revenue_share_percent: o.revenue_share_percent, owner_payable: o.owner_payable,
       statement_id: saved?.id || null,
       statement_code: saved?.statement_code || null,
       payment_status: saved?.status || (o.revenue === 0 && o.expenses === 0 ? 'no_activity' : o.owner_payable < 0 ? 'owner_owes' : 'pending'),
      };
    });
  }

  async generateOwnerStatements(branchId, userId, { start, end, property_id } = {}) {
    if (!branchId) throw httpError(400, 'Select a branch before generating owner statements.');
    const now = new Date();
    const periodStart = start || new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
    const periodEnd = end || new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);
    const calculated = await this.getOwnerStatements(branchId, property_id, { start: periodStart, end: periodEnd });
    if (!calculated.length) return [];
    validateStayDates(periodStart, periodEnd);
    const periodLabel = `STS-${periodStart.replace(/-/g, '')}-${periodEnd.replace(/-/g, '')}`;
    const generated = [];
    for (const row of calculated) {
      const statementPropertyId = row.property_ids.length === 1 ? row.property_ids[0] : null;
      const values = {
        branch_id: branchId,
        owner_contact_id: row.owner_contact_id,
        property_id: statementPropertyId,
        period_label: periodLabel,
        period_start: periodStart,
        period_end: periodEnd,
        rent_collected: row.booking_revenue,
        total_credits: row.booking_revenue,
        management_fee: row.management_fees,
        maintenance_deductions: row.expenses,
        total_deductions: row.management_fees + row.expenses,
        net_disbursement: row.owner_payable,
        closing_balance: row.owner_payable,
        line_items: [
          { source: 'short_stay', type: 'booking_revenue', description: 'Earned and collected booking revenue', amount: row.booking_revenue },
          { source: 'short_stay', type: 'management_fee', description: 'Short-stay management fee', amount: -row.management_fees },
          { source: 'short_stay', type: 'owner_expenses', description: 'Housekeeping and incident expenses', amount: -row.expenses },
        ],
        generated_by: userId || null,
        generated_at: new Date(),
        notes: 'Short Term Stay owner statement',
        status: 'ready',
      };
      let statement = await OwnerStatement.findOne({
        where: { branch_id: branchId, owner_contact_id: row.owner_contact_id, property_id: statementPropertyId, period_start: periodStart, period_end: periodEnd },
      });
      if (statement && ['sent', 'paid', 'closed'].includes(statement.status)) {
        generated.push(statement);
        continue;
      }
      if (statement) await statement.update(values);
      else statement = await OwnerStatement.create({ ...values, statement_code: await generateCode(OwnerStatement, 'statement_code', 'SSPC-OS-') });
      generated.push(statement);
    }
    return generated;
  }

  async updateOwnerStatementStatus(branchId, statementId, data) {
    const allowed = ['sent', 'paid', 'closed'];
    if (!allowed.includes(data.status)) throw httpError(400, 'Statement status must be sent, paid, or closed.');
    return sequelize.transaction(async (transaction) => {
      const statement = await OwnerStatement.findOne({
        where: { id: statementId, ...branchWhere(branchId), notes: 'Short Term Stay owner statement' },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!statement) throw httpError(404, 'Short Term Stay owner statement not found.');
      const transitions = { ready: ['sent'], sent: ['paid', 'closed'], paid: ['closed'], closed: [] };
      if (!(transitions[statement.status] || []).includes(data.status)) throw httpError(409, `A '${statement.status}' statement cannot move directly to '${data.status}'.`);
      const patch = { status: data.status };
      if (data.status === 'sent') {
        patch.sent_at = new Date();
        patch.sent_channel = data.sent_channel || 'email';
        patch.sent_evidence_url = data.sent_evidence_url || null;
      }
      if (data.status === 'paid') {
        if (numberOrZero(statement.net_disbursement) <= 0) throw httpError(409, 'Statements without a positive owner disbursement cannot be marked paid.');
        if (!String(data.disbursement_reference || '').trim()) throw httpError(400, 'A disbursement reference is required to mark a statement paid.');
        patch.disbursement_date = data.disbursement_date || new Date().toISOString().slice(0, 10);
        patch.disbursement_reference = String(data.disbursement_reference).trim();
        patch.disbursement_method = data.disbursement_method || 'bank_transfer';
      }
      return statement.update(patch, { transaction });
    });
  }

  /** Reports: headline operational + financial metrics for the report grid. */
  async getReports(branchId, { start, end, property_id } = {}) {
    const whereBranch = branchId ? { branch_id: branchId } : {};
    const whereProperty = property_id ? { property_id } : {};
    const num = (v) => Number(v || 0);
    const now = new Date();
    const periodStart = start || new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
    const periodEnd = end || new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);
    validateStayDates(periodStart, periodEnd);
    const [profiles, bookings, housekeeping, incidents, statements] = await Promise.all([
      ShortStayPropertyProfile.findAll({ where: { ...whereBranch, ...whereProperty }, raw: true }),
      ShortStayBooking.findAll({ where: { ...whereBranch, ...whereProperty, check_in_date: { [Op.lt]: periodEnd }, check_out_date: { [Op.gt]: periodStart } }, raw: true }),
      ShortStayHousekeepingTask.findAll({ where: { ...whereBranch, ...whereProperty, scheduled_date: { [Op.gte]: periodStart, [Op.lt]: periodEnd } }, raw: true }),
      ShortStayIncident.findAll({ where: { ...whereBranch, ...whereProperty, createdAt: { [Op.gte]: new Date(`${periodStart}T00:00:00Z`), [Op.lt]: new Date(`${periodEnd}T00:00:00Z`) } }, raw: true }),
      this.getOwnerStatements(branchId, property_id, { start: periodStart, end: periodEnd }),
    ]);
    const active = bookings.filter((x) => REVENUE_STATUSES.includes(x.status));
    const propertyRevenue = {};
    let occupiedNights = 0;
    for (const booking of active) {
      const earned = recognizedBookingRevenue(booking, periodStart, periodEnd);
      propertyRevenue[booking.property_id] = (propertyRevenue[booking.property_id] || 0) + earned;
      occupiedNights += overlapNights(booking.check_in_date, booking.check_out_date, periodStart, periodEnd);
    }
    const revenue = Object.values(propertyRevenue).reduce((sum, amount) => sum + amount, 0);
    const periodNights = overlapNights(periodStart, periodEnd, periodStart, periodEnd);
    const availableNights = profiles.length * periodNights;
    const adr = occupiedNights ? revenue / occupiedNights : 0;
    const arrivals = active.filter((x) => x.check_in_date >= periodStart && x.check_in_date < periodEnd).length;
    const departures = active.filter((x) => x.check_out_date >= periodStart && x.check_out_date < periodEnd).length;
    const direct = active.filter((x) => x.booking_source === 'direct').length;
    const signed = active.filter((x) => ['confirmed', 'ready_checkin', 'checked_in', 'checked_out', 'closed'].includes(x.status)).length;
    const cancelled = bookings.filter((x) => x.status === 'cancelled').length;
    const hkDone = housekeeping.filter((h) => h.status === 'completed').length;
    const openInc = incidents.filter((i) => ['reported', 'investigating'].includes(i.status)).length;
    const pct = (n, d) => (d > 0 ? Math.round((n / d) * 100) : 0);
    const topProperty = Object.entries(propertyRevenue).sort((a, b) => b[1] - a[1])[0];
    const topProfile = topProperty ? profiles.find((profile) => String(profile.property_id) === String(topProperty[0])) : null;

    return [
      { group: 'Occupancy', title: 'Occupancy & ADR', sub: `ADR ${Math.round(adr).toLocaleString('en-BD')}`, value: `${pct(occupiedNights, availableNights)}%` },
      { group: 'Movements', title: 'Arrivals & departures', sub: `${arrivals} arrivals · ${departures} departures`, value: `${arrivals + departures}` },
      { group: 'Revenue', title: 'Booking revenue', sub: 'Earned and collected in period', value: revenue },
      { group: 'Revenue', title: 'Revenue by property', sub: topProfile?.public_headline || (topProperty ? `Property #${topProperty[0]}` : 'No earned revenue'), value: topProperty ? topProperty[1] : 0, breakdown: propertyRevenue },
      { group: 'Revenue', title: 'Booking source', sub: 'Direct vs platform mix', value: `${pct(direct, active.length)}% direct` },
      { group: 'Risk', title: 'Cancellations', sub: 'Cancelled vs total', value: `${pct(cancelled, bookings.length)}%` },
      { group: 'Compliance', title: 'Agreements', sub: 'Signed guest agreements', value: `${pct(signed, active.length)}%` },
      { group: 'Finance', title: 'Deposits', sub: 'Held across active stays', value: bookings.reduce((s, x) => s + num(x.security_deposit_paid), 0) },
      { group: 'Operations', title: 'Housekeeping', sub: 'Tasks completed', value: `${pct(hkDone, housekeeping.length)}%` },
      { group: 'Operations', title: 'Incidents', sub: 'Currently open', value: `${openInc}` },
      { group: 'Owner', title: 'Owner fees', sub: 'Management fees earned', value: statements.reduce((s, st) => s + num(st.management_fees), 0) },
      { group: 'Owner', title: 'Payouts', sub: 'Owner payable this period', value: statements.reduce((s, st) => s + Math.max(0, num(st.owner_payable)), 0) },
    ];
  }
}

module.exports = new ShortTermStayService();
