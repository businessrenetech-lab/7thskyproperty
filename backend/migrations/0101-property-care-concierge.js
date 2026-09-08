'use strict';

/**
 * Migration 0101: Property Care & Concierge — line-specific registers, plus damage
 * columns on the shared incident register.
 *
 *   wt_property_assets     — per-property asset & maintenance register (next-service-due).
 *   wt_access_declarations — key/alarm/pets/valuables/restricted-areas declaration.
 *   wt_property_visits     — concierge Entry/Opening & Exit/Closing checklists.
 *   wt_utility_requests    — utility bill / connection assistance register.
 *   wt_incidents           — additive damage columns (pre_existing, estimated_cost,
 *                            responsibility, rectification_action) so the existing
 *                            shared incident register doubles as the Property Damage register.
 *
 * Additive and idempotent. addColumn/createTable failures are logged, not swallowed
 * (lesson from 0100, where a swallowed addColumn left the table partially migrated).
 */
module.exports = {
  up: async (q, S) => {
    const ts = {
      createdAt: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
    };
    const idBranchLine = {
      id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: { type: S.INTEGER, allowNull: false, defaultValue: 1 },
      service_line: { type: S.STRING(40), allowNull: false, defaultValue: 'property_care_concierge' },
    };
    const mkIndex = async (table) => {
      await q.addIndex(table, ['branch_id', 'service_line'], { name: `${table}_service_line` }).catch(() => {});
    };

    if (!(await q.describeTable('wt_property_assets').catch(() => null))) {
      await q.createTable('wt_property_assets', {
        ...idBranchLine,
        code: { type: S.STRING(30), allowNull: false },
        client_id: { type: S.INTEGER, allowNull: false },
        client_code: S.STRING(40), property_address: S.STRING(400),
        area: S.STRING(120), category: S.STRING(80), brand_model: S.STRING(160), serial_no: S.STRING(120),
        condition: S.STRING(40), last_service_date: S.DATEONLY, next_service_due: S.DATEONLY, warranty_expiry: S.DATEONLY,
        responsible_tech: S.STRING(120), maintenance_requirement: S.TEXT,
        est_cost: { type: S.DECIMAL(15, 2), defaultValue: 0 }, photo_url: S.STRING(500),
        status: { type: S.STRING(30), allowNull: false, defaultValue: 'Active' }, notes: S.TEXT,
        ...ts,
      }).catch((e) => console.warn('[0101] create wt_property_assets:', e.message));
      await mkIndex('wt_property_assets');
      await q.addIndex('wt_property_assets', ['client_id'], { name: 'wt_property_assets_client' }).catch(() => {});
    }

    if (!(await q.describeTable('wt_access_declarations').catch(() => null))) {
      await q.createTable('wt_access_declarations', {
        ...idBranchLine,
        code: { type: S.STRING(30), allowNull: false },
        client_id: { type: S.INTEGER, allowNull: false },
        client_code: S.STRING(40), property_address: S.STRING(400),
        key_access_method: S.STRING(160),
        alarm_managed: { type: S.BOOLEAN, defaultValue: false }, alarm_notes: S.STRING(255),
        pets: S.STRING(255), vulnerable_persons: S.STRING(255), known_hazards: S.TEXT, restricted_areas: S.TEXT,
        valuables_secured: { type: S.BOOLEAN, defaultValue: false },
        client_authorisation: { type: S.BOOLEAN, defaultValue: false },
        declaration_date: S.DATEONLY, notes: S.TEXT,
        ...ts,
      }).catch((e) => console.warn('[0101] create wt_access_declarations:', e.message));
      await mkIndex('wt_access_declarations');
      await q.addIndex('wt_access_declarations', ['client_id'], { name: 'wt_access_declarations_client' }).catch(() => {});
    }

    if (!(await q.describeTable('wt_property_visits').catch(() => null))) {
      await q.createTable('wt_property_visits', {
        ...idBranchLine,
        code: { type: S.STRING(30), allowNull: false },
        client_id: { type: S.INTEGER, allowNull: false },
        client_code: S.STRING(40), work_order_code: S.STRING(40), property_address: S.STRING(400),
        visit_type: { type: S.STRING(20), allowNull: false, defaultValue: 'Entry' }, visit_date: S.DATEONLY,
        access_method: S.STRING(160), condition: S.STRING(255), meter_readings: S.STRING(255),
        security_check: { type: S.BOOLEAN, defaultValue: false }, doors_locked: { type: S.BOOLEAN, defaultValue: false },
        alarm_activated: { type: S.BOOLEAN, defaultValue: false }, keys_returned: { type: S.BOOLEAN, defaultValue: false },
        photos: S.TEXT, issues: S.TEXT, completed_by: S.STRING(120), notes: S.TEXT,
        ...ts,
      }).catch((e) => console.warn('[0101] create wt_property_visits:', e.message));
      await mkIndex('wt_property_visits');
      await q.addIndex('wt_property_visits', ['client_id'], { name: 'wt_property_visits_client' }).catch(() => {});
    }

    if (!(await q.describeTable('wt_utility_requests').catch(() => null))) {
      await q.createTable('wt_utility_requests', {
        ...idBranchLine,
        code: { type: S.STRING(30), allowNull: false },
        client_id: { type: S.INTEGER, allowNull: false },
        client_code: S.STRING(40), property_address: S.STRING(400),
        utility_type: S.STRING(60), service_request: S.STRING(60), provider: S.STRING(160), account_ref: S.STRING(120),
        request_date: S.DATEONLY, required_date: S.DATEONLY,
        amount: { type: S.DECIMAL(15, 2), defaultValue: 0 }, client_approval: { type: S.BOOLEAN, defaultValue: false },
        completion_date: S.DATEONLY,
        status: { type: S.STRING(30), allowNull: false, defaultValue: 'Requested' }, notes: S.TEXT,
        ...ts,
      }).catch((e) => console.warn('[0101] create wt_utility_requests:', e.message));
      await mkIndex('wt_utility_requests');
      await q.addIndex('wt_utility_requests', ['client_id'], { name: 'wt_utility_requests_client' }).catch(() => {});
    }

    // Property Damage register = the shared incident register + these damage columns.
    const incCols = {
      pre_existing: { type: S.BOOLEAN, defaultValue: false },
      estimated_cost: { type: S.DECIMAL(15, 2), defaultValue: 0 },
      responsibility: S.STRING(120),
      rectification_action: S.TEXT,
    };
    const incDesc = await q.describeTable('wt_incidents').catch(() => null);
    if (incDesc) {
      for (const [col, def] of Object.entries(incCols)) {
        // `def` may be a bare type (S.STRING/S.TEXT) or a full attribute object
        // ({ type, defaultValue }). Normalise so addColumn always receives an
        // attribute object with a `type` — wrapping an attribute object as a type
        // is what produced the "[object Object]" SQL error on the first run.
        const attr = (def && def.type) ? { ...def, allowNull: true } : { type: def, allowNull: true };
        if (!incDesc[col]) {
          await q.addColumn('wt_incidents', col, attr)
            .catch((e) => console.warn(`[0101] addColumn wt_incidents.${col} skipped:`, e.message));
        }
      }
    }
  },
  down: async (q) => {
    await q.dropTable('wt_utility_requests').catch(() => {});
    await q.dropTable('wt_property_visits').catch(() => {});
    await q.dropTable('wt_access_declarations').catch(() => {});
    await q.dropTable('wt_property_assets').catch(() => {});
    for (const col of ['pre_existing', 'estimated_cost', 'responsibility', 'rectification_action']) {
      await q.removeColumn('wt_incidents', col).catch(() => {});
    }
  },
};
