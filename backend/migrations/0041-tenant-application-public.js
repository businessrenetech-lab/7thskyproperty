'use strict';
/** Public tenant application link + richer application content + employer reference. */
module.exports = {
  async up(queryInterface, Sequelize) {
    const t = await queryInterface.describeTable('tenant_applications');
    const add = async (col, spec) => { if (!t[col]) await queryInterface.addColumn('tenant_applications', col, spec); };
    // Public applicant link
    await add('application_token', { type: Sequelize.STRING(120), allowNull: true, unique: true });
    await add('application_token_expires_at', { type: Sequelize.DATE, allowNull: true });
    await add('submitted_at', { type: Sequelize.DATE, allowNull: true });
    // Content
    await add('business_name', { type: Sequelize.STRING, allowNull: true });
    await add('business_location', { type: Sequelize.STRING, allowNull: true });
    await add('photo_url', { type: Sequelize.STRING, allowNull: true });
    await add('nid_url', { type: Sequelize.STRING, allowNull: true });
    await add('has_pets', { type: Sequelize.BOOLEAN, defaultValue: false });
    await add('pet_types', { type: Sequelize.JSON, allowNull: true });
    await add('declaration_accepted_at', { type: Sequelize.DATE, allowNull: true });
    // Employer reference
    await add('employer_ref_name', { type: Sequelize.STRING, allowNull: true });
    await add('employer_ref_email', { type: Sequelize.STRING, allowNull: true });
    await add('employer_ref_phone', { type: Sequelize.STRING(40), allowNull: true });
    await add('employer_ref_role', { type: Sequelize.STRING, allowNull: true });
    await add('employer_ref_company', { type: Sequelize.STRING, allowNull: true });
    await add('employer_ref_token', { type: Sequelize.STRING(120), allowNull: true, unique: true });
    await add('employer_ref_sent_at', { type: Sequelize.DATE, allowNull: true });
    await add('employer_ref_response', { type: Sequelize.JSON, allowNull: true });
    await add('employer_ref_submitted_at', { type: Sequelize.DATE, allowNull: true });
  },
  async down(queryInterface) {
    for (const col of ['application_token', 'application_token_expires_at', 'submitted_at', 'business_name', 'business_location',
      'photo_url', 'nid_url', 'has_pets', 'pet_types', 'declaration_accepted_at',
      'employer_ref_name', 'employer_ref_email', 'employer_ref_phone', 'employer_ref_role', 'employer_ref_company',
      'employer_ref_token', 'employer_ref_sent_at', 'employer_ref_response', 'employer_ref_submitted_at']) {
      await queryInterface.removeColumn('tenant_applications', col).catch(() => {});
    }
  },
};
