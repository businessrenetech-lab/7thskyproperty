const sequelize = require('../config/db.config');
const Lead = require('../models/Lead');
const Batch = require('../models/Batch');
const Course = require('../models/Course');
const Student = require('../models/Student');
const JournalLine = require('../models/JournalLine');
const JournalEntry = require('../models/JournalEntry');
const Account = require('../models/Account');
const Invoice = require('../models/Invoice');
const Entry = sequelize; // Use for plain queries if needed
const { Op } = require('sequelize');

const ACTIVE_LEAD_STATUSES = ['new', 'contacted', 'interested', 'trial', 'fees_pending', 'payment_rejected'];
const ACTIVE_BATCH_STATUSES = ['enrolling', 'active', 'starting_soon'];

function toNumber(value) {
  return Number(value || 0);
}

function toDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function monthLabel(date) {
  return date.toLocaleString('en-US', { month: 'short' });
}

async function sumJournalByType(whereClause, accountType, amountField, startDate, endDate) {
  return toNumber(await JournalLine.sum(amountField, {
    include: [
      { model: Account, where: { ...whereClause, type: accountType }, attributes: [] },
      {
        model: JournalEntry,
        where: {
          ...whereClause,
          ...(startDate && endDate ? { date: { [Op.between]: [startDate, endDate] } } : {}),
        },
        attributes: [],
      },
    ],
  }));
}

async function buildFinancialTrend(whereClause) {
  const now = new Date();
  const months = [];

  for (let i = 5; i >= 0; i -= 1) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    const startDate = toDateOnly(start);
    const endDate = toDateOnly(end);

    const [revenue, expenses] = await Promise.all([
      sumJournalByType(whereClause, 'revenue', 'credit', startDate, endDate),
      sumJournalByType(whereClause, 'expense', 'debit', startDate, endDate),
    ]);

    months.push({
      name: monthLabel(start),
      revenue,
      expenses,
      expense: expenses,
      netProfit: revenue - expenses,
    });
  }

  return months;
}

function mapGroupedRows(rows, keyName) {
  return rows.map((row) => ({
    [keyName]: row.get(keyName) || 'unknown',
    count: toNumber(row.get('count')),
  }));
}

exports.getStats = async (req, res) => {
  try {
    const { branchId, role } = req.query;
    const whereClause = branchId && branchId !== 'all' ? { branch_id: branchId } : {};

    // 1. Core shared stats
    const totalLeads = await Lead.count({ where: whereClause });
    const totalBatches = await Batch.count({ where: { ...whereClause, status: { [Op.in]: ACTIVE_BATCH_STATUSES } } });
    const totalStudents = await Student.count({ where: whereClause });

    // 2. Financial Stats (Revenue & Expenses)
    const [revenue, expenses] = await Promise.all([
      sumJournalByType(whereClause, 'revenue', 'credit'),
      sumJournalByType(whereClause, 'expense', 'debit'),
    ]);

    // Build the response payload
    const payload = {
      totalLeads,
      totalBatches,
      totalStudents,
      revenue,
      expenses,
      netProfit: revenue - expenses,
    };

    if (role === 'super_admin' || role === 'branch_admin') {
      const today = toDateOnly(new Date());
      const activeLeadWhere = { ...whereClause, status: { [Op.in]: ACTIVE_LEAD_STATUSES } };

      const [
        activeBatches,
        batchByStatusRaw,
        leadsByStatusRaw,
        leadsBySourceRaw,
        hotLeads,
        recentLeads,
        newLeadsToday,
        unpaidInvoiceRows,
        overdueInvoiceCount,
        liquidAccounts,
        pipelineValue,
        financialTrend,
      ] = await Promise.all([
        Batch.findAll({
          where: { ...whereClause, status: { [Op.in]: ACTIVE_BATCH_STATUSES } },
          attributes: ['id', 'name', 'code', 'status', 'capacity', 'enrolled', 'start_date', 'end_date'],
          include: [{ model: Course, attributes: ['id', 'title', 'category'], required: false }],
          order: [['start_date', 'ASC'], ['id', 'DESC']],
          limit: 8,
        }),
        Batch.findAll({
          where: whereClause,
          attributes: ['status', [sequelize.fn('COUNT', sequelize.col('Batch.id')), 'count']],
          group: ['status'],
        }),
        Lead.findAll({
          where: whereClause,
          attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
          group: ['status'],
        }),
        Lead.findAll({
          where: whereClause,
          attributes: ['source', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
          group: ['source'],
        }),
        Lead.findAll({
          where: { ...activeLeadWhere, priority: { [Op.in]: ['high', 'hot'] } },
          attributes: ['id', 'name', 'phone', 'email', 'source', 'status', 'priority', 'score', 'deal_value', 'last_activity_at', 'createdAt'],
          order: [['priority', 'DESC'], ['score', 'DESC'], ['createdAt', 'DESC']],
          limit: 6,
        }),
        Lead.findAll({
          where: whereClause,
          attributes: ['id', 'name', 'phone', 'email', 'source', 'status', 'priority', 'score', 'deal_value', 'last_activity_at', 'createdAt'],
          order: [['createdAt', 'DESC']],
          limit: 6,
        }),
        Lead.count({
          where: { ...whereClause, createdAt: { [Op.gte]: today } },
        }),
        Invoice.findAll({
          where: { ...whereClause, status: { [Op.ne]: 'paid' } },
          attributes: ['id', 'amount', 'paid', 'status', 'due_date'],
        }),
        Invoice.count({
          where: { ...whereClause, status: { [Op.in]: ['overdue', 'partial', 'pending'] }, due_date: { [Op.lt]: today } },
        }),
        Account.findAll({
          where: { ...whereClause, type: 'asset', sub_type: { [Op.in]: ['bank', 'cash'] }, is_active: true },
          attributes: ['id', 'name', 'sub_type'],
          limit: 6,
          order: [['name', 'ASC']],
        }),
        Lead.sum('deal_value', { where: activeLeadWhere }),
        buildFinancialTrend(whereClause),
      ]);

      const unpaidInvoices = unpaidInvoiceRows.reduce((sum, invoice) => {
        return sum + Math.max(toNumber(invoice.amount) - toNumber(invoice.paid), 0);
      }, 0);

      payload.activeBatches = activeBatches.map((batch) => {
        const capacity = toNumber(batch.capacity);
        const enrolled = toNumber(batch.enrolled);
        return {
          id: batch.id,
          name: batch.name || batch.code,
          code: batch.code,
          status: batch.status,
          capacity,
          enrolled,
          start_date: batch.start_date,
          end_date: batch.end_date,
          fillRate: capacity ? Math.round((enrolled / capacity) * 100) : 0,
          courseTitle: batch.Course?.title || 'Course not assigned',
          courseCategory: batch.Course?.category || 'General',
        };
      });
      payload.batchByStatus = mapGroupedRows(batchByStatusRaw, 'status');
      payload.leadsByStatus = mapGroupedRows(leadsByStatusRaw, 'status');
      payload.leadsBySource = leadsBySourceRaw.map((row) => ({
        name: row.get('source') || 'Direct / Unknown',
        value: toNumber(row.get('count')),
      }));
      payload.hotLeads = hotLeads;
      payload.hotLeadCount = hotLeads.length;
      payload.recentLeads = recentLeads;
      payload.newLeadsToday = newLeadsToday;
      payload.unpaidInvoices = unpaidInvoices;
      payload.overdueInvoiceCount = overdueInvoiceCount;
      payload.liquidAccounts = liquidAccounts;
      payload.pipelineValue = toNumber(pipelineValue);
      payload.financialTrend = financialTrend;
    }

    // ─── ROLE SPECIFIC DATA ENRICHMENT ──────────────────────────────────────────

    // Accounting additional data
    if (role === 'accounting' || role === 'accounts') {
      const liquidAccounts = await Account.findAll({
        where: { ...whereClause, type: 'asset', sub_type: { [Op.in]: ['bank', 'cash'] } },
        attributes: ['id', 'name', 'balance', 'sub_type']
      });
      payload.liquidAccounts = liquidAccounts;

      const unpaidInvoices = await Invoice.sum('balance_due', { where: { ...whereClause, status: { [Op.ne]: 'paid' } } }) || 0;
      payload.unpaidInvoices = unpaidInvoices;

      // Mock revenue trend for chart (last 6 months)
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      payload.financialTrend = months.map((m, i) => ({
        name: m,
        revenue: Math.floor(Math.random() * 500000) + 200000,
        expense: Math.floor(Math.random() * 300000) + 100000,
      }));
    }

    // CRM / Counselor additional data
    if (role === 'crm' || role === 'counselor') {
      const leadsByStatus = await Lead.findAll({
        where: whereClause,
        attributes: ['status', [sequelize.fn('COUNT', 'id'), 'count']],
        group: ['status']
      });
      payload.leadsByStatus = leadsByStatus;

      payload.recentLeads = await Lead.findAll({
        where: whereClause,
        limit: 5,
        order: [['createdAt', 'DESC']]
      });

      const newLeadsToday = await Lead.count({
        where: { ...whereClause, createdAt: { [Op.gte]: new Date().toISOString().split('T')[0] } }
      });
      payload.newLeadsToday = newLeadsToday;
    }

    // Teacher / Trainer additional data
    if (role === 'teacher' || role === 'trainer') {
      // Mocking teacher schedule/metrics since assignment table might be separate
      payload.teacherBatches = await Batch.findAll({
        where: whereClause,
        limit: 3,
        order: [['start_date', 'DESC']]
      });
    }

    // Brand Manager additional data
    if (role === 'brandmanager') {
      const leadsBySourceRaw = await Lead.findAll({
        where: whereClause,
        attributes: ['source', [sequelize.fn('COUNT', 'id'), 'count']],
        group: ['source']
      });

      const sourceMap = { fb: 'Facebook', org: 'Organic', ref: 'Referral', walk_in: 'Walk In' };
      payload.leadsBySource = leadsBySourceRaw.map(l => ({
        name: sourceMap[l.source] || l.source || 'Direct',
        value: parseInt(l.dataValues.count, 10)
      }));

      // Trend for marketing chart
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      payload.leadGenerationTrend = days.map(d => ({
        name: d,
        leads: Math.floor(Math.random() * 30) + 5
      }));

      // Mocks for marketing CAC and Spend
      payload.marketingSpend = Math.floor(Math.random() * 50000) + 10000;
      payload.costPerLead = totalLeads ? (payload.marketingSpend / totalLeads).toFixed(2) : 0;
    }

    res.json(payload);
  } catch (error) {
    console.error('Dashboard Error:', error);
    res.status(500).json({ error: error.message });
  }
};
