'use strict';

/**
 * HRM Module 2: Employee Master Database (docs/hrm/2026-10-30-hrm-plan.md, Task 9).
 *
 * hr_employees holds every M2 §3.1–3.4 field. Its documents (§3.5), HR notes, the editable employee types
 * (§2: rules differ by type), the onboarding checklist (§11) and a log of reminders already sent (Task 12)
 * sit beside it. Employee codes never change (§4); rows are archived, never deleted (§6).
 *
 * The 11 employee types are seeded once, only when the table is empty; HR edits them afterwards.
 * Every table is created only when missing, so this is safe to re-run.
 */
const TYPES = [
  'Full-time employee', 'Part-time employee', 'Casual employee', 'Contract employee', 'Intern', 'Consultant',
  'Remote worker', 'Field staff', 'Probationary employee', 'Third-party assigned worker', 'Temporary worker',
];
const NO_ATTENDANCE = ['Consultant', 'Third-party assigned worker'];
const BASE_DOCS = ['National ID', 'Photo', 'CV', 'Employment Agreement', 'Bank Details', 'Emergency Contact Form', 'Policy Acknowledgement'];

module.exports = {
  async up(queryInterface, Sequelize) {
    const existing = new Set((await queryInterface.showAllTables()).map((t) => (typeof t === 'string' ? t : t.tableName)));
    const D = Sequelize;
    const id = { type: D.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false };
    const stamps = {
      created_at: { type: D.DATE, allowNull: false, defaultValue: D.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: D.DATE, allowNull: false, defaultValue: D.literal('CURRENT_TIMESTAMP') },
    };
    const ref = (table) => ({ type: D.INTEGER, allowNull: true, references: { model: table, key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' });
    const bool = (v = false) => ({ type: D.BOOLEAN, allowNull: false, defaultValue: v });

    const create = async (name, cols, indexes = []) => {
      if (existing.has(name)) return false;
      await queryInterface.createTable(name, { id, ...cols, ...stamps });
      for (const ix of indexes) await queryInterface.addIndex(name, ix, { name: `${name}_${ix.join('_')}` });
      return true;
    };

    const madeEmployees = await create('hr_employees', {
      branch_id: ref('branches'),
      employee_code: { type: D.STRING(30), allowNull: false, unique: true },
      user_id: ref('users'),
      // §3.1 basic information
      full_name: { type: D.STRING(160), allowNull: false },
      preferred_name: D.STRING(80),
      photo_url: D.STRING(500),
      gender: D.STRING(20),
      date_of_birth: D.DATEONLY,
      national_id: D.STRING(40),
      passport_no: D.STRING(40),
      tin: D.STRING(40),
      blood_group: D.STRING(8),
      marital_status: D.STRING(20),
      religion: D.STRING(40),
      nationality: D.STRING(60),
      personal_mobile: D.STRING(30),
      personal_email: D.STRING(160),
      work_email: D.STRING(160),
      family_details: D.TEXT,
      medical_notes: D.TEXT,
      // §3.2 contact
      present_address: D.TEXT,
      permanent_address: D.TEXT,
      city: D.STRING(80),
      district: D.STRING(80),
      postal_code: D.STRING(20),
      country: D.STRING(60),
      emergency_contact_name: D.STRING(120),
      emergency_contact_relationship: D.STRING(60),
      emergency_contact_phone: D.STRING(30),
      emergency_contact_address: D.TEXT,
      // §3.3 employment
      company_id: ref('hr_companies'),
      division_id: ref('hr_divisions'),
      department_id: ref('hr_departments'),
      team_id: ref('hr_teams'),
      position_id: ref('hr_positions'),
      supervisor_employee_id: ref('hr_employees'),
      employee_type: D.STRING(60),
      status: { type: D.STRING(30), allowNull: false, defaultValue: 'Onboarding' },
      lifecycle_stage: D.STRING(40),
      joining_date: D.DATEONLY,
      probation_end_date: D.DATEONLY,
      confirmation_date: D.DATEONLY,
      work_location_branch_id: ref('branches'),
      cost_centre_id: ref('hr_cost_centres'),
      salary_grade_id: ref('hr_salary_grades'),
      work_schedule: D.STRING(120),
      notice_period_days: D.INTEGER,
      contract_end_date: D.DATEONLY,
      exit_date: D.DATEONLY,
      archived_at: D.DATE,
      // §3.4 payroll (HR and Finance only)
      basic_salary: D.DECIMAL(12, 2),
      allowances: D.JSON,
      commission_eligible: bool(),
      bonus_eligible: bool(),
      overtime_eligible: bool(),
      bank_name: D.STRING(120),
      bank_account_no: D.STRING(60),
      bank_branch: D.STRING(120),
      mobile_banking_no: D.STRING(30),
      tax_status: D.STRING(60),
      provident_fund_eligible: bool(),
      loan_balance: D.DECIMAL(12, 2),
      deduction_rules: D.JSON,
      created_by: ref('users'),
    }, [['branch_id'], ['user_id'], ['department_id'], ['position_id'], ['supervisor_employee_id'], ['status'], ['employee_type'], ['joining_date'], ['contract_end_date'], ['probation_end_date']]);
    if (madeEmployees) await queryInterface.sequelize.query('ALTER TABLE hr_employees ADD FULLTEXT INDEX hr_employees_full_name_ft (full_name)');

    await create('hr_employee_documents', {
      employee_id: { ...ref('hr_employees'), allowNull: false, onDelete: 'CASCADE' },
      doc_type: { type: D.STRING(60), allowNull: false },
      file_url: { type: D.STRING(500), allowNull: false },
      file_name: D.STRING(255),
      uploaded_at: { type: D.DATE, allowNull: false, defaultValue: D.literal('CURRENT_TIMESTAMP') },
      uploaded_by: ref('users'),
      expiry_date: D.DATEONLY,
      verification_status: { type: D.STRING(12), allowNull: false, defaultValue: 'pending' },
      verified_by: ref('users'),
      verified_at: D.DATE,
      notes: D.TEXT,
    }, [['employee_id'], ['doc_type'], ['expiry_date']]);

    await create('hr_employee_notes', {
      employee_id: { ...ref('hr_employees'), allowNull: false, onDelete: 'CASCADE' },
      body: { type: D.TEXT, allowNull: false },
      visibility: { type: D.STRING(10), allowNull: false, defaultValue: 'hr' },
      created_by: ref('users'),
    }, [['employee_id']]);

    const madeTypes = await create('hr_employee_types', {
      name: { type: D.STRING(60), allowNull: false, unique: true },
      required_documents: D.JSON,
      leave_type_ids: D.JSON,
      attendance_required: bool(true),
      benefits_note: D.TEXT,
      is_active: bool(true),
    });
    if (madeTypes) {
      await queryInterface.bulkInsert('hr_employee_types', TYPES.map((name) => ({
        name, required_documents: JSON.stringify(BASE_DOCS), leave_type_ids: JSON.stringify([]),
        attendance_required: !NO_ATTENDANCE.includes(name), is_active: true, created_at: new Date(), updated_at: new Date(),
      })));
    }

    await create('hr_onboarding_tasks', {
      employee_id: { ...ref('hr_employees'), allowNull: false, onDelete: 'CASCADE' },
      task: { type: D.STRING(40), allowNull: false },
      owner: { type: D.STRING(12), allowNull: false, defaultValue: 'hr' },
      due_on: D.DATEONLY,
      done_at: D.DATE,
      done_by: ref('users'),
    }, [['employee_id'], ['done_at']]);

    if (await create('hr_reminders_sent', {
      kind: { type: D.STRING(40), allowNull: false },
      employee_id: D.INTEGER,
      entity_id: D.INTEGER,
      due_on: { type: D.DATEONLY, allowNull: false },
    })) {
      await queryInterface.addIndex('hr_reminders_sent', ['kind', 'employee_id', 'entity_id', 'due_on'], { unique: true, name: 'hr_reminders_sent_once' });
    }
  },

  async down(queryInterface) {
    for (const t of ['hr_reminders_sent', 'hr_onboarding_tasks', 'hr_employee_types', 'hr_employee_notes', 'hr_employee_documents', 'hr_employees']) {
      await queryInterface.dropTable(t).catch(() => {});
    }
  },
};
