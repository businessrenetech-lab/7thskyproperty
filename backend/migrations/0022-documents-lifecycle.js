'use strict';

/**
 * 0022 — Documents lifecycle.
 *
 * Extends property_documents into a polymorphic document store: any entity
 * (property/owner/tenant/tenancy/application/work_order/inspection/statement)
 * can attach documents with visibility scoping (staff/owner/tenant/provider).
 *
 * property_id stays for backwards compat but is nullable; entity_type+entity_id
 * is the canonical link.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { INTEGER, STRING, ENUM, BOOLEAN, DATEONLY, TEXT } = Sequelize;
    const qi = queryInterface;
    const addCol = async (t, c, spec) => {
      const desc = await qi.describeTable(t).catch(() => ({}));
      if (!desc[c]) await qi.addColumn(t, c, spec);
    };

    await addCol('property_documents', 'entity_type', { type: ENUM('property', 'owner', 'tenant', 'tenancy', 'application', 'work_order', 'inspection', 'statement', 'settlement'), defaultValue: 'property' });
    await addCol('property_documents', 'entity_id', { type: INTEGER });
    await addCol('property_documents', 'visibility', { type: ENUM('staff', 'owner', 'tenant', 'provider', 'public'), defaultValue: 'staff' });
    await addCol('property_documents', 'expiry_date', { type: DATEONLY });
    await addCol('property_documents', 'signature_status', { type: ENUM('not_required', 'pending', 'signed', 'expired'), defaultValue: 'not_required' });
    await addCol('property_documents', 'required_for', { type: STRING }); // e.g., "onboarding", "lease", "renewal"
    await addCol('property_documents', 'description', { type: TEXT });

    // Make property_id nullable so we can attach docs to owner/tenant records without a property
    await qi.changeColumn('property_documents', 'property_id', { type: INTEGER, allowNull: true }).catch(() => {});

    // Backfill entity_type/id for existing rows (all are 'property' by default)
    await qi.sequelize.query(`UPDATE property_documents SET entity_type = 'property', entity_id = property_id WHERE entity_id IS NULL`);

    await qi.addIndex('property_documents', ['entity_type', 'entity_id'], { name: 'idx_docs_entity' }).catch(() => {});
    await qi.addIndex('property_documents', ['visibility']).catch(() => {});
  },

  async down(queryInterface) {
    const cols = ['entity_type', 'entity_id', 'visibility', 'expiry_date', 'signature_status', 'required_for', 'description'];
    for (const c of cols) await queryInterface.removeColumn('property_documents', c).catch(() => {});
  },
};
