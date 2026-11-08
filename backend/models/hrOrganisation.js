const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

/**
 * HRM organisation structure (migration 0164): Company → Division → Department → Team → Position, with cost
 * centres, salary grades and the editable HR access settings. Rows are deactivated, never deleted.
 * JSON columns come back as strings in this database, so each has a getter that parses defensively.
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

const common = {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: true },
  code: { type: DataTypes.STRING(30), allowNull: false, unique: true },
  is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  created_by: { type: DataTypes.INTEGER, allowNull: true },
};
const opts = (tableName) => ({ tableName, underscored: true, timestamps: true });

const HrCompany = sequelize.define('HrCompany', {
  ...common,
  name: { type: DataTypes.STRING(160), allowNull: false },
  trading_name: DataTypes.STRING(160),
  registration_no: DataTypes.STRING(60),
  tin: DataTypes.STRING(40),
  bin: DataTypes.STRING(40),
  address: DataTypes.TEXT,
  phone: DataTypes.STRING(40),
  email: DataTypes.STRING(160),
  website: DataTypes.STRING(200),
  logo_url: DataTypes.STRING(500),
  policies: json('policies', []),
}, opts('hr_companies'));

const HrCostCentre = sequelize.define('HrCostCentre', {
  ...common,
  company_id: DataTypes.INTEGER,
  name: { type: DataTypes.STRING(120), allowNull: false },
}, opts('hr_cost_centres'));

const HrSalaryGrade = sequelize.define('HrSalaryGrade', {
  ...common,
  name: { type: DataTypes.STRING(60), allowNull: false },
  min_amount: DataTypes.DECIMAL(15, 2),
  max_amount: DataTypes.DECIMAL(15, 2),
}, opts('hr_salary_grades'));

const HrDivision = sequelize.define('HrDivision', {
  ...common,
  company_id: DataTypes.INTEGER,
  name: { type: DataTypes.STRING(160), allowNull: false },
  head_employee_id: DataTypes.INTEGER,
  business_function: DataTypes.STRING(200),
  website: DataTypes.STRING(200),
}, opts('hr_divisions'));

const HrDepartment = sequelize.define('HrDepartment', {
  ...common,
  division_id: DataTypes.INTEGER,
  name: { type: DataTypes.STRING(160), allowNull: false },
  manager_employee_id: DataTypes.INTEGER,
  location_branch_id: DataTypes.INTEGER,
  cost_centre_id: DataTypes.INTEGER,
}, opts('hr_departments'));

const HrTeam = sequelize.define('HrTeam', {
  ...common,
  department_id: DataTypes.INTEGER,
  name: { type: DataTypes.STRING(160), allowNull: false },
  leader_employee_id: DataTypes.INTEGER,
}, opts('hr_teams'));

const HrPosition = sequelize.define('HrPosition', {
  ...common,
  department_id: DataTypes.INTEGER,
  team_id: DataTypes.INTEGER,
  title: { type: DataTypes.STRING(160), allowNull: false },
  reports_to_position_id: DataTypes.INTEGER,
  is_top: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  employment_type: DataTypes.STRING(40),
  salary_grade_id: DataTypes.INTEGER,
  job_description: DataTypes.TEXT,
  qualifications: DataTypes.TEXT,
  experience: DataTypes.TEXT,
  skills: json('skills', []),
  approval_authority: json('approval_authority', []),
  headcount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
}, opts('hr_positions'));

const HrAccessSettings = sequelize.define('HrAccessSettings', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  matrix: json('matrix', null),
  field_groups: json('field_groups', null),
  updated_by: DataTypes.INTEGER,
}, opts('hr_access_settings'));

HrDivision.belongsTo(HrCompany, { foreignKey: 'company_id', as: 'company' });
HrCompany.hasMany(HrDivision, { foreignKey: 'company_id', as: 'divisions' });
HrCostCentre.belongsTo(HrCompany, { foreignKey: 'company_id', as: 'company' });
HrDepartment.belongsTo(HrDivision, { foreignKey: 'division_id', as: 'division' });
HrDivision.hasMany(HrDepartment, { foreignKey: 'division_id', as: 'departments' });
HrDepartment.belongsTo(HrCostCentre, { foreignKey: 'cost_centre_id', as: 'costCentre' });
HrTeam.belongsTo(HrDepartment, { foreignKey: 'department_id', as: 'department' });
HrDepartment.hasMany(HrTeam, { foreignKey: 'department_id', as: 'teams' });
HrPosition.belongsTo(HrDepartment, { foreignKey: 'department_id', as: 'department' });
HrDepartment.hasMany(HrPosition, { foreignKey: 'department_id', as: 'positions' });
HrPosition.belongsTo(HrTeam, { foreignKey: 'team_id', as: 'team' });
HrPosition.belongsTo(HrSalaryGrade, { foreignKey: 'salary_grade_id', as: 'salaryGrade' });
HrPosition.belongsTo(HrPosition, { foreignKey: 'reports_to_position_id', as: 'reportsTo' });

module.exports = { HrCompany, HrDivision, HrDepartment, HrTeam, HrCostCentre, HrSalaryGrade, HrPosition, HrAccessSettings };
