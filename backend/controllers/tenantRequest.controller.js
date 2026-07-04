const TenantRequest = require('../models/TenantRequest');
const WorkOrder = require('../models/WorkOrder');
const Property = require('../models/Property');
const Contact = require('../models/Contact');
const Tenancy = require('../models/Tenancy');
const { makeController } = require('./propertyControlCrud');

module.exports = makeController({
  Model: TenantRequest,
  codeField: 'request_code',
  codePrefix: 'SSPC-TR-',
  fields: ['tenant_contact_id', 'property_id', 'tenancy_id', 'work_order_id', 'request_date', 'request_type', 'details', 'priority', 'assigned_to', 'owner_approval_required', 'status', 'resolution_notes'],
  searchFields: ['request_code', 'details', 'resolution_notes'],
  include: [
    { model: Property, as: 'property', attributes: ['id', 'property_code', 'title', 'area', 'district'] },
    { model: Tenancy, as: 'tenancy', attributes: ['id', 'tenancy_code', 'status'] },
    { model: Contact, as: 'tenant', attributes: ['id', 'full_name', 'primary_phone', 'email'] },
    { model: WorkOrder, as: 'workOrder', attributes: ['id', 'work_order_code', 'title', 'status'] },
  ],
  defaults: { request_date: new Date().toISOString().slice(0, 10) },
});
