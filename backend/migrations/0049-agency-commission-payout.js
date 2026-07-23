'use strict';
/** Agency payouts + commission terms.
 *  - Lets the agency be a payee on a sale settlement (alongside vendor/third party).
 *  - Records HOW a fee was derived (fixed vs % of sale value) and any staff edit,
 *    with the term/reason behind the change.
 *  - Adds the vendor invoice that carries those terms. */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. The agency can be paid out of a settlement (commission + marketing fee).
    // Raw MODIFY: the column is NOT NULL with no default, which changeColumn cannot
    // round-trip (it emits `DEFAULT NULL` and MySQL rejects it).
    const d = await queryInterface.describeTable('sale_disbursements');
    const dType = String(d.payee_type?.type || '');
    if (dType.toLowerCase().includes('enum') && !dType.includes('agency')) {
      const members = [...dType.matchAll(/'([^']+)'/g)].map((m) => m[1]);
      if (!members.includes('agency')) members.push('agency');
      const list = members.map((m) => `'${m}'`).join(',');
      const nullable = d.payee_type.allowNull ? 'NULL' : 'NOT NULL';
      await queryInterface.sequelize.query(`ALTER TABLE sale_disbursements MODIFY COLUMN payee_type ENUM(${list}) ${nullable}`);
    }

    // 2. How the fee was worked out, and what changed if a human edited it.
    const l = await queryInterface.describeTable('sale_settlement_lines');
    const addLine = async (col, spec) => { if (!l[col]) await queryInterface.addColumn('sale_settlement_lines', col, spec); };
    await addLine('fee_basis', { type: Sequelize.ENUM('fixed', 'percent'), allowNull: true });
    await addLine('fee_rate', { type: Sequelize.DECIMAL(6, 2), allowNull: true });          // e.g. 2.50 (%)
    await addLine('fee_basis_amount', { type: Sequelize.DECIMAL(15, 2), allowNull: true }); // sale value the % applied to
    await addLine('auto_amount', { type: Sequelize.DECIMAL(15, 2), allowNull: true });      // what the agreement produced
    await addLine('edit_reason', { type: Sequelize.TEXT, allowNull: true });                // the term behind a change
    await addLine('edited_by', { type: Sequelize.INTEGER, allowNull: true });
    await addLine('edited_at', { type: Sequelize.DATE, allowNull: true });
    await addLine('terms', { type: Sequelize.TEXT, allowNull: true });                      // shown on the vendor invoice

    // 3. The vendor invoice that presents the commission + marketing fee and its terms.
    if (!(await queryInterface.showAllTables()).map(String).includes('sale_vendor_invoices')) {
      await queryInterface.createTable('sale_vendor_invoices', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: Sequelize.INTEGER, allowNull: false },
        settlement_id: { type: Sequelize.INTEGER, allowNull: false },
        transaction_id: { type: Sequelize.INTEGER },
        property_id: { type: Sequelize.INTEGER },
        invoice_code: { type: Sequelize.STRING(40), unique: true },
        vendor_party_id: { type: Sequelize.INTEGER },
        vendor_contact_id: { type: Sequelize.INTEGER },
        vendor_name: { type: Sequelize.STRING },
        sale_value: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
        commission_amount: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
        commission_basis: { type: Sequelize.ENUM('fixed', 'percent'), allowNull: true },
        commission_rate: { type: Sequelize.DECIMAL(6, 2), allowNull: true },
        marketing_fee: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
        other_fees: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
        total_amount: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
        terms: { type: Sequelize.TEXT },
        lines_snapshot: { type: Sequelize.JSON },
        status: { type: Sequelize.ENUM('draft', 'issued', 'paid', 'void'), defaultValue: 'draft' },
        issued_at: { type: Sequelize.DATE },
        issued_by: { type: Sequelize.INTEGER },
        pdf_url: { type: Sequelize.STRING },
        created_by: { type: Sequelize.INTEGER },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      });
      await queryInterface.addIndex('sale_vendor_invoices', ['settlement_id']);
      await queryInterface.addIndex('sale_vendor_invoices', ['branch_id', 'status']);
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('sale_vendor_invoices').catch(() => {});
    for (const c of ['fee_basis', 'fee_rate', 'fee_basis_amount', 'auto_amount', 'edit_reason', 'edited_by', 'edited_at', 'terms']) {
      await queryInterface.removeColumn('sale_settlement_lines', c).catch(() => {});
    }
  },
};
