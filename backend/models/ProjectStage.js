const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Project = require('./Project');

const ProjectStage = sequelize.define('ProjectStage', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  project_id: { type: DataTypes.INTEGER, allowNull: false },
  stage_key: { type: DataTypes.STRING(60), allowNull: false },
  stage_name: { type: DataTypes.STRING, allowNull: false },
  sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
  status: { type: DataTypes.ENUM('pending', 'in_progress', 'done', 'skipped', 'blocked'), defaultValue: 'pending' },
  assigned_to: DataTypes.INTEGER,
  due_date: DataTypes.DATEONLY,
  completed_at: DataTypes.DATE,
  checklist: { type: DataTypes.JSON, defaultValue: [] },
  required_documents: { type: DataTypes.JSON, defaultValue: [] },
  notes: DataTypes.TEXT,
}, { tableName: 'project_stages', underscored: true });

Project.hasMany(ProjectStage, { foreignKey: 'project_id', as: 'stages' });
ProjectStage.belongsTo(Project, { foreignKey: 'project_id' });

module.exports = ProjectStage;
