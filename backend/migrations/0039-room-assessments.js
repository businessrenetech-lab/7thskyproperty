'use strict';
/** Room-by-room assessment checklist: Clean/Undamaged/Working per item,
 *  multi-photo, completion report URL, and PropertyDocument 'assessment' type. */
module.exports = {
  async up(queryInterface, Sequelize) {
    const items = await queryInterface.describeTable('rental_assessment_items');
    if (!items.is_clean) await queryInterface.addColumn('rental_assessment_items', 'is_clean', { type: Sequelize.BOOLEAN, allowNull: true });
    if (!items.is_undamaged) await queryInterface.addColumn('rental_assessment_items', 'is_undamaged', { type: Sequelize.BOOLEAN, allowNull: true });
    if (!items.is_working) await queryInterface.addColumn('rental_assessment_items', 'is_working', { type: Sequelize.BOOLEAN, allowNull: true });
    if (!items.photos) await queryInterface.addColumn('rental_assessment_items', 'photos', { type: Sequelize.JSON, allowNull: true });

    const header = await queryInterface.describeTable('rental_assessments');
    if (!header.report_url) await queryInterface.addColumn('rental_assessments', 'report_url', { type: Sequelize.STRING, allowNull: true });

    // Append 'assessment' to property_documents.entity_type (append-only, guarded).
    const docs = await queryInterface.describeTable('property_documents');
    const typeStr = String(docs.entity_type?.type || '');
    if (typeStr.toLowerCase().includes('enum') && !typeStr.includes('assessment')) {
      const members = [...typeStr.matchAll(/'([^']+)'/g)].map((m) => m[1]);
      members.push('assessment');
      await queryInterface.changeColumn('property_documents', 'entity_type', {
        type: Sequelize.ENUM(...members), allowNull: docs.entity_type.allowNull, defaultValue: docs.entity_type.defaultValue || 'property',
      });
    }
  },
  async down(queryInterface) {
    for (const col of ['is_clean', 'is_undamaged', 'is_working', 'photos']) {
      await queryInterface.removeColumn('rental_assessment_items', col).catch(() => {});
    }
    await queryInterface.removeColumn('rental_assessments', 'report_url').catch(() => {});
  },
};
