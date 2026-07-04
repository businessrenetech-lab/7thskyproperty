const PropertyRisk = require('../models/PropertyRisk');
const { makeController } = require('./propertyControlCrud');

module.exports = makeController({
  Model: PropertyRisk,
  codeField: 'risk_code',
  codePrefix: 'SSPC-RISK-',
  fields: ['property_id', 'tenancy_id', 'owner_contact_id', 'tenant_contact_id', 'risk_category', 'description', 'likelihood', 'impact', 'risk_rating', 'mitigation', 'owner_user_id', 'review_date', 'status'],
  searchFields: ['risk_code', 'risk_category', 'description', 'mitigation'],
});
