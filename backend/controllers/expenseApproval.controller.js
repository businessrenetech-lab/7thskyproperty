const ExpenseApproval = require('../models/ExpenseApproval');
const WorkOrder = require('../models/WorkOrder');
const Property = require('../models/Property');
const Contact = require('../models/Contact');
const { makeController } = require('./propertyControlCrud');

module.exports = makeController({
  Model: ExpenseApproval,
  codeField: 'expense_code',
  codePrefix: 'SSPC-EXP-',
  fields: ['property_id', 'owner_contact_id', 'work_order_id', 'landlord_bill_id', 'expense_type', 'description', 'estimated_amount', 'approved_amount', 'owner_approval_required', 'approval_method', 'approved_by', 'approval_date', 'invoice_received', 'deduct_from_rent', 'status', 'notes'],
  searchFields: ['expense_code', 'expense_type', 'description', 'notes'],
  include: [
    { model: Property, as: 'property', attributes: ['id', 'property_code', 'title', 'area', 'district'] },
    { model: Contact, as: 'owner', attributes: ['id', 'full_name', 'primary_phone', 'email'] },
    { model: WorkOrder, as: 'workOrder', attributes: ['id', 'work_order_code', 'title', 'status'] },
  ],
});
