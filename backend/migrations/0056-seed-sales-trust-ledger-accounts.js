'use strict';

module.exports = {
  async up(queryInterface) {
    const [branches] = await queryInterface.sequelize.query('SELECT id FROM branches');
    const definitions = [
      ['1100', 'Client Trust Bank', 'asset', 'trust_bank'],
      ['1110', 'Agency Operating Bank', 'asset', 'operating_bank'],
      ['2100', 'Client Funds Held in Trust', 'liability', 'client_funds'],
      ['4100', 'Sales Commission Revenue', 'revenue', 'sales_commission'],
      ['4110', 'Marketing Revenue', 'revenue', 'marketing_revenue'],
    ];
    for (const branch of branches) {
      for (const [code, name, type, subType] of definitions) {
        const [rows] = await queryInterface.sequelize.query(
          'SELECT id FROM accounts WHERE branch_id = ? AND code = ? LIMIT 1',
          { replacements: [branch.id, code] },
        );
        if (!rows.length) {
          await queryInterface.bulkInsert('accounts', [{ branch_id: branch.id, code, name, type, sub_type: subType, is_active: true, created_at: new Date(), updated_at: new Date() }]);
        }
      }
    }
  },

  async down() {},
};
