const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Contact = require('./Contact');

const ContactDocument = sequelize.define('ContactDocument', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  contact_id: { type: DataTypes.INTEGER, allowNull: false },
  doc_type: { type: DataTypes.STRING, allowNull: false },
  title: DataTypes.STRING,
  file_url: { type: DataTypes.STRING, allowNull: false },
  file_name: DataTypes.STRING,
  mime_type: DataTypes.STRING(120),
  expiry_date: DataTypes.DATEONLY,
  uploaded_by: DataTypes.INTEGER,
}, {
  tableName: 'contact_documents',
  underscored: true,
});

ContactDocument.belongsTo(Contact, { foreignKey: 'contact_id' });
Contact.hasMany(ContactDocument, { foreignKey: 'contact_id', as: 'documents' });

module.exports = ContactDocument;
