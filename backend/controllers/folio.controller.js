const { Op } = require('sequelize');
const Folio = require('../models/Folio');
const FolioTransaction = require('../models/FolioTransaction');
const AccountCategory = require('../models/AccountCategory');
const ServiceProvider = require('../models/ServiceProvider');
const Contact = require('../models/Contact');
const Property = require('../models/Property');
const { asyncHandler, getPagination } = require('../utils/controllerHelpers');
const { getFolioMode, setFolioMode, folioWhereForBranch } = require('../services/folio.service');

const contactAttrs = ['id', 'full_name', 'primary_phone', 'email'];

exports.settings = asyncHandler(async (req, res) => {
  res.json({ data: { folio_mode: await getFolioMode() } });
});

exports.updateSettings = asyncHandler(async (req, res) => {
  const folio_mode = await setFolioMode(req.body.folio_mode);
  res.json({ data: { folio_mode }, message: 'Folio settings updated.' });
});

exports.list = asyncHandler(async (req, res) => {
  const { limit, offset, page } = getPagination(req);
  const where = { ...folioWhereForBranch(req) };
  if (req.query.type) where.folio_type = req.query.type;
  if (req.query.status) where.status = req.query.status;
  if (req.query.property_id) where.property_id = req.query.property_id;
  if (req.query.contact_id) where.contact_id = req.query.contact_id;
  if (req.query.search) where[Op.or] = [{ folio_code: { [Op.like]: `%${req.query.search}%` } }];
  const { rows, count } = await Folio.findAndCountAll({
    where,
    include: [
      { model: Contact, as: 'contact', attributes: contactAttrs },
      { model: Contact, as: 'owner', attributes: contactAttrs },
      { model: Contact, as: 'tenant', attributes: contactAttrs },
      { model: Property, as: 'property', attributes: ['id', 'property_code', 'title', 'category', 'property_type'] },
    ],
    limit,
    offset,
    order: [['created_at', 'DESC']],
  });
  res.json({ data: rows, pagination: { page, limit, total: count, pages: Math.ceil(count / limit) } });
});

exports.getOne = asyncHandler(async (req, res) => {
  const folio = await Folio.findOne({
    where: { id: req.params.id, ...folioWhereForBranch(req) },
    include: [
      { model: Contact, as: 'contact', attributes: contactAttrs },
      { model: Contact, as: 'owner', attributes: contactAttrs },
      { model: Contact, as: 'tenant', attributes: contactAttrs },
      { model: Property, as: 'property', attributes: ['id', 'property_code', 'title', 'category', 'property_type'] },
    ],
  });
  if (!folio) return res.status(404).json({ error: 'Folio not found.' });
  const transactions = await FolioTransaction.findAll({
    where: { folio_id: folio.id },
    include: [
      { model: AccountCategory, as: 'category', attributes: ['id', 'name', 'code'] },
      { model: ServiceProvider, as: 'provider', attributes: ['id', 'company_name'] },
    ],
    order: [['transaction_date', 'DESC'], ['id', 'DESC']],
    limit: 100,
  });
  res.json({ data: folio, transactions });
});
