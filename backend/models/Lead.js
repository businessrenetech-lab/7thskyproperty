const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Branch = require('./Branch');
const User = require('./User');

const Lead = sequelize.define('Lead', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  branch_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Branch,
      key: 'id',
    },
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  phone: {
    type: DataTypes.STRING,
  },
  email: {
    type: DataTypes.STRING,
  },
  date_of_birth: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  birthday_wish_last_sent_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  destination_country: {
    type: DataTypes.STRING,
  },
  source: {
    type: DataTypes.STRING,
  },
  referred_by: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  referral_amount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
  },
  status: {
    type: DataTypes.ENUM('new', 'contacted', 'interested', 'trial', 'enrolled', 'fees_pending', 'payment_rejected', 'successful', 'lost'),
    defaultValue: 'new',
  },
  course_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Selected course — auto-fills deal_value from course.base_fee',
  },
  batch_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Selected batch from website enquiry or checkout',
  },
  payment_ref: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
    comment: 'Session reference for website checkout payment',
  },
  counselor_id: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: 'id',
    },
  },
  batch_interest: {
    type: DataTypes.STRING,
  },
  tags: {
    type: DataTypes.JSON,
  },
  notes: {
    type: DataTypes.TEXT,
  },
  trial_date: {
    type: DataTypes.DATE,
  },
  score: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '0-100 lead quality score',
  },
  deal_value: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    comment: 'Expected enrollment fee value',
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'hot'),
    defaultValue: 'medium',
  },
  expected_close: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  last_activity_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  lost_reason: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  tableName: 'leads',
  underscored: true,
});

Lead.belongsTo(Branch, { foreignKey: 'branch_id' });
Lead.belongsTo(User, { as: 'Counselor', foreignKey: 'counselor_id' });

module.exports = Lead;
