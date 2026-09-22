// Every sales-engine agreement type, by side. The ONE list: signature handling,
// fee invoicing, agency fees and invoice scoping all read it, so a new category
// can't be forgotten in one of them.
const SALE_SIDE = ['sale_sale_agreement', 'commercial_sale_agreement', 'business_sale_agreement'];
const PURCHASE_SIDE = ['sale_purchase_agreement', 'commercial_purchase_agreement', 'business_purchase_agreement'];
const ALL_SALES_AGREEMENTS = [...PURCHASE_SIDE, ...SALE_SIDE];

module.exports = { SALE_SIDE, PURCHASE_SIDE, ALL_SALES_AGREEMENTS };
