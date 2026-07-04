const { Op, fn, col } = require('sequelize');
const Lead = require('../models/Lead');
const Enrollment = require('../models/Enrollment');
const Student = require('../models/Student');
const User = require('../models/User');
const Branch = require('../models/Branch');
const Course = require('../models/Course');
const Batch = require('../models/Batch');
const SystemSetting = require('../models/SystemSetting');
const { sendEmail, brandedEmailWrapper } = require('./communication.service');

const DEFAULT_ADMIN_RECIPIENTS = [
  'info@seventhskypropertycare.com',
];

const ADMIN_RECIPIENTS_KEY = 'ADMIN_NOTIFICATION_EMAILS';
const LAST_MONTHLY_REPORT_KEY = 'MONTHLY_REPORT_LAST_SENT_PERIOD';
const REPORT_SEND_WINDOW_DAYS = 7;

let monthlyReportRunning = false;

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const formatMoney = (value) => `${Number(value || 0).toLocaleString('en-BD')} BDT`;

const formatDateTime = (value) => {
  if (!value) return 'N/A';
  return new Date(value).toLocaleString('en-GB', {
    timeZone: 'Asia/Dhaka',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const parseRecipients = (value) => String(value || '')
  .split(/[;,\n]/)
  .map(email => email.trim())
  .filter(Boolean);

const getAdminRecipients = async () => {
  const setting = await SystemSetting.findOne({ where: { setting_key: ADMIN_RECIPIENTS_KEY } }).catch(() => null);
  const configured = parseRecipients(setting?.setting_value || process.env.ADMIN_NOTIFICATION_EMAILS);
  return configured.length ? configured : DEFAULT_ADMIN_RECIPIENTS;
};

const findBranch = async (branchId) => {
  if (!branchId) return null;
  return Branch.findByPk(branchId).catch(() => null);
};

const findCourse = async (courseId) => {
  if (!courseId) return null;
  return Course.findByPk(courseId).catch(() => null);
};

const findBatch = async (batchId) => {
  if (!batchId) return null;
  return Batch.findByPk(batchId).catch(() => null);
};

const detailRows = (rows) => rows
  .filter(([, value]) => value !== undefined && value !== null && value !== '')
  .map(([label, value]) => `
    <tr class="detail-row">
      <td class="receipt-label" style="padding:12px 20px;font-size:14px;color:#6c757d;width:38%;border-bottom:1px solid #f0f2f5;">${escapeHtml(label)}</td>
      <td class="receipt-value" style="padding:12px 20px 12px 0;font-size:14px;color:#1a1a2e;font-weight:600;border-bottom:1px solid #f0f2f5;">${escapeHtml(value)}</td>
    </tr>
  `).join('');

const card = (title, rows) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e9ecef;border-radius:10px;overflow:hidden;margin-bottom:24px;">
    <tr>
      <td style="background-color:#003768;padding:14px 20px;">
        <h3 style="margin:0;font-size:15px;font-weight:700;color:#ffffff;letter-spacing:0.3px;">${escapeHtml(title)}</h3>
      </td>
    </tr>
    <tr>
      <td style="padding:0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${detailRows(rows)}
        </table>
      </td>
    </tr>
  </table>
`;

const sendAdminEmail = async (subject, title, bodyContent) => {
  const recipients = await getAdminRecipients();
  const html = brandedEmailWrapper(title, bodyContent);
  return sendEmail(recipients.join(', '), subject, html, [], 'info');
};

const sendLeadNotificationEmail = async ({ lead, branch, course, batch, type } = {}) => {
  if (!lead) return { success: false, error: 'Missing lead' };

  const [resolvedBranch, resolvedCourse, resolvedBatch] = await Promise.all([
    branch || findBranch(lead.branch_id),
    course || findCourse(lead.course_id),
    batch || findBatch(lead.batch_id),
  ]);

  const leadType = type || lead.tags?.booking_type || lead.source || 'New Lead';
  const subject = `New ${leadType} Lead - ${lead.name} | Seventh Sky Property Care`;
  const bodyContent = `
    <h2 class="hero-title" style="margin:0 0 6px 0;font-size:24px;font-weight:700;color:#1a1a2e;">New Lead Submitted</h2>
    <p style="margin:0 0 24px 0;font-size:15px;color:#495057;line-height:1.7;">
      A new real estate lead has just been submitted to Seventh Sky Property Care. Please assign follow-up quickly while the intent is fresh.
    </p>
    ${card('Lead Details', [
      ['Name', lead.name],
      ['Phone', lead.phone],
      ['Email', lead.email],
      ['Lead Type', leadType],
      ['Source', lead.source],
      ['Status', lead.status],
      ['Priority', lead.priority],
      ['Score', lead.score],
      ['Branch', resolvedBranch?.name || lead.branch_id],
      ['Service / Property', resolvedCourse?.title || lead.batch_interest],
      ['Project / Stage', resolvedBatch?.name || resolvedBatch?.code],
      ['Interested Area', lead.destination_country],
      ['Deal Value', lead.deal_value ? formatMoney(lead.deal_value) : 'N/A'],
      ['Submitted At', formatDateTime(lead.createdAt || new Date())],
    ])}
    ${lead.notes ? `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
        <tr>
          <td style="background-color:#f8f9fa;border-left:4px solid #1bbdf1;padding:16px 20px;border-radius:0 8px 8px 0;">
            <p style="margin:0 0 6px 0;font-size:15px;color:#003768;font-weight:700;">Notes</p>
            <p style="margin:0;font-size:14px;color:#495057;line-height:1.6;white-space:pre-line;">${escapeHtml(lead.notes)}</p>
          </td>
        </tr>
      </table>
    ` : ''}
    <p style="margin:0;font-size:14px;color:#6c757d;line-height:1.6;">
      Recommended next action: call the lead, confirm property/service fit, and update CRM status after contact.
    </p>
  `;

  return sendAdminEmail(subject, `New Lead - ${lead.name}`, bodyContent);
};

const sendEnrollmentNotificationEmail = async ({ enrollment, student, user, branch, batch, course, source, invoice } = {}) => {
  if (!enrollment) return { success: false, error: 'Missing enrollment' };

  const resolvedStudent = student || await Student.findByPk(enrollment.student_id).catch(() => null);
  const resolvedUser = user || (resolvedStudent?.user_id ? await User.findByPk(resolvedStudent.user_id).catch(() => null) : null);
  const resolvedBatch = batch || await findBatch(enrollment.batch_id);
  const resolvedCourse = course || await findCourse(resolvedBatch?.course_id);
  const resolvedBranch = branch || await findBranch(enrollment.branch_id);
  const studentName = resolvedUser?.name || [resolvedStudent?.first_name, resolvedStudent?.last_name].filter(Boolean).join(' ') || `Student #${enrollment.student_id}`;

  const subject = `Client Request Created - ${studentName} | Seventh Sky Property Care`;
  const bodyContent = `
    <h2 class="hero-title" style="margin:0 0 6px 0;font-size:24px;font-weight:700;color:#1a1a2e;">Client Request Created</h2>
    <p style="margin:0 0 24px 0;font-size:15px;color:#495057;line-height:1.7;">
      A client request has been created at Seventh Sky Property Care. Please verify payment status and next-step onboarding.
    </p>
    ${card('Request Details', [
      ['Client', studentName],
      ['Phone', resolvedStudent?.mobile_no],
      ['Email', resolvedUser?.email],
      ['Branch', resolvedBranch?.name || enrollment.branch_id],
      ['Service / Property', resolvedCourse?.title || 'N/A'],
      ['Project / Stage', resolvedBatch?.name || resolvedBatch?.code || 'TBA'],
      ['Total Fee', formatMoney(enrollment.total_fee)],
      ['Paid Amount', formatMoney(enrollment.paid_amount)],
      ['Discount', formatMoney(enrollment.discount)],
      ['Status', enrollment.status],
      ['Invoice', invoice?.invoice_no],
      ['Source', source || 'system'],
      ['Created At', formatDateTime(enrollment.createdAt || new Date())],
    ])}
    <p style="margin:0;font-size:14px;color:#6c757d;line-height:1.6;">
      Recommended next action: confirm payment collection, project assignment, and client welcome communication.
    </p>
  `;

  return sendAdminEmail(subject, `Client Request - ${studentName}`, bodyContent);
};

const getPreviousMonthRange = (now = new Date()) => {
  const year = now.getFullYear();
  const month = now.getMonth();
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 1, 0, 0, 0, 0);
  const periodKey = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
  const label = start.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'Asia/Dhaka' });
  return { start, end, periodKey, label };
};

const getLastReportPeriod = async () => {
  const setting = await SystemSetting.findOne({ where: { setting_key: LAST_MONTHLY_REPORT_KEY } }).catch(() => null);
  return setting?.setting_value || '';
};

const setLastReportPeriod = async (periodKey) => {
  const [setting] = await SystemSetting.findOrCreate({
    where: { setting_key: LAST_MONTHLY_REPORT_KEY },
    defaults: {
      setting_value: periodKey,
      description: 'Last monthly admin report period sent',
      is_secret: false,
      category: 'email',
    },
  });

  if (setting.setting_value !== periodKey) {
    await setting.update({ setting_value: periodKey });
  }
};

const rowsFromAggregate = (items, labelKey, valueKey) => {
  if (!items.length) return '<tr><td style="padding:12px 20px;font-size:14px;color:#6c757d;">No data for this period.</td></tr>';
  return items.map(item => `
    <tr>
      <td style="padding:10px 20px;font-size:14px;color:#1a1a2e;border-bottom:1px solid #f0f2f5;">${escapeHtml(item[labelKey] || 'Unknown')}</td>
      <td style="padding:10px 20px;font-size:14px;color:#003768;font-weight:700;text-align:right;border-bottom:1px solid #f0f2f5;">${escapeHtml(item[valueKey])}</td>
    </tr>
  `).join('');
};

const tableBlock = (title, leftLabel, rightLabel, rows) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e9ecef;border-radius:10px;overflow:hidden;margin-bottom:24px;">
    <tr>
      <td colspan="2" style="background-color:#003768;padding:14px 20px;">
        <h3 style="margin:0;font-size:15px;font-weight:700;color:#ffffff;letter-spacing:0.3px;">${escapeHtml(title)}</h3>
      </td>
    </tr>
    <tr>
      <td style="padding:10px 20px;background:#f8f9fa;font-size:12px;color:#6c757d;font-weight:700;text-transform:uppercase;">${escapeHtml(leftLabel)}</td>
      <td style="padding:10px 20px;background:#f8f9fa;font-size:12px;color:#6c757d;font-weight:700;text-transform:uppercase;text-align:right;">${escapeHtml(rightLabel)}</td>
    </tr>
    ${rows}
  </table>
`;

const sendMonthlyReportEmail = async ({ start, end, periodKey, label }) => {
  const where = { createdAt: { [Op.gte]: start, [Op.lt]: end } };

  const [leadCount, trialLeadCount, successfulLeadCount, enrollmentCount, paidEnrollmentCount, leadSources, branchLeadRows, branchEnrollmentRows, enrollments] = await Promise.all([
    Lead.count({ where }),
    Lead.count({ where: { ...where, status: 'trial' } }),
    Lead.count({ where: { ...where, status: 'successful' } }),
    Enrollment.count({ where }),
    Enrollment.count({ where: { ...where, status: 'paid' } }),
    Lead.findAll({
      where,
      attributes: ['source', [fn('COUNT', col('id')), 'count']],
      group: ['source'],
      raw: true,
    }),
    Lead.findAll({
      where,
      attributes: ['branch_id', [fn('COUNT', col('id')), 'lead_count']],
      group: ['branch_id'],
      raw: true,
    }),
    Enrollment.findAll({
      where,
      attributes: ['branch_id', [fn('COUNT', col('id')), 'enrollment_count'], [fn('SUM', col('total_fee')), 'total_fee'], [fn('SUM', col('paid_amount')), 'paid_amount']],
      group: ['branch_id'],
      raw: true,
    }),
    Enrollment.findAll({ where, attributes: ['id', 'batch_id', 'total_fee', 'paid_amount'], raw: true }),
  ]);

  const [branches, batches] = await Promise.all([
    Branch.findAll({ attributes: ['id', 'name'], raw: true }).catch(() => []),
    Batch.findAll({ attributes: ['id', 'course_id'], raw: true }).catch(() => []),
  ]);
  const branchNames = new Map(branches.map(branch => [branch.id, branch.name]));
  const batchCourseIds = new Map(batches.map(batch => [batch.id, batch.course_id]));
  const courseIds = [...new Set(enrollments.map(enrollment => batchCourseIds.get(enrollment.batch_id)).filter(Boolean))];
  const courses = courseIds.length ? await Course.findAll({ where: { id: courseIds }, attributes: ['id', 'title'], raw: true }).catch(() => []) : [];
  const courseNames = new Map(courses.map(course => [course.id, course.title]));

  const enrollmentFeeTotal = enrollments.reduce((sum, enrollment) => sum + Number(enrollment.total_fee || 0), 0);
  const enrollmentPaidTotal = enrollments.reduce((sum, enrollment) => sum + Number(enrollment.paid_amount || 0), 0);
  const courseTotals = new Map();
  for (const enrollment of enrollments) {
    const courseId = batchCourseIds.get(enrollment.batch_id);
    const courseName = courseNames.get(courseId) || 'Unassigned Service';
    courseTotals.set(courseName, (courseTotals.get(courseName) || 0) + 1);
  }

  const sourceRows = leadSources
    .map(item => ({ source: item.source || 'Unknown', count: Number(item.count || 0) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  const branchLeadSummary = branchLeadRows
    .map(item => ({ branch: branchNames.get(item.branch_id) || `Branch #${item.branch_id}`, count: Number(item.lead_count || 0) }))
    .sort((a, b) => b.count - a.count);
  const branchEnrollmentSummary = branchEnrollmentRows
    .map(item => ({
      branch: branchNames.get(item.branch_id) || `Branch #${item.branch_id}`,
      summary: `${Number(item.enrollment_count || 0)} enrollments / ${formatMoney(item.total_fee || 0)}`,
    }))
    .sort((a, b) => String(a.branch).localeCompare(String(b.branch)));
  const courseSummary = [...courseTotals.entries()]
    .map(([course, count]) => ({ course, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const bodyContent = `
    <h2 class="hero-title" style="margin:0 0 6px 0;font-size:24px;font-weight:700;color:#1a1a2e;">Monthly Growth Report</h2>
    <p style="margin:0 0 24px 0;font-size:15px;color:#495057;line-height:1.7;">
      Performance summary for ${escapeHtml(label)} from Seventh Sky Property Care.
    </p>
    ${card('Executive Summary', [
      ['Report Period', label],
      ['New Leads', leadCount],
      ['Qualified Leads', trialLeadCount],
      ['Successful Leads', successfulLeadCount],
      ['Client Requests', enrollmentCount],
      ['Paid Requests', paidEnrollmentCount],
      ['Request Fee Pipeline', formatMoney(enrollmentFeeTotal)],
      ['Collected Request Amount', formatMoney(enrollmentPaidTotal)],
      ['Report Key', periodKey],
    ])}
    ${tableBlock('Lead Sources', 'Source', 'Leads', rowsFromAggregate(sourceRows, 'source', 'count'))}
    ${tableBlock('Branch Lead Performance', 'Branch', 'Leads', rowsFromAggregate(branchLeadSummary, 'branch', 'count'))}
    ${tableBlock('Branch Request Performance', 'Branch', 'Requests / Pipeline', rowsFromAggregate(branchEnrollmentSummary, 'branch', 'summary'))}
    ${tableBlock('Top Requested Services', 'Service', 'Requests', rowsFromAggregate(courseSummary, 'course', 'count'))}
    <p style="margin:0;font-size:14px;color:#6c757d;line-height:1.6;">
      Recommended review: compare lead source quality, speed-to-lead, lead-to-client conversion, and pending-payment follow-up by branch.
    </p>
  `;

  return sendAdminEmail(`Monthly Report - ${label} | Seventh Sky Property Care`, `Monthly Report - ${label}`, bodyContent);
};

const runMonthlyReportSweep = async ({ force = false } = {}) => {
  if (monthlyReportRunning) return { skipped: true, reason: 'already_running' };
  monthlyReportRunning = true;

  try {
    const now = new Date();
    if (!force && now.getDate() > REPORT_SEND_WINDOW_DAYS) {
      return { skipped: true, reason: 'outside_send_window' };
    }

    const period = getPreviousMonthRange(now);
    const lastSent = await getLastReportPeriod();
    if (!force && lastSent === period.periodKey) {
      return { skipped: true, reason: 'already_sent', period: period.periodKey };
    }

    const result = await sendMonthlyReportEmail(period);
    if (result?.success) {
      await setLastReportPeriod(period.periodKey);
    }

    return { sent: Boolean(result?.success), period: period.periodKey, result };
  } catch (error) {
    console.error('[ADMIN_NOTIFY] Monthly report failed:', error.message);
    return { sent: false, error: error.message };
  } finally {
    monthlyReportRunning = false;
  }
};

module.exports = {
  DEFAULT_ADMIN_RECIPIENTS,
  sendLeadNotificationEmail,
  sendEnrollmentNotificationEmail,
  runMonthlyReportSweep,
};
