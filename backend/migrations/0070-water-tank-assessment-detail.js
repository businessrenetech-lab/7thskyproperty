'use strict';

/**
 * Migration 0070: richer site assessments.
 *
 *   wt_assessment_comments   threaded notes/observations against an assessment
 *   wt_site_assessments      custom_checks  — checklist items an assessor adds
 *                                             on top of the 9 standard ones
 *                            equipment      — plant/PPE used on the visit
 *                            weather / duration / attendees — visit context
 *                            client_present / client_signature — sign-off detail
 *                            template_key   — which checklist template was used
 *
 * Idempotent.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const S = Sequelize;
    const has = async (t) => { try { await queryInterface.describeTable(t); return true; } catch { return false; } };
    const hasCol = async (t, c) => { try { return !!(await queryInterface.describeTable(t))[c]; } catch { return false; } };

    if (!(await has('wt_assessment_comments'))) await queryInterface.createTable('wt_assessment_comments', {
      id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: { type: S.INTEGER, allowNull: false, defaultValue: 1 },
      assessment_id: { type: S.INTEGER, allowNull: false },
      assessment_code: S.STRING(30),
      body: { type: S.TEXT, allowNull: false },
      category: { type: S.STRING(40), defaultValue: 'Note' }, // Note | Observation | Risk | Client Request | Follow-up
      author: S.STRING(120),
      attachment_url: S.STRING(500),
      pinned: { type: S.BOOLEAN, defaultValue: false },
      createdAt: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
    });
    try { await queryInterface.addIndex('wt_assessment_comments', ['assessment_id'], { name: 'wt_assessment_comments_assessment' }); } catch { /* present */ }

    const cols = {
      custom_checks: S.JSON,
      equipment: S.JSON,
      attendees: S.STRING(255),
      weather: S.STRING(80),
      duration_minutes: { type: S.INTEGER, defaultValue: 0 },
      client_present: { type: S.BOOLEAN, defaultValue: false },
      client_signature: S.STRING(500),
      template_key: S.STRING(60),
    };
    for (const [col, spec] of Object.entries(cols)) {
      if (!(await hasCol('wt_site_assessments', col))) await queryInterface.addColumn('wt_site_assessments', col, spec);
    }
  },

  down: async (queryInterface) => {
    try { await queryInterface.dropTable('wt_assessment_comments'); } catch { /* not present */ }
    for (const c of ['custom_checks', 'equipment', 'attendees', 'weather', 'duration_minutes', 'client_present', 'client_signature', 'template_key']) {
      try { await queryInterface.removeColumn('wt_site_assessments', c); } catch { /* not present */ }
    }
  },
};
