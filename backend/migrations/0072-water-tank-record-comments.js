'use strict';

/**
 * Migration 0072: generalise assessment comments into record comments.
 *
 * Comments were tied to site assessments only. Quotations (and later work
 * orders, invoices, complaints) need the same running commentary, so the table
 * becomes entity-addressed: (entity_type, entity_id).
 *
 * wt_assessment_comments is carried over row-for-row and then dropped.
 * Idempotent.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const S = Sequelize;
    const has = async (t) => { try { await queryInterface.describeTable(t); return true; } catch { return false; } };

    if (!(await has('wt_record_comments'))) {
      await queryInterface.createTable('wt_record_comments', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: S.INTEGER, allowNull: false, defaultValue: 1 },
        entity_type: { type: S.STRING(40), allowNull: false },
        entity_id: { type: S.INTEGER, allowNull: false },
        entity_code: S.STRING(30),
        body: { type: S.TEXT, allowNull: false },
        category: { type: S.STRING(40), defaultValue: 'Note' },
        author: S.STRING(120),
        attachment_url: S.STRING(500),
        pinned: { type: S.BOOLEAN, defaultValue: false },
        createdAt: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      });
      try {
        await queryInterface.addIndex('wt_record_comments', ['entity_type', 'entity_id'], { name: 'wt_record_comments_entity' });
      } catch { /* already present */ }
    }

    // carry anything already written against an assessment
    if (await has('wt_assessment_comments')) {
      await queryInterface.sequelize.query(`
        INSERT INTO wt_record_comments
          (branch_id, entity_type, entity_id, entity_code, body, category, author, attachment_url, pinned, createdAt, updatedAt)
        SELECT branch_id, 'site-assessments', assessment_id, assessment_code, body, category, author, attachment_url, pinned, createdAt, updatedAt
        FROM wt_assessment_comments
      `);
      await queryInterface.dropTable('wt_assessment_comments');
    }
  },

  down: async (queryInterface) => {
    try { await queryInterface.dropTable('wt_record_comments'); } catch { /* not present */ }
  },
};
