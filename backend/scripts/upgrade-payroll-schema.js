const sequelize = require('../config/db.config');
const PayrollDeduction = require('../models/PayrollDeduction');
const PayrollBonus = require('../models/PayrollBonus');

const tableColumnExists = async (tableName, columnName) => {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    { replacements: [tableName, columnName] }
  );
  return Number(rows[0]?.count || 0) > 0;
};

const addColumnIfMissing = async (tableName, columnName, definition) => {
  if (await tableColumnExists(tableName, columnName)) return false;
  await sequelize.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${definition}`);
  return true;
};

const run = async () => {
  await sequelize.authenticate();

  const changes = [];
  const add = async (table, column, definition) => {
    if (await addColumnIfMissing(table, column, definition)) changes.push(`${table}.${column}`);
  };

  await sequelize.query("ALTER TABLE `payrolls` MODIFY COLUMN `status` ENUM('draft','pending_admin','pending_accounting','paid','rejected') DEFAULT 'draft'");
  await add('payrolls', 'expense_id', 'INT NULL');
  await add('payrolls', 'rejection_reason', 'TEXT NULL');

  await add('expenses', 'expense_origin', "VARCHAR(50) DEFAULT 'manual'");
  await add('expenses', 'payroll_id', 'INT NULL');
  await sequelize.query('ALTER TABLE `expenses` MODIFY COLUMN `account_id` INT NULL');
  await add('expenses', 'payment_source_selected', 'TINYINT(1) DEFAULT 1');
  await add('expenses', 'payment_source_selected_by', 'INT NULL');
  await add('expenses', 'payment_source_selected_at', 'DATETIME NULL');

  await sequelize.query("ALTER TABLE `staff_pay_rules` MODIFY COLUMN `employment_type` ENUM('full_time','part_time','contract','guest','permanent') DEFAULT 'full_time'");
  await add('staff_pay_rules', 'salary_mode', "ENUM('fixed','session_class','hourly','manual','monthly','per_class','per_hour','per_student') DEFAULT 'fixed'");
  await add('staff_pay_rules', 'work_shift', "ENUM('morning','evening','both','custom') DEFAULT 'both'");
  await add('staff_pay_rules', 'festival_bonus', 'DECIMAL(15,2) DEFAULT 0');
  await add('staff_pay_rules', 'conveyance_fee', 'DECIMAL(15,2) DEFAULT 0');
  await add('staff_pay_rules', 'other_allowance', 'DECIMAL(15,2) DEFAULT 0');
  await add('staff_pay_rules', 'deduction', 'DECIMAL(15,2) DEFAULT 0');

  await add('staff_profiles', 'employment_status', "ENUM('active','on_leave','notice_period','resigned','terminated','inactive','suspended') DEFAULT 'active'");
  await add('staff_profiles', 'exit_date', 'DATE NULL');
  await add('staff_profiles', 'exit_reason', 'TEXT NULL');
  await add('staff_profiles', 'notice_start_date', 'DATE NULL');
  await add('staff_profiles', 'notice_end_date', 'DATE NULL');
  await add('staff_profiles', 'final_settlement_status', "ENUM('pending','calculated','sent_to_accounting','paid') DEFAULT 'pending'");
  await add('staff_profiles', 'final_settlement_notes', 'TEXT NULL');

  await PayrollDeduction.sync();
  await PayrollBonus.sync();

  console.log(JSON.stringify({ ok: true, changed: changes }, null, 2));
};

run()
  .then(() => sequelize.close())
  .catch(async (error) => {
    console.error(JSON.stringify({ ok: false, error: error.message, sql: error.sql }, null, 2));
    await sequelize.close().catch(() => {});
    process.exit(1);
  });
