const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Property = require('./Property');

const PropertyDocument = sequelize.define('PropertyDocument', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  property_id: { type: DataTypes.INTEGER },
  doc_type: DataTypes.STRING,
  title: DataTypes.STRING,
  file_url: { type: DataTypes.STRING, allowNull: false },
  file_name: DataTypes.STRING,
  is_private: { type: DataTypes.BOOLEAN, defaultValue: true },
  uploaded_by: DataTypes.INTEGER,
  // Polymorphic + lifecycle (0022)
  entity_type: { type: DataTypes.ENUM('property', 'owner', 'tenant', 'tenancy', 'application', 'work_order', 'inspection', 'statement', 'settlement'), defaultValue: 'property' },
  entity_id: DataTypes.INTEGER,
  visibility: { type: DataTypes.ENUM('staff', 'owner', 'tenant', 'provider', 'public'), defaultValue: 'staff' },
  expiry_date: DataTypes.DATEONLY,
  signature_status: { type: DataTypes.ENUM('not_required', 'pending', 'signed', 'expired'), defaultValue: 'not_required' },
  required_for: DataTypes.STRING,
  description: DataTypes.TEXT,
}, { tableName: 'property_documents', underscored: true });

Property.hasMany(PropertyDocument, { foreignKey: 'property_id', as: 'documents' });
PropertyDocument.belongsTo(Property, { foreignKey: 'property_id' });

module.exports = PropertyDocument;
