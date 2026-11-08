'use strict';

/**
 * HRM Phase 4: payroll, performance reviews and offboarding, ported from Hadi Real Estate
 * (docs/hrm/2026-10-30-hrm-plan.md, Task 24).
 *
 * A pay run is the company's month (HR is company-wide; branch_id records who prepared it). Preparing it writes one payslip per employee on the roster that month; the
 * CEO approves the run through the Approvals inbox and Accounts marks it paid. One-off bonuses and deductions
 * (Hadi's PayrollBonus / PayrollDeduction, one table here) are approved before a run picks them up. A
 * performance review is written by HR or the supervisor and acknowledged by the employee. An exit records
 * how and when someone leaves, the handover, the checklist and the final settlement; the employee row stays.
 *
 * Every table is created only when missing, so this is safe to re-run.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const existing = new Set((await queryInterface.showAllTables()).map((t) => (typeof t === 'string' ? t : t.tableName)));
    const D = Sequelize;
    const id = () => ({ type: D.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false });
    const stamps = () => ({
      created_at: { type: D.DATE, allowNull: false, defaultValue: D.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: D.DATE, allowNull: false, defaultValue: D.literal('CURRENT_TIMESTAMP') },
    });
    const ref = (table) => ({ type: D.INTEGER, allowNull: true, references: { model: table, key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' });
    const own = (table) => ({ ...ref(table), allowNull: false, onDelete: 'CASCADE' });
    const money = () => ({ type: D.DECIMAL(14, 2), allowNull: false, defaultValue: 0 });
    const str = (n, def) => ({ type: D.STRING(n), allowNull: def === undefined, ...(def !== undefined ? { defaultValue: def } : {}) });

    const create = async (name, cols, indexes = []) => {
      if (existing.has(name)) return;
      await queryInterface.createTable(name, { id: id(), ...cols, ...stamps() });
      for (const ix of indexes) {
        const unique = ix[0] === '!';
        const fields = unique ? ix.slice(1) : ix;
        await queryInterface.addIndex(name, fields, { name: `${name}_${fields.join('_')}`, unique });
      }
    };

    await create('hr_pay_runs', {
      branch_id: ref('branches'),
      month: { type: D.INTEGER, allowNull: false },
      year: { type: D.INTEGER, allowNull: false },
      status: str(20, 'draft'),
      change_request_id: ref('hr_change_requests'),
      employees: { type: D.INTEGER, allowNull: false, defaultValue: 0 },
      gross_total: money(),
      deduction_total: money(),
      net_total: money(),
      prepared_by: ref('users'),
      prepared_at: { type: D.DATE, allowNull: true },
      approved_at: { type: D.DATE, allowNull: true },
      paid_by: ref('users'),
      paid_at: { type: D.DATE, allowNull: true },
      payment_method: str(30),
      payment_reference: str(120),
      notes: { type: D.TEXT, allowNull: true },
    }, [['!', 'year', 'month'], ['status']]);

    await create('hr_payslips', {
      run_id: own('hr_pay_runs'),
      employee_id: own('hr_employees'),
      active_days: { type: D.INTEGER, allowNull: false, defaultValue: 0 },
      days_in_month: { type: D.INTEGER, allowNull: false, defaultValue: 0 },
      unpaid_days: { type: D.DECIMAL(5, 1), allowNull: false, defaultValue: 0 },
      basic: money(),
      allowances_total: money(),
      bonus_total: money(),
      deduction_total: money(),
      gross: money(),
      net: money(),
      lines: { type: D.JSON, allowNull: true },
    }, [['!', 'run_id', 'employee_id'], ['employee_id']]);

    await create('hr_pay_adjustments', {
      branch_id: ref('branches'),
      employee_id: own('hr_employees'),
      direction: str(10),
      type: str(40),
      month: { type: D.INTEGER, allowNull: false },
      year: { type: D.INTEGER, allowNull: false },
      amount: money(),
      reason: { type: D.TEXT, allowNull: true },
      status: str(12, 'pending'),
      payslip_id: ref('hr_payslips'),
      created_by: ref('users'),
      decided_by: ref('users'),
      decided_at: { type: D.DATE, allowNull: true },
    }, [['employee_id', 'year', 'month'], ['status']]);

    await create('hr_performance_reviews', {
      branch_id: ref('branches'),
      employee_id: own('hr_employees'),
      reviewer_user_id: ref('users'),
      period_label: str(60),
      period_start: { type: D.DATEONLY, allowNull: true },
      period_end: { type: D.DATEONLY, allowNull: true },
      ratings: { type: D.JSON, allowNull: true },
      overall: { type: D.DECIMAL(3, 1), allowNull: true },
      strengths: { type: D.TEXT, allowNull: true },
      improvements: { type: D.TEXT, allowNull: true },
      goals: { type: D.TEXT, allowNull: true },
      status: str(14, 'draft'),
      submitted_at: { type: D.DATE, allowNull: true },
      acknowledged_at: { type: D.DATE, allowNull: true },
      employee_comment: { type: D.TEXT, allowNull: true },
    }, [['employee_id'], ['status']]);

    await create('hr_exits', {
      branch_id: ref('branches'),
      employee_id: own('hr_employees'),
      exit_type: str(20),
      reason: { type: D.TEXT, allowNull: true },
      notice_date: { type: D.DATEONLY, allowNull: true },
      last_working_day: { type: D.DATEONLY, allowNull: false },
      handover_employee_id: ref('hr_employees'),
      checklist: { type: D.JSON, allowNull: true },
      settlement: { type: D.JSON, allowNull: true },
      settlement_status: str(20, 'pending'),
      change_request_id: ref('hr_change_requests'),
      status: str(14, 'open'),
      created_by: ref('users'),
    }, [['employee_id'], ['status']]);
  },

  async down(queryInterface) {
    for (const t of ['hr_exits', 'hr_performance_reviews', 'hr_pay_adjustments', 'hr_payslips', 'hr_pay_runs']) {
      await queryInterface.dropTable(t).catch(() => {});
    }
  },
};
