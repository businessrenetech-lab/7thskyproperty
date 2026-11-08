'use strict';

/**
 * HRM Module 1: organisation structure (docs/hrm/2026-10-30-hrm-plan.md, Task 1).
 *
 * Company → Division → Department → Team → Position, plus cost centres, salary grades and the editable
 * HR access settings (Task 4). Nothing here is seeded: Seventh Sky builds its own structure (M1 §2, §13).
 * Columns that point at people (head_employee_id, manager_employee_id, leader_employee_id) stay plain INTs:
 * hr_employees arrives in 0166. Rows are deactivated (is_active), never deleted (M2 §6).
 *
 * Every table is created only when missing, so this is safe to re-run.
 */
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
    const base = (prefixLen = 30) => ({
      branch_id: ref('branches'),
      code: { type: D.STRING(prefixLen), allowNull: false, unique: true },
      is_active: { type: D.BOOLEAN, allowNull: false, defaultValue: true },
      created_by: ref('users'),
    });

    const create = async (name, cols, indexes = []) => {
      if (existing.has(name)) return;
      await queryInterface.createTable(name, { id, ...cols, ...stamps });
      for (const ix of indexes) await queryInterface.addIndex(name, ix, { name: `${name}_${ix.join('_')}` });
    };

    await create('hr_companies', {
      ...base(),
      name: { type: D.STRING(160), allowNull: false },
      trading_name: D.STRING(160),
      registration_no: D.STRING(60),
      tin: D.STRING(40),
      bin: D.STRING(40),
      address: D.TEXT,
      phone: D.STRING(40),
      email: D.STRING(160),
      website: D.STRING(200),
      logo_url: D.STRING(500),
      policies: D.JSON,
    }, [['is_active']]);

    await create('hr_cost_centres', {
      ...base(),
      company_id: ref('hr_companies'),
      name: { type: D.STRING(120), allowNull: false },
    }, [['company_id'], ['is_active']]);

    await create('hr_salary_grades', {
      ...base(),
      name: { type: D.STRING(60), allowNull: false },
      min_amount: D.DECIMAL(15, 2),
      max_amount: D.DECIMAL(15, 2),
    }, [['is_active']]);

    await create('hr_divisions', {
      ...base(),
      company_id: ref('hr_companies'),
      name: { type: D.STRING(160), allowNull: false },
      head_employee_id: D.INTEGER,
      business_function: D.STRING(200),
      website: D.STRING(200),
    }, [['company_id'], ['head_employee_id'], ['is_active']]);

    await create('hr_departments', {
      ...base(),
      division_id: ref('hr_divisions'),
      name: { type: D.STRING(160), allowNull: false },
      manager_employee_id: D.INTEGER,
      location_branch_id: ref('branches'),
      cost_centre_id: ref('hr_cost_centres'),
    }, [['division_id'], ['manager_employee_id'], ['location_branch_id'], ['cost_centre_id'], ['is_active']]);

    await create('hr_teams', {
      ...base(),
      department_id: ref('hr_departments'),
      name: { type: D.STRING(160), allowNull: false },
      leader_employee_id: D.INTEGER,
    }, [['department_id'], ['leader_employee_id'], ['is_active']]);

    await create('hr_positions', {
      ...base(),
      department_id: ref('hr_departments'),
      team_id: ref('hr_teams'),
      title: { type: D.STRING(160), allowNull: false },
      reports_to_position_id: ref('hr_positions'),
      is_top: { type: D.BOOLEAN, allowNull: false, defaultValue: false },
      employment_type: D.STRING(40),
      salary_grade_id: ref('hr_salary_grades'),
      job_description: D.TEXT,
      qualifications: D.TEXT,
      experience: D.TEXT,
      skills: D.JSON,
      approval_authority: D.JSON,
      headcount: { type: D.INTEGER, allowNull: false, defaultValue: 1 },
    }, [['department_id'], ['team_id'], ['reports_to_position_id'], ['salary_grade_id'], ['is_active']]);

    if (!existing.has('hr_access_settings')) {
      await queryInterface.createTable('hr_access_settings', {
        id,
        matrix: D.JSON,
        field_groups: D.JSON,
        updated_by: ref('users'),
        ...stamps,
      });
    }
  },

  async down(queryInterface) {
    for (const t of ['hr_access_settings', 'hr_positions', 'hr_teams', 'hr_departments', 'hr_divisions', 'hr_salary_grades', 'hr_cost_centres', 'hr_companies']) {
      await queryInterface.dropTable(t).catch(() => {});
    }
  },
};
