/**
 * publicWebsite.controller.js — Dedicated, production-grade endpoints for the
 * public website. Handles property listings, sales/rental enquiries, online tenant
 * applications, care service requests, appraisals, and admin website overview.
 */
const { Op } = require('sequelize');
const sequelize = require('../config/db.config');
const Property = require('../models/Property');
const PropertyMedia = require('../models/PropertyMedia');
const Contact = require('../models/Contact');
const Client = require('../models/Client');
const RentalEnquiry = require('../models/RentalEnquiry');
const SalesEnquiry = require('../models/SalesEnquiry');
const { TenantApplication, TenantVerification } = require('../models/TenantApplication');
const { VERIFICATION_ITEMS } = require('../services/rentalWorkflow.service');
const CareEnquiry = require('../models/CareEnquiry');
const Lead = require('../models/Lead');
const Branch = require('../models/Branch');
const ShortStayPropertyProfile = require('../models/ShortStayPropertyProfile');
const ShortStayBooking = require('../models/ShortStayBooking');
const { generateCode } = require('../utils/codeGenerator');
const { routeAndEnrol } = require('./salesEnquiry.controller');
const { asyncHandler, branchScope, resolveBranchId, getPagination, pick } = require('../utils/controllerHelpers');

/** Resolve default or main branch id safely */
async function getDefaultBranchId() {
  try {
    const b = await Branch.findOne({ order: [['id', 'ASC']] });
    return b?.id || 1;
  } catch {
    return 1;
  }
}

/** Defensive parser ensuring arrays are always returned as real JS arrays (never strings) */
function parseArray(val, fallback = []) {
  if (!val) return fallback;
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

/** Ensure Contact exists or is created with matching phone/email */
async function ensureContact({ branchId, name, phone, email, source = 'website', notes = '' }, transaction) {
  const or = [];
  if (phone) or.push({ primary_phone: phone });
  if (email) or.push({ email });

  let contact = null;
  if (or.length) {
    contact = await Contact.findOne({
      where: {
        branch_id: branchId,
        [Op.or]: or,
      },
      transaction,
    });
  }

  if (!contact) {
    const parts = (name || '').trim().split(/\s+/);
    contact = await Contact.create({
      branch_id: branchId,
      contact_code: await generateCode(Contact, 'contact_code', 'SSPC-CT-'),
      contact_type: 'individual',
      full_name: name || 'Website Visitor',
      first_name: parts[0] || null,
      last_name: parts.slice(1).join(' ') || null,
      primary_phone: phone || null,
      email: email || null,
      source: source || 'website',
      notes: notes || 'Created from public website submission.',
    }, { transaction });
  }

  return contact;
}

// ─── 1. PUBLIC PROPERTY LISTINGS ──────────────────────────────────────────────
exports.getPublishedProperties = asyncHandler(async (req, res) => {
  const { limit = 24, page = 1 } = req.query;
  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 24, 1), 100);
  const offset = (pageNum - 1) * limitNum;

  const where = {
    [Op.or]: [
      { is_published: true },
      { listing_type: 'short_term' },
    ],
  };

  // Category filter: residential, commercial, rural
  if (req.query.category && ['residential', 'commercial', 'rural', 'business'].includes(req.query.category)) {
    where.category = req.query.category;
  }

  // Listing type: sale, rent, lease, short_term
  if (req.query.listing_type && ['sale', 'rent', 'lease', 'short_term'].includes(req.query.listing_type)) {
    where.listing_type = req.query.listing_type;
  }

  // Status: available, reserved, under_offer, sold, rented
  if (req.query.status) {
    if (req.query.status !== 'all') {
      where.status = req.query.status;
    }
  }

  // Featured filter
  if (req.query.featured === 'true' || req.query.featured === '1') {
    where.is_featured = true;
  }

  // Bedrooms
  if (req.query.bedrooms) {
    const beds = parseInt(req.query.bedrooms, 10);
    if (!isNaN(beds)) where.bedrooms = { [Op.gte]: beds };
  }

  // Price range
  if (req.query.min_price || req.query.max_price) {
    where.price = {};
    if (req.query.min_price) where.price[Op.gte] = Number(req.query.min_price);
    if (req.query.max_price) where.price[Op.lte] = Number(req.query.max_price);
  }

  // Search keyword
  if (req.query.search) {
    const q = `%${req.query.search}%`;
    where[Op.or] = [
      { title: { [Op.like]: q } },
      { property_code: { [Op.like]: q } },
      { area: { [Op.like]: q } },
      { city: { [Op.like]: q } },
      { district: { [Op.like]: q } },
      { address: { [Op.like]: q } },
    ];
  }

  // Order
  let order = [['is_featured', 'DESC'], ['id', 'DESC']];
  if (req.query.sort === 'price_asc') order = [['price', 'ASC']];
  if (req.query.sort === 'price_desc') order = [['price', 'DESC']];
  if (req.query.sort === 'newest') order = [['id', 'DESC']];

  const { rows, count } = await Property.findAndCountAll({
    where,
    include: [
      {
        model: PropertyMedia,
        as: 'media',
        attributes: ['id', 'file_url', 'media_type', 'caption', 'sort_order'],
        required: false,
      },
      {
        model: ShortStayPropertyProfile,
        as: 'short_stay_profile',
        required: false,
      },
    ],
    order,
    limit: limitNum,
    offset,
    distinct: true,
  });

  const sanitized = rows.map((p) => {
    const plain = p.get({ plain: true });
    const isShortStay = plain.listing_type === 'short_term' || Boolean(plain.short_stay_profile);
    const shortStayRate = plain.short_stay_profile?.base_nightly_rate;
    const effectivePrice = (isShortStay && shortStayRate) ? Number(shortStayRate) : (plain.price ? Number(plain.price) : 0);
    const priceUnit = isShortStay ? 'per night' : (plain.price_unit || (plain.listing_type === 'sale' ? 'Total' : 'per month'));
    const priceDisplay = effectivePrice > 0 
      ? (isShortStay ? `৳${effectivePrice.toLocaleString()} / night` : `৳${effectivePrice.toLocaleString()}`) 
      : 'Price on Enquiry';

    return {
      id: plain.id,
      property_code: plain.property_code,
      title: (isShortStay && plain.short_stay_profile?.public_headline) ? plain.short_stay_profile.public_headline : plain.title,
      slug: (isShortStay && plain.short_stay_profile?.public_slug) ? plain.short_stay_profile.public_slug : (plain.slug || plain.property_code?.toLowerCase()),
      category: plain.category,
      property_type: plain.property_type,
      listing_type: plain.listing_type,
      status: plain.status,
      listing_status: plain.listing_status,
      price: effectivePrice,
      price_display: priceDisplay,
      price_unit: priceUnit,
      currency: plain.currency || 'BDT',
      is_negotiable: plain.is_negotiable,
      address: plain.address,
      area: plain.area,
      city: plain.city,
      district: plain.district,
      bedrooms: (isShortStay && plain.short_stay_profile?.bedrooms) ? plain.short_stay_profile.bedrooms : plain.bedrooms,
      bathrooms: (isShortStay && plain.short_stay_profile?.bathrooms) ? plain.short_stay_profile.bathrooms : plain.bathrooms,
      balconies: plain.balconies,
      parking: plain.parking,
      building_size: plain.building_size,
      land_size: plain.land_size,
      furnishing: plain.furnishing,
      features: parseArray(
        (isShortStay && Array.isArray(plain.short_stay_profile?.amenities) && plain.short_stay_profile.amenities.length > 0)
          ? plain.short_stay_profile.amenities
          : plain.features,
        ['24/7 Security & CCTV', 'Backup Generator', 'Dedicated Parking', 'High-Speed Elevators']
      ),
      nearby_places: parseArray(plain.nearby_places, []),
      featured_image_url: plain.featured_image_url || plain.media?.[0]?.file_url || null,
      media: plain.media || [],
      is_featured: plain.is_featured,
      approved_monthly_rent: plain.approved_monthly_rent,
      lease_min_period_months: plain.lease_min_period_months,
      short_stay_profile: plain.short_stay_profile || null,
      created_at: plain.created_at,
    };
  });

  res.json({
    data: sanitized,
    pagination: {
      total: count,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(count / limitNum),
    },
  });
});

// ─── 2. PUBLIC PROPERTY DETAILS ───────────────────────────────────────────────
exports.getPropertyDetails = asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params;
  const isNumeric = /^\d+$/.test(idOrSlug);

  const orConditions = [];
  if (isNumeric) {
    orConditions.push({ id: Number(idOrSlug) });
  }
  orConditions.push({ property_code: idOrSlug });
  orConditions.push({ slug: idOrSlug });

  let property = await Property.findOne({
    where: {
      [Op.or]: orConditions,
    },
    include: [
      {
        model: PropertyMedia,
        as: 'media',
        attributes: ['id', 'file_url', 'media_type', 'caption', 'sort_order'],
      },
      {
        model: ShortStayPropertyProfile,
        as: 'short_stay_profile',
        required: false,
      },
    ],
    order: [[{ model: PropertyMedia, as: 'media' }, 'sort_order', 'ASC']],
  });

  let shortStayProfile = property?.short_stay_profile || null;

  if (!property) {
    shortStayProfile = await ShortStayPropertyProfile.findOne({
      where: { public_slug: idOrSlug },
      include: [
        {
          model: Property,
          as: 'property',
          include: [{ model: PropertyMedia, as: 'media' }],
        },
      ],
    });
    if (shortStayProfile?.property) {
      property = shortStayProfile.property;
    }
  }

  if (!property) {
    return res.status(404).json({ error: 'Property not found or is currently not listed.' });
  }

  // Increment view counter silently in background
  Property.increment('views_count', { by: 1, where: { id: property.id } }).catch(() => {});

  const plain = property.get({ plain: true });
  if (!shortStayProfile && plain.short_stay_profile) {
    shortStayProfile = plain.short_stay_profile;
  }
  if (!shortStayProfile && plain.listing_type === 'short_term') {
    shortStayProfile = await ShortStayPropertyProfile.findOne({
      where: { property_id: property.id },
    });
  }

  const isShortStay = plain.listing_type === 'short_term' || Boolean(shortStayProfile);
  const effectivePrice = (isShortStay && shortStayProfile?.base_nightly_rate)
    ? Number(shortStayProfile.base_nightly_rate)
    : (plain.price ? Number(plain.price) : 0);

  const rawFeatures = (isShortStay && Array.isArray(shortStayProfile?.amenities) && shortStayProfile.amenities.length > 0)
    ? shortStayProfile.amenities
    : plain.features;

  const featuresList = parseArray(rawFeatures, ['24/7 Security & CCTV', 'Backup Generator', 'Dedicated Parking', 'High-Speed Elevators']);
  const nearbyPlacesList = parseArray(plain.nearby_places, []);
  const mediaList = Array.isArray(plain.media) ? plain.media : [];

  res.json({
    data: {
      ...plain,
      title: (isShortStay && shortStayProfile?.public_headline) ? shortStayProfile.public_headline : plain.title,
      description: (isShortStay && shortStayProfile?.public_description) ? shortStayProfile.public_description : plain.description,
      bedrooms: (isShortStay && shortStayProfile?.bedrooms) ? shortStayProfile.bedrooms : plain.bedrooms,
      bathrooms: (isShortStay && shortStayProfile?.bathrooms) ? shortStayProfile.bathrooms : plain.bathrooms,
      features: featuresList,
      nearby_places: nearbyPlacesList,
      media: mediaList,
      price: effectivePrice,
      price_display: effectivePrice > 0 ? (isShortStay ? `৳${effectivePrice.toLocaleString()} / night` : `৳${effectivePrice.toLocaleString()}`) : 'Price on Enquiry',
      price_unit: isShortStay ? 'per night' : (plain.price_unit || (plain.listing_type === 'sale' ? 'Total' : 'per month')),
      short_stay_profile: shortStayProfile ? (shortStayProfile.get ? shortStayProfile.get({ plain: true }) : shortStayProfile) : null,
    },
  });
});

// ─── 3. SUBMIT RENTAL ENQUIRY (Website Prospective Tenant) ───────────────────
exports.submitRentalEnquiry = asyncHandler(async (req, res) => {
  const { name, phone, email, property_id, property_code, budget, preferred_move_in, lease_period, occupancy_requirement, message, viewing_date } = req.body || {};

  if (!name || (!phone && !email)) {
    return res.status(400).json({ error: 'Name and at least a phone number or email are required.' });
  }

  let property = null;
  const propIdentifier = property_id || property_code;
  if (propIdentifier) {
    const isNum = /^\d+$/.test(String(propIdentifier));
    property = await Property.findOne({
      where: isNum 
        ? { [Op.or]: [{ id: Number(propIdentifier) }, { property_code: String(propIdentifier) }] }
        : { [Op.or]: [{ property_code: String(propIdentifier) }, { slug: String(propIdentifier) }] }
    });
  }

  const branchId = property?.branch_id || await getDefaultBranchId();

  const enquiry = await sequelize.transaction(async (tx) => {
    const contact = await ensureContact({
      branchId,
      name,
      phone,
      email,
      source: 'website',
      notes: `Rental enquiry on ${property ? property.title : 'general rental'}`,
    }, tx);

    const code = await generateCode(RentalEnquiry, 'enquiry_code', 'SSPC-EQ-');

    const createdRental = await RentalEnquiry.create({
      branch_id: branchId,
      enquiry_code: code,
      property_id: property?.id || null,
      contact_id: contact.id,
      enquirer_name: name,
      phone: phone || null,
      email: email || null,
      source: 'website',
      budget: budget ? Number(budget) : null,
      preferred_move_in: preferred_move_in || null,
      lease_period: lease_period || '6 Months',
      occupancy_requirement: occupancy_requirement || null,
      viewing_date: viewing_date || null,
      notes: message || null,
      stage: 'new',
      next_action: 'Contact prospective tenant to qualify and arrange viewing',
    }, { transaction: tx });

    // If this is a short stay property, mirror to ShortStayEnquiry so it surfaces on Short Stay Enquiries desk
    if (property && property.listing_type === 'short_term') {
      try {
        const ShortStayEnquiry = require('../models/ShortStayEnquiry');
        const ShortStayPropertyProfile = require('../models/ShortStayPropertyProfile');
        const prof = await ShortStayPropertyProfile.findOne({ where: { property_id: property.id }, transaction: tx });
        await ShortStayEnquiry.create({
          branch_id: branchId,
          property_id: property.id,
          profile_id: prof?.id || null,
          guest_name: name,
          guest_email: email || null,
          guest_phone: phone || null,
          check_in_date: preferred_move_in || new Date(Date.now() + 86400000).toISOString().slice(0, 10),
          check_out_date: new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10),
          adults_count: 2,
          children_count: 0,
          message: message || 'Inquiry submitted from public website',
          quoted_amount: budget ? Number(budget) : (property.price || 0),
          status: 'new',
          source: 'website',
        }, { transaction: tx });
      } catch (err) {
        console.warn('[Public Website] Mirror ShortStayEnquiry warning:', err.message);
      }
    }

    return createdRental;
  });

  res.status(201).json({
    message: 'Your rental enquiry has been received. Our leasing team will contact you shortly.',
    enquiry_code: enquiry.enquiry_code,
    reference_number: enquiry.enquiry_code,
    id: enquiry.id,
  });
});

// ─── 4. SUBMIT SALES ENQUIRY (Website Buyer) ──────────────────────────────────
exports.submitSalesEnquiry = asyncHandler(async (req, res) => {
  const { name, phone, email, property_id, property_code, budget, preferred_area, message, viewing_date,
    utm_source, utm_medium, utm_campaign } = req.body || {};

  if (!name || (!phone && !email)) {
    return res.status(400).json({ error: 'Name and at least a phone number or email are required.' });
  }

  let property = null;
  const propIdentifier = property_id || property_code;
  if (propIdentifier) {
    const isNum = /^\d+$/.test(String(propIdentifier));
    property = await Property.findOne({
      where: isNum 
        ? { [Op.or]: [{ id: Number(propIdentifier) }, { property_code: String(propIdentifier) }] }
        : { [Op.or]: [{ property_code: String(propIdentifier) }, { slug: String(propIdentifier) }] }
    });
  }

  const branchId = property?.branch_id || await getDefaultBranchId();

  const enquiry = await sequelize.transaction(async (tx) => {
    const contact = await ensureContact({
      branchId,
      name,
      phone,
      email,
      source: 'website',
      notes: `Buyer enquiry on ${property ? property.title : 'general sale property'}`,
    }, tx);

    // Also link or ensure client record
    let client = await Client.findOne({ where: { contact_id: contact.id }, transaction: tx });
    if (!client) {
      client = await Client.create({
        branch_id: branchId,
        contact_id: contact.id,
        client_code: await generateCode(Client, 'client_code', 'SSPC-CL-'),
        client_type: 'buyer',
        is_buyer: true,
        status: 'active',
      }, { transaction: tx });
    }

    const code = await generateCode(SalesEnquiry, 'enquiry_code', 'SSPC-BEQ-');

    const created = await SalesEnquiry.create({
      branch_id: branchId,
      enquiry_code: code,
      property_id: property?.id || null,
      contact_id: contact.id,
      client_id: client.id,
      enquirer_name: name,
      phone: phone || null,
      email: email || null,
      source: 'website',
      utm_source: utm_source || null,
      utm_medium: utm_medium || null,
      utm_campaign: utm_campaign || null,
      budget: budget ? Number(budget) : null,
      preferred_area: preferred_area || property?.area || null,
      viewing_date: viewing_date || null,
      message: message || null,
      stage: 'new',
      next_action: 'Contact prospective buyer to arrange consultation',
    }, { transaction: tx });
    await routeAndEnrol(created, property?.id || null, tx);
    return created;
  });

  res.status(201).json({
    message: 'Your enquiry has been received. Our sales executive will connect with you.',
    enquiry_code: enquiry.enquiry_code,
    reference_number: enquiry.enquiry_code,
    id: enquiry.id,
  });
});

// ─── 5. SUBMIT TENANT APPLICATION (Website Online Tenancy Application) ───────
exports.submitTenantApplication = asyncHandler(async (req, res) => {
  const {
    property_id, property_code, applicant_name, mobile, email, occupation, employer, monthly_income,
    preferred_move_in, lease_period, occupancy_requirement, budget,
    proposed_monthly_rent, proposed_security_deposit, proposed_advance_rent,
    current_address, permanent_address, current_landlord_name, current_landlord_phone,
    current_tenancy_address, current_tenancy_rent, current_tenancy_duration, reason_for_moving,
    employment_type, job_title, work_address, employment_duration,
    references, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
    has_pets, pet_types, notes, nid_number, passport_number, date_of_birth,
  } = req.body || {};

  if (!applicant_name || !mobile) {
    return res.status(400).json({ error: 'Applicant name and mobile number are required to submit an application.' });
  }

  let property = null;
  const propIdentifier = property_id || property_code;
  if (propIdentifier) {
    const isNum = /^\d+$/.test(String(propIdentifier));
    property = await Property.findOne({
      where: isNum 
        ? { [Op.or]: [{ id: Number(propIdentifier) }, { property_code: String(propIdentifier) }] }
        : { [Op.or]: [{ property_code: String(propIdentifier) }, { slug: String(propIdentifier) }] }
    });
  }

  const branchId = property?.branch_id || await getDefaultBranchId();

  const application = await sequelize.transaction(async (tx) => {
    const contact = await ensureContact({
      branchId,
      name: applicant_name,
      phone: mobile,
      email: email || null,
      source: 'website',
      notes: `Tenant application for ${property ? property.title : 'rental unit'}`,
    }, tx);

    const appCode = await generateCode(TenantApplication, 'application_code', 'SSPC-APP-');

    const createdApp = await TenantApplication.create({
      branch_id: branchId,
      application_code: appCode,
      property_id: property?.id || null,
      tenant_contact_id: contact.id,
      applicant_name,
      mobile,
      email: email || null,
      occupation: occupation || null,
      employer: employer || null,
      monthly_income: monthly_income ? Number(monthly_income) : null,
      application_date: new Date(),
      preferred_move_in: preferred_move_in || null,
      lease_period: lease_period || '6 Months',
      occupancy_requirement: occupancy_requirement || null,
      budget: budget ? Number(budget) : (proposed_monthly_rent ? Number(proposed_monthly_rent) : null),
      source: 'website',
      status: 'submitted',
      proposed_monthly_rent: proposed_monthly_rent ? Number(proposed_monthly_rent) : (property?.approved_monthly_rent || null),
      proposed_security_deposit: proposed_security_deposit ? Number(proposed_security_deposit) : null,
      proposed_advance_rent: proposed_advance_rent ? Number(proposed_advance_rent) : null,
      current_address: current_address || null,
      permanent_address: permanent_address || null,
      current_landlord_name: current_landlord_name || null,
      current_landlord_phone: current_landlord_phone || null,
      current_tenancy_address: current_tenancy_address || null,
      current_tenancy_rent: current_tenancy_rent ? Number(current_tenancy_rent) : null,
      current_tenancy_duration: current_tenancy_duration || null,
      reason_for_moving: reason_for_moving || null,
      employment_type: employment_type || null,
      job_title: job_title || null,
      work_address: work_address || null,
      employment_duration: employment_duration || null,
      references: Array.isArray(references) ? references : [],
      emergency_contact_name: emergency_contact_name || null,
      emergency_contact_phone: emergency_contact_phone || null,
      emergency_contact_relationship: emergency_contact_relationship || null,
      has_pets: !!has_pets,
      pet_types: pet_types || null,
      date_of_birth: date_of_birth || null,
      nid_number: nid_number || null,
      passport_number: passport_number || null,
      notes: notes || 'Submitted via public website online application form.',
      submitted_at: new Date(),
    }, { transaction: tx });

    // Seed standard verification checklist items for PM review
    try {
      if (Array.isArray(VERIFICATION_ITEMS) && VERIFICATION_ITEMS.length > 0) {
        await TenantVerification.bulkCreate(
          VERIFICATION_ITEMS.map((v, i) => ({
            application_id: createdApp.id,
            item: v.item,
            required: true,
            status: 'pending',
            evidence_required: v.evidence_required,
            sort_order: i,
          })),
          { transaction: tx }
        );
      }
    } catch (verErr) {
      console.warn('[submitTenantApplication] Seed verifications skipped:', verErr.message);
    }

    return createdApp;
  });

  res.status(201).json({
    message: 'Your tenancy application has been submitted successfully. Our property manager will review and contact you.',
    application_code: application.application_code,
    reference_number: application.application_code,
    id: application.id,
  });
});

// ─── 6. SUBMIT CARE SERVICE REQUEST ───────────────────────────────────────────
exports.submitServiceRequest = asyncHandler(async (req, res) => {
  const {
    name, phone, email, service_line, service_name,
    address, district, preferred_date, description,
  } = req.body || {};

  if (!name || (!phone && !email)) {
    return res.status(400).json({ error: 'Name and a phone or email are required.' });
  }

  const branchId = await getDefaultBranchId();

  const enquiry = await sequelize.transaction(async (tx) => {
    const contact = await ensureContact({
      branchId,
      name,
      phone,
      email,
      source: 'website',
      notes: `Service request for ${service_line || service_name || 'Property Care'}`,
    }, tx);

    const code = await generateCode(CareEnquiry, 'enquiry_code', 'SSPC-CEN-');

    return CareEnquiry.create({
      branch_id: branchId,
      enquiry_code: code,
      customer_contact_id: contact.id,
      customer_name: name,
      mobile: phone || null,
      email: email || null,
      district: district || 'Dhaka',
      address: address || null,
      service_interest: service_name || service_line || 'Property Care',
      service_category: service_line || null,
      notes: `${description || ''} ${preferred_date ? `(Preferred: ${preferred_date})` : ''}`.trim(),
      source: 'web',
      stage: 'enquiry',
    }, { transaction: tx });
  });

  res.status(201).json({
    message: 'Your service request has been logged. Our property care desk will contact you to confirm timing.',
    enquiry_code: enquiry.enquiry_code,
    id: enquiry.id,
  });
});

// ─── 7. SUBMIT APPRAISAL / VALUATION REQUEST ─────────────────────────────────
exports.submitAppraisalRequest = asyncHandler(async (req, res) => {
  const {
    name, phone, email, property_address, property_type,
    bedrooms, intent = 'rent', notes, preferred_time,
  } = req.body || {};

  if (!name || (!phone && !email) || !property_address) {
    return res.status(400).json({ error: 'Name, phone/email, and property address are required for an appraisal.' });
  }

  const branchId = await getDefaultBranchId();

  const lead = await sequelize.transaction(async (tx) => {
    const contact = await ensureContact({
      branchId,
      name,
      phone,
      email,
      source: 'website',
      notes: `Appraisal request for ${property_address} (${intent})`,
    }, tx);

    const leadCode = await generateCode(Lead, 'lead_code', 'SSPC-LD-');

    return Lead.create({
      branch_id: branchId,
      lead_code: leadCode,
      contact_id: contact.id,
      name,
      phone: phone || null,
      email: email || null,
      vertical_key: intent === 'sell' ? 'sales' : 'property_management',
      requirement: `Appraisal Request: ${intent.toUpperCase()} | Address: ${property_address} | Type: ${property_type || 'Residential'} | Bedrooms: ${bedrooms || 'N/A'}. Preferred Time: ${preferred_time || 'ASAP'}. Notes: ${notes || 'None'}`,
      source: 'website_appraisal',
      status: 'new',
      priority: 'high',
      notes: `Submitted from website 'Book an Appraisal' pill button modal.`,
    }, { transaction: tx });
  });

  res.status(201).json({
    message: 'Appraisal request submitted. Our senior valuer will prepare your comprehensive market assessment.',
    lead_code: lead.lead_code,
  });
});

// ─── 8. SUBMIT GENERAL CONTACT / NRB INQUIRY ──────────────────────────────────
exports.submitContactMessage = asyncHandler(async (req, res) => {
  const { name, phone, email, subject, message, type = 'general' } = req.body || {};

  if (!name || (!phone && !email) || !message) {
    return res.status(400).json({ error: 'Name, contact detail, and message are required.' });
  }

  const branchId = await getDefaultBranchId();

  const lead = await sequelize.transaction(async (tx) => {
    const contact = await ensureContact({
      branchId,
      name,
      phone,
      email,
      source: 'website',
      notes: `Website contact form (${type})`,
    }, tx);

    const leadCode = await generateCode(Lead, 'lead_code', 'SSPC-LD-');

    return Lead.create({
      branch_id: branchId,
      lead_code: leadCode,
      contact_id: contact.id,
      name,
      phone: phone || null,
      email: email || null,
      vertical_key: type === 'nrb' ? 'nrb_desk' : 'general',
      requirement: `[${subject || (type === 'nrb' ? 'NRB Advisory' : 'General Enquiry')}]: ${message}`,
      source: 'website_contact',
      status: 'new',
      priority: 'medium',
      notes: `Submitted via website contact page.`,
    }, { transaction: tx });
  });

  res.status(201).json({
    message: 'Thank you for reaching out. A Seventh Sky advisor will respond promptly.',
    lead_code: lead.lead_code,
  });
});

// ─── 9. ADMIN WEBSITE MANAGEMENT OVERVIEW ─────────────────────────────────────
exports.getWebsiteAdminSummary = asyncHandler(async (req, res) => {
  const bScope = branchScope(req);

  const [
    buyerEnquiriesTotal,
    buyerEnquiriesNew,
    rentalEnquiriesTotal,
    rentalEnquiriesNew,
    tenantAppsTotal,
    tenantAppsSubmitted,
    careEnquiriesTotal,
    appraisalLeadsTotal,
    publishedSales,
    publishedRentals,
    publishedShortStays,
    allPublishedProperties,
  ] = await Promise.all([
    SalesEnquiry.count({ where: { ...bScope, source: 'website' } }).catch(() => 0),
    SalesEnquiry.count({ where: { ...bScope, source: 'website', stage: 'new' } }).catch(() => 0),
    RentalEnquiry.count({ where: { ...bScope, source: 'website' } }).catch(() => 0),
    RentalEnquiry.count({ where: { ...bScope, source: 'website', stage: 'new' } }).catch(() => 0),
    TenantApplication.count({ where: { ...bScope, source: 'website' } }).catch(() => 0),
    TenantApplication.count({ where: { ...bScope, source: 'website', status: 'submitted' } }).catch(() => 0),
    CareEnquiry.count({ where: { ...bScope, source: { [Op.in]: ['web', 'website'] } } }).catch(() => 0),
    Lead.count({ where: { ...bScope, source: { [Op.in]: ['website_appraisal', 'website_contact', 'website'] } } }).catch(() => 0),
    Property.count({ where: { ...bScope, is_published: true, listing_type: 'sale' } }).catch(() => 0),
    Property.count({ where: { ...bScope, is_published: true, listing_type: { [Op.in]: ['rent', 'lease'] } } }).catch(() => 0),
    ShortStayPropertyProfile.count({ where: { is_website_listed: true } }).catch(() => 0),
    Property.findAll({
      where: { ...bScope },
      attributes: ['id', 'property_code', 'title', 'category', 'listing_type', 'status', 'listing_status', 'price', 'is_published', 'is_featured', 'featured_image_url'],
      order: [['is_published', 'DESC'], ['id', 'DESC']],
      limit: 100,
    }).catch(() => []),
  ]);

  // Fetch latest 20 enquiries of each category
  const [recentBuyer, recentRental, recentApps, recentCare, recentLeads] = await Promise.all([
    SalesEnquiry.findAll({
      where: { ...bScope, source: 'website' },
      include: [{ model: Property, as: 'property', attributes: ['id', 'title', 'property_code'] }],
      order: [['id', 'DESC']],
      limit: 15,
    }).catch(() => []),
    RentalEnquiry.findAll({
      where: { ...bScope, source: 'website' },
      include: [{ model: Property, as: 'property', attributes: ['id', 'title', 'property_code'] }],
      order: [['id', 'DESC']],
      limit: 15,
    }).catch(() => []),
    TenantApplication.findAll({
      where: { ...bScope, source: 'website' },
      include: [{ model: Property, as: 'property', attributes: ['id', 'title', 'property_code'] }],
      order: [['id', 'DESC']],
      limit: 15,
    }).catch(() => []),
    CareEnquiry.findAll({
      where: { ...bScope, source: { [Op.in]: ['web', 'website'] } },
      order: [['id', 'DESC']],
      limit: 15,
    }).catch(() => []),
    Lead.findAll({
      where: { ...bScope, source: { [Op.in]: ['website_appraisal', 'website_contact', 'website'] } },
      order: [['id', 'DESC']],
      limit: 15,
    }).catch(() => []),
  ]);

  res.json({
    stats: {
      total_inquiries: buyerEnquiriesTotal + rentalEnquiriesTotal + tenantAppsTotal + careEnquiriesTotal + appraisalLeadsTotal,
      new_inquiries: buyerEnquiriesNew + rentalEnquiriesNew + tenantAppsSubmitted,
      buyer_enquiries: { total: buyerEnquiriesTotal, new: buyerEnquiriesNew },
      rental_enquiries: { total: rentalEnquiriesTotal, new: rentalEnquiriesNew },
      tenant_applications: { total: tenantAppsTotal, submitted: tenantAppsSubmitted },
      care_enquiries: { total: careEnquiriesTotal },
      appraisal_leads: { total: appraisalLeadsTotal },
      inventory: {
        published_sales: publishedSales,
        published_rentals: publishedRentals,
        published_short_stays: publishedShortStays,
        total_properties: allPublishedProperties.length,
      },
    },
    properties: allPublishedProperties,
    inquiries: {
      buyer: recentBuyer,
      rental: recentRental,
      applications: recentApps,
      care: recentCare,
      leads: recentLeads,
    },
  });
});

// ─── 10. ADMIN TOGGLE PROPERTY WEBSITE STATUS ─────────────────────────────────
exports.togglePropertyWebsiteStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const property = await Property.findOne({ where: { id, ...branchScope(req) } });
  if (!property) return res.status(404).json({ error: 'Property not found.' });

  const { is_published, is_featured, listing_status, status, price, title } = req.body;
  const updatePayload = {};

  if (typeof is_published === 'boolean') updatePayload.is_published = is_published;
  if (typeof is_featured === 'boolean') updatePayload.is_featured = is_featured;
  if (listing_status) updatePayload.listing_status = listing_status;
  if (status) updatePayload.status = status;
  if (price !== undefined) updatePayload.price = Number(price);
  if (title !== undefined) updatePayload.title = title;

  await property.update(updatePayload);

  // Sync to ShortStayPropertyProfile if it exists so price & published status remain synchronized
  try {
    const ShortStayPropertyProfile = require('../models/ShortStayPropertyProfile');
    const strProfile = await ShortStayPropertyProfile.findOne({ where: { property_id: property.id } });
    if (strProfile) {
      const profPatch = {};
      if (typeof is_published === 'boolean') profPatch.is_website_listed = is_published;
      if (price !== undefined) profPatch.base_nightly_rate = Number(price);
      if (title !== undefined) profPatch.public_headline = title;
      if (Object.keys(profPatch).length > 0) {
        await strProfile.update(profPatch);
      }
    }
  } catch (syncErr) {
    console.warn('[Website Admin Property Status] STR sync warning:', syncErr.message);
  }

  res.json({ message: 'Property website status updated.', data: property });
});
