const ArrearsAction = require('../models/ArrearsAction');
const { makeController } = require('./propertyControlCrud');

module.exports = makeController({
  Model: ArrearsAction,
  codeField: 'arrears_code',
  codePrefix: 'SSPC-ARR-',
  fields: ['rental_ledger_id', 'property_id', 'owner_contact_id', 'tenant_contact_id', 'due_date', 'amount_due', 'amount_received', 'outstanding_amount', 'days_overdue', 'reminder_stage', 'reminder_sent_at', 'notice_issued', 'escalation_level', 'action_required', 'status', 'notes'],
  searchFields: ['arrears_code', 'action_required', 'notes'],
});
