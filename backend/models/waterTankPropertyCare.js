/**
 * waterTankPropertyCare.js — Property Care & Concierge line-specific registers
 * (manifest flags `asset_register` / `concierge` / `utility_coordination`).
 *
 *   wt_property_assets     — per-property asset & maintenance register (next-service-due).
 *   wt_access_declarations — key/alarm/pets/valuables/restricted-areas declaration.
 *   wt_property_visits     — concierge Entry/Opening & Exit/Closing checklists.
 *   wt_utility_requests    — utility bill / connection assistance register.
 *
 * All service_line-tagged like every wt_* table. Created by migration 0101.
 */
const { DataTypes: D } = require('sequelize');
const sequelize = require('../config/db.config');

const base = {
  id: { type: D.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: D.INTEGER, allowNull: false, defaultValue: 1 },
  service_line: { type: D.STRING(40), allowNull: false, defaultValue: 'property_care_concierge' },
};

const WtPropertyAsset = sequelize.define('WtPropertyAsset', {
  ...base,
  code: { type: D.STRING(30), allowNull: false },      // AST-
  client_id: { type: D.INTEGER, allowNull: false },
  client_code: D.STRING(40),
  property_address: D.STRING(400),
  area: D.STRING(120),               // Asset / Area (e.g. "Rooftop AC", "Front Garden")
  category: D.STRING(80),            // Appliance | HVAC | Plumbing | Garden | Security | Structure | Other
  brand_model: D.STRING(160),
  serial_no: D.STRING(120),
  condition: D.STRING(40),           // Excellent | Good | Fair | Poor | Needs Repair
  last_service_date: D.DATEONLY,
  next_service_due: D.DATEONLY,
  warranty_expiry: D.DATEONLY,
  responsible_tech: D.STRING(120),
  maintenance_requirement: D.TEXT,
  est_cost: { type: D.DECIMAL(15, 2), defaultValue: 0 },
  photo_url: D.STRING(500),
  status: { type: D.STRING(30), allowNull: false, defaultValue: 'Active' }, // Active | Due | Overdue | Retired
  notes: D.TEXT,
}, { tableName: 'wt_property_assets' });

const WtAccessDeclaration = sequelize.define('WtAccessDeclaration', {
  ...base,
  code: { type: D.STRING(30), allowNull: false },      // ACC-
  client_id: { type: D.INTEGER, allowNull: false },
  client_code: D.STRING(40),
  property_address: D.STRING(400),
  key_access_method: D.STRING(160),  // Key held | Lockbox | Client present | Smart lock code
  alarm_managed: { type: D.BOOLEAN, defaultValue: false },
  alarm_notes: D.STRING(255),
  pets: D.STRING(255),
  vulnerable_persons: D.STRING(255),
  known_hazards: D.TEXT,
  restricted_areas: D.TEXT,
  valuables_secured: { type: D.BOOLEAN, defaultValue: false },
  client_authorisation: { type: D.BOOLEAN, defaultValue: false },
  declaration_date: D.DATEONLY,
  notes: D.TEXT,
}, { tableName: 'wt_access_declarations' });

const WtPropertyVisit = sequelize.define('WtPropertyVisit', {
  ...base,
  code: { type: D.STRING(30), allowNull: false },      // VIS-
  client_id: { type: D.INTEGER, allowNull: false },
  client_code: D.STRING(40),
  work_order_code: D.STRING(40),
  property_address: D.STRING(400),
  visit_type: { type: D.STRING(20), allowNull: false, defaultValue: 'Entry' }, // Entry | Exit
  visit_date: D.DATEONLY,
  access_method: D.STRING(160),
  condition: D.STRING(255),          // condition on entry / work-area secured on exit
  meter_readings: D.STRING(255),
  security_check: { type: D.BOOLEAN, defaultValue: false },
  doors_locked: { type: D.BOOLEAN, defaultValue: false },
  alarm_activated: { type: D.BOOLEAN, defaultValue: false },
  keys_returned: { type: D.BOOLEAN, defaultValue: false },
  photos: D.TEXT,
  issues: D.TEXT,
  completed_by: D.STRING(120),
  notes: D.TEXT,
}, { tableName: 'wt_property_visits' });

const WtUtilityRequest = sequelize.define('WtUtilityRequest', {
  ...base,
  code: { type: D.STRING(30), allowNull: false },      // UTL-
  client_id: { type: D.INTEGER, allowNull: false },
  client_code: D.STRING(40),
  property_address: D.STRING(400),
  utility_type: D.STRING(60),        // Electricity | Water (WASA) | Gas | Internet | Council / Rates | Other
  service_request: D.STRING(60),     // Bill Payment | New Connection | Disconnection | Transfer | Query
  provider: D.STRING(160),
  account_ref: D.STRING(120),
  request_date: D.DATEONLY,
  required_date: D.DATEONLY,
  amount: { type: D.DECIMAL(15, 2), defaultValue: 0 },
  client_approval: { type: D.BOOLEAN, defaultValue: false },
  completion_date: D.DATEONLY,
  status: { type: D.STRING(30), allowNull: false, defaultValue: 'Requested' }, // Requested | In Progress | Awaiting Client | Completed | Cancelled
  notes: D.TEXT,
}, { tableName: 'wt_utility_requests' });

module.exports = { WtPropertyAsset, WtAccessDeclaration, WtPropertyVisit, WtUtilityRequest };
