const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const Rule = sequelize.define('Rule', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  branch_id: {
    type: DataTypes.INTEGER,
    references: {
      model: require('./Branch'),
      key: 'id',
    },
  },
  trigger_type: {
    type: DataTypes.ENUM('fee_overdue', 'student_absent', 'new_lead', 'batch_full', 'enrollment_confirmed', 'birthday_reminder'),
    allowNull: false
  },
  action_type: {
    type: DataTypes.ENUM('send_sms', 'send_whatsapp', 'create_notification', 'send_email'),
    allowNull: false
  },
  template: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Supports placeholders like {student_name}, {amount}, {date}'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  config: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Additional configuration like delay in hours'
  }
}, {
  tableName: 'automation_rules',
  timestamps: true,
  underscored: true
});

module.exports = Rule;
