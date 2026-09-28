/**
 * The five Rural Rent dashboards (CRM workbook, "DASHBOARDS TO BUILD INTO CRM"):
 * owner, tenant, property, financial and executive.
 *
 * Every query is scoped to category 'rural' AND listing_type 'rent'. Category
 * alone would pull in the Rural SALE book, which shares the category.
 */
const { Op } = require('sequelize');
const Property = require('../models/Property');
const Tenancy = require('../models/Tenancy');
const RentalEnquiry = require('../models/RentalEnquiry');
const RegisterEntry = require('../models/RegisterEntry');
const { Inspection } = require('../models/Inspection');
const PropertyInvoice = require('../models/PropertyInvoice');
const NonCircumventionRecord = require('../models/NonCircumventionRecord');
const PropertyOwnerProfile = require('../models/PropertyOwnerProfile');
const { asyncHandler, branchScope } = require('../utils/controllerHelpers');
const { propertyTypeCounts, revenueByType, leaseKpis } = require('../services/ruralRentDashboardMath');
const { arrearsAgeing } = require('../services/businessRentDashboardMath');
const { protectionState } = require('../services/protectionWindow');
const { REGISTERS } = require('./ruralSourcing.controller');

const plain = (rows) => rows.map((r) => (r.toJSON ? r.toJSON() : r));
const money = (rows, field = 'amount') => rows.reduce((t, r) => {
  const n = Number(r[field]);
  return t + (Number.isFinite(n) ? n : 0);
}, 0);

exports.dashboard = asyncHandler(async (req, res) => {
  const key = String(req.params.key || '');
  const scope = branchScope(req);

  const props = plain(await Property.findAll({
    where: { ...scope, category: 'rural', listing_type: 'rent' },
  }));
  const propIds = props.map((p) => p.id);
  const tenancies = propIds.length
    ? plain(await Tenancy.findAll({ where: { ...scope, property_id: { [Op.in]: propIds } } }))
    : [];
  const kpis = leaseKpis(props, tenancies);

  /** Unpaid PM invoices for these tenancies — the arrears source. */
  const openInvoices = async () => (tenancies.length
    ? plain(await PropertyInvoice.findAll({
      where: {
        ...scope,
        tenancy_id: { [Op.in]: tenancies.map((t) => t.id) },
        status: { [Op.notIn]: ['paid', 'cancelled', 'refunded', 'draft'] },
      },
    }))
    : []);

  if (key === 'owner') {
    const invoices = await openInvoices();
    const owners = new Set(props.map((p) => p.owner_contact_id).filter(Boolean));
    return res.json({
      data: {
        activeListings: props.filter((p) => p.status === 'available').length,
        occupied: kpis.occupied,
        vacant: kpis.vacant,
        owners: owners.size,
        leasingRevenue: money(tenancies, 'monthly_rent'),
        arrears: arrearsAgeing(invoices.map((i) => ({ amount: i.balance, due_date: i.due_date }))),
      },
    });
  }

  if (key === 'tenant') {
    const briefs = plain(await RegisterEntry.findAll({
      where: { ...scope, register_definition_id: REGISTERS.requirement },
    }));
    const shortlist = plain(await RegisterEntry.findAll({
      where: { ...scope, register_definition_id: REGISTERS.shortlist },
    }));
    const inspections = propIds.length
      ? plain(await Inspection.findAll({ where: { ...scope, property_id: { [Op.in]: propIds } } }))
      : [];
    const enquiries = plain(await RentalEnquiry.findAll({ where: { ...scope, category: 'rural' } }));
    return res.json({
      data: {
        activeBriefs: briefs.length,
        shortlisted: shortlist.length,
        enquiries: enquiries.length,
        inspections: inspections.length,
        activeLeases: kpis.activeLeases,
        renewalsDue: kpis.renewalsDue,
      },
    });
  }

  if (key === 'property') {
    return res.json({ data: { total: props.length, byType: propertyTypeCounts(props) } });
  }

  if (key === 'financial') {
    const invoices = await openInvoices();
    const profiles = propIds.length
      ? plain(await PropertyOwnerProfile.findAll({ where: { property_id: { [Op.in]: propIds } } }))
      : [];
    return res.json({
      data: {
        leasingFees: money(profiles, 'leasing_fee'),
        managementFees: money(profiles, 'management_commission'),
        marketingBudget: money(profiles, 'marketing_budget'),
        outstandingInvoices: { count: invoices.length, total: money(invoices, 'balance') },
        revenueByType: revenueByType(props, tenancies.map((t) => ({
          property_id: t.property_id, amount: t.monthly_rent,
        }))),
      },
    });
  }

  if (key === 'executive') {
    const invoices = await openInvoices();
    const owners = new Set(props.map((p) => p.owner_contact_id).filter(Boolean));
    const tenants = new Set(tenancies.map((t) => t.tenant_contact_id).filter(Boolean));
    const protections = plain(await NonCircumventionRecord.findAll({
      where: { ...scope, context: 'rental', category: 'rural' },
    }));
    const revenue = money(tenancies, 'monthly_rent');
    const outstanding = money(invoices, 'balance');
    return res.json({
      data: {
        owners: owners.size,
        tenants: tenants.size,
        properties: props.length,
        activeRentals: kpis.activeLeases,
        occupancyRate: kpis.occupancyRate,
        revenue,
        // Gross profit is not modelled for rural yet; report revenue net of what
        // is still outstanding rather than inventing a cost line.
        netOfOutstanding: revenue - outstanding,
        protectedIntroductions: protections.filter((p) => protectionState(p).state !== 'expired').length,
      },
    });
  }

  return res.status(404).json({ error: `Unknown dashboard '${key}'.` });
});
