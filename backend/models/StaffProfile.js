const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const User = require('./User');
const Branch = require('./Branch');

const StaffProfile = sequelize.define('StaffProfile', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: {
      model: User,
      key: 'id',
    },
  },
  branch_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Branch,
      key: 'id',
    },
  },
  designation: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  base_salary: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
  },
  bank_name: {
    type: DataTypes.STRING,
  },
  account_no: {
    type: DataTypes.STRING,
  },
  father_name: {
    type: DataTypes.STRING,
  },
  mother_name: {
    type: DataTypes.STRING,
  },
  address: {
    type: DataTypes.TEXT,
  },
  contact_details: {
    type: DataTypes.STRING,
  },
  educational_background: {
    type: DataTypes.JSON,
  },
  work_experience: {
    type: DataTypes.JSON,
  },
  joining_date: {
    type: DataTypes.DATEONLY,
  },
  phone: {
    type: DataTypes.STRING(50),
  },
  emergency_contact: {
    type: DataTypes.STRING,
  },
  blood_group: {
    type: DataTypes.STRING(5),
  },
  nid_number: {
    type: DataTypes.STRING(20),
  },
  date_of_birth: {
    type: DataTypes.DATEONLY,
  },
  gender: {
    type: DataTypes.ENUM('male', 'female', 'other'),
  },
  marital_status: {
    type: DataTypes.ENUM('single', 'married', 'divorced', 'widowed'),
  },
  profile_photo: {
    type: DataTypes.STRING(500),
  },
  reports_to: {
    type: DataTypes.INTEGER,
    references: { model: User, key: 'id' },
  },
  department: {
    type: DataTypes.STRING,
  },
  employment_status: {
    type: DataTypes.ENUM('active', 'on_leave', 'notice_period', 'resigned', 'terminated', 'inactive', 'suspended'),
    defaultValue: 'active',
  },
  exit_date: {
    type: DataTypes.DATEONLY,
  },
  exit_reason: {
    type: DataTypes.TEXT,
  },
  notice_start_date: {
    type: DataTypes.DATEONLY,
  },
  notice_end_date: {
    type: DataTypes.DATEONLY,
  },
  final_settlement_status: {
    type: DataTypes.ENUM('pending', 'calculated', 'sent_to_accounting', 'paid'),
    defaultValue: 'pending',
  },
  final_settlement_notes: {
    type: DataTypes.TEXT,
  },
}, {
  tableName: 'staff_profiles',
  underscored: true,
});

StaffProfile.belongsTo(User, { foreignKey: 'user_id' });
StaffProfile.belongsTo(Branch, { foreignKey: 'branch_id' });
User.hasOne(StaffProfile, { foreignKey: 'user_id' });

module.exports = StaffProfile;
