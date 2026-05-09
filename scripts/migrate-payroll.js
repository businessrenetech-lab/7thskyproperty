/**
 * Payroll System — Safe Database Migration
 * Adds missing columns to existing tables without data loss.
 * Run: node scripts/migrate-payroll.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', 'backend', '.env') });
const sequelize = require('../backend/config/db.config');

const addColumnIfMissing = async (table, column, definition) => {
  try {
    const [rows] = await sequelize.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      { replacements: [table, column] }
    );
    if (rows.length > 0) {
      console.log(`  ⏭  ${table}.${column} — already exists`);
      return false;
    }
    await sequelize.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
    console.log(`  ✅ ${table}.${column} — ADDED`);
    return true;
  } catch (err) {
    console.error(`  ❌ ${table}.${column} — FAILED: ${err.message}`);
    return false;
  }
};

const runOptionalQuery = async (label, sql) => {
  try {
    await sequelize.query(sql);
    console.log(`  ✅ ${label}`);
  } catch (err) {
    console.log(`  ⚠ ${label} — skipped: ${err.message}`);
  }
};

const createTableIfMissing = async (table) => {
  try {
    const [rows] = await sequelize.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
      { replacements: [table] }
    );
    return rows.length > 0;
  } catch {
    return false;
  }
};

(async () => {
  console.log('\n══════════════════════════════════════════════');
  console.log('  PAYROLL SYSTEM — DATABASE MIGRATION');
  console.log('══════════════════════════════════════════════\n');

  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // ─── teacher_sessions table ──────────────────────────────────────
    console.log('── teacher_sessions ──');
    const tsExists = await createTableIfMissing('teacher_sessions');
    if (!tsExists) {
      console.log('  ⚠ Table does not exist — will be created by Sequelize sync');
      // Force sync just the TeacherSession model
      const TeacherSession = require('../backend/models/TeacherSession');
      await TeacherSession.sync();
      console.log('  ✅ teacher_sessions table created');
    } else {
      await addColumnIfMissing('teacher_sessions', 'batch_id', 'INT NULL');
      await addColumnIfMissing('teacher_sessions', 'course_id', 'INT NULL');
      await addColumnIfMissing('teacher_sessions', 'start_time', 'TIME NULL');
      await addColumnIfMissing('teacher_sessions', 'end_time', 'TIME NULL');
      await addColumnIfMissing('teacher_sessions', 'session_type', "ENUM('regular','trial','makeup','extra') DEFAULT 'regular'");
    }

    // ─── payroll_bonuses table ───────────────────────────────────────
    console.log('\n── payroll_bonuses ──');
    const pbExists = await createTableIfMissing('payroll_bonuses');
    if (!pbExists) {
      console.log('  ⚠ Table does not exist — creating via sync');
      const PayrollBonus = require('../backend/models/PayrollBonus');
      await PayrollBonus.sync();
      console.log('  ✅ payroll_bonuses table created');
    }

    // ─── payroll_deductions table ────────────────────────────────────
    console.log('\n── payroll_deductions ──');
    const pdExists = await createTableIfMissing('payroll_deductions');
    if (!pdExists) {
      console.log('  ⚠ Table does not exist — creating via sync');
      const PayrollDeduction = require('../backend/models/PayrollDeduction');
      await PayrollDeduction.sync();
      console.log('  ✅ payroll_deductions table created');
    } else {
      await addColumnIfMissing('payroll_deductions', 'payroll_id', 'INT NULL');
      await addColumnIfMissing('payroll_deductions', 'deduction_type', "ENUM('loan_repayment','advance_recovery','unpaid_leave','absence','late_fine','disciplinary_fine','manual_adjustment','tax','other') DEFAULT 'other'");
      await addColumnIfMissing('payroll_deductions', 'source', "ENUM('manual','loan','attendance','fine','advance') DEFAULT 'manual'");
      await addColumnIfMissing('payroll_deductions', 'applied_at', 'DATETIME NULL');
      await addColumnIfMissing('payroll_deductions', 'approved_by', 'INT NULL');
      await addColumnIfMissing('payroll_deductions', 'created_by', 'INT NULL');
    }

    // ─── staff_profiles table ────────────────────────────────────────
    console.log('\n── staff_profiles ──');
    await addColumnIfMissing('staff_profiles', 'employment_status', "ENUM('active','on_leave','notice_period','resigned','terminated','inactive','suspended') DEFAULT 'active'");
    await addColumnIfMissing('staff_profiles', 'exit_date', 'DATE NULL');
    await addColumnIfMissing('staff_profiles', 'exit_reason', 'TEXT NULL');
    await addColumnIfMissing('staff_profiles', 'notice_start_date', 'DATE NULL');
    await addColumnIfMissing('staff_profiles', 'notice_end_date', 'DATE NULL');
    await addColumnIfMissing('staff_profiles', 'final_settlement_status', "ENUM('pending','calculated','sent_to_accounting','paid') DEFAULT 'pending'");
    await addColumnIfMissing('staff_profiles', 'final_settlement_notes', 'TEXT NULL');
    await addColumnIfMissing('staff_profiles', 'joining_date', 'DATE NULL');
    await addColumnIfMissing('staff_profiles', 'phone', 'VARCHAR(50) NULL');
    await addColumnIfMissing('staff_profiles', 'emergency_contact', 'VARCHAR(255) NULL');
    await addColumnIfMissing('staff_profiles', 'blood_group', 'VARCHAR(5) NULL');
    await addColumnIfMissing('staff_profiles', 'nid_number', 'VARCHAR(20) NULL');
    await addColumnIfMissing('staff_profiles', 'date_of_birth', 'DATE NULL');
    await addColumnIfMissing('staff_profiles', 'gender', "ENUM('male','female','other') NULL");
    await addColumnIfMissing('staff_profiles', 'marital_status', "ENUM('single','married','divorced','widowed') NULL");
    await addColumnIfMissing('staff_profiles', 'profile_photo', 'VARCHAR(500) NULL');
    await addColumnIfMissing('staff_profiles', 'reports_to', 'INT NULL');
    await addColumnIfMissing('staff_profiles', 'department', 'VARCHAR(255) NULL');

    // ─── staff_pay_rules table ───────────────────────────────────────
    console.log('\n── staff_pay_rules ──');
    const sprExists = await createTableIfMissing('staff_pay_rules');
    if (!sprExists) {
      console.log('  ⚠ Table does not exist — creating via sync');
      const StaffPayRule = require('../backend/models/StaffPayRule');
      await StaffPayRule.sync();
      console.log('  ✅ staff_pay_rules table created');
    } else {
      await addColumnIfMissing('staff_pay_rules', 'salary_mode', "ENUM('fixed','session_class','hourly','manual','monthly','per_class','per_hour','per_student') DEFAULT 'fixed'");
      await addColumnIfMissing('staff_pay_rules', 'work_shift', "ENUM('morning','evening','both','custom') DEFAULT 'both'");
      await addColumnIfMissing('staff_pay_rules', 'festival_bonus', 'DECIMAL(15,2) DEFAULT 0');
      await addColumnIfMissing('staff_pay_rules', 'conveyance_fee', 'DECIMAL(15,2) DEFAULT 0');
      await addColumnIfMissing('staff_pay_rules', 'other_allowance', 'DECIMAL(15,2) DEFAULT 0');
      await addColumnIfMissing('staff_pay_rules', 'deduction', 'DECIMAL(15,2) DEFAULT 0');
    }

    // ─── payrolls table ──────────────────────────────────────────────
    console.log('\n── payrolls ──');
    await runOptionalQuery('payrolls.status enum upgraded', "ALTER TABLE `payrolls` MODIFY COLUMN `status` ENUM('draft','pending_admin','pending_accounting','paid','rejected') DEFAULT 'draft'");
    await addColumnIfMissing('payrolls', 'expense_id', 'INT NULL');
    await addColumnIfMissing('payrolls', 'rejection_reason', 'TEXT NULL');
    await addColumnIfMissing('payrolls', 'journal_entry_id', 'INT NULL');

    // ─── expenses table ──────────────────────────────────────────────
    console.log('\n── expenses ──');
    await runOptionalQuery('expenses.account_id nullable', 'ALTER TABLE `expenses` MODIFY COLUMN `account_id` INT NULL');
    await addColumnIfMissing('expenses', 'expense_origin', "VARCHAR(50) DEFAULT 'manual'");
    await addColumnIfMissing('expenses', 'payroll_id', 'INT NULL');
    await addColumnIfMissing('expenses', 'payment_source_selected', 'TINYINT(1) DEFAULT 1');
    await addColumnIfMissing('expenses', 'payment_source_selected_by', 'INT NULL');
    await addColumnIfMissing('expenses', 'payment_source_selected_at', 'DATETIME NULL');

    console.log('\n══════════════════════════════════════════════');
    console.log('  ✅ MIGRATION COMPLETE');
    console.log('══════════════════════════════════════════════\n');

    process.exit(0);
  } catch (err) {
    console.error(`\n❌ Migration failed: ${err.message}`);
    process.exit(1);
  }
})();
