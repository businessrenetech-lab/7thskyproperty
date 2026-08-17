/**
 * shortTermStay.controller.js — Request/Response Handlers for Short Term Stay API.
 * Uses asyncHandler, branchScope, pick, and controllerHelpers.
 */
const { Op } = require('sequelize');
const { asyncHandler, branchScope, resolveBranchId, pick } = require('../utils/controllerHelpers');
const shortTermStayService = require('../services/shortTermStay.service');

const ShortStayPropertyProfile = require('../models/ShortStayPropertyProfile');
const ShortStayOwnerManagement = require('../models/ShortStayOwnerManagement');
const ShortStayBooking = require('../models/ShortStayBooking');
const ShortStayHousekeepingTask = require('../models/ShortStayHousekeepingTask');
const ShortStayIncident = require('../models/ShortStayIncident');
const Property = require('../models/Property');
const Contact = require('../models/Contact');
const PropertyMedia = require('../models/PropertyMedia');
const ServiceProvider = require('../models/ServiceProvider');

const PROFILE_FIELDS = [
  'public_headline', 'public_description', 'accommodation_type', 'bedrooms', 'bathrooms',
  'max_guests', 'max_adults', 'max_children', 'furnishing_status', 'amenities',
  'base_nightly_rate', 'weekend_rate', 'weekly_rate', 'monthly_rate', 'cleaning_fee',
  'security_deposit', 'extra_guest_fee', 'early_checkin_fee', 'late_checkout_fee',
  'min_nights', 'cancellation_policy', 'house_rules', 'checkin_time', 'checkout_time',
  'access_instructions', 'wifi_name', 'wifi_password', 'is_featured_on_website',
  'seo_title', 'seo_description',
];

const PROPERTY_FIELDS = [
  'title', 'category', 'property_type', 'listing_type', 'price', 'price_unit', 'currency',
  'is_negotiable', 'address', 'area', 'city', 'district', 'postal_code', 'country',
  'latitude', 'longitude', 'map_url', 'nearby_places', 'bedrooms', 'bathrooms',
  'balconies', 'parking', 'land_size', 'building_size', 'floor_number', 'total_floors',
  'total_units', 'building_height', 'year_built', 'unit_floor_plans', 'furnishing',
  'features', 'description', 'featured_image_url', 'video_tour_url', 'drone_video_url',
  'floor_plan_url', 'virtual_tour_url', 'owner_contact_id', 'listing_agent_id', 'manager_id',
  'seo_title', 'seo_description',
];

// Attach a provider_name to rows that carry assigned_provider_id (small, in-JS join)
async function withProviderNames(rows) {
  const plain = rows.map((r) => (r.get ? r.get({ plain: true }) : r));
  const ids = [...new Set(plain.map((r) => r.assigned_provider_id).filter(Boolean))];
  if (!ids.length) return plain;
  const providers = await ServiceProvider.findAll({ where: { id: ids }, attributes: ['id', 'company_name', 'contact_person'] });
  const map = Object.fromEntries(providers.map((p) => [p.id, p.company_name || p.contact_person]));
  return plain.map((r) => ({ ...r, provider_name: r.assigned_provider_id ? (map[r.assigned_provider_id] || null) : null }));
}

// 1. Dashboard summary
exports.getDashboardSummary = asyncHandler(async (req, res) => {
  const branchFilter = branchScope(req);
  const data = await shortTermStayService.getDashboardSummary(branchFilter.branch_id);
  res.json(data);
});

// 2. List Short Stay Properties
exports.getProperties = asyncHandler(async (req, res) => {
  const branchFilter = branchScope(req);
  const properties = await shortTermStayService.getProperties(branchFilter.branch_id, req.query);
  res.json(properties);
});

// 3. Upsert Property Profile & Rates
exports.upsertPropertyProfile = asyncHandler(async (req, res) => {
  const payload = pick(req.body, ['property_id', ...PROFILE_FIELDS]);
  const profile = await shortTermStayService.upsertPropertyProfile(branchScope(req).branch_id, payload);
  res.status(200).json(profile);
});

exports.onboardProperty = asyncHandler(async (req, res) => {
  const mode = req.body.mode;
  const payload = {
    mode,
    property_id: req.body.property_id,
    property: pick(req.body.property || {}, PROPERTY_FIELDS),
    profile: pick(req.body.profile || {}, PROFILE_FIELDS),
  };
  const branchId = mode === 'existing'
    ? branchScope(req).branch_id
    : resolveBranchId(req, req.body.property?.branch_id || req.body.branch_id);
  const profile = await shortTermStayService.onboardProperty(branchId, req.user?.id, payload);
  res.status(201).json(profile);
});

exports.updatePropertyProfile = asyncHandler(async (req, res) => {
  const nestedProfile = req.body.profile && typeof req.body.profile === 'object' ? req.body.profile : req.body;
  const payload = {
    profile: pick(nestedProfile, PROFILE_FIELDS),
    property: pick(req.body.property || {}, PROPERTY_FIELDS.filter((field) => field !== 'listing_type')),
  };
  const profile = await shortTermStayService.updatePropertyProfile(branchScope(req).branch_id, req.params.id, payload);
  res.json(profile);
});

exports.getPropertyDashboard = asyncHandler(async (req, res) => {
  const data = await shortTermStayService.getPropertyDashboard(branchScope(req).branch_id, req.params.id);
  res.json(data);
});

exports.getRatePlans = asyncHandler(async (req, res) => {
  res.json(await shortTermStayService.getRatePlans(branchScope(req).branch_id, req.params.id));
});

exports.createRatePlan = asyncHandler(async (req, res) => {
  const payload = pick(req.body, ['name', 'start_date', 'end_date', 'nightly_rate', 'weekend_rate', 'min_nights', 'priority', 'is_active']);
  const plan = await shortTermStayService.createRatePlan(branchScope(req).branch_id, req.params.id, payload);
  res.status(201).json(plan);
});

exports.updateRatePlan = asyncHandler(async (req, res) => {
  const payload = pick(req.body, ['name', 'start_date', 'end_date', 'nightly_rate', 'weekend_rate', 'min_nights', 'priority', 'is_active']);
  res.json(await shortTermStayService.updateRatePlan(branchScope(req).branch_id, req.params.id, payload));
});

exports.deleteRatePlan = asyncHandler(async (req, res) => {
  await shortTermStayService.deleteRatePlan(branchScope(req).branch_id, req.params.id);
  res.status(204).end();
});

// 4. Toggle Website Listing
exports.toggleWebsiteListing = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { is_website_listed } = req.body;
  if (typeof is_website_listed !== 'boolean') return res.status(400).json({ error: 'is_website_listed must be a boolean.' });
  const profile = await shortTermStayService.toggleWebsiteListing(branchScope(req).branch_id, id, is_website_listed);
  res.json(profile);
});

// 4b. Set property lifecycle status (draft → ready → active → suspended)
exports.setPropertyStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const payload = pick(req.body, ['status', 'override_reason']);
  const profile = await shortTermStayService.setPropertyStatus(branchScope(req).branch_id, id, payload, {
    canOverride: req.user?.role === 'super_admin',
  });
  res.json(profile);
});

exports.savePropertyReadiness = asyncHandler(async (req, res) => {
  const payload = pick(req.body, ['items', 'notes', 'photos', 'is_passed']);
  const readiness = await shortTermStayService.savePropertyReadiness(
    branchScope(req).branch_id,
    req.user?.id,
    req.params.id,
    payload
  );
  res.json(readiness);
});

// 5. Public API: Get published website listings
exports.getPublicListings = asyncHandler(async (req, res) => {
  const listings = await shortTermStayService.getPublicListings(req.query);
  res.json(listings);
});

// 6. Public API: Get listing detail by slug
exports.getPublicListingBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const listing = await shortTermStayService.getPublicListingBySlug(slug);
  res.json(listing);
});

exports.getPublicAvailability = asyncHandler(async (req, res) => {
  const result = await shortTermStayService.getPublicAvailability(req.params.slug, req.query);
  res.json(result);
});

exports.createPublicEnquiry = asyncHandler(async (req, res) => {
  const payload = pick(req.body, [
    'profile_id', 'public_slug', 'slug', 'guest_name', 'guest_email', 'guest_phone',
    'full_name', 'email', 'phone', 'check_in_date', 'check_out_date', 'adults_count',
    'children_count', 'message',
  ]);
  const enquiry = await shortTermStayService.createPublicEnquiry(payload);
  res.status(201).json(enquiry);
});

// 6b. Availability timeline (properties + blocks/bookings across a date window)
exports.getAvailability = asyncHandler(async (req, res) => {
  const branchFilter = branchScope(req);
  const { start, end, property_id } = req.query;
  const data = await shortTermStayService.getAvailability(branchFilter.branch_id, {
    start, end, property_id: property_id ? Number(property_id) : undefined,
  });
  res.json(data);
});

// 7. List Bookings
exports.getBookings = asyncHandler(async (req, res) => {
  const branchFilter = branchScope(req);
  const where = { ...branchFilter };
  if (req.query.property_id) where.property_id = req.query.property_id;
  const bookings = await ShortStayBooking.findAll({
    where,
    include: [
      { model: Property, as: 'property' },
      { model: Contact, as: 'lead_guest' },
    ],
    order: [['id', 'DESC']],
  });
  res.json(bookings);
});

// Settings (module defaults)
exports.getSettings = asyncHandler(async (req, res) => {
  res.json(await shortTermStayService.getSettings(resolveBranchId(req, req.query.branch_id)));
});
exports.saveSettings = asyncHandler(async (req, res) => {
  const payload = pick(req.body, ['rates', 'policy', 'house_rules', 'turnover_checklist', 'checkin_checklist', 'checkout_checklist', 'property_readiness_checklist']);
  res.json(await shortTermStayService.saveSettings(resolveBranchId(req, req.body.branch_id), payload));
});

// 7d. Qualify an enquiry (enquiry → hold)
exports.qualifyEnquiry = asyncHandler(async (req, res) => {
  const booking = await shortTermStayService.qualifyEnquiry(branchScope(req).branch_id, {
    booking_id: req.params.id,
    source_record: req.body.source_record,
  });
  res.json(booking);
});

exports.convertEnquiry = asyncHandler(async (req, res) => {
  const booking = await shortTermStayService.convertPublicEnquiry(
    branchScope(req).branch_id,
    req.user?.id,
    req.params.id
  );
  res.status(201).json(booking);
});

// 7c. Save a readiness snapshot (check-in/out checklist + photos + notes) — upsert
exports.saveReadiness = asyncHandler(async (req, res) => {
  const allowed = ['booking_id', 'check_type', 'items', 'notes', 'photos', 'is_passed'];
  const payload = pick(req.body, allowed);
  const check = await shortTermStayService.saveReadiness(branchScope(req).branch_id, req.user?.id, payload);
  res.status(201).json(check);
});

// 7e. Get a booking's readiness (checklist built from template if none saved)
exports.getReadiness = asyncHandler(async (req, res) => {
  const type = req.query.type === 'exit_inspection' ? 'exit_inspection' : 'pre_arrival';
  const data = await shortTermStayService.getReadiness(branchScope(req).branch_id, req.params.id, type);
  res.json(data);
});

// 7f. Check-in / check-out board (all operational guests with completion state)
exports.getCheckInOutBoard = asyncHandler(async (req, res) => {
  res.json(await shortTermStayService.getCheckInOutBoard(branchScope(req).branch_id, req.query.property_id));
});

// 7b. Booking detail (occupants, profile, readiness, gates) for the check-in/out desk
exports.getBookingDetail = asyncHandler(async (req, res) => {
  const branchFilter = branchScope(req);
  const detail = await shortTermStayService.getBookingDetail(branchFilter.branch_id, req.params.id);
  res.json(detail);
});

// 8. Create Booking / Enquiry
exports.createBooking = asyncHandler(async (req, res) => {
  const allowed = [
    'property_id', 'lead_guest_contact_id', 'booking_source', 'external_reference',
    'check_in_date', 'check_out_date', 'adults_count', 'children_count',
    'nightly_rate', 'cleaning_fee', 'security_deposit_amount', 'occupants',
  ];
  const payload = pick(req.body, allowed);
  const booking = await shortTermStayService.createBooking(branchScope(req).branch_id, req.user?.id, payload);
  res.status(201).json(booking);
});

// 8b. Confirm booking (record payment + deposit → confirmed)
exports.confirmBooking = asyncHandler(async (req, res) => {
  const payload = pick(req.body, ['paid_amount', 'security_deposit_paid']);
  payload.booking_id = req.params.id;
  const booking = await shortTermStayService.confirmBooking(branchScope(req).branch_id, req.user?.id, payload);
  res.json(booking);
});

exports.cancelBooking = asyncHandler(async (req, res) => {
  const payload = pick(req.body, ['reason', 'refund_amount', 'deposit_refunded_amount']);
  const booking = await shortTermStayService.cancelBooking(branchScope(req).branch_id, req.user?.id, req.params.id, payload);
  res.json(booking);
});

exports.amendBooking = asyncHandler(async (req, res) => {
  const payload = pick(req.body, ['check_in_date', 'check_out_date', 'adults_count', 'children_count', 'reason']);
  const booking = await shortTermStayService.amendBooking(branchScope(req).branch_id, req.user?.id, req.params.id, payload);
  res.json(booking);
});

// 9. Build STS-Owner Agreement
exports.buildOwnerAgreement = asyncHandler(async (req, res) => {
  const allowed = ['property_id', 'primary_owner_contact_id', 'joint_owner_contact_ids', 'revenue_share_percent'];
  const payload = pick(req.body, allowed);
  const result = await shortTermStayService.buildOwnerAgreement(branchScope(req).branch_id, req.user?.id, payload);
  res.status(201).json(result);
});

// 10. Build Guest Agreement
exports.buildGuestAgreement = asyncHandler(async (req, res) => {
  const { booking_id } = req.body;
  const envelope = await shortTermStayService.buildGuestAgreement(branchScope(req).branch_id, req.user?.id, booking_id);
  res.status(201).json(envelope);
});

// 11. Execute Check-In
exports.executeCheckIn = asyncHandler(async (req, res) => {
  const allowed = ['booking_id', 'house_rules_acknowledged', 'access_notes'];
  const payload = pick(req.body, allowed);
  const result = await shortTermStayService.executeCheckIn(branchScope(req).branch_id, req.user?.id, payload);
  res.json(result);
});

// 12. Execute Check-Out
exports.executeCheckOut = asyncHandler(async (req, res) => {
  const allowed = ['booking_id', 'keys_returned', 'checkout_notes'];
  const payload = pick(req.body, allowed);
  const result = await shortTermStayService.executeCheckOut(branchScope(req).branch_id, req.user?.id, payload);
  res.json(result);
});

// ── Phase 2 read endpoints ──
exports.getEnquiries = asyncHandler(async (req, res) => {
  const b = branchScope(req);
  res.json(await shortTermStayService.getEnquiries(b.branch_id, req.query.property_id));
});
exports.getGuests = asyncHandler(async (req, res) => {
  const b = branchScope(req);
  res.json(await shortTermStayService.getGuests(b.branch_id));
});
exports.getOwnerAgreements = asyncHandler(async (req, res) => {
  const b = branchScope(req);
  res.json(await shortTermStayService.getOwnerAgreements(b.branch_id));
});
exports.getGuestAgreements = asyncHandler(async (req, res) => {
  const b = branchScope(req);
  res.json(await shortTermStayService.getGuestAgreements(b.branch_id));
});
exports.getPayments = asyncHandler(async (req, res) => {
  const b = branchScope(req);
  res.json(await shortTermStayService.getPayments(b.branch_id, req.query.property_id));
});
exports.getOwnerStatements = asyncHandler(async (req, res) => {
  const b = branchScope(req);
  res.json(await shortTermStayService.getOwnerStatements(b.branch_id, req.query.property_id, {
    start: req.query.start,
    end: req.query.end,
  }));
});
exports.generateOwnerStatements = asyncHandler(async (req, res) => {
  const payload = pick(req.body, ['start', 'end', 'property_id']);
  const branchId = resolveBranchId(req, req.body.branch_id);
  const rows = await shortTermStayService.generateOwnerStatements(branchId, req.user?.id, payload);
  res.status(201).json(rows);
});
exports.updateOwnerStatementStatus = asyncHandler(async (req, res) => {
  const payload = pick(req.body, ['status', 'disbursement_date', 'disbursement_reference', 'disbursement_method', 'sent_channel', 'sent_evidence_url']);
  const row = await shortTermStayService.updateOwnerStatementStatus(branchScope(req).branch_id, req.params.id, payload);
  res.json(row);
});
exports.getReports = asyncHandler(async (req, res) => {
  const b = branchScope(req);
  res.json(await shortTermStayService.getReports(b.branch_id, req.query));
});

// 13. Housekeeping Tasks
exports.getHousekeepingTasks = asyncHandler(async (req, res) => {
  const branchFilter = branchScope(req);
  const where = { ...branchFilter };
  if (req.query.property_id) where.property_id = req.query.property_id;
  const tasks = await ShortStayHousekeepingTask.findAll({
    where,
    include: [{ model: Property, as: 'property' }],
    order: [['id', 'DESC']],
  });
  res.json(await withProviderNames(tasks));
});

exports.createHousekeepingTask = asyncHandler(async (req, res) => {
  const allowed = ['property_id', 'booking_id', 'task_type', 'assigned_provider_id', 'scheduled_date', 'cost', 'charge_to'];
  const payload = pick(req.body, allowed);
  const branchId = branchScope(req).branch_id;
  const property = await shortTermStayService.validateOperationalReferences(branchId, payload);
  const task = await ShortStayHousekeepingTask.create({ branch_id: property.branch_id, ...payload });
  res.status(201).json(task);
});

exports.updateHousekeepingTask = asyncHandler(async (req, res) => {
  const task = await ShortStayHousekeepingTask.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!task) return res.status(404).json({ error: 'Housekeeping task not found' });
  const payload = pick(req.body, ['status', 'cost', 'scheduled_date', 'assigned_provider_id', 'charge_to']);
  await shortTermStayService.validateOperationalReferences(branchScope(req).branch_id, { property_id: task.property_id, assigned_provider_id: payload.assigned_provider_id });
  await task.update(payload);
  if (payload.status === 'completed' && task.task_type === 'turnover') {
    const remaining = await ShortStayHousekeepingTask.count({
      where: { property_id: task.property_id, status: { [Op.ne]: 'completed' }, ...branchScope(req) },
    });
    if (!remaining) {
      const profile = await ShortStayPropertyProfile.findOne({ where: { property_id: task.property_id, ...branchScope(req) } });
      if (profile && !profile.is_manual_status_override) await profile.update({ current_occupancy_status: 'available' });
    }
  }
  res.json(task);
});

// 14. Incidents & Damage Reports
exports.getIncidents = asyncHandler(async (req, res) => {
  const branchFilter = branchScope(req);
  const where = { ...branchFilter };
  if (req.query.property_id) where.property_id = req.query.property_id;
  const incidents = await ShortStayIncident.findAll({
    where,
    include: [{ model: Property, as: 'property' }],
    order: [['id', 'DESC']],
  });
  res.json(await withProviderNames(incidents));
});

exports.createIncident = asyncHandler(async (req, res) => {
  const allowed = ['property_id', 'booking_id', 'severity', 'category', 'description', 'evidence_urls', 'estimated_cost'];
  const payload = pick(req.body, allowed);
  const property = await shortTermStayService.validateOperationalReferences(branchScope(req).branch_id, payload);
  const incident = await ShortStayIncident.create({ branch_id: property.branch_id, ...payload, deduct_from_deposit_amount: 0 });
  res.status(201).json(incident);
});

exports.updateIncident = asyncHandler(async (req, res) => {
  const payload = pick(req.body, ['status', 'severity', 'estimated_cost', 'deduct_from_deposit_amount', 'assigned_provider_id', 'evidence_urls', 'work_order_id']);
  const incident = await shortTermStayService.updateIncident(branchScope(req).branch_id, req.user?.id, req.params.id, payload);
  res.json(incident);
});

exports.createAvailabilityBlock = asyncHandler(async (req, res) => {
  const payload = pick(req.body, ['property_id', 'start_date', 'end_date', 'block_type', 'notes']);
  const block = await shortTermStayService.createAvailabilityBlock(branchScope(req).branch_id, payload);
  res.status(201).json(block);
});

exports.updateAvailabilityBlock = asyncHandler(async (req, res) => {
  const payload = pick(req.body, ['start_date', 'end_date', 'block_type', 'notes']);
  const block = await shortTermStayService.updateAvailabilityBlock(branchScope(req).branch_id, req.params.id, payload);
  res.json(block);
});

exports.deleteAvailabilityBlock = asyncHandler(async (req, res) => {
  await shortTermStayService.deleteAvailabilityBlock(branchScope(req).branch_id, req.params.id);
  res.status(204).end();
});
