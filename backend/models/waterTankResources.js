/**
 * waterTankResources.js — internal Team & Fleet + Inventory for delivery-by-own-team
 * service lines (manifest `team_fleet: true` / `inventory: true`; Removal & Relocation).
 *
 *   wt_crew            — internal crew members (Team Leader / Driver / Mover / Packer).
 *   wt_vehicles        — the fleet (Truck / Van / Pickup).
 *   wt_inventory_items — items being moved on a job (room, qty, fragile/high-value, photo).
 *
 * All service_line-tagged like every wt_* table. Created by migration 0100.
 * Crew + vehicles are picked from the DB (or added inline) at the work-order
 * Resource Allocation step — there is NO provider master agreement for these lines.
 */
const { DataTypes: D } = require('sequelize');
const sequelize = require('../config/db.config');

const base = {
  id: { type: D.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: D.INTEGER, allowNull: false, defaultValue: 1 },
  service_line: { type: D.STRING(40), allowNull: false, defaultValue: 'removal_relocation' },
};

const WtCrew = sequelize.define('WtCrew', {
  ...base,
  code: { type: D.STRING(30), allowNull: false },
  name: { type: D.STRING(160), allowNull: false },
  role: D.STRING(60),          // Team Leader | Driver | Mover | Packer | Supervisor
  phone: D.STRING(60),
  email: D.STRING(160),
  skills: D.TEXT,
  status: { type: D.STRING(30), allowNull: false, defaultValue: 'Active' }, // Active | On Leave | Inactive
  notes: D.TEXT,
}, { tableName: 'wt_crew' });

const WtVehicle = sequelize.define('WtVehicle', {
  ...base,
  code: { type: D.STRING(30), allowNull: false },
  reg_no: D.STRING(60),
  vehicle_type: D.STRING(60),  // Truck (Large) | Truck (Medium) | Van | Pickup
  capacity: D.STRING(80),      // e.g. "3 Ton", "12 CBM"
  status: { type: D.STRING(30), allowNull: false, defaultValue: 'Available' }, // Available | In Use | Maintenance
  notes: D.TEXT,
}, { tableName: 'wt_vehicles' });

const WtInventoryItem = sequelize.define('WtInventoryItem', {
  ...base,
  client_id: { type: D.INTEGER, allowNull: false },
  client_code: D.STRING(40),
  project_id: D.STRING(40),
  work_order_code: D.STRING(40),
  room: D.STRING(80),
  item: { type: D.STRING(200), allowNull: false },
  qty: { type: D.INTEGER, allowNull: false, defaultValue: 1 },
  fragile: { type: D.BOOLEAN, defaultValue: false },
  high_value: { type: D.BOOLEAN, defaultValue: false },
  photo_url: D.STRING(500),
  condition_note: D.STRING(255),
  // Listed | Packed | Loaded | Delivered | Damaged | Missing
  status: { type: D.STRING(30), allowNull: false, defaultValue: 'Listed' },
}, { tableName: 'wt_inventory_items' });

module.exports = { WtCrew, WtVehicle, WtInventoryItem };
