'use strict';

/**
 * HRM Module 3: Recruitment & ATS (docs/hrm/2026-10-30-hrm-plan.md, Task 16).
 *
 * A workforce request (M3 §3, §4) is approved through the four-step chain (M3 §5) and becomes a vacancy. The
 * job description library (§6) feeds vacancies. Candidates (§8, §9) apply to vacancies; each application moves
 * through the §10 statuses, every move logged with user, date and time. Interviews (§12), evaluations (§13),
 * pre-employment checks (§14) and offers (§15) hang off the application. Candidate files sit in their own table
 * and are copied to hr_employee_documents when the candidate is hired.
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
    const own = (table) => ({ ...ref(table), allowNull: false, onDelete: 'CASCADE' });
    const bool = (v = false) => ({ type: D.BOOLEAN, allowNull: false, defaultValue: v });
    const money = { type: D.DECIMAL(14, 2), allowNull: true };

    const create = async (name, cols, indexes = []) => {
      if (existing.has(name)) return;
      await queryInterface.createTable(name, { id, ...cols, ...stamps });
      for (const ix of indexes) {
        const unique = ix[0] === '!';
        const fields = unique ? ix.slice(1) : ix;
        await queryInterface.addIndex(name, fields, { name: `${name}_${fields.join('_')}`, unique });
      }
    };

    await create('hr_job_descriptions', {
      branch_id: ref('branches'),
      position_id: ref('hr_positions'),
      title: { type: D.STRING(150), allowNull: false },
      department_id: ref('hr_departments'),
      reports_to_position_id: ref('hr_positions'),
      summary: D.TEXT, duties: D.TEXT, responsibilities: D.TEXT, qualifications: D.TEXT, experience: D.TEXT,
      technical_skills: D.TEXT, soft_skills: D.TEXT, working_hours: D.STRING(150),
      salary_grade_id: ref('hr_salary_grades'),
      kpis: D.TEXT, career_path: D.TEXT,
      cloned_from_id: ref('hr_job_descriptions'),
      is_active: bool(true),
      created_by: ref('users'),
    }, [['position_id'], ['department_id']]);

    await create('hr_workforce_requests', {
      branch_id: ref('branches'),
      department_id: ref('hr_departments'),
      position_id: ref('hr_positions'),
      reason: { type: D.TEXT, allowNull: false },
      request_kind: { type: D.STRING(20), allowNull: false },          // 'New Position' | 'Replacement'
      vacancies_count: { type: D.INTEGER, allowNull: false, defaultValue: 1 },
      salary_min: money, salary_max: money,
      employment_type: D.STRING(60),
      expected_joining_date: D.DATEONLY,
      budget_available: bool(false),
      approving_manager_id: ref('users'),
      // The vacancy-request fields (M3 §4) travel with the request so the approved vacancy is complete.
      reports_to_position_id: ref('hr_positions'),
      salary_grade_id: ref('hr_salary_grades'),
      location_branch_id: ref('branches'),
      closing_date: D.DATEONLY,
      priority: { type: D.STRING(10), allowNull: false, defaultValue: 'Normal' },
      job_description_id: ref('hr_job_descriptions'),
      requested_by: ref('users'),
      change_request_id: ref('hr_change_requests'),
      status: { type: D.STRING(12), allowNull: false, defaultValue: 'pending' },   // pending | approved | rejected | withdrawn
    }, [['status'], ['department_id']]);

    await create('hr_vacancies', {
      branch_id: ref('branches'),
      vacancy_code: { type: D.STRING(20), allowNull: false },
      workforce_request_id: ref('hr_workforce_requests'),
      department_id: ref('hr_departments'),
      position_id: ref('hr_positions'),
      reports_to_position_id: ref('hr_positions'),
      employment_type: D.STRING(60),
      salary_grade_id: ref('hr_salary_grades'),
      salary_min: money, salary_max: money,
      location_branch_id: ref('branches'),
      positions_count: { type: D.INTEGER, allowNull: false, defaultValue: 1 },
      closing_date: D.DATEONLY,
      priority: { type: D.STRING(10), allowNull: false, defaultValue: 'Normal' },
      job_description_id: ref('hr_job_descriptions'),
      status: { type: D.STRING(20), allowNull: false, defaultValue: 'draft' },   // draft | pending_approval | published | closed | filled
      channels: D.JSON,
      public_slug: D.STRING(160),
      published_at: D.DATE,
      closed_at: D.DATE,
      cost_amount: { type: D.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      filled_count: { type: D.INTEGER, allowNull: false, defaultValue: 0 },
      created_by: ref('users'),
    }, [['!', 'vacancy_code'], ['!', 'public_slug'], ['status'], ['department_id']]);

    await create('hr_candidates', {
      branch_id: ref('branches'),
      candidate_code: { type: D.STRING(20), allowNull: false },
      full_name: { type: D.STRING(150), allowNull: false },
      date_of_birth: D.DATEONLY,
      mobile: D.STRING(20), email: D.STRING(190), address: D.TEXT,
      national_id: D.STRING(40),
      highest_qualification: D.STRING(150), institution: D.STRING(150), graduation_year: D.INTEGER,
      current_employer: D.STRING(150), current_position: D.STRING(150),
      years_experience: { type: D.DECIMAL(4, 1), allowNull: true },
      expected_salary: money,
      notice_period: D.STRING(60),
      skills: D.JSON,
      location: D.STRING(120),
      availability: D.STRING(60),
      in_talent_pool: bool(false),
      duplicate_of_id: ref('hr_candidates'),
      archived_at: D.DATE,
    }, [['!', 'candidate_code'], ['email'], ['mobile'], ['national_id'], ['in_talent_pool']]);

    await create('hr_candidate_documents', {
      candidate_id: own('hr_candidates'),
      doc_type: { type: D.STRING(60), allowNull: false },
      file_url: { type: D.STRING(500), allowNull: false },
      file_name: D.STRING(255),
      uploaded_by: ref('users'),
    }, [['candidate_id']]);

    await create('hr_applications', {
      candidate_id: own('hr_candidates'),
      vacancy_id: own('hr_vacancies'),
      status: { type: D.STRING(30), allowNull: false, defaultValue: 'Application Received' },
      source: D.STRING(60),
      cover_letter: D.TEXT,
      screening: D.JSON,
      screening_score: { type: D.DECIMAL(5, 1), allowNull: true },
      applied_at: { type: D.DATE, allowNull: false, defaultValue: D.literal('CURRENT_TIMESTAMP') },
      hr_confirmed_at: D.DATE,
      hr_confirmed_by: ref('users'),
      hire_change_request_id: ref('hr_change_requests'),
      hired_employee_id: ref('hr_employees'),
    }, [['!', 'candidate_id', 'vacancy_id'], ['vacancy_id', 'status'], ['status']]);

    await create('hr_application_events', {
      application_id: own('hr_applications'),
      kind: { type: D.STRING(12), allowNull: false, defaultValue: 'status' },   // status | message | note
      from_status: D.STRING(30), to_status: D.STRING(30),
      channel: D.STRING(10),
      actor_id: ref('users'),
      at: { type: D.DATE, allowNull: false, defaultValue: D.literal('CURRENT_TIMESTAMP') },
      note: D.TEXT,
    }, [['application_id']]);

    await create('hr_interviews', {
      application_id: own('hr_applications'),
      type: { type: D.STRING(30), allowNull: false },
      scheduled_at: { type: D.DATE, allowNull: false },
      duration_minutes: { type: D.INTEGER, allowNull: false, defaultValue: 45 },
      location: D.STRING(200), meeting_link: D.STRING(500),
      panel: D.JSON,
      notes: D.TEXT,
      rating: D.INTEGER,
      status: { type: D.STRING(12), allowNull: false, defaultValue: 'scheduled' },   // scheduled | completed | cancelled
      reminder_sent_at: D.DATE,
      created_by: ref('users'),
    }, [['application_id'], ['scheduled_at']]);

    await create('hr_evaluations', {
      interview_id: own('hr_interviews'),
      evaluator_id: ref('users'),
      scores: D.JSON,
      recommendation: D.STRING(30),
      comments: D.TEXT,
    }, [['!', 'interview_id', 'evaluator_id']]);

    await create('hr_checks', {
      application_id: own('hr_applications'),
      check_type: { type: D.STRING(60), allowNull: false },
      required: bool(true),
      status: { type: D.STRING(14), allowNull: false, defaultValue: 'pending' },   // pending | done | failed
      verified_by: ref('users'),
      verified_at: D.DATE,
      file_url: D.STRING(500),
      notes: D.TEXT,
    }, [['!', 'application_id', 'check_type']]);

    await create('hr_offers', {
      application_id: own('hr_applications'),
      position_id: ref('hr_positions'),
      salary: money,
      employment_type: D.STRING(60),
      probation_months: D.INTEGER,
      start_date: D.DATEONLY,
      supervisor_employee_id: ref('hr_employees'),
      work_location_branch_id: ref('branches'),
      letter_html: D.TEXT('long'),
      token_hash: D.STRING(64),
      token_expires_at: D.DATE,
      status: { type: D.STRING(10), allowNull: false, defaultValue: 'draft' },   // draft | sent | accepted | declined
      sent_at: D.DATE, accepted_at: D.DATE, accepted_ip: D.STRING(64), declined_at: D.DATE, decline_reason: D.TEXT,
      created_by: ref('users'),
    }, [['application_id'], ['token_hash']]);
  },

  async down(queryInterface) {
    for (const t of ['hr_offers', 'hr_checks', 'hr_evaluations', 'hr_interviews', 'hr_application_events', 'hr_applications',
      'hr_candidate_documents', 'hr_candidates', 'hr_vacancies', 'hr_workforce_requests', 'hr_job_descriptions']) {
      await queryInterface.dropTable(t).catch(() => {});
    }
  },
};
