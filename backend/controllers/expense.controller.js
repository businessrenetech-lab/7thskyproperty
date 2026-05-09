const Expense = require('../models/Expense');
const Account = require('../models/Account');
const User = require('../models/User');
const ExpenseCategory = require('../models/ExpenseCategory');
const JournalEntry = require('../models/JournalEntry');
const JournalLine = require('../models/JournalLine');
const Payroll = require('../models/Payroll');
const PayrollDeduction = require('../models/PayrollDeduction');
const AuditLog = require('../models/AuditLog');
const sequelize = require('../config/db.config');
const { fn, col, literal, Op } = require('sequelize');

const AUTO_APPROVAL_THRESHOLD = 5000; // BDT

const normalizeExpenseMethod = (account) => {
  const source = account?.sub_type || 'cash';
  const accountName = String(account?.name || '').toLowerCase();
  if (source === 'bank') return 'bank_transfer';
  if (source === 'mfs') return accountName.includes('nagad') ? 'nagad' : 'bkash';
  if (['cash', 'bkash', 'nagad', 'bank_transfer', 'card'].includes(source)) return source;
  return 'cash';
};

const isPayrollExpense = (expense) => Boolean(expense.payroll_id || expense.expense_origin === 'payroll');

const ensurePayrollPaymentSourceSelected = (expense) => {
  if (isPayrollExpense(expense) && !expense.payment_source_selected) {
    throw new Error('Choose a cash, bank, or mobile wallet payment source before accounting action.');
  }
};

const isReferralExpense = ({ expenseOrigin, category, description }) => {
  const explicitOrigin = String(expenseOrigin || '').trim().toLowerCase();
  if (explicitOrigin === 'referral') return true;

  const text = `${category || ''} ${description || ''}`.toLowerCase();
  return text.includes('referral expense') || text.includes('referral fee payout') || text.includes('[ref:') || text.includes('referral');
};

// ── Helper: Create journal entries for an approved expense ──
const createExpenseJournalEntries = async (expense, userId, transaction) => {
  const targetBranch = expense.branch_id;
  const liquidAccount = await Account.findOne({ where: { id: expense.account_id, branch_id: targetBranch }, transaction });
  if (!liquidAccount) throw new Error('Payment source (Bank/Cash/Mobile Wallet) account not found');

  let expenseAccount = await Account.findOne({ where: { name: expense.category, type: 'expense', branch_id: targetBranch } });
  if (!expenseAccount) {
    const existing = await Account.findAll({ where: { type: 'expense', branch_id: targetBranch }, attributes: ['code'] });
    let maxCode = 5000;
    existing.forEach(acc => {
      const ci = parseInt(acc.code.split('-')[0]);
      if (!isNaN(ci) && ci > maxCode) maxCode = ci;
    });
    expenseAccount = await Account.create({
      branch_id: targetBranch, code: targetBranch === 1 ? `${maxCode + 1}` : `${maxCode + 1}-U`,
      name: expense.category, type: 'expense', is_active: true
    }, { transaction });
  }

  const entry = await JournalEntry.create({
    branch_id: targetBranch,
    ref_no: `EXP-APP-${expense.id}-${Date.now()}`,
    description: expense.description || `Approved Expense: ${expense.category}`,
    date: new Date(),
    posted_by: userId
  }, { transaction });

  await JournalLine.bulkCreate([
    { journal_entry_id: entry.id, account_id: expenseAccount.id, debit: expense.amount, credit: 0, notes: expense.description },
    { journal_entry_id: entry.id, account_id: liquidAccount.id, debit: 0, credit: expense.amount, notes: `Paid via ${expense.payment_method}` }
  ], { transaction });

  return entry;
};

const writePayrollExpenseAudit = (expense, userId, action, newValue, transaction) => {
  if (!expense.payroll_id) return Promise.resolve();
  return AuditLog.create({
    user_id: userId,
    branch_id: expense.branch_id,
    action,
    entity: 'Payroll',
    entity_id: expense.payroll_id,
    new_value: newValue,
  }, { transaction });
};

// ── Helper: Create reversal journal entries for a deleted expense ──
const createReversalJournalEntries = async (expense, userId, transaction) => {
  const targetBranch = expense.branch_id;
  const liquidAccount = await Account.findOne({ where: { id: expense.account_id, branch_id: targetBranch }, transaction });
  if (!liquidAccount) throw new Error('Payment source account not found for reversal');

  const expenseAccount = await Account.findOne({ where: { name: expense.category, type: 'expense', branch_id: targetBranch } });
  if (!expenseAccount) throw new Error('Expense account not found for reversal');

  const entry = await JournalEntry.create({
    branch_id: targetBranch,
    ref_no: `EXP-REV-${expense.id}-${Date.now()}`,
    description: `Reversal: ${expense.description || expense.category} (Deleted)`,
    date: new Date(),
    posted_by: userId
  }, { transaction });

  // Reverse: Credit the expense account, Debit the liquid account
  await JournalLine.bulkCreate([
    { journal_entry_id: entry.id, account_id: expenseAccount.id, debit: 0, credit: expense.amount, notes: `Reversal - ${expense.description}` },
    { journal_entry_id: entry.id, account_id: liquidAccount.id, debit: expense.amount, credit: 0, notes: `Reversal - refund via ${expense.payment_method}` }
  ], { transaction });

  return entry;
};

// ── GET /expenses ──
exports.getExpenses = async (req, res) => {
  try {
    const { category, from, to, status } = req.query;
    const where = { branch_id: req.branchId };
    if (category) where.category = category;
    if (status && status !== 'all') where.status = status;
    if (from || to) {
      where.date = {};
      if (from) where.date[Op.gte] = from;
      if (to) where.date[Op.lte] = to;
    }

    const expenses = await Expense.findAll({
      where,
      include: [
        { model: Account, attributes: ['name', 'code', 'type', 'sub_type'] },
        { model: User, as: 'Approver', attributes: ['name'] },
        { model: User, as: 'Deleter', attributes: ['name'] }
      ],
      order: [['created_at', 'DESC']]
    });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── GET /expenses/split ──
exports.getExpenseSplit = async (req, res) => {
  try {
    const split = await Expense.findAll({
      attributes: ['category', [fn('SUM', col('amount')), 'total']],
      where: { branch_id: req.branchId, status: 'approved' },
      group: ['category'],
      order: [[literal('total'), 'DESC']]
    });
    const grandTotal = split.reduce((s, e) => s + parseFloat(e.dataValues.total || 0), 0);
    const result = split.map(e => ({
      category: e.category || 'Uncategorized',
      total: parseFloat(e.dataValues.total),
      percentage: grandTotal > 0 ? ((parseFloat(e.dataValues.total) / grandTotal) * 100).toFixed(1) : 0
    }));
    res.json({ split: result, grandTotal });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── POST /expenses — Smart Auto-Approval ──
exports.createExpense = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { account_id, amount, description, category, payment_method, date, expense_origin } = req.body;
    const targetBranch = req.branchId || 1;
    const numericAmount = parseFloat(amount);
    const referralExpense = isReferralExpense({ expenseOrigin: expense_origin, category, description });

    // receipt_url comes from multer if file was uploaded
    const receipt_url = req.file ? `/uploads/expenses/${req.file.filename}` : null;

    // If amount >= 5000, receipt is REQUIRED
    if (numericAmount >= AUTO_APPROVAL_THRESHOLD && !receipt_url) {
      await t.rollback();
      return res.status(400).json({ 
        error: `Expenses of BDT ${AUTO_APPROVAL_THRESHOLD.toLocaleString()} or above require a receipt upload for branch admin approval.` 
      });
    }

    // Determine initial status based on threshold
    const isAutoApproved = !referralExpense && numericAmount < AUTO_APPROVAL_THRESHOLD;
    const initialStatus = isAutoApproved ? 'approved' : 'pending';

    const expense = await Expense.create({
      branch_id: targetBranch,
      account_id, amount: numericAmount, description, category, payment_method,
      receipt_url,
      date: date || new Date(),
      status: initialStatus,
      expense_origin: expense_origin || 'manual',
      approved_by: isAutoApproved ? req.user.id : null,
      payment_source_selected: true,
    }, { transaction: t });

    // If auto-approved, create journal entries immediately
    if (isAutoApproved) {
      await createExpenseJournalEntries(expense, req.user.id, t);
    }

    await t.commit();
    res.status(201).json({ 
      expense, 
      auto_approved: isAutoApproved,
      referral_expense: referralExpense,
      message: isAutoApproved 
        ? 'Expense auto-approved and journal entry created (below BDT 5,000)' 
        : referralExpense
          ? 'Referral expense submitted for approval. No journal entry created yet.'
          : 'Expense submitted for branch admin approval (BDT 5,000+). Receipt attached.'
    });
  } catch (error) {
    await t.rollback();
    console.error('Create Expense Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ── PUT /expenses/:id/verify ──
exports.verifyExpense = async (req, res) => {
  try {
    const expense = await Expense.findOne({ where: { id: req.params.id, branch_id: req.branchId } });
    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    ensurePayrollPaymentSourceSelected(expense);
    
    await expense.update({
      status: 'verified',
      verified_by: req.user.id,
      verification_date: new Date()
    });
    
    res.json(expense);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── PUT /expenses/:id/approve ──
exports.approveExpense = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const expense = await Expense.findOne({ where: { id: req.params.id, branch_id: req.branchId }, transaction: t, lock: true });
    if (!expense) {
      await t.rollback();
      return res.status(404).json({ error: 'Expense not found' });
    }
    if (['approved', 'deleted', 'rejected'].includes(expense.status)) {
      await t.rollback();
      return res.status(400).json({ error: `Expense is already ${expense.status}` });
    }
    ensurePayrollPaymentSourceSelected(expense);

    let payroll = null;
    if (isPayrollExpense(expense)) {
      payroll = await Payroll.findOne({ where: { id: expense.payroll_id, branch_id: expense.branch_id }, transaction: t, lock: true });
      if (!payroll || payroll.status === 'paid') {
        await t.rollback();
        return res.status(400).json({ error: 'Payroll is already paid or unavailable.' });
      }
    }

    const entry = await createExpenseJournalEntries(expense, req.user.id, t);

    await expense.update({
      status: 'approved',
      approved_by: req.user.id
    }, { transaction: t });

    if (isPayrollExpense(expense)) {
      await payroll.update({
        status: 'paid',
        journal_entry_id: entry.id,
        rejection_reason: null,
      }, { transaction: t });
      await PayrollDeduction.update({
        status: 'applied',
        applied_at: new Date(),
      }, { where: { payroll_id: expense.payroll_id, branch_id: expense.branch_id, status: 'approved' }, transaction: t });
      const PayrollBonus = require('../models/PayrollBonus');
      await PayrollBonus.update({
        status: 'applied',
        applied_at: new Date(),
      }, { where: { payroll_id: expense.payroll_id, branch_id: expense.branch_id, status: 'approved' }, transaction: t });
      await writePayrollExpenseAudit(expense, req.user.id, 'APPROVE_PAYMENT', {
        expense_id: expense.id,
        journal_entry_id: entry.id,
        amount: expense.amount,
      }, t);
    }

    await t.commit();
    res.json({ message: 'Expense approved and journal entry created', expense });
  } catch (error) {
    console.error('Approve Error:', error);
    if (t) await t.rollback();
    res.status(500).json({ error: error.message });
  }
};

// ── PUT /expenses/:id/reject ──
exports.rejectExpense = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { rejection_reason } = req.body;
    const expense = await Expense.findOne({ where: { id: req.params.id, branch_id: req.branchId }, transaction: t, lock: true });
    if (!expense) {
      await t.rollback();
      return res.status(404).json({ error: 'Expense not found' });
    }
    if (['approved', 'deleted'].includes(expense.status)) {
      await t.rollback();
      return res.status(400).json({ error: `Expense is already ${expense.status}` });
    }
    
    await expense.update({
      status: 'rejected',
      rejection_reason
    }, { transaction: t });

    if (isPayrollExpense(expense)) {
      await Payroll.update({
        status: 'rejected',
        rejection_reason: rejection_reason || 'Rejected by accounting',
      }, { where: { id: expense.payroll_id, branch_id: expense.branch_id }, transaction: t });
      await writePayrollExpenseAudit(expense, req.user.id, 'REJECT_PAYMENT', {
        expense_id: expense.id,
        reason: rejection_reason || '',
      }, t);
    }
    
    await t.commit();
    res.json({ message: 'Expense rejected', expense });
  } catch (error) {
    if (t) await t.rollback();
    res.status(500).json({ error: error.message });
  }
};

// ── DELETE /expenses/:id — Soft-delete with Journal Reversal ──
exports.deleteExpense = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { deletion_reason } = req.body;
    if (!deletion_reason || !deletion_reason.trim()) {
      await t.rollback();
      return res.status(400).json({ error: 'A deletion reason is required.' });
    }

    const expense = await Expense.findOne({ where: { id: req.params.id, branch_id: req.branchId }, transaction: t, lock: true });
    if (!expense) {
      await t.rollback();
      return res.status(404).json({ error: 'Expense not found' });
    }
    if (expense.status === 'deleted') {
      await t.rollback();
      return res.status(400).json({ error: 'Expense already deleted' });
    }

    // If the expense was approved, reverse the journal entries
    if (expense.status === 'approved') {
      await createReversalJournalEntries(expense, req.user.id, t);
    }

    await expense.update({
      status: 'deleted',
      deletion_reason: deletion_reason.trim(),
      deleted_by: req.user.id,
      deleted_at: new Date()
    }, { transaction: t });

    if (isPayrollExpense(expense)) {
      await Payroll.update({
        status: 'rejected',
        rejection_reason: `Payroll expense deleted: ${deletion_reason.trim()}`,
      }, { where: { id: expense.payroll_id, branch_id: expense.branch_id }, transaction: t });
      await writePayrollExpenseAudit(expense, req.user.id, 'DELETE_PAYMENT', {
        expense_id: expense.id,
        reason: deletion_reason.trim(),
      }, t);
    }

    await t.commit();
    res.json({ 
      message: expense.status === 'approved' 
        ? 'Expense deleted and journal entries reversed' 
        : 'Expense deleted',
      expense 
    });
  } catch (error) {
    console.error('Delete Expense Error:', error);
    if (t) await t.rollback();
    res.status(500).json({ error: error.message });
  }
};

exports.selectPaymentSource = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { account_id } = req.body;
    const expense = await Expense.findOne({ where: { id: req.params.id, branch_id: req.branchId }, transaction: t, lock: true });
    if (!expense) {
      await t.rollback();
      return res.status(404).json({ error: 'Expense not found' });
    }
    if (!isPayrollExpense(expense)) {
      await t.rollback();
      return res.status(400).json({ error: 'Payment source selection is only for payroll requests.' });
    }
    if (!['pending', 'verified'].includes(expense.status)) {
      await t.rollback();
      return res.status(400).json({ error: 'Payment source can only be selected before approval.' });
    }

    const sourceAccount = await Account.findOne({
      where: {
        id: account_id,
        branch_id: expense.branch_id,
        type: 'asset',
        is_active: true,
        [Op.or]: [
          { code: { [Op.like]: '10%' } },
          { sub_type: { [Op.in]: ['cash', 'bank', 'mfs'] } },
        ],
      },
      transaction: t,
      lock: true,
    });
    if (!sourceAccount) {
      await t.rollback();
      return res.status(400).json({ error: 'Choose a valid cash, bank, or mobile wallet account.' });
    }

    await expense.update({
      account_id: sourceAccount.id,
      payment_method: normalizeExpenseMethod(sourceAccount),
      payment_source_selected: true,
      payment_source_selected_by: req.user.id,
      payment_source_selected_at: new Date(),
    }, { transaction: t });

    await Payroll.update({
      status: 'pending_accounting',
      rejection_reason: null,
    }, { where: { id: expense.payroll_id, branch_id: expense.branch_id }, transaction: t });

    await writePayrollExpenseAudit(expense, req.user.id, 'SELECT_PAYMENT_SOURCE', {
      expense_id: expense.id,
      account_id: sourceAccount.id,
      payment_method: normalizeExpenseMethod(sourceAccount),
    }, t);

    await t.commit();
    res.json({ message: 'Payroll payment source selected. Accounting can now verify or approve.', expense });
  } catch (error) {
    if (t) await t.rollback();
    res.status(500).json({ error: error.message });
  }
};

// --- Expense Category CRUD ---

exports.getExpenseCategories = async (req, res) => {
  try {
    const categories = await ExpenseCategory.findAll({
      where: { parent_id: null, is_active: true },
      include: [{ model: ExpenseCategory, as: 'Children', where: { is_active: true }, required: false }],
      order: [['name', 'ASC'], [{ model: ExpenseCategory, as: 'Children' }, 'name', 'ASC']]
    });
    res.json(categories);
  } catch (error) {
    console.error('[ERROR] Fetch Categories Error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getAllCategoriesFlat = async (req, res) => {
  try {
    const categories = await ExpenseCategory.findAll({
      where: { is_active: true },
      include: [{ model: ExpenseCategory, as: 'Parent', attributes: ['name'] }],
      order: [['type', 'ASC'], ['name', 'ASC']]
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createExpenseCategory = async (req, res) => {
  try {
    const { name, parent_id, description } = req.body;
    const cleanParentId = (parent_id && parent_id !== '' && parent_id !== 'null' && parent_id !== 'undefined') ? parseInt(parent_id) : null;
    const type = cleanParentId ? 'sub' : 'head';

    if (cleanParentId && !isNaN(cleanParentId)) {
      const parent = await ExpenseCategory.findByPk(cleanParentId);
      if (!parent) return res.status(404).json({ error: 'Parent category not found' });
    }
    
    const finalParentId = (cleanParentId && !isNaN(cleanParentId)) ? cleanParentId : null;

    const category = await ExpenseCategory.create({
      branch_id: req.branchId || 1, 
      name, 
      parent_id: finalParentId, 
      type, 
      description
    });
    res.status(201).json(category);
  } catch (error) {
    console.error('[ERROR] Expense Category Error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.updateExpenseCategory = async (req, res) => {
  try {
    const cat = await ExpenseCategory.findByPk(req.params.id);
    if (!cat) return res.status(404).json({ error: 'Category not found' });
    await cat.update(req.body);
    res.json(cat);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteExpenseCategory = async (req, res) => {
  try {
    const cat = await ExpenseCategory.findByPk(req.params.id);
    if (!cat) return res.status(404).json({ error: 'Category not found' });
    await cat.update({ is_active: false });
    // Also deactivate children
    await ExpenseCategory.update({ is_active: false }, { where: { parent_id: cat.id } });
    res.json({ message: 'Category deactivated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
