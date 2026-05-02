const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const User = require('./User');
const Branch = require('./Branch');
const Batch = require('./Batch');

const Student = sequelize.define('Student', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    unique: true,
    allowNull: false,
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
  batch_id: {
    type: DataTypes.INTEGER,
    references: {
      model: Batch,
      key: 'id',
    },
  },
  guardian_id: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: 'id',
    },
  },
  first_name: {
    type: DataTypes.STRING,
  },
  middle_name: {
    type: DataTypes.STRING,
  },
  last_name: {
    type: DataTypes.STRING,
  },
  father_name: {
    type: DataTypes.STRING,
  },
  mother_name: {
    type: DataTypes.STRING,
  },
  mobile_no: {
    type: DataTypes.STRING,
  },
  nid_birth_cert: {
    type: DataTypes.STRING,
  },
  date_of_birth: {
    type: DataTypes.DATEONLY,
  },
  birthday_wish_last_sent_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  religion: {
    type: DataTypes.STRING,
  },
  nationality: {
    type: DataTypes.STRING,
    defaultValue: 'Bangladeshi',
  },
  gender: {
    type: DataTypes.ENUM('male', 'female', 'other'),
    allowNull: true,
  },
  blood_group: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  marital_status: {
    type: DataTypes.ENUM('single', 'married', 'divorced', 'widowed'),
    allowNull: true,
  },
  emergency_contact_name: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  emergency_contact_relation: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  emergency_contact_phone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  current_address: {
    type: DataTypes.TEXT,
  },
  permanent_address: {
    type: DataTypes.TEXT,
  },
  passport_no: {
    type: DataTypes.STRING,
  },
  passport_expiry: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  visa_status: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  profession: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  lead_source: {
    type: DataTypes.ENUM('facebook', 'instagram', 'google', 'referral', 'walk_in', 'website', 'newspaper', 'event', 'other'),
    allowNull: true,
  },
  referred_by: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  referral_amount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
  },
  photograph_url: {
    type: DataTypes.STRING,
  },
  educational_details: {
    type: DataTypes.JSON,
  },
  employment_details: {
    type: DataTypes.JSON,
  },
  post_course_goal_type: {
    type: DataTypes.ENUM('specific_country', 'another_purpose'),
    allowNull: true,
  },
  target_country: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  english_level: {
    type: DataTypes.ENUM('beginner', 'intermediate', 'expert'),
    allowNull: true,
  },
  final_course_result: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  success_destination_country: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  success_notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  success_recorded_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  enrollment_date: {
    type: DataTypes.DATEONLY,
  },
  plan_type: {
    type: DataTypes.ENUM('free', 'premium'),
    defaultValue: 'free',
  },
  premium_start_date: {
    type: DataTypes.DATE,
  },
  premium_expiry_date: {
    type: DataTypes.DATE,
  },
  active_devices: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  target_score: {
    type: DataTypes.INTEGER,
    defaultValue: 79,
  },
  exam_date: {
    type: DataTypes.DATEONLY,
  },
  status: {
    type: DataTypes.ENUM('active', 'graduated', 'dropped'),
    defaultValue: 'active',
  },
}, {
  tableName: 'students',
  underscored: true,
});

Student.belongsTo(User, { foreignKey: 'user_id' });
Student.belongsTo(Branch, { foreignKey: 'branch_id' });
Student.belongsTo(Batch, { foreignKey: 'batch_id' });
Student.belongsTo(User, { as: 'Guardian', foreignKey: 'guardian_id' });

const Activity = require('./Activity');
Student.hasMany(Activity, { foreignKey: 'student_id' });
Activity.belongsTo(Student, { foreignKey: 'student_id' });

module.exports = Student;
