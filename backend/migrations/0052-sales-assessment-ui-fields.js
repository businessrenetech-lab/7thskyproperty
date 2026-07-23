'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const addMissing = async (table, columns) => {
      const current = await queryInterface.describeTable(table);
      for (const [name, definition] of Object.entries(columns)) {
        if (!current[name]) await queryInterface.addColumn(table, name, definition);
      }
    };

    await addMissing('sale_assessments', {
      inspector_name: { type: Sequelize.STRING, allowNull: true },
      occupancy_status: { type: Sequelize.STRING(40), allowNull: true },
      marketability_score: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
    });

    await addMissing('sale_assessment_items', {
      is_clean: { type: Sequelize.BOOLEAN, allowNull: true },
      is_undamaged: { type: Sequelize.BOOLEAN, allowNull: true },
      is_working: { type: Sequelize.BOOLEAN, allowNull: true },
    });

    await addMissing('sale_appraisals', {
      approved_value: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      reserve_value: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      quick_sale_value: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      expected_days: { type: Sequelize.INTEGER, allowNull: true },
      strengths: { type: Sequelize.JSON, allowNull: true },
      weaknesses: { type: Sequelize.JSON, allowNull: true },
    });
  },

  async down(queryInterface) {
    const removeExisting = async (table, columns) => {
      const current = await queryInterface.describeTable(table);
      for (const name of columns) {
        if (current[name]) await queryInterface.removeColumn(table, name);
      }
    };

    await removeExisting('sale_appraisals', [
      'weaknesses',
      'strengths',
      'expected_days',
      'quick_sale_value',
      'reserve_value',
      'approved_value',
    ]);
    await removeExisting('sale_assessment_items', ['is_working', 'is_undamaged', 'is_clean']);
    await removeExisting('sale_assessments', ['marketability_score', 'occupancy_status', 'inspector_name']);
  },
};
