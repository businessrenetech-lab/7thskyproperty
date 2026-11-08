const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

/**
 * HRM Recruitment & ATS (migration 0167). JSON columns come back as strings in this database, so each has a
 * getter that parses defensively. Candidates are archived, never deleted (M3 §9: unsuccessful ones stay searchable).
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
const I = DataTypes.INTEGER;
const T = DataTypes.TEXT;
const money = DataTypes.DECIMAL(14, 2);
const bool = (v = false) => ({ type: DataTypes.BOOLEAN, allowNull: false, defaultValue: v });
const opts = (tableName) => ({ tableName, underscored: true, timestamps: true });

/** Writable fields per record (the API whitelists from these). */
const FIELDS = {
  jobDescription: ['position_id', 'title', 'department_id', 'reports_to_position_id', 'summary', 'duties', 'responsibilities', 'qualifications',
    'experience', 'technical_skills', 'soft_skills', 'working_hours', 'salary_grade_id', 'kpis', 'career_path', 'is_active'],
  workforceRequest: ['department_id', 'position_id', 'reason', 'request_kind', 'vacancies_count', 'salary_min', 'salary_max', 'employment_type',
    'expected_joining_date', 'budget_available', 'approving_manager_id', 'reports_to_position_id', 'salary_grade_id', 'location_branch_id',
    'closing_date', 'priority', 'job_description_id'],
  vacancy: ['reports_to_position_id', 'employment_type', 'salary_grade_id', 'salary_min', 'salary_max', 'location_branch_id', 'positions_count',
    'closing_date', 'priority', 'job_description_id', 'cost_amount'],
  candidate: ['full_name', 'date_of_birth', 'mobile', 'email', 'address', 'national_id', 'highest_qualification', 'institution', 'graduation_year',
    'current_employer', 'current_position', 'years_experience', 'expected_salary', 'notice_period', 'skills', 'location', 'availability'],
  interview: ['type', 'scheduled_at', 'duration_minutes', 'location', 'meeting_link', 'panel', 'notes', 'rating', 'status'],
  offer: ['position_id', 'salary', 'employment_type', 'probation_months', 'start_date', 'supervisor_employee_id', 'work_location_branch_id'],
};

const HrJobDescription = sequelize.define('HrJobDescription', {
  id: { type: I, primaryKey: true, autoIncrement: true },
  branch_id: I, position_id: I, title: { type: S(150), allowNull: false }, department_id: I, reports_to_position_id: I,
  summary: T, duties: T, responsibilities: T, qualifications: T, experience: T, technical_skills: T, soft_skills: T,
  working_hours: S(150), salary_grade_id: I, kpis: T, career_path: T, cloned_from_id: I, is_active: bool(true), created_by: I,
}, opts('hr_job_descriptions'));

const HrWorkforceRequest = sequelize.define('HrWorkforceRequest', {
  id: { type: I, primaryKey: true, autoIncrement: true },
  branch_id: I, department_id: I, position_id: I, reason: { type: T, allowNull: false }, request_kind: { type: S(20), allowNull: false },
  vacancies_count: { type: I, defaultValue: 1 }, salary_min: money, salary_max: money, employment_type: S(60), expected_joining_date: DataTypes.DATEONLY,
  budget_available: bool(), approving_manager_id: I, reports_to_position_id: I, salary_grade_id: I, location_branch_id: I,
  closing_date: DataTypes.DATEONLY, priority: { type: S(10), defaultValue: 'Normal' }, job_description_id: I, requested_by: I,
  change_request_id: I, status: { type: S(12), defaultValue: 'pending' },
}, opts('hr_workforce_requests'));

const HrVacancy = sequelize.define('HrVacancy', {
  id: { type: I, primaryKey: true, autoIncrement: true },
  branch_id: I, vacancy_code: { type: S(20), allowNull: false }, workforce_request_id: I, department_id: I, position_id: I, reports_to_position_id: I,
  employment_type: S(60), salary_grade_id: I, salary_min: money, salary_max: money, location_branch_id: I, positions_count: { type: I, defaultValue: 1 },
  closing_date: DataTypes.DATEONLY, priority: { type: S(10), defaultValue: 'Normal' }, job_description_id: I,
  status: { type: S(20), defaultValue: 'draft' }, channels: json('channels', []), public_slug: S(160), published_at: DataTypes.DATE,
  closed_at: DataTypes.DATE, cost_amount: { type: money, defaultValue: 0 }, filled_count: { type: I, defaultValue: 0 }, created_by: I,
}, opts('hr_vacancies'));

const HrCandidate = sequelize.define('HrCandidate', {
  id: { type: I, primaryKey: true, autoIncrement: true },
  branch_id: I, candidate_code: { type: S(20), allowNull: false }, full_name: { type: S(150), allowNull: false },
  date_of_birth: DataTypes.DATEONLY, mobile: S(20), email: S(190), address: T, national_id: S(40),
  highest_qualification: S(150), institution: S(150), graduation_year: I, current_employer: S(150), current_position: S(150),
  years_experience: DataTypes.DECIMAL(4, 1), expected_salary: money, notice_period: S(60), skills: json('skills', []),
  location: S(120), availability: S(60), in_talent_pool: bool(), duplicate_of_id: I, archived_at: DataTypes.DATE,
}, opts('hr_candidates'));

const HrCandidateDocument = sequelize.define('HrCandidateDocument', {
  id: { type: I, primaryKey: true, autoIncrement: true },
  candidate_id: { type: I, allowNull: false }, doc_type: { type: S(60), allowNull: false }, file_url: { type: S(500), allowNull: false },
  file_name: S(255), uploaded_by: I,
}, opts('hr_candidate_documents'));

const HrApplication = sequelize.define('HrApplication', {
  id: { type: I, primaryKey: true, autoIncrement: true },
  candidate_id: { type: I, allowNull: false }, vacancy_id: { type: I, allowNull: false },
  status: { type: S(30), defaultValue: 'Application Received' }, source: S(60), cover_letter: T,
  screening: json('screening', null), screening_score: DataTypes.DECIMAL(5, 1), applied_at: DataTypes.DATE,
  hr_confirmed_at: DataTypes.DATE, hr_confirmed_by: I, hire_change_request_id: I, hired_employee_id: I,
}, opts('hr_applications'));

const HrApplicationEvent = sequelize.define('HrApplicationEvent', {
  id: { type: I, primaryKey: true, autoIncrement: true },
  application_id: { type: I, allowNull: false }, kind: { type: S(12), defaultValue: 'status' }, from_status: S(30), to_status: S(30),
  channel: S(10), actor_id: I, at: DataTypes.DATE, note: T,
}, opts('hr_application_events'));

const HrInterview = sequelize.define('HrInterview', {
  id: { type: I, primaryKey: true, autoIncrement: true },
  application_id: { type: I, allowNull: false }, type: { type: S(30), allowNull: false }, scheduled_at: { type: DataTypes.DATE, allowNull: false },
  duration_minutes: { type: I, defaultValue: 45 }, location: S(200), meeting_link: S(500), panel: json('panel', []), notes: T, rating: I,
  status: { type: S(12), defaultValue: 'scheduled' }, reminder_sent_at: DataTypes.DATE, created_by: I,
}, opts('hr_interviews'));

const HrEvaluation = sequelize.define('HrEvaluation', {
  id: { type: I, primaryKey: true, autoIncrement: true },
  interview_id: { type: I, allowNull: false }, evaluator_id: I, scores: json('scores', {}), recommendation: S(30), comments: T,
}, opts('hr_evaluations'));

const HrCheck = sequelize.define('HrCheck', {
  id: { type: I, primaryKey: true, autoIncrement: true },
  application_id: { type: I, allowNull: false }, check_type: { type: S(60), allowNull: false }, required: bool(true),
  status: { type: S(14), defaultValue: 'pending' }, verified_by: I, verified_at: DataTypes.DATE, file_url: S(500), notes: T,
}, opts('hr_checks'));

const HrOffer = sequelize.define('HrOffer', {
  id: { type: I, primaryKey: true, autoIncrement: true },
  application_id: { type: I, allowNull: false }, position_id: I, salary: money, employment_type: S(60), probation_months: I,
  start_date: DataTypes.DATEONLY, supervisor_employee_id: I, work_location_branch_id: I, letter_html: DataTypes.TEXT('long'),
  token_hash: S(64), token_expires_at: DataTypes.DATE, status: { type: S(10), defaultValue: 'draft' },
  sent_at: DataTypes.DATE, accepted_at: DataTypes.DATE, accepted_ip: S(64), declined_at: DataTypes.DATE, decline_reason: T, created_by: I,
}, opts('hr_offers'));

module.exports = {
  HrJobDescription, HrWorkforceRequest, HrVacancy, HrCandidate, HrCandidateDocument, HrApplication, HrApplicationEvent,
  HrInterview, HrEvaluation, HrCheck, HrOffer, FIELDS,
};
