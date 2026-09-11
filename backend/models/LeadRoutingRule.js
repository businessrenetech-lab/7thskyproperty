const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

// A lead-routing rule: match a new sales enquiry on category/area/source
// (any null = wildcard) and assign it to a single officer or round-robin
// across a pool. Lower priority evaluated first; first match wins.
const LeadRoutingRule = sequelize.define('LeadRoutingRule', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  priority: { type: DataTypes.INTEGER, defaultValue: 100 },
  match_category: DataTypes.STRING,
  match_area: DataTypes.STRING,
  match_source: DataTypes.STRING,
  assign_to: DataTypes.INTEGER,
  assign_pool: DataTypes.JSON,          // array of user ids (in-rule round-robin)
  default_sequence_id: DataTypes.INTEGER,
  active: { type: DataTypes.BOOLEAN, defaultValue: true },
  created_by: DataTypes.INTEGER,
}, { tableName: 'lead_routing_rules', underscored: true });

module.exports = LeadRoutingRule;
