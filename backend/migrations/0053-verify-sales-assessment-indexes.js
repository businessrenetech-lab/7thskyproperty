'use strict';

module.exports = {
  async up(queryInterface) {
    const definitions = [
      ['sale_assessments', 'uq_sale_assessments_property', ['property_id'], true],
      ['sale_assessments', 'idx_sale_assessments_branch_status', ['branch_id', 'status'], false],
      ['sale_appraisals', 'uq_sale_appraisals_branch_assessment', ['branch_id', 'assessment_id'], true],
      ['sale_proposals', 'uq_sale_proposals_branch_number', ['branch_id', 'proposal_number'], true],
      ['sale_report_versions', 'uq_sale_report_versions_appraisal', ['branch_id', 'appraisal_id', 'version_number'], true],
      ['sale_report_versions', 'uq_sale_report_versions_proposal', ['branch_id', 'proposal_id', 'version_number'], true],
    ];

    for (const [table, name, fields, unique] of definitions) {
      const indexes = await queryInterface.showIndex(table);
      if (!indexes.some((index) => index.name === name)) {
        await queryInterface.addIndex(table, fields, { name, unique });
      }
    }
  },

  async down() {
    // These constraints may have been created by 0051; never remove them on rollback.
  },
};
