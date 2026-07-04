const AccountCategory = require('../models/AccountCategory');
const InvoiceItem = require('../models/InvoiceItem');
const PropertyInvoice = require('../models/PropertyInvoice');
const RentalReceipt = require('../models/RentalReceipt');
const Tenancy = require('../models/Tenancy');
const sequelize = require('../config/db.config');
const { generateCode } = require('../utils/codeGenerator');
const { ensureFoliosForTenancy, findBestLandlordFolio, postFolioTransaction } = require('./folio.service');

const num = (v) => Number(v || 0);
const currentPeriod = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

async function generateMonthlyRentalReceipts({ period_label = currentPeriod(), receipt_day = 5, created_by = null } = {}) {
  const rentCategory = await AccountCategory.findOne({ where: { code: 'RENT' } });
  const tenancies = await Tenancy.findAll({ where: { status: 'active' } });
  let created = 0;
  let skipped = 0;

  for (const tenancy of tenancies) {
    const existing = await RentalReceipt.findOne({ where: { tenancy_id: tenancy.id, period_label } });
    const total = num(tenancy.monthly_rent) + num(tenancy.service_charge);
    if (existing || !tenancy.tenant_contact_id || total <= 0) { skipped++; continue; }

    await sequelize.transaction(async (tx) => {
      const folios = await ensureFoliosForTenancy(tenancy, { transaction: tx });
      const landlordFolio = await findBestLandlordFolio(tenancy.owner_contact_id, tenancy.property_id, { transaction: tx });
      const dueDate = `${period_label}-${String(receipt_day).padStart(2, '0')}`;
      const receipt = await RentalReceipt.create({
        branch_id: tenancy.branch_id,
        receipt_code: await generateCode(RentalReceipt, 'receipt_code', 'SSPC-RR-'),
        period_label,
        tenancy_id: tenancy.id,
        tenant_contact_id: tenancy.tenant_contact_id,
        landlord_contact_id: tenancy.owner_contact_id,
        property_id: tenancy.property_id,
        tenant_folio_id: folios.tenantFolio?.id || null,
        landlord_folio_id: landlordFolio?.id || null,
        rent_amount: num(tenancy.monthly_rent),
        service_charge: num(tenancy.service_charge),
        total_amount: total,
        balance: total,
        due_date: dueDate,
        created_by,
      }, { transaction: tx });

      const invoice = await PropertyInvoice.create({
        branch_id: tenancy.branch_id,
        invoice_code: await generateCode(PropertyInvoice, 'invoice_code', 'SSPC-IN-'),
        invoice_kind: 'client',
        invoice_type: 'rental_receipt',
        contact_id: tenancy.tenant_contact_id,
        property_id: tenancy.property_id,
        tenancy_id: tenancy.id,
        folio_id: folios.tenantFolio?.id || null,
        account_category_id: rentCategory?.id || null,
        billed_to_type: 'tenant',
        service_for: 'tenancy',
        title: `Rental receipt ${period_label}`,
        subtotal: total,
        total,
        balance: total,
        amount_paid: 0,
        status: 'sent',
        issue_date: new Date(),
        due_date: dueDate,
        notes: `Rental receipt ${period_label}`,
        source_receipt_id: receipt.id,
        created_by,
      }, { transaction: tx });

      await InvoiceItem.create({
        invoice_id: invoice.id,
        description: `Rental receipt ${period_label}`,
        quantity: 1,
        unit_price: total,
        amount: total,
        account_category_id: rentCategory?.id || null,
        property_id: tenancy.property_id,
        tenancy_id: tenancy.id,
        billable_to_tenant: true,
      }, { transaction: tx });

      if (folios.tenantFolio) {
        await postFolioTransaction({
          folio_id: folios.tenantFolio.id,
          transaction_type: 'invoice',
          bucket: 'rent',
          account_category_id: rentCategory?.id || null,
          invoice_id: invoice.id,
          property_id: tenancy.property_id,
          tenancy_id: tenancy.id,
          description: `Rental receipt ${period_label}`,
          debit: total,
          created_by,
        }, { transaction: tx });
      }
      await receipt.update({ invoice_id: invoice.id }, { transaction: tx });
    });
    created++;
  }
  return { period_label, created, skipped };
}

function startRentalReceiptScheduler() {
  const runIfFifth = async () => {
    const today = new Date();
    if (today.getDate() !== 5) return;
    try {
      const result = await generateMonthlyRentalReceipts({ period_label: currentPeriod(), receipt_day: 5 });
      console.log(`[RentalReceiptScheduler] ${result.period_label}: created=${result.created}, skipped=${result.skipped}`);
    } catch (err) {
      console.warn(`[RentalReceiptScheduler] skipped: ${err.message}`);
    }
  };
  runIfFifth();
  setInterval(runIfFifth, 24 * 60 * 60 * 1000);
}

module.exports = { generateMonthlyRentalReceipts, startRentalReceiptScheduler };
