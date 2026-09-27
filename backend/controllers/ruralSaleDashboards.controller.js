/**
 * The five Rural Sale dashboards (sales workbook, "RECOMMENDED DASHBOARDS"):
 * seller, buyer, land, risk and executive.
 *
 * Every query is scoped to category 'rural' AND listing_type 'sale'. Category
 * alone would pull in the Rural RENT book, which shares the category — the same
 * trap the Rent dashboards guard against in the other direction.
 */
const { Op } = require('sequelize');
const Property = require('../models/Property');
const PropertyDeal = require('../models/PropertyDeal');
const PropertyRisk = require('../models/PropertyRisk');
const RegisterEntry = require('../models/RegisterEntry');
const { Inspection } = require('../models/Inspection');
const SalesEnquiry = require('../models/SalesEnquiry');
const NonCircumventionRecord = require('../models/NonCircumventionRecord');
const { asyncHandler, branchScope } = require('../utils/controllerHelpers');
const { propertyTypeCounts } = require('../services/ruralRentDashboardMath');
const { saleFunnel, daysOnMarket, commission, riskGroups } = require('../services/ruralSaleDashboardMath');
const { protectionState } = require('../services/protectionWindow');

const plain = (rows) => rows.map((r) => (r.toJSON ? r.toJSON() : r));

/** Register entries for one register_key on one vertical, branch-scoped. */
async function entriesFor(req, verticalKey, registerKey) {
  const sequelize = require('../config/db.config');
  const [defs] = await sequelize.query(
    'SELECT id FROM register_definitions WHERE vertical_key = :v AND register_key = :k LIMIT 1',
    { replacements: { v: verticalKey, k: registerKey } },
  );
  if (!defs.length) return [];
  return plain(await RegisterEntry.findAll({
    where: { ...branchScope(req), register_definition_id: defs[0].id, vertical_key: verticalKey },
  }));
}

exports.dashboard = asyncHandler(async (req, res) => {
  const key = String(req.params.key || '');
  const scope = branchScope(req);

  const props = plain(await Property.findAll({
    where: { ...scope, category: 'rural', listing_type: 'sale' },
  }));
  const propIds = props.map((p) => p.id);

  const deals = propIds.length
    ? plain(await PropertyDeal.findAll({ where: { ...scope, property_id: { [Op.in]: propIds } } }))
    : [];
  const inspections = propIds.length
    ? plain(await Inspection.findAll({ where: { ...scope, property_id: { [Op.in]: propIds } } }))
    : [];

  if (key === 'seller') {
    const offers = await entriesFor(req, 'rural_sale', 'offer_register');
    const money = commission(deals);
    const funnel = saleFunnel({
      listings: props.filter((p) => p.status === 'available').length,
      inspections: inspections.length,
      offers: offers.length,
      sales: money.completedDeals,
    });
    return res.json({
      data: {
        ...funnel,
        sellers: new Set(props.map((p) => p.owner_contact_id || p.seller_contact_id).filter(Boolean)).size,
        byType: propertyTypeCounts(props),
        commissionRevenue: money.earned,
        commissionPipeline: money.pipeline,
        daysOnMarket: daysOnMarket(props),
      },
    });
  }

  if (key === 'buyer') {
    const [searches, shortlist, requirements] = await Promise.all([
      entriesFor(req, 'rural_purchase', 'property_search_register'),
      entriesFor(req, 'rural_purchase', 'shortlist_register'),
      entriesFor(req, 'rural_purchase', 'requirement_register'),
    ]);
    // sales_enquiries has no category column - the enquiries controller scopes by
    // joining the property, so this scopes by the sale book's property ids.
    const enquiries = propIds.length
      ? plain(await SalesEnquiry.findAll({ where: { ...scope, property_id: { [Op.in]: propIds } } }))
      : [];
    const money = commission(deals.filter((d) => String(d.deal_type || '') === 'buy'));
    return res.json({
      data: {
        activeBuyers: new Set(deals.filter((d) => d.buyer_client_id).map((d) => d.buyer_client_id)).size,
        requirements: requirements.length,
        searches: searches.length,
        shortlisted: shortlist.length,
        enquiries: enquiries.length,
        transactions: money.completedDeals,
        successFees: money.earned,
        successFeePipeline: money.pipeline,
      },
    });
  }

  if (key === 'land') {
    // The land dashboard is the book by rural type, plus what the SOP calls
    // vacant land: listed and not yet under offer.
    const underOffer = new Set(deals
      .filter((d) => !['cancelled'].includes(String(d.status || '')))
      .map((d) => Number(d.property_id)));
    return res.json({
      data: {
        total: props.length,
        byType: propertyTypeCounts(props),
        vacant: props.filter((p) => p.status === 'available' && !underOffer.has(Number(p.id))).length,
        underOffer: props.filter((p) => underOffer.has(Number(p.id))).length,
        sold: props.filter((p) => p.status === 'sold').length,
      },
    });
  }

  if (key === 'risk') {
    const where = { ...scope, is_dispute: true };
    if (propIds.length) where.property_id = { [Op.in]: propIds };
    const disputes = propIds.length ? plain(await PropertyRisk.findAll({ where })) : [];
    return res.json({
      data: {
        total: disputes.length,
        byGroup: riskGroups(disputes),
        escalated: disputes.filter((d) => d.dispute_stage === 'escalated').length,
        open: disputes.filter((d) => !['resolved', 'closed'].includes(String(d.dispute_stage || ''))).length,
        resolved: disputes.filter((d) => d.dispute_stage === 'resolved').length,
      },
    });
  }

  if (key === 'executive') {
    const money = commission(deals);
    const protections = plain(await NonCircumventionRecord.findAll({
      where: { ...scope, category: 'rural' },
    }));
    return res.json({
      data: {
        listings: props.length,
        available: props.filter((p) => p.status === 'available').length,
        buyers: new Set(deals.map((d) => d.buyer_client_id).filter(Boolean)).size,
        transactions: money.completedDeals,
        commissionRevenue: money.earned,
        commissionPipeline: money.pipeline,
        totalSaleValue: money.saleValue,
        averageSalePrice: money.averageSalePrice,
        // Gross margin is not modelled for rural sale yet; report the commission
        // rate actually achieved rather than inventing a cost line.
        commissionRate: money.saleValue > 0
          ? Math.round((money.earned / money.saleValue) * 1000) / 10
          : 0,
        protectedIntroductions: protections.filter((p) => protectionState(p).state !== 'expired').length,
      },
    });
  }

  return res.status(404).json({ error: `Unknown dashboard '${key}'.` });
});
