const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const User = require('./User');
const Branch = require('./Branch');
const Batch = require('./Batch');
const Course = require('./Course');

const TeacherSession = sequelize.define('TeacherSession', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  teacher_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: User, key: 'id' },
  },
  branch_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: Branch, key: 'id' },
  },
  batch_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: Batch, key: 'id' },
  },
  course_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: Course, key: 'id' },
  },
  session_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  start_time: {
    type: DataTypes.TIME,
  },
  end_time: {
    type: DataTypes.TIME,
  },
  duration_hours: {
    type: DataTypes.DECIMAL(8, 2),
    defaultValue: 1,
  },
  session_type: {
    type: DataTypes.ENUM('regular', 'trial', 'makeup', 'extra'),
    defaultValue: 'regular',
  },
  pay_basis: {
    type: DataTypes.ENUM('per_class', 'per_hour', 'per_student', 'manual'),
    defaultValue: 'per_class',
  },
  status: {
    type: DataTypes.ENUM('scheduled', 'completed', 'cancelled', 'approved'),
    defaultValue: 'approved',
  },
  student_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  rate: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
  },
  notes: {
    type: DataTypes.TEXT,
  },
  approved_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: User, key: 'id' },
  },
  approved_at: {
    type: DataTypes.DATE,
  },
}, {
  tableName: 'teacher_sessions',
  underscored: true,
  indexes: [
    { fields: ['teacher_id', 'session_date'] },
    { fields: ['branch_id', 'session_date'] },
  ],
});

TeacherSession.belongsTo(User, { as: 'Teacher', foreignKey: 'teacher_id' });
TeacherSession.belongsTo(User, { as: 'Approver', foreignKey: 'approved_by' });
TeacherSession.belongsTo(Branch, { foreignKey: 'branch_id' });
TeacherSession.belongsTo(Batch, { foreignKey: 'batch_id' });
TeacherSession.belongsTo(Course, { foreignKey: 'course_id' });
User.hasMany(TeacherSession, { as: 'TeachingSessions', foreignKey: 'teacher_id' });

module.exports = TeacherSession;
