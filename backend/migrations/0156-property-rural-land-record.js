'use strict';

// Rural land record (CRM workbook, Owner Sheet 2). Additive and nullable:
// residential, commercial and business properties are untouched and read as
// "not recorded". `union_name` avoids the SQL reserved word UNION.
const COLUMNS = {
  upazila: 'STRING',
  union_name: 'STRING',
  village: 'STRING',
  mouza: 'STRING',
  khatiyan: 'STRING',
  dag: 'STRING',
  land_area_decimal: 'DECIMAL',
  current_use: 'STRING',
};

module.exports = {
  async up(queryInterface, Sequelize) {
    const t = await queryInterface.describeTable('properties');
    for (const [name, type] of Object.entries(COLUMNS)) {
      if (!t[name]) {
        await queryInterface.addColumn('properties', name, {
          type: type === 'DECIMAL' ? Sequelize.DECIMAL(12, 3) : Sequelize.STRING,
          allowNull: true,
        });
      }
    }
    // The console searches on these, so index the two that narrow a search most.
    const idx = await queryInterface.showIndex('properties');
    const names = idx.map((i) => i.name);
    if (!names.includes('properties_upazila')) {
      await queryInterface.addIndex('properties', ['upazila'], { name: 'properties_upazila' });
    }
    if (!names.includes('properties_mouza')) {
      await queryInterface.addIndex('properties', ['mouza'], { name: 'properties_mouza' });
    }
  },
  async down(queryInterface) {
    const t = await queryInterface.describeTable('properties');
    for (const name of Object.keys(COLUMNS)) {
      if (t[name]) await queryInterface.removeColumn('properties', name);
    }
  },
};
