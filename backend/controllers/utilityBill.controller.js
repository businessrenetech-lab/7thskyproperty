const UtilityBill = require('../models/UtilityBill');
const { makeController } = require('./propertyControlCrud');

module.exports = makeController({
  Model: UtilityBill,
  codeField: 'utility_code',
  codePrefix: 'SSPC-UTIL-',
  fields: ['property_id', 'tenancy_id', 'tenant_contact_id', 'owner_contact_id', 'utility_type', 'responsibility', 'provider', 'bill_period', 'amount', 'due_date', 'paid_by', 'payment_status', 'evidence_url', 'notes', 'invoice_id', 'landlord_bill_id'],
  searchFields: ['utility_code', 'provider', 'bill_period', 'notes'],
});
