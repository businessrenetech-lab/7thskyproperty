const Account = require('../models/Account');
const JournalEntry = require('../models/JournalEntry');
const JournalLine = require('../models/JournalLine');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const sequelize = require('../config/db.config');
const { injectBranchFilter } = require('../middleware/branch.middleware');
const { Op } = require('sequelize');

// Get Chart of Accounts
exports.getAccounts = async (req, res) => {
  try {
    const queryOptions = injectBranchFilter(req, { order: [['code', 'ASC']] });
    const accounts = await Account.findAll(queryOptions);
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create Journal Entry (Double Entry)
exports.createJournalEntry = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { ref_no, description, date, lines } = req.body;
    if (!Array.isArray(lines) || lines.length < 2) {
      await t.rollback();
      return res.status(400).json({ error: 'At least two journal lines are required' });
    }

    const accountIds = [...new Set(lines.map(line => line.account_id).filter(Boolean))];
    if (!accountIds.length || lines.some(line => !line.account_id)) {
      await t.rollback();
      return res.status(400).json({ error: 'Every journal line must include an account' });
    }

    const validAccountCount = await Account.count({
      where: { id: { [Op.in]: accountIds }, branch_id: req.branchId, is_active: true }
    });
    if (validAccountCount !== accountIds.length) {
      await t.rollback();
      return res.status(400).json({ error: 'Journal lines must use active accounts from the selected branch' });
    }

    const totalDebit = lines.reduce((sum, l) => sum + parseFloat(l.debit || 0), 0);
    const totalCredit = lines.reduce((sum, l) => sum + parseFloat(l.credit || 0), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      await t.rollback();
      return res.status(400).json({ error: 'Journal entry is not balanced' });
    }

    const entry = await JournalEntry.create({
      branch_id: req.branchId, ref_no, description, date: date || new Date(), posted_by: req.user.id
    }, { transaction: t });

    const journalLines = lines.map(line => ({
      journal_entry_id: entry.id, account_id: line.account_id, debit: line.debit || 0, credit: line.credit || 0, notes: line.notes
    }));
    await JournalLine.bulkCreate(journalLines, { transaction: t });

    await AuditLog.create({
      user_id: req.user.id, branch_id: req.branchId, action: 'CREATE', entity: 'JournalEntry',
      entity_id: entry.id, new_value: { ref_no, description, totalDebit, totalCredit }
    }, { transaction: t });

    await t.commit();
    res.status(201).json(entry);
  } catch (error) {
    await t.rollback();
    res.status(500).json({ error: error.message });
  }
};

// ── NEW: Transaction Journal (Full listing) ──
exports.getJournal = async (req, res) => {
  try {
    const { search, type, from, to, account_id } = req.query;
    const entryWhere = { branch_id: req.branchId };
    if (search) {
      entryWhere[Op.or] = [
        { ref_no: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }
    
    const lineWhere = {};
    if (account_id && account_id !== 'all') {
      lineWhere.account_id = account_id;
    }

    if (from && to) {
      const endDate = new Date(to);
      endDate.setHours(23, 59, 59, 999);
      entryWhere.date = { [Op.between]: [new Date(from), endDate] };
    } else if (from) {
      entryWhere.date = { [Op.gte]: new Date(from) };
    } else if (to) {
      const endDate = new Date(to);
      endDate.setHours(23, 59, 59, 999);
      entryWhere.date = { [Op.lte]: endDate };
    }

    const accountInclude = { model: Account, attributes: ['name', 'code', 'type'] };
    if (type && type !== 'all') accountInclude.where = { type };

    const lines = await JournalLine.findAll({
      where: lineWhere,
      include: [
        { model: JournalEntry, where: entryWhere, include: [{ model: User, as: 'Poster', attributes: ['name'] }] },
        accountInclude
      ],
      order: [[JournalEntry, 'date', 'DESC'], ['id', 'DESC']],
      limit: 200
    });

    res.json(lines);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── NEW: Ledger Summary (Account-level) ──
exports.getLedgerSummary = async (req, res) => {
  try {
    const accounts = await Account.findAll({ where: { branch_id: req.branchId, is_active: true }, order: [['type', 'ASC'], ['code', 'ASC']] });
    const summary = [];

    for (const acc of accounts) {
      const debitTotal = await JournalLine.sum('debit', { where: { account_id: acc.id } }) || 0;
      const creditTotal = await JournalLine.sum('credit', { where: { account_id: acc.id } }) || 0;
      if (debitTotal || creditTotal) {
        summary.push({
          id: acc.id, name: acc.name, code: acc.code, type: acc.type,
          debitTotal: parseFloat(debitTotal), creditTotal: parseFloat(creditTotal),
          balance: parseFloat(debitTotal) - parseFloat(creditTotal)
        });
      }
    }
    res.json({ accounts: summary });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── NEW: Account Detailed Ledger (Drill-Down) ──
exports.getLedgerAccountDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const account = await Account.findByPk(id);
    if (!account) return res.status(404).json({ error: 'Account not found' });
    if (account.branch_id !== req.branchId) return res.status(403).json({ error: 'Access denied to this account' });

    const lines = await JournalLine.findAll({
      where: { account_id: id },
      include: [{ model: JournalEntry }],
      order: [[JournalEntry, 'date', 'ASC'], ['id', 'ASC']]
    });

    let balance = 0;
    const history = lines.map(line => {
      // Normal balances: Assets & Expenses increase with Debits. Liabilities, Equity, Revenue increase with Credits.
      const debit = parseFloat(line.debit || 0);
      const credit = parseFloat(line.credit || 0);
      
      if (account.type === 'asset' || account.type === 'expense') {
        balance = balance + debit - credit;
      } else {
        balance = balance + credit - debit;
      }

      return {
        id: line.id,
        date: line.JournalEntry?.date,
        ref_no: line.JournalEntry?.ref_no,
        description: line.description || line.JournalEntry?.description,
        debit,
        credit,
        running_balance: balance
      };
    });

    res.json({ account, history });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── NEW: Audit Log ──
exports.getAuditLog = async (req, res) => {
  try {
    const logs = await AuditLog.findAll({
      where: { branch_id: req.branchId },
      include: [{ model: User, attributes: ['name'] }],
      order: [['created_at', 'DESC']],
      limit: 100
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
