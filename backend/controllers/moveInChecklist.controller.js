const MoveInChecklistItem = require('../models/MoveInChecklistItem');
const Tenancy = require('../models/Tenancy');
const Property = require('../models/Property');
const Contact = require('../models/Contact');
const { makeController } = require('./propertyControlCrud');
const { asyncHandler, branchScope } = require('../utils/controllerHelpers');
const { generateCode } = require('../utils/codeGenerator');

const ITEMS = [
  ['Signed tenancy agreement received', 'Signed agreement'],
  ['Advance rent received', 'Receipt'],
  ['Security deposit/bond received', 'Receipt'],
  ['Entry inspection completed', 'Entry inspection report/photos'],
  ['Keys/access handover recorded', 'Key handover form'],
  ['Utility responsibility explained', 'Tenant acknowledgement'],
  ['Occupant declaration completed', 'Occupant list/IDs'],
];

const nextCodesFrom = (baseCode, count) => {
  const match = String(baseCode).match(/^(.*?)(\d+)$/);
  if (!match) return Array.from({ length: count }, (_, i) => `${baseCode}-${i + 1}`);
  const [, prefix, num] = match;
  const start = Number(num);
  return Array.from({ length: count }, (_, i) => `${prefix}${String(start + i).padStart(num.length, '0')}`);
};

const base = makeController({
  Model: MoveInChecklistItem,
  codeField: 'checklist_code',
  codePrefix: 'SSPC-MI-',
  fields: ['tenancy_id', 'property_id', 'tenant_contact_id', 'checklist_item', 'required', 'status', 'evidence_required', 'evidence_url', 'responsible_id', 'notes', 'completed_at', 'sort_order'],
  searchFields: ['checklist_code', 'checklist_item', 'notes'],
  include: [
    { model: Property, as: 'property', attributes: ['id', 'property_code', 'title', 'area', 'district'] },
    { model: Tenancy, as: 'tenancy', attributes: ['id', 'tenancy_code', 'status'] },
    { model: Contact, as: 'tenant', attributes: ['id', 'full_name', 'primary_phone', 'email'] },
  ],
});

base.seedForTenancy = asyncHandler(async (req, res) => {
  const tenancy = await Tenancy.findOne({ where: { id: req.params.tenancyId, ...branchScope(req) } });
  if (!tenancy) return res.status(404).json({ error: 'Tenancy not found.' });
  const existing = await MoveInChecklistItem.count({ where: { tenancy_id: tenancy.id } });
  if (!existing) {
    const firstCode = await generateCode(MoveInChecklistItem, 'checklist_code', 'SSPC-MI-');
    const codes = nextCodesFrom(firstCode, ITEMS.length);
    await MoveInChecklistItem.bulkCreate(ITEMS.map(([item, evidence], i) => ({
      branch_id: tenancy.branch_id,
      checklist_code: codes[i],
      tenancy_id: tenancy.id,
      property_id: tenancy.property_id,
      tenant_contact_id: tenancy.tenant_contact_id,
      checklist_item: item,
      evidence_required: evidence,
      sort_order: i,
      created_by: req.user?.id || null,
    })));
  }
  const rows = await MoveInChecklistItem.findAll({ where: { tenancy_id: tenancy.id }, order: [['sort_order', 'ASC']] });
  res.status(existing ? 200 : 201).json({ data: rows, message: existing ? 'Move-in checklist already exists.' : 'Move-in checklist seeded.' });
});

module.exports = base;
