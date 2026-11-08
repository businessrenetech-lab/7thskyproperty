'use strict';

/**
 * HR: attendance, office calendar, leave, shifts / schedules and ZKTeco biometric devices.
 *
 * Ported from Hadi Real Estate. The models (StaffProfile, StaffAttendance, LeaveType, LeaveRequest, LeaveBalance,
 * OfficeHoliday, Shift, StaffSchedule, Biometric*) have been in this repo for a long time with no tables behind
 * them, so every HR screen failed. This creates the twelve tables exactly as those models describe them.
 *
 * staff_profiles is Hadi's employee record (employee id, designation, department, joining / exit dates). The
 * Employee Master of the client spec (docs/hrm/2026-10-30-hrm-plan.md, Phase 2) extends this table rather than
 * adding a second one.
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
    const ref = (table, allowNull = false) => ({ type: D.INTEGER, allowNull, references: { model: table, key: 'id' }, onUpdate: 'CASCADE', onDelete: allowNull ? 'SET NULL' : 'CASCADE' });

    const create = async (name, cols, indexes = []) => {
      if (existing.has(name)) return;
      await queryInterface.createTable(name, { id, ...cols, ...stamps });
      for (const ix of indexes) await queryInterface.addIndex(name, ix.fields, { unique: !!ix.unique, name: ix.name || `${name}_${ix.fields.join('_')}` });
    };

    await create('staff_profiles', {
      user_id: { ...ref('users'), unique: true },
      branch_id: ref('branches'),
      designation: { type: D.STRING, allowNull: false },
      base_salary: { type: D.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      bank_name: D.STRING,
      account_no: D.STRING,
      father_name: D.STRING,
      mother_name: D.STRING,
      address: D.TEXT,
      contact_details: D.STRING,
      educational_background: D.JSON,
      work_experience: D.JSON,
      joining_date: D.DATEONLY,
      phone: D.STRING(50),
      emergency_contact: D.STRING,
      emergency_relation: D.STRING(60),
      emergency_phone: D.STRING(20),
      blood_group: D.STRING(5),
      nid_number: D.STRING(20),
      date_of_birth: D.DATEONLY,
      gender: D.ENUM('male', 'female', 'other'),
      marital_status: D.ENUM('single', 'married', 'divorced', 'widowed'),
      profile_photo: D.STRING(500),
      reports_to: ref('users', true),
      department: D.STRING,
      employment_status: { type: D.ENUM('active', 'on_leave', 'notice_period', 'resigned', 'terminated', 'inactive', 'suspended', 'exited'), defaultValue: 'active' },
      exit_date: D.DATEONLY,
      exit_reason: D.TEXT,
      notice_start_date: D.DATEONLY,
      notice_end_date: D.DATEONLY,
      final_settlement_status: { type: D.ENUM('pending', 'calculated', 'sent_to_accounting', 'paid'), defaultValue: 'pending' },
      final_settlement_notes: D.TEXT,
      employee_id: { type: D.STRING(30), allowNull: true },
    }, [{ fields: ['employee_id'], unique: true, name: 'staff_profiles_employee_id' }]);

    await create('staff_attendance', {
      user_id: ref('users'),
      branch_id: ref('branches'),
      date: { type: D.DATEONLY, allowNull: false },
      check_in: D.TIME,
      check_out: D.TIME,
      status: { type: D.ENUM('present', 'absent', 'late', 'half_day', 'on_leave'), defaultValue: 'absent' },
      method: { type: D.ENUM('manual', 'biometric', 'qr', 'mobile'), defaultValue: 'manual' },
      notes: D.TEXT,
      ip_address: D.STRING,
      latitude: D.STRING,
      longitude: D.STRING,
    }, [{ fields: ['user_id', 'date'], unique: true }, { fields: ['branch_id', 'date'] }]);

    await create('leave_types', {
      name: { type: D.STRING, allowNull: false },
      days_per_year: { type: D.INTEGER, defaultValue: 0 },
      is_paid: { type: D.BOOLEAN, defaultValue: true },
      color: { type: D.STRING(7), defaultValue: '#00D4FF' },
      code: { type: D.STRING(30), allowNull: true },
      category: { type: D.STRING(20), allowNull: false, defaultValue: 'other' },
      requires_proof: { type: D.BOOLEAN, allowNull: false, defaultValue: false },
      template: { type: D.TEXT, allowNull: true },
      description: { type: D.STRING(255), allowNull: true },
      sort_order: { type: D.INTEGER, allowNull: false, defaultValue: 0 },
      is_active: { type: D.BOOLEAN, allowNull: false, defaultValue: true },
    });

    await create('leave_requests', {
      user_id: ref('users'),
      branch_id: ref('branches'),
      leave_type_id: ref('leave_types'),
      start_date: { type: D.DATEONLY, allowNull: false },
      end_date: { type: D.DATEONLY, allowNull: false },
      total_days: { type: D.DECIMAL(4, 1), allowNull: false },
      reason: D.TEXT,
      worked_date: { type: D.DATEONLY, allowNull: true },
      proof_note: { type: D.TEXT, allowNull: true },
      handover_note: { type: D.TEXT, allowNull: true },
      status: { type: D.ENUM('pending', 'approved', 'rejected', 'cancelled'), defaultValue: 'pending' },
      approved_by: ref('users', true),
      approved_at: D.DATE,
      rejection_note: D.TEXT,
    }, [{ fields: ['user_id', 'status'] }, { fields: ['branch_id', 'status'] }]);

    await create('leave_balances', {
      user_id: ref('users'),
      leave_type_id: ref('leave_types'),
      year: { type: D.INTEGER, allowNull: false },
      entitled: { type: D.DECIMAL(4, 1), defaultValue: 0 },
      used: { type: D.DECIMAL(4, 1), defaultValue: 0 },
      carried_over: { type: D.DECIMAL(4, 1), defaultValue: 0 },
    }, [{ fields: ['user_id', 'leave_type_id', 'year'], unique: true }]);

    await create('office_holidays', {
      branch_id: { type: D.INTEGER, allowNull: true },
      name: { type: D.STRING(120), allowNull: false },
      kind: { type: D.STRING(20), allowNull: false, defaultValue: 'public_holiday' },
      date_from: { type: D.DATEONLY, allowNull: false },
      date_to: { type: D.DATEONLY, allowNull: false },
      created_by: { type: D.INTEGER, allowNull: true },
    }, [{ fields: ['date_from'] }, { fields: ['branch_id'] }]);

    await create('shifts', {
      branch_id: ref('branches'),
      name: { type: D.STRING, allowNull: false },
      start_time: { type: D.TIME, allowNull: false },
      end_time: { type: D.TIME, allowNull: false },
      color: { type: D.STRING(7), defaultValue: '#00D4FF' },
    });

    await create('staff_schedules', {
      user_id: ref('users'),
      shift_id: ref('shifts'),
      date: { type: D.DATEONLY, allowNull: false },
      notes: D.TEXT,
    }, [{ fields: ['user_id', 'date'], unique: true }]);

    await create('biometric_devices', {
      serial_number: { type: D.STRING(100), allowNull: false, unique: true },
      name: { type: D.STRING, allowNull: false, defaultValue: 'Unnamed Device' },
      branch_id: ref('branches'),
      model: D.STRING(100),
      firmware_version: D.STRING(50),
      ip_address: D.STRING(45),
      port: { type: D.INTEGER, defaultValue: 4370 },
      status: { type: D.ENUM('active', 'inactive', 'offline', 'maintenance'), defaultValue: 'active' },
      last_heartbeat: D.DATE,
      last_sync_stamp: { type: D.STRING(50), defaultValue: '0' },
      push_version: D.STRING(20),
      timezone: { type: D.STRING(50), defaultValue: 'Asia/Dhaka' },
      location_description: D.STRING,
      settings: D.JSON,
    }, [{ fields: ['branch_id'] }, { fields: ['status'] }]);

    await create('biometric_logs', {
      device_serial: { type: D.STRING(100), allowNull: false },
      pin: { type: D.STRING(50), allowNull: false },
      punch_time: { type: D.DATE, allowNull: false },
      verify_type: { type: D.INTEGER, defaultValue: 0 },
      io_mode: { type: D.INTEGER, defaultValue: 0 },
      work_code: { type: D.STRING(20), defaultValue: '0' },
      reserved: D.STRING(100),
      processed: { type: D.BOOLEAN, defaultValue: false },
      processed_at: D.DATE,
      process_error: D.TEXT,
      matched_user_id: D.INTEGER,
    }, [
      { fields: ['device_serial', 'pin', 'punch_time'], unique: true },
      { fields: ['pin'] }, { fields: ['punch_time'] }, { fields: ['processed'] },
    ]);

    await create('biometric_user_maps', {
      device_serial: { type: D.STRING(100), allowNull: false },
      pin: { type: D.STRING(50), allowNull: false },
      user_id: ref('users'),
      employee_name: D.STRING,
      is_active: { type: D.BOOLEAN, defaultValue: true },
    }, [{ fields: ['device_serial', 'pin'], unique: true }]);

    await create('biometric_commands', {
      device_serial: { type: D.STRING(100), allowNull: false },
      command: { type: D.TEXT, allowNull: false },
      command_type: { type: D.ENUM('INFO', 'REBOOT', 'CLEAR_LOG', 'CLEAR_DATA', 'SET_USER', 'DEL_USER', 'SET_TIME', 'ENROLL_FP', 'CHECK', 'CUSTOM'), defaultValue: 'INFO' },
      status: { type: D.ENUM('pending', 'delivered', 'executed', 'failed'), defaultValue: 'pending' },
      response: D.TEXT,
      delivered_at: D.DATE,
      executed_at: D.DATE,
      created_by: D.INTEGER,
    }, [{ fields: ['device_serial', 'status'] }]);
  },

  async down() {
    // Additive: HR data is never dropped by a rollback.
  },
};
