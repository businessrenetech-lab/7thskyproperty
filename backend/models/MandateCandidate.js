const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Property = require('./Property');
const BuyerMandate = require('./BuyerMandate');

/**
 * MandateCandidate — a property on a buyer mandate's shortlist, with a fit note,
 * the buyer's feedback and a per-candidate status. Converting it creates the
 * property-linked buy PropertyDeal (converted_deal_id).
 */
const MandateCandidate = sequelize.define('MandateCandidate', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  mandate_id: { type: DataTypes.INTEGER, allowNull: false },
  property_id: { type: DataTypes.INTEGER, allowNull: false },
  status: { type: DataTypes.ENUM('shortlisted', 'viewing', 'rejected', 'converted'), defaultValue: 'shortlisted' },
  fit_note: DataTypes.TEXT,
  feedback: DataTypes.TEXT,
  // Stage 4 — inspection coordination
  viewing_date: DataTypes.DATE,
  inspection_notes: DataTypes.TEXT,
  inspection_photos: DataTypes.JSON,
  converted_deal_id: DataTypes.INTEGER,
  created_by: DataTypes.INTEGER,
}, { tableName: 'mandate_candidates', underscored: true });

MandateCandidate.belongsTo(Property, { as: 'property', foreignKey: 'property_id' });
BuyerMandate.hasMany(MandateCandidate, { as: 'candidates', foreignKey: 'mandate_id' });
MandateCandidate.belongsTo(BuyerMandate, { as: 'mandate', foreignKey: 'mandate_id' });

module.exports = MandateCandidate;
