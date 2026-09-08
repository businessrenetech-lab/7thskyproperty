'use strict';

/**
 * Migration 0100: Removal & Relocation — internal Team & Fleet, Inventory, and the
 * work-order columns for Resource Allocation, pickup/drop-off, and delay charges.
 *
 *   wt_crew, wt_vehicles, wt_inventory_items — new tables (service_line-tagged).
 *   wt_work_orders — additive columns: pickup/drop-off addresses + access,
 *     scheduled move date, allocated crew/vehicle ids, optional external provider
 *     (name/fee/disbursed), delay hours/charge, allocation stamps.
 *   wt_site_assessments — pickup/drop-off addresses for the site inspection.
 *
 * Additive and idempotent. Timestamps use createdAt/updatedAt to match wt_* tables.
 */
module.exports = {
  up: async (q, S) => {
    const ts = {
      createdAt: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
    };

    if (!(await q.describeTable('wt_crew').catch(() => null))) {
      await q.createTable('wt_crew', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: S.INTEGER, allowNull: false, defaultValue: 1 },
        service_line: { type: S.STRING(40), allowNull: false, defaultValue: 'removal_relocation' },
        code: { type: S.STRING(30), allowNull: false },
        name: { type: S.STRING(160), allowNull: false },
        role: S.STRING(60), phone: S.STRING(60), email: S.STRING(160), skills: S.TEXT,
        status: { type: S.STRING(30), allowNull: false, defaultValue: 'Active' }, notes: S.TEXT,
        ...ts,
      });
      await q.addIndex('wt_crew', ['branch_id', 'service_line'], { name: 'wt_crew_service_line' }).catch(() => {});
    }

    if (!(await q.describeTable('wt_vehicles').catch(() => null))) {
      await q.createTable('wt_vehicles', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: S.INTEGER, allowNull: false, defaultValue: 1 },
        service_line: { type: S.STRING(40), allowNull: false, defaultValue: 'removal_relocation' },
        code: { type: S.STRING(30), allowNull: false },
        reg_no: S.STRING(60), vehicle_type: S.STRING(60), capacity: S.STRING(80),
        status: { type: S.STRING(30), allowNull: false, defaultValue: 'Available' }, notes: S.TEXT,
        ...ts,
      });
      await q.addIndex('wt_vehicles', ['branch_id', 'service_line'], { name: 'wt_vehicles_service_line' }).catch(() => {});
    }

    if (!(await q.describeTable('wt_inventory_items').catch(() => null))) {
      await q.createTable('wt_inventory_items', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: S.INTEGER, allowNull: false, defaultValue: 1 },
        service_line: { type: S.STRING(40), allowNull: false, defaultValue: 'removal_relocation' },
        client_id: { type: S.INTEGER, allowNull: false },
        client_code: S.STRING(40), project_id: S.STRING(40), work_order_code: S.STRING(40),
        room: S.STRING(80), item: { type: S.STRING(200), allowNull: false },
        qty: { type: S.INTEGER, allowNull: false, defaultValue: 1 },
        fragile: { type: S.BOOLEAN, defaultValue: false }, high_value: { type: S.BOOLEAN, defaultValue: false },
        photo_url: S.STRING(500), condition_note: S.STRING(255),
        status: { type: S.STRING(30), allowNull: false, defaultValue: 'Listed' },
        ...ts,
      });
      await q.addIndex('wt_inventory_items', ['branch_id', 'service_line'], { name: 'wt_inventory_service_line' }).catch(() => {});
      await q.addIndex('wt_inventory_items', ['client_id'], { name: 'wt_inventory_client' }).catch(() => {});
    }

    const woCols = {
      pickup_address: S.STRING(400), pickup_access: S.STRING(255),
      dropoff_address: S.STRING(400), dropoff_access: S.STRING(255),
      move_date: S.DATEONLY,
      crew_ids: S.JSON, vehicle_ids: S.JSON,
      external_provider_name: S.STRING(200), external_provider_fee: { type: S.DECIMAL(15, 2), defaultValue: 0 },
      external_provider_disbursed: { type: S.BOOLEAN, defaultValue: false },
      delay_hours: { type: S.DECIMAL(6, 2), defaultValue: 0 }, delay_charge: { type: S.DECIMAL(15, 2), defaultValue: 0 },
      allocated_at: S.DATE, allocated_by: S.STRING(120),
    };
    const woDesc = await q.describeTable('wt_work_orders').catch(() => null);
    if (woDesc) {
      for (const [col, type] of Object.entries(woCols)) {
        // Log rather than silently swallow: a swallowed addColumn once left this
        // migration partially applied (the DECIMAL/BOOLEAN columns missing), which
        // only surfaced later as "Unknown column" at work-order creation time.
        if (!woDesc[col]) {
          await q.addColumn('wt_work_orders', col, { type, allowNull: true })
            .catch((e) => console.warn(`[0100] addColumn wt_work_orders.${col} skipped:`, e.message));
        }
      }
    }

    const saDesc = await q.describeTable('wt_site_assessments').catch(() => null);
    if (saDesc) {
      for (const col of ['pickup_address', 'dropoff_address']) {
        if (!saDesc[col]) await q.addColumn('wt_site_assessments', col, { type: S.STRING(400), allowNull: true }).catch(() => {});
      }
    }
  },
  down: async (q) => {
    await q.dropTable('wt_inventory_items').catch(() => {});
    await q.dropTable('wt_vehicles').catch(() => {});
    await q.dropTable('wt_crew').catch(() => {});
    for (const col of ['pickup_address', 'pickup_access', 'dropoff_address', 'dropoff_access', 'move_date', 'crew_ids', 'vehicle_ids', 'external_provider_name', 'external_provider_fee', 'external_provider_disbursed', 'delay_hours', 'delay_charge', 'allocated_at', 'allocated_by']) {
      await q.removeColumn('wt_work_orders', col).catch(() => {});
    }
    for (const col of ['pickup_address', 'dropoff_address']) await q.removeColumn('wt_site_assessments', col).catch(() => {});
  },
};
