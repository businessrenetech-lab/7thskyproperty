const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

/**
 * BusinessDocument — SOP Step 7 (document collection) + Step 19 (due diligence)
 * register for a BusinessListing, tied to Schedule D. Files live in the private
 * /uploads/documents folder (JWT-gated). Matches migration 0130.
 */
const BusinessDocument = sequelize.define('BusinessDocument', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  business_listing_id: { type: DataTypes.INTEGER, allowNull: true },
  property_id: DataTypes.INTEGER, // business property on the shared sales engine (0143)
  doc_type: DataTypes.STRING(50),
  name: DataTypes.STRING,
  status: { type: DataTypes.STRING(20), defaultValue: 'required' },
  file_url: DataTypes.STRING,
  is_confidential: { type: DataTypes.BOOLEAN, defaultValue: true },
  verified_by: DataTypes.INTEGER,
  verified_at: DataTypes.DATE,
  notes: DataTypes.TEXT,
  created_by: DataTypes.INTEGER,
}, {
  tableName: 'business_documents',
  underscored: true,
});

module.exports = BusinessDocument;
