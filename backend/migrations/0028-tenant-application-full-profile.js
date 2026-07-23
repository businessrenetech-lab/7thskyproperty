'use strict';

/**
 * Capture the full tenant application profile submitted by applicants.
 * Website listing applications will reuse these fields when that public form ships.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { STRING, TEXT, DATEONLY, DECIMAL, INTEGER, JSON: JSONT } = Sequelize;
    const qi = queryInterface;
    const addCol = async (table, col, spec) => {
      const desc = await qi.describeTable(table).catch(() => ({}));
      if (!desc[col]) await qi.addColumn(table, col, spec);
    };

    await addCol('tenant_applications', 'proposed_monthly_rent', { type: DECIMAL(15, 2) });
    await addCol('tenant_applications', 'proposed_service_charge', { type: DECIMAL(15, 2) });
    await addCol('tenant_applications', 'proposed_security_deposit', { type: DECIMAL(15, 2) });
    await addCol('tenant_applications', 'proposed_advance_rent', { type: DECIMAL(15, 2) });
    await addCol('tenant_applications', 'proposed_lease_term_months', { type: INTEGER });
    await addCol('tenant_applications', 'proposed_lease_start', { type: DATEONLY });

    await addCol('tenant_applications', 'current_address', { type: TEXT });
    await addCol('tenant_applications', 'permanent_address', { type: TEXT });
    await addCol('tenant_applications', 'current_landlord_name', { type: STRING });
    await addCol('tenant_applications', 'current_landlord_phone', { type: STRING });
    await addCol('tenant_applications', 'current_tenancy_address', { type: TEXT });
    await addCol('tenant_applications', 'current_tenancy_rent', { type: DECIMAL(15, 2) });
    await addCol('tenant_applications', 'current_tenancy_duration', { type: STRING });
    await addCol('tenant_applications', 'reason_for_moving', { type: TEXT });

    await addCol('tenant_applications', 'employment_type', { type: STRING });
    await addCol('tenant_applications', 'job_title', { type: STRING });
    await addCol('tenant_applications', 'work_address', { type: TEXT });
    await addCol('tenant_applications', 'employment_duration', { type: STRING });
    await addCol('tenant_applications', 'other_income', { type: DECIMAL(15, 2) });
    await addCol('tenant_applications', 'income_source_notes', { type: TEXT });

    await addCol('tenant_applications', 'references', { type: JSONT, defaultValue: [] });
    await addCol('tenant_applications', 'emergency_contact_name', { type: STRING });
    await addCol('tenant_applications', 'emergency_contact_phone', { type: STRING });
    await addCol('tenant_applications', 'emergency_contact_relationship', { type: STRING });
    await addCol('tenant_applications', 'emergency_contact_address', { type: TEXT });

    await addCol('tenant_applications', 'date_of_birth', { type: DATEONLY });
    await addCol('tenant_applications', 'nationality', { type: STRING });
    await addCol('tenant_applications', 'nid_number', { type: STRING });
    await addCol('tenant_applications', 'passport_number', { type: STRING });
    await addCol('tenant_applications', 'kyc_documents', { type: JSONT, defaultValue: [] });
    await addCol('tenant_applications', 'kyc_notes', { type: TEXT });
  },

  async down(queryInterface) {
    const cols = [
      'proposed_monthly_rent', 'proposed_service_charge', 'proposed_security_deposit', 'proposed_advance_rent',
      'proposed_lease_term_months', 'proposed_lease_start', 'current_address', 'permanent_address',
      'current_landlord_name', 'current_landlord_phone', 'current_tenancy_address', 'current_tenancy_rent',
      'current_tenancy_duration', 'reason_for_moving', 'employment_type', 'job_title', 'work_address',
      'employment_duration', 'other_income', 'income_source_notes', 'references', 'emergency_contact_name',
      'emergency_contact_phone', 'emergency_contact_relationship', 'emergency_contact_address', 'date_of_birth',
      'nationality', 'nid_number', 'passport_number', 'kyc_documents', 'kyc_notes',
    ];
    for (const col of cols) await queryInterface.removeColumn('tenant_applications', col).catch(() => {});
  },
};
