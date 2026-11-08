const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const User = require('./User');
const Branch = require('./Branch');
const { readEducation, readExperience } = require('../utils/staffHistory');

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
  // Read through utils/staffHistory: always a list of row objects, whatever an older form stored (a JSON string,
  // a list of strings, a plain string). Saved by the staff form as that list (see staffHistory.js for the shape).
  educational_background: {
    type: DataTypes.JSON,
    get() { return readEducation(this.getDataValue('educational_background')); },
  },
  work_experience: {
    type: DataTypes.JSON,
    get() { return readExperience(this.getDataValue('work_experience')); },
  },
  joining_date: {
    type: DataTypes.DATEONLY,
  },
  phone: {
    type: DataTypes.STRING(50),
  },
  // Emergency contact: the person's name, how they are related, and their phone (2026-10-09).
  emergency_contact: {
    type: DataTypes.STRING,
  },
  emergency_relation: {
    type: DataTypes.STRING(60),
  },
  emergency_phone: {
    type: DataTypes.STRING(20),
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
    type: DataTypes.ENUM('active', 'on_leave', 'notice_period', 'resigned', 'terminated', 'inactive', 'suspended', 'exited'),
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
  // The company's own employee number (owner request 2026-10-09), typed by HR, e.g. "HLD-0012". Optional; unique
  // across the company (the named unique index allows any number of NULLs). See utils/employeeId.js.
  employee_id: {
    type: DataTypes.STRING(30),
    allowNull: true,
  },
}, {
  tableName: 'staff_profiles',
  underscored: true,
  indexes: [{ unique: true, fields: ['employee_id'], name: 'staff_profiles_employee_id' }],
});

StaffProfile.belongsTo(User, { foreignKey: 'user_id' });
StaffProfile.belongsTo(Branch, { foreignKey: 'branch_id' });
User.hasOne(StaffProfile, { foreignKey: 'user_id' });

module.exports = StaffProfile;
