const crypto = require('crypto');
const Invoice = require('../models/Invoice');

const isUniqueInvoiceNoError = (error) => {
  if (error?.name !== 'SequelizeUniqueConstraintError') return false;
  const fields = error.fields || {};
  if (Array.isArray(fields)) return fields.includes('invoice_no') || fields.includes('invoiceNo');
  return Boolean(fields.invoice_no || fields.invoiceNo || fields['invoice_no']);
};

const generateInvoiceNo = ({ prefix = 'INV', branchId } = {}) => {
  const year = new Date().getFullYear();
  const branchPart = branchId ? `-${branchId}` : '';
  const timePart = Date.now().toString(36).toUpperCase();
  const entropy = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}${branchPart}-${year}-${timePart}-${entropy}`;
};

const createInvoiceWithGeneratedNo = async (payload, options = {}, numberOptions = {}) => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await Invoice.create({
        ...payload,
        invoice_no: generateInvoiceNo({ branchId: payload.branch_id, ...numberOptions }),
      }, options);
    } catch (error) {
      if (!isUniqueInvoiceNoError(error) || attempt === 4) throw error;
    }
  }

  throw new Error('Failed to generate a unique invoice number');
};

module.exports = { createInvoiceWithGeneratedNo, generateInvoiceNo };
