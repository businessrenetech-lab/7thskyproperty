const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

/**
 * HRM Employee Master Database (migration 0166). Every M2 §3 field lives on HrEmployee; documents, HR notes,
 * employee types, the onboarding checklist and the sent-reminder log sit beside it. JSON columns come back as
 * strings in this database, so each has a getter that parses defensively. Rows are archived, never deleted.
 */
const json = (name, fallback) => ({
  type: DataTypes.JSON,
  get() {
    const v = this.getDataValue(name);
    if (v == null) return fallback;
    if (typeof v !== 'string') return v;
    try { return JSON.parse(v); } catch { return fallback; }
  },
});
const S = (n) => DataTypes.STRING(n);
// A fresh object per column: Sequelize writes each column's name into its attribute object.
const flag = () => ({ type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false });
const opts = (tableName, extra = {}) => ({ tableName, underscored: true, timestamps: true, ...extra });

/** Fields by profile section (M2 §3); the API whitelists writes from these lists. */
const SECTIONS = {
  basic: ['full_name', 'preferred_name', 'photo_url', 'gender', 'date_of_birth', 'national_id', 'passport_no', 'tin', 'blood_group',
    'marital_status', 'religion', 'nationality', 'personal_mobile', 'personal_email', 'work_email', 'family_details', 'medical_notes'],
  contact: ['present_address', 'permanent_address', 'city', 'district', 'postal_code', 'country', 'emergency_contact_name',
    'emergency_contact_relationship', 'emergency_contact_phone', 'emergency_contact_address'],
  employment: ['company_id', 'division_id', 'department_id', 'team_id', 'position_id', 'supervisor_employee_id', 'employee_type', 'status',
    'lifecycle_stage', 'joining_date', 'probation_end_date', 'confirmation_date', 'work_location_branch_id', 'cost_centre_id', 'salary_grade_id',
    'work_schedule', 'notice_period_days', 'contract_end_date', 'exit_date'],
  payroll: ['basic_salary', 'allowances', 'commission_eligible', 'bonus_eligible', 'overtime_eligible', 'bank_name', 'bank_account_no',
    'bank_branch', 'mobile_banking_no', 'tax_status', 'provident_fund_eligible', 'loan_balance', 'deduction_rules'],
};
const EDITABLE = [...SECTIONS.basic, ...SECTIONS.contact, ...SECTIONS.employment, ...SECTIONS.payroll];

const HrEmployee = sequelize.define('HrEmployee', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: DataTypes.INTEGER,
  employee_code: { type: S(30), allowNull: false, unique: true },
  user_id: DataTypes.INTEGER,
  full_name: { type: S(160), allowNull: false },
  preferred_name: S(80),
  photo_url: S(500),
  gender: S(20),
  date_of_birth: DataTypes.DATEONLY,
  national_id: S(40),
  passport_no: S(40),
  tin: S(40),
  blood_group: S(8),
  marital_status: S(20),
  religion: S(40),
  nationality: S(60),
  personal_mobile: S(30),
  personal_email: S(160),
  work_email: S(160),
  family_details: DataTypes.TEXT,
  medical_notes: DataTypes.TEXT,
  present_address: DataTypes.TEXT,
  permanent_address: DataTypes.TEXT,
  city: S(80),
  district: S(80),
  postal_code: S(20),
  country: S(60),
  emergency_contact_name: S(120),
  emergency_contact_relationship: S(60),
  emergency_contact_phone: S(30),
  emergency_contact_address: DataTypes.TEXT,
  company_id: DataTypes.INTEGER,
  division_id: DataTypes.INTEGER,
  department_id: DataTypes.INTEGER,
  team_id: DataTypes.INTEGER,
  position_id: DataTypes.INTEGER,
  supervisor_employee_id: DataTypes.INTEGER,
  employee_type: S(60),
  status: { type: S(30), allowNull: false, defaultValue: 'Onboarding' },
  lifecycle_stage: S(40),
  joining_date: DataTypes.DATEONLY,
  probation_end_date: DataTypes.DATEONLY,
  confirmation_date: DataTypes.DATEONLY,
  work_location_branch_id: DataTypes.INTEGER,
  cost_centre_id: DataTypes.INTEGER,
  salary_grade_id: DataTypes.INTEGER,
  work_schedule: S(120),
  notice_period_days: DataTypes.INTEGER,
  contract_end_date: DataTypes.DATEONLY,
  exit_date: DataTypes.DATEONLY,
  archived_at: DataTypes.DATE,
  basic_salary: DataTypes.DECIMAL(12, 2),
  allowances: json('allowances', []),
  commission_eligible: flag(),
  bonus_eligible: flag(),
  overtime_eligible: flag(),
  bank_name: S(120),
  bank_account_no: S(60),
  bank_branch: S(120),
  mobile_banking_no: S(30),
  tax_status: S(60),
  provident_fund_eligible: flag(),
  loan_balance: DataTypes.DECIMAL(12, 2),
  deduction_rules: json('deduction_rules', []),
  created_by: DataTypes.INTEGER,
}, opts('hr_employees'));

const HrEmployeeDocument = sequelize.define('HrEmployeeDocument', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  employee_id: { type: DataTypes.INTEGER, allowNull: false },
  doc_type: { type: S(60), allowNull: false },
  file_url: { type: S(500), allowNull: false },
  file_name: S(255),
  uploaded_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  uploaded_by: DataTypes.INTEGER,
  expiry_date: DataTypes.DATEONLY,
  verification_status: { type: S(12), allowNull: false, defaultValue: 'pending' },
  verified_by: DataTypes.INTEGER,
  verified_at: DataTypes.DATE,
  notes: DataTypes.TEXT,
}, opts('hr_employee_documents'));

const HrEmployeeNote = sequelize.define('HrEmployeeNote', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  employee_id: { type: DataTypes.INTEGER, allowNull: false },
  body: { type: DataTypes.TEXT, allowNull: false },
  visibility: { type: S(10), allowNull: false, defaultValue: 'hr' },
  created_by: DataTypes.INTEGER,
}, opts('hr_employee_notes'));

const HrEmployeeType = sequelize.define('HrEmployeeType', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: S(60), allowNull: false, unique: true },
  required_documents: json('required_documents', []),
  leave_type_ids: json('leave_type_ids', []),
  attendance_required: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  benefits_note: DataTypes.TEXT,
  is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, opts('hr_employee_types'));

const HrOnboardingTask = sequelize.define('HrOnboardingTask', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  employee_id: { type: DataTypes.INTEGER, allowNull: false },
  task: { type: S(40), allowNull: false },
  owner: { type: S(12), allowNull: false, defaultValue: 'hr' },
  due_on: DataTypes.DATEONLY,
  done_at: DataTypes.DATE,
  done_by: DataTypes.INTEGER,
}, opts('hr_onboarding_tasks'));

const HrReminderSent = sequelize.define('HrReminderSent', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  kind: { type: S(40), allowNull: false },
  employee_id: DataTypes.INTEGER,
  entity_id: DataTypes.INTEGER,
  due_on: { type: DataTypes.DATEONLY, allowNull: false },
}, opts('hr_reminders_sent'));

HrEmployee.hasMany(HrEmployeeDocument, { foreignKey: 'employee_id', as: 'documents' });
HrEmployeeDocument.belongsTo(HrEmployee, { foreignKey: 'employee_id' });
HrEmployee.hasMany(HrOnboardingTask, { foreignKey: 'employee_id', as: 'onboarding' });
HrEmployee.belongsTo(HrEmployee, { foreignKey: 'supervisor_employee_id', as: 'supervisor' });

module.exports = { HrEmployee, HrEmployeeDocument, HrEmployeeNote, HrEmployeeType, HrOnboardingTask, HrReminderSent, SECTIONS, EDITABLE };
