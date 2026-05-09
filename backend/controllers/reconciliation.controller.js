const sequelize = require('../config/db.config');
const { Op, fn, col, literal } = require('sequelize');
const Transaction = require('../models/Transaction');
const Expense = require('../models/Expense');
const Account = require('../models/Account');
const Branch = require('../models/Branch');
const User = require('../models/User');
const Student = require('../models/Student');
const Enrollment = require('../models/Enrollment');
const Batch = require('../models/Batch');
const Course = require('../models/Course');
const BankAccount = require('../models/BankAccount');
const BankAccountLedgerMap = require('../models/BankAccountLedgerMap');
const ReconciliationSession = require('../models/ReconciliationSession');
const ReconciliationLine = require('../models/ReconciliationLine');
const ReconciliationEvent = require('../models/ReconciliationEvent');
const LiquidityMovement = require('../models/LiquidityMovement');
const JournalLine = require('../models/JournalLine');
const JournalEntry = require('../models/JournalEntry');
const AuditLog = require('../models/AuditLog');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getBranchId(req) {
  return req.scopedBranchId || req.branchId;
}

function branchWhere(req, extra = {}) {
  const bid = getBranchId(req);
  return bid ? { ...extra, branch_id: bid } : extra;
}

async function writeEvent(sessionId, branchId, userId, action, details, oldValue, newValue) {
  await ReconciliationEvent.create({
    session_id: sessionId,
    branch_id: branchId,
    user_id: userId,
    action,
    details,
    old_value: oldValue,
    new_value: newValue,
  });
}

async function writeAudit(req, entity, entityId, action, oldValue, newValue) {
  try {
    await AuditLog.create({
      user_id: req.user?.id,
      branch_id: getBranchId(req),
      entity,
      entity_id: entityId,
      action,
      old_value: oldValue,
      new_value: newValue,
      ip_address: req.ip,
    });
  } catch (_) {}
}

// ─── Mapping CRUD ─────────────────────────────────────────────────────────────

exports.getMappings = async (req, res) => {
  try {
    const where = branchWhere(req, { is_active: true });
    const maps = await BankAccountLedgerMap.findAll({
      where,
      include: [
        { model: BankAccount, attributes: ['account_name', 'account_number', 'bank_name'] },
        { model: Account, attributes: ['name', 'code', 'type'] },
      ],
    });
    res.json(maps);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.createMapping = async (req, res) => {
  try {
    const { bank_account_id, account_id, channel } = req.body;
    if (!bank_account_id || !account_id || !channel) {
      return res.status(400).json({ error: 'bank_account_id, account_id, and channel are required' });
    }
    const mapping = await BankAccountLedgerMap.create({
      bank_account_id,
      account_id,
      channel,
      branch_id: getBranchId(req),
      is_active: true,
    });
    await writeAudit(req, 'BankAccountLedgerMap', mapping.id, 'create', null, mapping.toJSON());
    res.status(201).json(mapping);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.updateMapping = async (req, res) => {
  try {
    const mapping = await BankAccountLedgerMap.findOne({ where: { id: req.params.id, branch_id: getBranchId(req) } });
    if (!mapping) return res.status(404).json({ error: 'Mapping not found' });
    const old = mapping.toJSON();
    const { branch_id, ...updateData } = req.body;
    await mapping.update(updateData);
    await writeAudit(req, 'BankAccountLedgerMap', mapping.id, 'update', old, mapping.toJSON());
    res.json(mapping);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.deleteMapping = async (req, res) => {
  try {
    const mapping = await BankAccountLedgerMap.findOne({ where: { id: req.params.id, branch_id: getBranchId(req) } });
    if (!mapping) return res.status(404).json({ error: 'Mapping not found' });
    await mapping.update({ is_active: false });
    await writeAudit(req, 'BankAccountLedgerMap', mapping.id, 'deactivate', mapping.toJSON(), { is_active: false });
    res.json({ message: 'Mapping deactivated' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// ─── Session List & Detail ────────────────────────────────────────────────────

exports.getSessions = async (req, res) => {
  try {
    const { status, start_date, end_date } = req.query;
    const where = branchWhere(req);
    if (status) where.status = status;
    if (start_date || end_date) {
      where.recon_date = {};
      if (start_date) where.recon_date[Op.gte] = start_date;
      if (end_date) where.recon_date[Op.lte] = end_date;
    }
    const sessions = await ReconciliationSession.findAll({
      where,
      order: [['recon_date', 'DESC']],
      include: [
        { model: User, as: 'Preparer', attributes: ['name'] },
        { model: User, as: 'Reviewer', attributes: ['name'] },
        { model: User, as: 'Approver', attributes: ['name'] },
      ],
    });
    res.json(sessions);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.getSessionDetail = async (req, res) => {
  try {
    const session = await ReconciliationSession.findOne({
      where: { id: req.params.id, branch_id: getBranchId(req) },
      include: [
        { model: User, as: 'Preparer', attributes: ['name'] },
        { model: User, as: 'Reviewer', attributes: ['name'] },
        { model: User, as: 'Approver', attributes: ['name'] },
      ],
    });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const lines = await ReconciliationLine.findAll({
      where: { session_id: session.id },
      include: [{ model: Account, attributes: ['name', 'code', 'type'] }],
      order: [['channel', 'ASC']],
    });

    const events = await ReconciliationEvent.findAll({
      where: { session_id: session.id },
      order: [['created_at', 'ASC']],
      include: [{ model: User, attributes: ['name'] }],
    });

    res.json({ session, lines, events });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// ─── Engine: Generate Session ─────────────────────────────────────────────────

exports.generateSession = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const branchId = getBranchId(req);
    const { recon_date } = req.body;
    if (!recon_date) {
      await t.rollback();
      return res.status(400).json({ error: 'recon_date is required' });
    }

    // Prevent duplicate session for same date
    const existing = await ReconciliationSession.findOne({
      where: { branch_id: branchId, recon_date },
    });
    if (existing) {
      await t.rollback();
      return res.status(409).json({ error: `Session already exists for ${recon_date}` });
    }

    // Get all active mappings for this branch
    const mappings = await BankAccountLedgerMap.findAll({
      where: { branch_id: branchId, is_active: true },
      include: [
        { model: Account, attributes: ['id', 'name'] },
        { model: BankAccount, attributes: ['id', 'account_name'] },
      ],
    });

    // Get all successful transactions for the date
    const transactions = await Transaction.findAll({
      where: {
        branch_id: branchId,
        status: 'success',
        paid_at: {
          [Op.between]: [
            `${recon_date} 00:00:00`,
            `${recon_date} 23:59:59`,
          ],
        },
      },
      attributes: ['method', 'amount', 'source', 'account_id', 'enrollment_id'],
      raw: true,
    });

    // Get all approved expenses for the date
    const expenses = await Expense.findAll({
      where: {
        branch_id: branchId,
        status: 'approved',
        date: recon_date,
      },
      attributes: ['account_id', 'amount', 'payment_method', 'category'],
      raw: true,
    });

    // ─── Build per-channel aggregation ─────────────────────────────────
    const channelMap = {};

    // Inflows from transactions
    for (const tx of transactions) {
      const method = tx.method || 'cash';
      if (!channelMap[method]) channelMap[method] = { inflows: 0, outflows: 0, txCount: 0, expenseCount: 0 };
      channelMap[method].inflows += parseFloat(tx.amount) || 0;
      channelMap[method].txCount += 1;
    }

    // Outflows from expenses
    for (const exp of expenses) {
      const method = exp.payment_method || 'cash';
      if (!channelMap[method]) channelMap[method] = { inflows: 0, outflows: 0, txCount: 0, expenseCount: 0 };
      channelMap[method].outflows += parseFloat(exp.amount) || 0;
      channelMap[method].expenseCount += 1;
    }

    // Also count by account_id for ledger reconciliation
    const accountInflows = {};
    const accountOutflows = {};
    const accountTxCounts = {};
    const accountExpCounts = {};
    for (const tx of transactions) {
      const aid = tx.account_id;
      if (!aid) continue;
      accountInflows[aid] = (accountInflows[aid] || 0) + parseFloat(tx.amount);
      accountTxCounts[aid] = (accountTxCounts[aid] || 0) + 1;
    }
    for (const exp of expenses) {
      const aid = exp.account_id;
      if (!aid) continue;
      accountOutflows[aid] = (accountOutflows[aid] || 0) + parseFloat(exp.amount);
      accountExpCounts[aid] = (accountExpCounts[aid] || 0) + 1;
    }

    // ─── Create session ─────────────────────────────────────────────────
    const session = await ReconciliationSession.create({
      branch_id: branchId,
      recon_date,
      status: 'draft',
      total_inflows: transactions.reduce((s, tx) => s + parseFloat(tx.amount), 0),
      total_outflows: expenses.reduce((s, e) => s + parseFloat(e.amount), 0),
      prepared_by: req.user?.id,
    }, { transaction: t });

    let totalLedgerNet = 0;
    let totalVariance = 0;
    const linesCreated = [];

    // ─── For each mapping, compute reconciliation line ──────────────────
    for (const mapping of mappings) {
      const accId = mapping.account_id;
      const channel = mapping.channel;

      const opInflows = channelMap[channel]?.inflows || 0;
      const opOutflows = channelMap[channel]?.outflows || 0;
      const opNet = opInflows - opOutflows;
      const txCount = channelMap[channel]?.txCount || 0;
      const expenseCount = channelMap[channel]?.expenseCount || 0;

      // Ledger: get journal lines for the mapped account on this date
      const ledgerLines = await JournalLine.findAll({
        where: { account_id: accId },
        include: [{
          model: JournalEntry,
          where: {
            branch_id: branchId,
            date: recon_date,
          },
          attributes: [],
        }],
        raw: true,
      });

      const ledgerDebit = ledgerLines.reduce((s, l) => s + parseFloat(l.debit || 0), 0);
      const ledgerCredit = ledgerLines.reduce((s, l) => s + parseFloat(l.credit || 0), 0);
      const ledgerNet = ledgerDebit - ledgerCredit;

      const variance = Math.abs(opNet - ledgerNet);
      let lineStatus = 'matched';
      if (variance > 5) lineStatus = 'variance_major';
      else if (variance > 0) lineStatus = 'variance_minor';

      const line = await ReconciliationLine.create({
        session_id: session.id,
        mapping_id: mapping.id,
        account_id: accId,
        bank_account_id: mapping.bank_account_id,
        channel,
        operational_inflows: opInflows,
        operational_outflows: opOutflows,
        operational_net: opNet,
        ledger_debit: ledgerDebit,
        ledger_credit: ledgerCredit,
        ledger_net: ledgerNet,
        variance,
        status: lineStatus,
        tx_count: txCount,
        expense_count: expenseCount,
      }, { transaction: t });

      linesCreated.push(line);
      totalLedgerNet += ledgerNet;
      totalVariance += variance;
    }

    // Update session totals
    await session.update({
      total_ledger_net: totalLedgerNet,
      total_variance: totalVariance,
    }, { transaction: t });

    await writeEvent(session.id, branchId, req.user?.id, 'generate', `Session generated for ${recon_date}`, null, { lines: linesCreated.length });

    await t.commit();
    res.status(201).json({ session, lines: linesCreated });
  } catch (e) {
    await t.rollback();
    res.status(500).json({ error: e.message });
  }
};

// ─── Line drill-down ──────────────────────────────────────────────────────────

exports.getLineDetail = async (req, res) => {
  try {
    const line = await ReconciliationLine.findByPk(req.params.lineId);
    if (!line) return res.status(404).json({ error: 'Reconciliation line not found' });

    const session = await ReconciliationSession.findOne({ where: { id: line.session_id, branch_id: getBranchId(req) } });
    if (!session) return res.status(404).json({ error: 'Session not found or access denied' });

    const reconDate = session.recon_date;
    const branchId = session.branch_id;
    const channel = line.channel;
    const accId = line.account_id;

    // Transactions for this channel on this date
    const transactions = await Transaction.findAll({
      where: {
        branch_id: branchId,
        status: 'success',
        method: channel,
        paid_at: { [Op.between]: [`${reconDate} 00:00:00`, `${reconDate} 23:59:59`] },
      },
      include: [
        {
          model: require('../models/Enrollment'),
          include: [
            { model: require('../models/Student'), include: [{ model: require('../models/User'), attributes: ['name'] }] },
          ],
        },
      ],
      order: [['paid_at', 'ASC']],
    });

    // Approved expenses for this channel on this date
    const expenseRows = await Expense.findAll({
      where: {
        branch_id: branchId,
        status: 'approved',
        date: reconDate,
        payment_method: channel,
      },
      include: [{ model: Account, attributes: ['name'] }],
      order: [['date', 'ASC']],
    });

    // Journal lines for mapped account on this date
    const ledgerLines = await JournalLine.findAll({
      where: { account_id: accId },
      include: [{
        model: JournalEntry,
        where: { branch_id: branchId, date: reconDate },
        attributes: ['ref_no', 'description', 'date'],
      }],
    });

    res.json({ transactions, expenses: expenseRows, ledgerLines, line });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// ─── Workflow: Review / Approve / Reopen ──────────────────────────────────────

exports.reviewSession = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const session = await ReconciliationSession.findOne({ where: { id: req.params.id, branch_id: getBranchId(req) } });
    if (!session) {
      await t.rollback();
      return res.status(404).json({ error: 'Session not found' });
    }
    if (session.status !== 'draft') {
      await t.rollback();
      return res.status(400).json({ error: `Cannot review session in '${session.status}' status` });
    }
    const oldStatus = session.status;
    await session.update({
      status: 'reviewed',
      reviewed_by: req.user?.id,
    }, { transaction: t });

    await writeEvent(session.id, session.branch_id, req.user?.id, 'review', 'Session marked as reviewed', { status: oldStatus }, { status: 'reviewed' });
    await t.commit();
    res.json({ message: 'Session reviewed', session });
  } catch (e) {
    await t.rollback();
    res.status(500).json({ error: e.message });
  }
};

exports.approveSession = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const session = await ReconciliationSession.findOne({ where: { id: req.params.id, branch_id: getBranchId(req) } });
    if (!session) {
      await t.rollback();
      return res.status(404).json({ error: 'Session not found' });
    }
    if (session.status !== 'reviewed') {
      await t.rollback();
      return res.status(400).json({ error: `Cannot approve session in '${session.status}' status` });
    }
    // Segregation of duties: approver cannot be preparer
    if (session.prepared_by === req.user?.id) {
      await t.rollback();
      return res.status(403).json({ error: 'Approver must be different from preparer (segregation of duties)' });
    }
    const oldStatus = session.status;
    await session.update({
      status: 'approved',
      approved_by: req.user?.id,
      locked_at: new Date(),
    }, { transaction: t });

    await writeEvent(session.id, session.branch_id, req.user?.id, 'approve', 'Session approved and locked', { status: oldStatus }, { status: 'approved' });
    await writeAudit(req, 'ReconciliationSession', session.id, 'approve', { status: oldStatus }, { status: 'approved', locked_at: new Date() });
    await t.commit();
    res.json({ message: 'Session approved and locked', session });
  } catch (e) {
    await t.rollback();
    res.status(500).json({ error: e.message });
  }
};

exports.reopenSession = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const session = await ReconciliationSession.findOne({ where: { id: req.params.id, branch_id: getBranchId(req) } });
    if (!session) {
      await t.rollback();
      return res.status(404).json({ error: 'Session not found' });
    }
    if (session.status !== 'approved') {
      await t.rollback();
      return res.status(400).json({ error: `Can only reopen approved sessions` });
    }
    const { reason } = req.body;
    if (!reason) {
      await t.rollback();
      return res.status(400).json({ error: 'Reopen reason is required' });
    }
    const oldStatus = session.status;
    await session.update({
      status: 'draft',
      approved_by: null,
      locked_at: null,
      reopen_reason: reason,
    }, { transaction: t });

    await writeEvent(session.id, session.branch_id, req.user?.id, 'reopen', reason, { status: oldStatus }, { status: 'draft' });
    await writeAudit(req, 'ReconciliationSession', session.id, 'reopen', { status: oldStatus }, { status: 'draft', reopen_reason: reason });
    await t.commit();
    res.json({ message: 'Session reopened', session });
  } catch (e) {
    await t.rollback();
    res.status(500).json({ error: e.message });
  }
};

exports.lockSession = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const session = await ReconciliationSession.findOne({ where: { id: req.params.id, branch_id: getBranchId(req) } });
    if (!session) {
      await t.rollback();
      return res.status(404).json({ error: 'Session not found' });
    }
    if (session.status !== 'approved') {
      await t.rollback();
      return res.status(400).json({ error: `Can only lock approved sessions` });
    }
    await session.update({
      status: 'locked',
      locked_at: new Date(),
    }, { transaction: t });

    await writeEvent(session.id, session.branch_id, req.user?.id, 'lock', 'Session locked', { status: 'approved' }, { status: 'locked' });
    await t.commit();
    res.json({ message: 'Session locked', session });
  } catch (e) {
    await t.rollback();
    res.status(500).json({ error: e.message });
  }
};

exports.updateLineNotes = async (req, res) => {
  try {
    const line = await ReconciliationLine.findByPk(req.params.lineId);
    if (!line) return res.status(404).json({ error: 'Line not found' });

    const session = await ReconciliationSession.findOne({ where: { id: line.session_id, branch_id: getBranchId(req) } });
    if (!session) return res.status(404).json({ error: 'Line not found' });
    if (session?.status === 'approved' || session?.status === 'locked') {
      return res.status(403).json({ error: 'Cannot edit lines on approved/locked sessions' });
    }

    const old = { notes: line.notes, status: line.status };
    await line.update({
      notes: req.body.notes || line.notes,
      status: req.body.status || line.status,
    });

    await writeEvent(session.id, session.branch_id, req.user?.id, 'line_update', `Line updated: ${line.channel}`, old, { notes: line.notes, status: line.status });
    res.json(line);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// ─── Quick Stats ──────────────────────────────────────────────────────────────

exports.getStats = async (req, res) => {
  try {
    const branchId = getBranchId(req);
    const today = getTodayLocal();

    // Today's totals
    const todayTx = await Transaction.findAll({
      where: {
        branch_id: branchId,
        status: 'success',
        paid_at: { [Op.between]: [`${today} 00:00:00`, `${today} 23:59:59`] },
      },
      attributes: [[fn('SUM', col('amount')), 'total'], [fn('COUNT', col('id')), 'count']],
      raw: true,
    });

    const todayExp = await Expense.findAll({
      where: {
        branch_id: branchId,
        status: 'approved',
        date: today,
      },
      attributes: [[fn('SUM', col('amount')), 'total'], [fn('COUNT', col('id')), 'count']],
      raw: true,
    });

    // Session stats
    const sessions = await ReconciliationSession.findAll({
      where: { branch_id: branchId },
      attributes: ['status', [fn('COUNT', col('id')), 'count']],
      group: ['status'],
      raw: true,
    });

    const sessionStats = {};
    for (const s of sessions) {
      sessionStats[s.status] = parseInt(s.count);
    }

    // Unreconciled variance
    const varianceLines = await ReconciliationLine.findAll({
      where: { status: { [Op.in]: ['variance_minor', 'variance_major'] } },
      include: [{
        model: ReconciliationSession,
        where: { branch_id: branchId },
        attributes: [],
      }],
      attributes: [[fn('SUM', col('variance')), 'total']],
      raw: true,
    });

    res.json({
      today: {
        inflows: parseFloat(todayTx[0]?.total) || 0,
        inflow_count: parseInt(todayTx[0]?.count) || 0,
        outflows: parseFloat(todayExp[0]?.total) || 0,
        outflow_count: parseInt(todayExp[0]?.count) || 0,
        net: (parseFloat(todayTx[0]?.total) || 0) - (parseFloat(todayExp[0]?.total) || 0),
      },
      sessions: {
        draft: sessionStats.draft || 0,
        reviewed: sessionStats.reviewed || 0,
        approved: sessionStats.approved || 0,
        locked: sessionStats.locked || 0,
      },
      unresolved_variance: parseFloat(varianceLines[0]?.total) || 0,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Keep old endpoints for backward compatibility
exports.getBankAccounts = async (req, res) => {
  try {
    const accounts = await BankAccount.findAll({ where: branchWhere(req) });
    res.json(accounts);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const LIQUID_ACCOUNT_FILTER = {
  type: 'asset',
  is_active: true,
  [Op.or]: [
    { code: { [Op.like]: '10%' } },
    { sub_type: { [Op.in]: ['cash', 'bank', 'mfs'] } },
  ],
};

function formatDateLocal(dateObj) {
  const d = new Date(dateObj);
  // Use Intl.DateTimeFormat for proper timezone-aware formatting (handles DST if applicable)
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d);
  const y = parts.find(p => p.type === 'year').value;
  const m = parts.find(p => p.type === 'month').value;
  const dd = parts.find(p => p.type === 'day').value;
  return `${y}-${m}-${dd}`;
}

function getTodayLocal() {
  return formatDateLocal(new Date());
}

function toDateOnly(value) {
  if (!value) return getTodayLocal();
  // If the value is already a YYYY-MM-DD string, return it directly
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return formatDateLocal(value);
}

function isWithinRange(date, from, to) {
  return (!from || date >= from) && (!to || date <= to);
}

async function getLiquidAccounts(branchId) {
  return Account.findAll({ where: { ...LIQUID_ACCOUNT_FILTER, branch_id: branchId }, order: [['code', 'ASC']] });
}

async function ensureSessionForDate(branchId, reconDate, userId) {
  const [session] = await ReconciliationSession.findOrCreate({
    where: { branch_id: branchId, recon_date: reconDate },
    defaults: { branch_id: branchId, recon_date: reconDate, status: 'draft', prepared_by: userId }
  });
  return session;
}

async function ensureLineForAccount(session, accountId, channel) {
  const [line] = await ReconciliationLine.findOrCreate({
    where: { session_id: session.id, account_id: accountId },
    defaults: { session_id: session.id, account_id: accountId, channel, status: 'matched' }
  });
  return line;
}

async function buildLiquidityRows(branchId, toDate) {
  const liquidAccounts = await getLiquidAccounts(branchId);
  const accountIds = liquidAccounts.map((account) => account.id);
  if (!accountIds.length) {
    return { liquidAccounts, rows: [] };
  }

  const [transactions, expenses, manualMovements] = await Promise.all([
    Transaction.findAll({
      where: { branch_id: branchId, status: 'success', account_id: { [Op.in]: accountIds }, paid_at: { [Op.lte]: `${toDate} 23:59:59` } },
      include: [{ model: Account, attributes: ['id', 'name', 'code', 'sub_type'] }, { model: Enrollment, required: false, include: [{ model: Student, required: false, include: [{ model: User, attributes: ['name'] }] }, { model: Batch, required: false, include: [{ model: Course, attributes: ['title'], required: false }] }] }],
      order: [['paid_at', 'ASC'], ['id', 'ASC']]
    }),
    Expense.findAll({
      where: { branch_id: branchId, account_id: { [Op.in]: accountIds }, status: 'approved', date: { [Op.lte]: toDate } },
      include: [{ model: Account, attributes: ['id', 'name', 'code', 'sub_type'] }],
      order: [['date', 'ASC'], ['id', 'ASC']]
    }),
    LiquidityMovement.findAll({
      where: { branch_id: branchId, account_id: { [Op.in]: accountIds }, movement_date: { [Op.lte]: toDate } },
      include: [{ model: Account, attributes: ['id', 'name', 'code', 'sub_type'] }, { model: Account, as: 'RelatedAccount', attributes: ['id', 'name', 'code', 'sub_type'], required: false }, { model: User, as: 'Creator', attributes: ['name'], required: false }],
      order: [['movement_date', 'ASC'], ['id', 'ASC']]
    })
  ]);

  // ── Double-count prevention ───────────────────────────────────────────────
  // A closing_submission records the ACTUAL physical balance at end-of-day.
  // It already accounts for all Transactions & Expenses on prior days.
  // Therefore, Transaction/Expense rows from dates STRICTLY BEFORE the latest
  // closing date are excluded (absorbed). Same-day transactions are kept so
  // the user can see new income that arrived after the closing was submitted.
  // The closing_submission is sorted LAST within each day so it always resets
  // the running balance after all same-day transactions are processed.
  const latestClosingDateByAccount = {};
  manualMovements.forEach((movement) => {
    if (movement.transaction_type === 'closing_submission') {
      const accId = movement.account_id;
      const mDate = movement.movement_date;
      if (!latestClosingDateByAccount[accId] || mDate >= latestClosingDateByAccount[accId]) {
        latestClosingDateByAccount[accId] = mDate;
      }
    }
  });

  const rows = [];
  transactions.forEach((tx) => {
    const txDate = toDateOnly(tx.paid_at);
    const closingCutoff = latestClosingDateByAccount[tx.account_id];
    // Skip transactions from days already closed (strictly before closing date).
    // Same-day transactions are kept — closing sorts last to reset the balance.
    if (closingCutoff && txDate < closingCutoff) return;

    const studentName = tx.Enrollment?.Student?.User?.name || 'Walk-in / Manual';
    const courseTitle = tx.Enrollment?.Batch?.Course?.title || 'General Income';
    const account = tx.Account;
    const subType = account?.sub_type || 'cash';
    rows.push({
      unique_key: `tx-${tx.id}`,
      account_id: tx.account_id,
      movement_date: txDate,
      event_time: new Date(tx.paid_at || tx.created_at || Date.now()).getTime(),
      transaction_type: subType === 'bank' ? 'direct_bank_receipt' : subType === 'mfs' ? 'mobile_receipt' : 'collection',
      direction: 'inflow',
      amount: Number(tx.amount || 0),
      reference: tx.transaction_ref || tx.receipt_no,
      remarks: `${studentName} · ${courseTitle}`,
      source_model: 'Transaction',
      source_id: String(tx.id),
      account_name: account?.name || 'Unknown Account',
      account_code: account?.code || '',
      account_type: subType,
      created_by_name: 'System',
    });
  });

  expenses.forEach((expense) => {
    const expDate = toDateOnly(expense.date);
    const closingCutoff = latestClosingDateByAccount[expense.account_id];
    // Skip expenses from days already closed (strictly before closing date).
    if (closingCutoff && expDate < closingCutoff) return;

    const account = expense.Account;
    rows.push({
      unique_key: `expense-${expense.id}`,
      account_id: expense.account_id,
      movement_date: expDate,
      event_time: new Date(expense.date).getTime(),
      transaction_type: expense.expense_origin === 'payroll' ? 'payroll_expense' : 'expense',
      direction: 'outflow',
      amount: Number(expense.amount || 0),
      reference: expense.expense_origin === 'payroll' ? `PAYROLL-${expense.payroll_id || expense.id}` : expense.category,
      remarks: expense.description,
      source_model: 'Expense',
      source_id: String(expense.id),
      account_name: account?.name || 'Unknown Account',
      account_code: account?.code || '',
      account_type: account?.sub_type || 'cash',
      created_by_name: 'System',
    });
  });

  manualMovements.forEach((movement) => {
    rows.push({
      unique_key: `manual-${movement.id}`,
      account_id: movement.account_id,
      movement_date: movement.movement_date,
      event_time: new Date(movement.created_at || movement.movement_date).getTime(),
      transaction_type: movement.transaction_type,
      direction: movement.direction,
      amount: Number(movement.amount || 0),
      actual_balance: Number(movement.actual_balance || 0),
      variance_amount: Number(movement.variance_amount || 0),
      previous_balance: Number(movement.previous_balance || 0),
      new_balance: Number(movement.new_balance || 0),
      reference: movement.reference,
      remarks: movement.remarks,
      reason: movement.reason,
      source_model: movement.source_model || 'LiquidityMovement',
      source_id: movement.source_id || String(movement.id),
      account_name: movement.Account?.name || 'Unknown Account',
      account_code: movement.Account?.code || '',
      account_type: movement.Account?.sub_type || 'cash',
      related_account_name: movement.RelatedAccount?.name || '',
      created_by_name: movement.Creator?.name || 'System',
    });
  });

  // Sort: date ASC, then closing_submission ALWAYS last within each day,
  // then by event_time, then by unique_key as tiebreaker.
  const isClosing = (r) => r.transaction_type === 'closing_submission' ? 1 : 0;
  rows.sort((a, b) => {
    if (a.movement_date !== b.movement_date) return a.movement_date.localeCompare(b.movement_date);
    // Closing submissions must come after all other entries on the same day
    const ca = isClosing(a), cb = isClosing(b);
    if (ca !== cb) return ca - cb;
    if (a.event_time !== b.event_time) return a.event_time - b.event_time;
    return a.unique_key.localeCompare(b.unique_key);
  });

  return { liquidAccounts, rows };
}

async function buildLiquiditySnapshot(branchId, from, to) {
  const { liquidAccounts, rows } = await buildLiquidityRows(branchId, to);
  const accountMap = new Map(liquidAccounts.map((account) => [account.id, account]));
  const balances = {};
  const summaries = new Map();
  const rangeRows = [];

  const lastClosings = await LiquidityMovement.findAll({
    where: {
      branch_id: branchId,
      transaction_type: 'closing_submission',
      movement_date: { [Op.lt]: from }
    },
    order: [['movement_date', 'DESC'], ['id', 'DESC']],
    attributes: ['account_id', 'actual_balance', 'movement_date'],
    raw: true
  });

  const lastClosingMap = {};
  lastClosings.forEach((lc) => {
    if (!lastClosingMap[lc.account_id]) {
      lastClosingMap[lc.account_id] = lc;
    }
  });

  liquidAccounts.forEach((account) => {
    const lastClosing = lastClosingMap[account.id];
    summaries.set(account.id, {
      account_id: account.id,
      account_name: account.name,
      account_code: account.code,
      account_type: account.sub_type || 'cash',
      opening_balance: 0,
      inflows: 0,
      outflows: 0,
      expected_closing_balance: 0,
      actual_closing_balance: null,
      discrepancy_amount: 0,
      discrepancy_reason: '',
      last_reference: '',
      status: 'open',
      last_actual_closing: lastClosing ? Number(lastClosing.actual_balance || 0) : null,
      last_actual_closing_date: lastClosing?.movement_date || null,
      continuity_variance: lastClosing ? 0 - Number(lastClosing.actual_balance || 0) : 0,
      opening_source: lastClosing ? 'carry_forward' : 'not_set',
      opening_source_label: lastClosing ? 'Carry forward' : 'Not set',
      opening_recorded_by: lastClosing ? 'System' : null,
      opening_adjustments_total: 0,
      system_generated_inflows: 0,
      manual_inflows: 0,
      system_generated_outflows: 0,
      manual_outflows: 0,
      closing_source: 'pending',
      closing_source_label: 'Pending',
      closing_recorded_by: null,
      closing_recorded_at: null
    });
  });

  rows.forEach((row) => {
    const summary = summaries.get(row.account_id);
    if (!summary) return;
    const previousBalance = balances[row.account_id] || 0;
    const signedAmount = row.direction === 'inflow' ? row.amount : row.direction === 'outflow' ? -row.amount : 0;
    
    // Crucial Bug Fix: A closing submission from a previous day must RESET the running balance to the actual physical count submitted by the user.
    // Otherwise, carry forwards ignore manual reconciliation and discrepancies compound forever.
    const computedBalance = row.transaction_type === 'closing_submission' 
      ? Number(row.actual_balance || 0) 
      : previousBalance + signedAmount;
      
    const isOpeningEntry = ['opening_balance', 'opening_adjustment'].includes(row.transaction_type);
    const normalizedRow = {
      ...row,
      previous_balance: previousBalance,
      new_balance: computedBalance,
      amount: Number(row.amount || 0),
      account_name: row.account_name || accountMap.get(row.account_id)?.name || 'Unknown Account',
      account_code: row.account_code || accountMap.get(row.account_id)?.code || '',
      account_type: row.account_type || accountMap.get(row.account_id)?.sub_type || 'cash'
    };
    balances[row.account_id] = computedBalance;

    if (row.movement_date < from) {
      summary.opening_balance = computedBalance;
      summary.expected_closing_balance = computedBalance;
      summary.continuity_variance = summary.opening_balance - Number(summary.last_actual_closing || 0);
      return;
    }

    if (!isWithinRange(row.movement_date, from, to)) return;

    if (isOpeningEntry && row.movement_date === from) {
      summary.opening_balance = computedBalance;
      summary.expected_closing_balance = computedBalance;
      summary.opening_adjustments_total += signedAmount;
      summary.opening_source = row.transaction_type;
      summary.opening_source_label = row.transaction_type === 'opening_balance' ? 'Manual opening' : 'Opening adjustment';
      summary.opening_recorded_by = row.created_by_name || 'System';
      summary.continuity_variance = summary.opening_balance - Number(summary.last_actual_closing || 0);
      summary.last_reference = normalizedRow.reference || summary.last_reference;
      rangeRows.push(normalizedRow);
      return;
    }

    if (normalizedRow.direction === 'inflow') {
      summary.inflows += normalizedRow.amount;
      if (['Transaction', 'Expense'].includes(normalizedRow.source_model)) summary.system_generated_inflows += normalizedRow.amount;
      else summary.manual_inflows += normalizedRow.amount;
    }
    if (normalizedRow.direction === 'outflow') {
      summary.outflows += normalizedRow.amount;
      if (['Transaction', 'Expense'].includes(normalizedRow.source_model)) summary.system_generated_outflows += normalizedRow.amount;
      else summary.manual_outflows += normalizedRow.amount;
    }

    // Do NOT overwrite expected_closing_balance inside the loop.
    summary.last_reference = normalizedRow.reference || summary.last_reference;

    if (normalizedRow.transaction_type === 'closing_submission') {
      summary.actual_closing_balance = Number(normalizedRow.actual_balance || 0);
      summary.discrepancy_amount = Number(normalizedRow.variance_amount || 0);
      summary.discrepancy_reason = normalizedRow.reason || normalizedRow.remarks || '';
      summary.status = Math.abs(summary.discrepancy_amount) > 0.009 ? 'discrepancy' : 'reconciled';
      summary.closing_source = 'closing_submission';
      summary.closing_source_label = 'Manual submission';
      summary.closing_recorded_by = normalizedRow.created_by_name || 'System';
      summary.closing_recorded_at = normalizedRow.movement_date;
    }

    rangeRows.push(normalizedRow);
  });

  summaries.forEach((summary) => {
    if (summary.actual_closing_balance === null) {
      summary.status = summary.inflows || summary.outflows ? 'open' : 'idle';
    }
    // FIX: Expected closing balance MUST strictly follow the mathematical formula for the current period
    // to prevent closing submissions from overwriting the expected amount and hiding discrepancies.
    summary.expected_closing_balance = summary.opening_balance + summary.inflows - summary.outflows;
  });

  const auditWhere = { branch_id: branchId, entity: { [Op.in]: ['LiquidityMovement', 'ReconciliationSession', 'ReconciliationLine'] } };
  if (from || to) {
    auditWhere.created_at = {};
    if (from) auditWhere.created_at[Op.gte] = `${from} 00:00:00`;
    if (to) auditWhere.created_at[Op.lte] = `${to} 23:59:59`;
  }

  const auditTrail = await AuditLog.findAll({
    where: auditWhere,
    include: [{ model: User, attributes: ['name'], required: false }],
    order: [['created_at', 'DESC']],
    limit: 250
  });

  const movementsRaw = rangeRows.sort((a, b) => b.movement_date.localeCompare(a.movement_date) || b.event_time - a.event_time);
  
  // Inject explicit Carry Forward rows to demystify running balance calculations for accountants
  const carryForwardRows = [];
  Array.from(summaries.values()).forEach(summary => {
    if (summary.opening_balance !== 0 || summary.last_actual_closing_date) {
      carryForwardRows.push({
        unique_key: `cf-${summary.account_id}-${from}`,
        account_id: summary.account_id,
        movement_date: from || getTodayLocal(),
        event_time: 0, // Sorts to the very beginning of the day time-wise
        transaction_type: 'carry_forward',
        direction: 'neutral',
        amount: 0,
        previous_balance: summary.opening_balance,
        new_balance: summary.opening_balance,
        reference: 'SYS-CF',
        remarks: `Balance carried forward from previous period`,
        source_model: 'System',
        account_name: summary.account_name,
        account_code: summary.account_code,
        created_by_name: 'System',
      });
    }
  });
  
  const movements = [...movementsRaw, ...carryForwardRows].sort((a, b) => b.movement_date.localeCompare(a.movement_date) || b.event_time - a.event_time);

  const operationalMovements = movements.filter((row) => !['opening_balance', 'opening_adjustment', 'carry_forward'].includes(row.transaction_type));
  const transfers = movements.filter((row) => ['transfer_in', 'transfer_out'].includes(row.transaction_type));
  const directBankReceipts = movements.filter((row) => ['direct_bank_receipt', 'mobile_receipt'].includes(row.transaction_type));
  const adjustments = movements.filter((row) => ['opening_balance', 'opening_adjustment', 'closing_adjustment', 'manual_adjustment', 'reversal'].includes(row.transaction_type));
  const discrepancies = Array.from(summaries.values()).filter((summary) => Math.abs(Number(summary.discrepancy_amount || 0)) > 0.009);
  const dailySummaryMap = new Map();
  operationalMovements.forEach((row) => {
    const daily = dailySummaryMap.get(row.movement_date) || { date: row.movement_date, inflows: 0, outflows: 0, transfers: 0, discrepancies: 0 };
    if (row.direction === 'inflow') daily.inflows += row.amount;
    if (row.direction === 'outflow') daily.outflows += row.amount;
    if (['transfer_in', 'transfer_out'].includes(row.transaction_type)) daily.transfers += row.amount;
    if (row.transaction_type === 'closing_submission' && Math.abs(Number(row.variance_amount || 0)) > 0.009) daily.discrepancies += Number(row.variance_amount || 0);
    dailySummaryMap.set(row.movement_date, daily);
  });

  const openingClosingReport = Array.from(summaries.values()).map((summary) => ({
    report_from: from,
    report_to: to,
    account_id: summary.account_id,
    account_name: summary.account_name,
    account_code: summary.account_code,
    account_type: summary.account_type,
    previous_closing_date: summary.last_actual_closing_date,
    previous_closing_balance: summary.last_actual_closing,
    opening_balance: summary.opening_balance,
    opening_source: summary.opening_source,
    opening_source_label: summary.opening_source_label,
    opening_recorded_by: summary.opening_recorded_by,
    opening_adjustments_total: summary.opening_adjustments_total,
    continuity_variance: summary.continuity_variance,
    inflows: summary.inflows,
    outflows: summary.outflows,
    expected_closing_balance: summary.expected_closing_balance,
    actual_closing_balance: summary.actual_closing_balance,
    discrepancy_amount: summary.discrepancy_amount,
    discrepancy_reason: summary.discrepancy_reason,
    closing_source: summary.closing_source,
    closing_source_label: summary.closing_source_label,
    closing_recorded_by: summary.closing_recorded_by,
    closing_recorded_at: summary.closing_recorded_at,
    has_continuity_exception: Math.abs(Number(summary.continuity_variance || 0)) > 0.009,
    has_closing_exception: Math.abs(Number(summary.discrepancy_amount || 0)) > 0.009,
  }));

  return {
    summary: {
      total_accounts: liquidAccounts.length,
      total_inflows: operationalMovements.reduce((sum, row) => sum + (row.direction === 'inflow' ? row.amount : 0), 0),
      total_outflows: operationalMovements.reduce((sum, row) => sum + (row.direction === 'outflow' ? row.amount : 0), 0),
      total_discrepancy: discrepancies.reduce((sum, row) => sum + Math.abs(Number(row.discrepancy_amount || 0)), 0),
      reconciled_accounts: Array.from(summaries.values()).filter((row) => row.status === 'reconciled').length,
      open_accounts: Array.from(summaries.values()).filter((row) => row.status === 'open').length,
    },
    accounts: Array.from(summaries.values()),
    movements,
    transfers,
    direct_bank_receipts: directBankReceipts,
    discrepancies,
    adjustment_history: adjustments,
    opening_closing_report: openingClosingReport,
    daily_summary: Array.from(dailySummaryMap.values()).sort((a, b) => b.date.localeCompare(a.date)),
    full_audit_trail: auditTrail.map((item) => ({
      id: item.id,
      timestamp: item.created_at,
      user_name: item.User?.name || 'System',
      action: item.action,
      entity: item.entity,
      entity_id: item.entity_id,
      old_value: item.old_value,
      new_value: item.new_value,
    }))
  };
}

async function createManualMovement(req, payload, precomputedSnapshot) {
  const branchId = getBranchId(req);
  const movementDate = payload.movement_date || toDateOnly(new Date());
  // Use pre-computed snapshot if provided, avoiding redundant DB queries
  const snapshot = precomputedSnapshot || await buildLiquiditySnapshot(branchId, movementDate, movementDate);
  const accountSummary = snapshot.accounts.find((item) => item.account_id === Number(payload.account_id));
  const previousBalance = Number(payload.previous_balance ?? accountSummary?.expected_closing_balance ?? accountSummary?.opening_balance ?? 0);
  const signedAmount = payload.direction === 'inflow'
    ? Number(payload.amount || 0)
    : payload.direction === 'outflow'
      ? -Number(payload.amount || 0)
      : 0;
  const computedNewBalance = Number(payload.new_balance ?? (previousBalance + signedAmount));

  const movement = await LiquidityMovement.create({
    ...payload,
    branch_id: branchId,
    movement_date: movementDate,
    previous_balance: previousBalance,
    new_balance: computedNewBalance,
    created_by: req.user?.id,
    updated_by: req.user?.id,
  });
  await writeAudit(req, 'LiquidityMovement', movement.id, 'create', null, movement.toJSON());
  return movement;
}

exports.getLiquidityDashboard = async (req, res) => {
  try {
    const from = toDateOnly(req.query.from);
    const to = toDateOnly(req.query.to || req.query.from);
    const snapshot = await buildLiquiditySnapshot(getBranchId(req), from, to);
    res.json({ range: { from, to }, ...snapshot });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.recordOpeningBalance = async (req, res) => {
  try {
    const branchId = getBranchId(req);
    const { account_id, date, opening_balance, reason } = req.body;
    if (!account_id || opening_balance === undefined) return res.status(400).json({ error: 'account_id and opening_balance are required' });

    const targetDate = toDateOnly(date);
    const snapshot = await buildLiquiditySnapshot(branchId, targetDate, targetDate);
    const summary = snapshot.accounts.find((item) => item.account_id === Number(account_id));
    if (!summary) return res.status(404).json({ error: 'Liquid account not found' });

    const desiredOpening = Number(opening_balance || 0);
    const diff = desiredOpening - Number(summary.opening_balance || 0);
    if (Math.abs(diff) < 0.009) return res.json({ message: 'Opening balance already matches system value.' });

    const previousClosing = await LiquidityMovement.findOne({
      where: {
        branch_id: branchId,
        account_id: Number(account_id),
        transaction_type: 'closing_submission',
        movement_date: { [Op.lt]: targetDate }
      },
      order: [['movement_date', 'DESC'], ['id', 'DESC']],
      raw: true
    });

    if (previousClosing) {
      const previousActual = Number(previousClosing.actual_balance || 0);
      if (Math.abs(desiredOpening - previousActual) > 0.009) {
        return res.status(400).json({
          error: `Opening balance mismatch. Previous closing on ${previousClosing.movement_date} was ${previousActual}. Record the source through collection, transfer, or an adjustment workflow instead of resetting opening balance.`,
          previous_closing_date: previousClosing.movement_date,
          previous_closing_balance: previousActual,
          requested_opening_balance: desiredOpening,
        });
      }
    }

    if (!reason?.trim()) return res.status(400).json({ error: 'Reason is required for opening balance adjustment' });

    const account = await Account.findOne({ where: { id: account_id, branch_id: branchId } });
    if (!account) return res.status(404).json({ error: 'Account not found' });
    const session = await ensureSessionForDate(branchId, targetDate, req.user?.id);
    const line = await ensureLineForAccount(session, account.id, account.sub_type || 'cash');

    const movement = await createManualMovement(req, {
      account_id: Number(account_id),
      movement_date: targetDate,
      transaction_type: Number(line.opening_balance || 0) !== 0 ? 'opening_adjustment' : 'opening_balance',
      direction: diff >= 0 ? 'inflow' : 'outflow',
      amount: Math.abs(diff),
      reference: `OPEN-${targetDate}`,
      remarks: `Opening balance set to ${desiredOpening}`,
      reason,
    }, snapshot);

    await line.update({ opening_balance: desiredOpening, notes: reason });
    await writeEvent(session.id, branchId, req.user?.id, 'opening_balance_update', reason, { opening_balance: summary.opening_balance }, { opening_balance: desiredOpening, movement_id: movement.id });
    res.status(201).json({ message: 'Opening balance adjustment recorded.', movement_id: movement.id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.recordCollection = async (req, res) => {
  try {
    const { account_id, date, amount, source, reference, remarks, transaction_type } = req.body;
    if (!account_id || !amount) return res.status(400).json({ error: 'account_id and amount are required' });
    const account = await Account.findOne({ where: { id: account_id, branch_id: getBranchId(req) } });
    if (!account) return res.status(404).json({ error: 'Account not found' });
    const type = transaction_type || (account.sub_type === 'bank' ? 'direct_bank_receipt' : account.sub_type === 'mfs' ? 'mobile_receipt' : 'collection');
    const movementDate = toDateOnly(date);
    const snapshot = await buildLiquiditySnapshot(getBranchId(req), movementDate, movementDate);
    const movement = await createManualMovement(req, {
      account_id: Number(account_id),
      movement_date: movementDate,
      transaction_type: type,
      direction: 'inflow',
      amount: Number(amount),
      reference: reference || source || null,
      remarks: remarks || source || 'Manual collection entry',
      source_model: 'ManualEntry',
      source_id: null,
    }, snapshot);
    res.status(201).json({ message: 'Collection recorded successfully.', movement_id: movement.id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.recordTransfer = async (req, res) => {
  try {
    const { from_account_id, to_account_id, date, amount, reference, remarks } = req.body;
    if (!from_account_id || !to_account_id || !amount) return res.status(400).json({ error: 'from_account_id, to_account_id, and amount are required' });
    if (Number(from_account_id) === Number(to_account_id)) return res.status(400).json({ error: 'Source and destination must be different' });
    const branchId = getBranchId(req);
    const [fromAccount, toAccount] = await Promise.all([
      Account.findOne({ where: { id: from_account_id, branch_id: branchId } }),
      Account.findOne({ where: { id: to_account_id, branch_id: branchId } })
    ]);
    if (!fromAccount || !toAccount) return res.status(404).json({ error: 'Transfer account not found' });

    const transferDate = toDateOnly(date);
    const ref = reference || `TRF-${Date.now()}`;
    const commonRemarks = remarks || `${fromAccount.name} -> ${toAccount.name}`;
    // Build snapshot once for both outflow and inflow movements
    const snapshot = await buildLiquiditySnapshot(branchId, transferDate, transferDate);

    const outflow = await createManualMovement(req, {
      account_id: Number(from_account_id),
      related_account_id: Number(to_account_id),
      movement_date: transferDate,
      transaction_type: 'transfer_out',
      direction: 'outflow',
      amount: Number(amount),
      reference: ref,
      remarks: commonRemarks,
      source_model: 'LiquidityTransfer',
      source_id: ref,
    }, snapshot);

    const inflow = await createManualMovement(req, {
      account_id: Number(to_account_id),
      related_account_id: Number(from_account_id),
      movement_date: transferDate,
      transaction_type: 'transfer_in',
      direction: 'inflow',
      amount: Number(amount),
      reference: ref,
      remarks: commonRemarks,
      source_model: 'LiquidityTransfer',
      source_id: ref,
    }, snapshot);

    res.status(201).json({ message: 'Transfer recorded successfully.', outflow_id: outflow.id, inflow_id: inflow.id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.recordClosingBalance = async (req, res) => {
  try {
    const branchId = getBranchId(req);
    const { account_id, date, actual_closing_balance, reason } = req.body;
    if (!account_id || actual_closing_balance === undefined) return res.status(400).json({ error: 'account_id and actual_closing_balance are required' });

    const targetDate = toDateOnly(date);
    const snapshot = await buildLiquiditySnapshot(branchId, targetDate, targetDate);
    const summary = snapshot.accounts.find((item) => item.account_id === Number(account_id));
    if (!summary) return res.status(404).json({ error: 'Liquid account not found' });

    const expected = Number(summary.expected_closing_balance || summary.opening_balance || 0);
    const actual = Number(actual_closing_balance || 0);
    const variance = actual - expected;
    if (Math.abs(variance) > 0.009 && !reason?.trim()) return res.status(400).json({ error: 'Explanation is required when there is a discrepancy' });

    const account = await Account.findOne({ where: { id: account_id, branch_id: branchId } });
    if (!account) return res.status(404).json({ error: 'Account not found' });
    const session = await ensureSessionForDate(branchId, targetDate, req.user?.id);
    const line = await ensureLineForAccount(session, account.id, account.sub_type || 'cash');

    // Idempotency: if a closing submission already exists for this account+date, update it
    const existingClosing = await LiquidityMovement.findOne({
      where: {
        branch_id: branchId,
        account_id: Number(account_id),
        transaction_type: 'closing_submission',
        movement_date: targetDate,
      },
      order: [['id', 'DESC']], // latest one if multiple exist
    });

    let movement;
    if (existingClosing) {
      // Update the existing closing submission instead of creating a duplicate
      await existingClosing.update({
        previous_balance: expected,
        new_balance: expected,
        actual_balance: actual,
        variance_amount: variance,
        reason: reason || existingClosing.reason || '',
        remarks: `Closing submitted for ${account.name}`,
        updated_by: req.user?.id,
      });
      movement = existingClosing;
      // Clean up any older duplicate closings for the same account+date
      await LiquidityMovement.destroy({
        where: {
          branch_id: branchId,
          account_id: Number(account_id),
          transaction_type: 'closing_submission',
          movement_date: targetDate,
          id: { [Op.ne]: existingClosing.id },
        },
      });
      await writeAudit(req, 'LiquidityMovement', movement.id, 'update', { actual_balance: existingClosing.actual_balance }, { actual_balance: actual, variance });
    } else {
      movement = await createManualMovement(req, {
        account_id: Number(account_id),
        movement_date: targetDate,
        transaction_type: 'closing_submission',
        direction: 'neutral',
        amount: 0,
        previous_balance: expected,
        new_balance: expected,
        actual_balance: actual,
        variance_amount: variance,
        reference: `CLOSE-${targetDate}`,
        remarks: `Closing submitted for ${account.name}`,
        reason: reason || '',
      }, snapshot);
    }

    await line.update({
      opening_balance: Number(summary.opening_balance || 0),
      expected_closing_balance: expected,
      actual_closing_balance: actual,
      discrepancy_amount: variance,
      discrepancy_reason: reason || '',
      status: Math.abs(variance) > 0.009 ? 'variance_major' : 'matched',
      submitted_by: req.user?.id,
      submitted_at: new Date(),
    });

    // Recompute total_variance from all lines (not additive — safe for re-submissions)
    const allLines = await ReconciliationLine.findAll({ where: { session_id: session.id }, attributes: ['discrepancy_amount'], raw: true });
    const recomputedVariance = allLines.reduce((sum, l) => sum + Math.abs(Number(l.discrepancy_amount || 0)), 0);
    await session.update({ total_variance: recomputedVariance });
    await writeEvent(session.id, branchId, req.user?.id, 'closing_submission', reason || 'Closing submitted', { expected }, { actual, variance, movement_id: movement.id });
    res.status(201).json({ message: 'Closing balance submitted.', variance, movement_id: movement.id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.getLiquidityReports = async (req, res) => {
  try {
    const from = toDateOnly(req.query.from);
    const to = toDateOnly(req.query.to || req.query.from);
    const snapshot = await buildLiquiditySnapshot(getBranchId(req), from, to);
    res.json({ range: { from, to }, ...snapshot });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
