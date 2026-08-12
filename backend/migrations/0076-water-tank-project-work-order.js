'use strict';

/**
 * SSPC-WTCM-PWO-01 — Project Work Order.
 *
 * The work order stops being a bare assignment record and becomes the signed
 * project document described in "Water Tank CM - Project Work Order V0.2":
 * ten sections covering client details, requested services, tank details, scope,
 * materials, timeline, pricing (A–E), warranty and the project checklist.
 *
 * Section 8 pricing is seeded from the source quotation but stays editable — the
 * agreed price may differ from the quoted price after negotiation (Pricing Note 2).
 * The signing envelope remains the legal record; these columns are the operational
 * projection the console reads and the branded PDF is rendered from.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const S = Sequelize;
    const columns = await queryInterface.describeTable('wt_work_orders');
    const add = async (name, spec) => { if (!columns[name]) await queryInterface.addColumn('wt_work_orders', name, spec); };

    // Section 1 — project information
    await add('quotation_no', S.STRING(40));
    await add('agreement_reference', S.STRING(60));
    await add('date_issued', S.DATEONLY);
    await add('project_manager', S.STRING(120));

    // Section 2 — client details
    await add('client_company', S.STRING(160));
    await add('client_contact_person', S.STRING(120));
    await add('client_phone', S.STRING(40));
    await add('client_email', S.STRING(160));
    await add('site_address', S.TEXT);
    await add('property_type', S.STRING(60));

    // Section 3 — requested services (the eight checkbox families)
    await add('service_selections', S.JSON);

    // Section 4 — tank details
    await add('tank_details', S.JSON);

    // Section 5 — scope of work (scope already exists)
    await add('deliverables', S.TEXT);

    // Section 6 — materials, chemicals, equipment
    await add('materials_required', S.JSON);
    await add('chemicals_required', S.JSON);
    await add('equipment_required', S.JSON);

    // Section 7 — project timeline
    await add('timeline_dates', S.JSON);

    // Section 8 — pricing (lines already exists and holds the selected services)
    await add('material_lines', S.JSON);
    await add('labour_lines', S.JSON);
    await add('cost_summary', S.JSON);
    await add('payment_schedule', S.JSON);
    await add('payment_method', S.STRING(60));
    await add('pricing_notes', S.TEXT);

    // Section 9 — warranty periods
    await add('warranty_terms', S.JSON);

    // Section 10 — project checklist
    await add('project_checklist', S.JSON);

    // two-party signature of the work order itself
    await add('wo_doc_code', S.STRING(40));
    await add('wo_envelope_id', S.INTEGER);
    await add('wo_doc_status', { type: S.STRING(30), allowNull: false, defaultValue: 'Not Started' });
    await add('wo_sent_at', S.DATE);
    await add('wo_signed_at', S.DATE);
    await add('wo_signed_document_html', S.TEXT('long'));
    await add('provider_onboarded_at', S.DATE);
    await add('client_notified_at', S.DATE);

    const indexes = await queryInterface.showIndex('wt_work_orders').catch(() => []);
    const has = (name) => indexes.some((i) => i.name === name);
    if (!has('wt_work_orders_wo_envelope_id')) {
      await queryInterface.addIndex('wt_work_orders', ['wo_envelope_id'], { name: 'wt_work_orders_wo_envelope_id' }).catch(() => {});
    }
  },

  down: async (queryInterface) => {
    const drop = async (name) => { await queryInterface.removeColumn('wt_work_orders', name).catch(() => {}); };
    for (const name of [
      'quotation_no', 'agreement_reference', 'date_issued', 'project_manager',
      'client_company', 'client_contact_person', 'client_phone', 'client_email', 'site_address', 'property_type',
      'service_selections', 'tank_details', 'deliverables',
      'materials_required', 'chemicals_required', 'equipment_required', 'timeline_dates',
      'material_lines', 'labour_lines', 'cost_summary', 'payment_schedule', 'payment_method', 'pricing_notes',
      'warranty_terms', 'project_checklist',
      'wo_doc_code', 'wo_envelope_id', 'wo_doc_status', 'wo_sent_at', 'wo_signed_at', 'wo_signed_document_html',
      'provider_onboarded_at', 'client_notified_at',
    ]) await drop(name);
    await queryInterface.removeIndex('wt_work_orders', 'wt_work_orders_wo_envelope_id').catch(() => {});
  },
};
