const JournalEntry = require('../models/JournalEntry');
const JournalLine = require('../models/JournalLine');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const Invoice = require('../models/Invoice');
const Expense = require('../models/Expense');
const Enrollment = require('../models/Enrollment');
const Student = require('../models/Student');
const User = require('../models/User');
const Batch = require('../models/Batch');
const Course = require('../models/Course');
const LiquidityMovement = require('../models/LiquidityMovement');
const sequelize = require('../config/db.config');
const { Op, fn, col, literal } = require('sequelize');

const PREMIUM_PLAN_PRICE = 2500;

const getBranchId = (req) => req.scopedBranchId || req.branchId;

const createDateRangeFilter = (from, to) => {
  const dateFilter = {};
  if (from) dateFilter[Op.gte] = from;
  if (to) {
    let toVal = to;
    if (typeof toVal === 'string' && toVal.length === 10) {
      toVal = `${toVal} 23:59:59`;
    }
    dateFilter[Op.lte] = toVal;
  }
  return (from || to) ? dateFilter : null;
};

const buildSourceLabel = (transaction) => {
  if (transaction?.source === 'premium_plan') return 'PTE Premium Subscription';
  if (transaction?.source === 'website') return 'Website Payment';
  if (transaction?.source === 'manual') return 'Manual Income';
  return 'Student Course Fee';
};

// ── Existing: Record Expense (journal entry based) ──
exports.recordExpense = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { account_id, amount, payment_method, notes, date } = req.body;
    const expenseAccount = await Account.findOne({ where: { id: account_id, branch_id: req.branchId } });
    if (!expenseAccount || expenseAccount.type !== 'expense') throw new Error('Invalid expense account');

    const cashCode = '1000';
    const bankCode = '1010';
    const creditAccount = await Account.findOne({ where: { code: payment_method === 'cash' ? cashCode : bankCode, branch_id: req.branchId } });
    if (!creditAccount) throw new Error('Payment account not found');

    const entry = await JournalEntry.create({
      branch_id: req.branchId,
      ref_no: `EXP-${Date.now()}`,
      description: notes || `Expense: ${expenseAccount.name}`,
      date: date || new Date(),
      posted_by: req.user.id
    }, { transaction: t });

    await JournalLine.bulkCreate([
      { journal_entry_id: entry.id, account_id: expenseAccount.id, debit: amount, credit: 0, notes },
      { journal_entry_id: entry.id, account_id: creditAccount.id, debit: 0, credit: amount, notes: `Paid via ${payment_method}` }
    ], { transaction: t });

    await Expense.create({
      branch_id: req.branchId, account_id, amount, description: notes, category: expenseAccount.name,
      payment_method, date: date || new Date(), approved_by: req.user.id, status: 'approved'
    }, { transaction: t });

    await t.commit();
    res.status(201).json(entry);
  } catch (error) {
    await t.rollback();
    res.status(500).json({ error: error.message });
  }
};

// ── Finance Stats (basic) ──
exports.getFinanceStats = async (req, res) => {
  try {
    const branchId = getBranchId(req);
    const branchFilter = branchId ? { branch_id: branchId } : {};
    const revenue = await JournalLine.sum('credit', { include: [{ model: Account, where: { ...branchFilter, type: 'revenue' } }] });
    const expenses = await JournalLine.sum('debit', { include: [{ model: Account, where: { ...branchFilter, type: 'expense' } }] });
    res.json({ totalRevenue: revenue || 0, totalExpenses: expenses || 0, netProfit: (revenue || 0) - (expenses || 0) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── NEW: Accounts Overview Dashboard ──
exports.getOverview = async (req, res) => {
  try {
    const branchId = req.scopedBranchId;
    const branchFilter = branchId ? { branch_id: branchId } : {};
    const revenue = await JournalLine.sum('credit', { include: [{ model: Account, where: { ...branchFilter, type: 'revenue' } }] }) || 0;
    const expenses = await JournalLine.sum('debit', { include: [{ model: Account, where: { ...branchFilter, type: 'expense' } }] }) || 0;
    const totalInvoices = await Invoice.count({ where: branchFilter });
    const feeCollected = await Transaction.sum('amount', { where: { ...branchFilter, status: 'success' } }) || 0;
    const salaryExpense = await Expense.sum('amount', { where: { ...branchFilter, category: { [Op.like]: '%Salary%' } } }) || 0;
    const scholarshipGiven = await Expense.sum('amount', { where: { ...branchFilter, category: { [Op.like]: '%Scholarship%' } } }) || 0;
    const openInvoices = await Invoice.findAll({
      where: { ...branchFilter, status: { [Op.notIn]: ['paid', 'rejected'] } },
      attributes: ['amount', 'paid', 'status']
    });

    const receivablesDue = openInvoices.reduce((sum, invoice) => sum + Math.max(Number(invoice.amount || 0) - Number(invoice.paid || 0), 0), 0);
    const unpaidInvoices = openInvoices.filter((invoice) => Math.max(Number(invoice.amount || 0) - Number(invoice.paid || 0), 0) > 0).length;
    const overdueReceivables = openInvoices
      .filter((invoice) => invoice.status === 'overdue')
      .reduce((sum, invoice) => sum + Math.max(Number(invoice.amount || 0) - Number(invoice.paid || 0), 0), 0);

    res.json({
      revenue, expenses, netProfit: revenue - expenses,
      receivablesDue,
      overdueReceivables,
      totalInvoices, unpaidInvoices, feeCollected, salaryExpense, scholarshipGiven
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── NEW: Profit & Loss ──
exports.getProfitLoss = async (req, res) => {
  try {
    const { from, to } = req.query;
    const branchId = getBranchId(req);
    const branchFilter = branchId ? { branch_id: branchId } : {};
    const dateFilter = {};
    if (from) dateFilter[Op.gte] = from;
    if (to) dateFilter[Op.lte] = to;
    const entryWhere = Object.keys(dateFilter).length ? { ...branchFilter, date: dateFilter } : branchFilter;

    const revenueAccounts = await Account.findAll({ where: { ...branchFilter, type: 'revenue' }, attributes: ['id', 'name', 'code'] });
    const expenseAccounts = await Account.findAll({ where: { ...branchFilter, type: 'expense' }, attributes: ['id', 'name', 'code'] });

    const getTotal = async (accountIds, field) => {
      if (!accountIds.length) return 0;
      const result = await JournalLine.sum(field, {
        where: { account_id: { [Op.in]: accountIds } },
        include: [{ model: JournalEntry, where: entryWhere, attributes: [] }]
      });
      return result || 0;
    };

    const revenueIds = revenueAccounts.map(a => a.id);
    const expenseIds = expenseAccounts.map(a => a.id);

    const totalRevenue = await getTotal(revenueIds, 'credit');
    const totalExpenses = await getTotal(expenseIds, 'debit');

    // Per-account breakdown
    const revenueBreakdown = [];
    for (const acc of revenueAccounts) {
      const total = await getTotal([acc.id], 'credit');
      if (total > 0) revenueBreakdown.push({ name: acc.name, code: acc.code, amount: total });
    }
    const expenseBreakdown = [];
    for (const acc of expenseAccounts) {
      const total = await getTotal([acc.id], 'debit');
      if (total > 0) expenseBreakdown.push({ name: acc.name, code: acc.code, amount: total });
    }

    res.json({ totalRevenue, totalExpenses, netProfit: totalRevenue - totalExpenses, revenueBreakdown, expenseBreakdown });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── NEW: Trial Balance ──
exports.getTrialBalance = async (req, res) => {
  try {
    const branchId = getBranchId(req);
    const branchFilter = branchId ? { branch_id: branchId } : {};
    const accounts = await Account.findAll({ where: { ...branchFilter, is_active: true }, order: [['code', 'ASC']] });
    const summary = [];
    let totalDebits = 0, totalCredits = 0;

    for (const acc of accounts) {
      const debitTotal = await JournalLine.sum('debit', { where: { account_id: acc.id } }) || 0;
      const creditTotal = await JournalLine.sum('credit', { where: { account_id: acc.id } }) || 0;
      const balance = debitTotal - creditTotal;
      if (debitTotal || creditTotal) {
        summary.push({ id: acc.id, name: acc.name, code: acc.code, type: acc.type, debitTotal, creditTotal, balance });
        totalDebits += debitTotal;
        totalCredits += creditTotal;
      }
    }

    res.json({ accounts: summary, totalDebits, totalCredits, difference: totalDebits - totalCredits, isBalanced: Math.abs(totalDebits - totalCredits) < 0.01 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── NEW: Cash Flow (Enhanced / Detailed) ──
exports.getCashFlow = async (req, res) => {
  try {
    const branchId = getBranchId(req);
    const { from, to } = req.query;
    const txWhere = { branch_id: branchId, status: 'success' };
    const expWhere = { branch_id: branchId, status: { [Op.in]: ['approved', 'verified'] } };
    if (from) { txWhere.paid_at = { ...(txWhere.paid_at || {}), [Op.gte]: `${from} 00:00:00` }; expWhere.date = { ...(expWhere.date || {}), [Op.gte]: from }; }
    if (to) { txWhere.paid_at = { ...(txWhere.paid_at || {}), [Op.lte]: `${to} 23:59:59` }; expWhere.date = { ...(expWhere.date || {}), [Op.lte]: to }; }

    const [transactions, expenses] = await Promise.all([
      Transaction.findAll({
        where: txWhere,
        include: [
          { model: Enrollment, required: false, include: [{ model: Student, required: false, include: [{ model: User, attributes: ['name'] }] }, { model: Batch, required: false, include: [{ model: Course, attributes: ['title'], required: false }] }] },
          { model: Account, required: false, attributes: ['name', 'sub_type'] }
        ],
        order: [['paid_at', 'DESC']]
      }),
      Expense.findAll({
        where: expWhere,
        include: [{ model: Account, required: false, attributes: ['name'] }],
        order: [['date', 'DESC']]
      })
    ]);

    const inflowRows = transactions.map(tx => ({
      id: tx.id,
      date: tx.paid_at,
      type: 'inflow',
      receipt_no: tx.receipt_no,
      amount: Number(tx.amount || 0),
      method: tx.method,
      category: buildSourceLabel(tx),
      description: tx.Enrollment?.Student?.User?.name
        ? `${tx.Enrollment.Student.User.name} · ${tx.Enrollment?.Batch?.Course?.title || 'Fee'}`
        : buildSourceLabel(tx),
      account: tx.Account?.name || 'Unmapped'
    }));

    const outflowRows = expenses.map(exp => ({
      id: exp.id,
      date: exp.date,
      type: 'outflow',
      receipt_no: exp.voucher_no || `EXP-${exp.id}`,
      amount: Number(exp.amount || 0),
      method: exp.payment_method || 'cash',
      category: exp.category || exp.Account?.name || 'Expense',
      description: exp.description || exp.category || 'Operational Expense',
      account: exp.Account?.name || 'Unknown'
    }));

    const totalInflows = inflowRows.reduce((s, r) => s + r.amount, 0);
    const totalOutflows = outflowRows.reduce((s, r) => s + r.amount, 0);

    // Group by category
    const inflowByCategory = Object.values(inflowRows.reduce((map, r) => {
      if (!map[r.category]) map[r.category] = { category: r.category, total: 0, count: 0 };
      map[r.category].total += r.amount; map[r.category].count++;
      return map;
    }, {})).sort((a, b) => b.total - a.total);

    const outflowByCategory = Object.values(outflowRows.reduce((map, r) => {
      if (!map[r.category]) map[r.category] = { category: r.category, total: 0, count: 0 };
      map[r.category].total += r.amount; map[r.category].count++;
      return map;
    }, {})).sort((a, b) => b.total - a.total);

    // Group by method
    const inflowByMethod = Object.values(inflowRows.reduce((map, r) => {
      const m = (r.method || 'cash').toUpperCase();
      if (!map[m]) map[m] = { method: m, total: 0, count: 0 };
      map[m].total += r.amount; map[m].count++;
      return map;
    }, {})).sort((a, b) => b.total - a.total);

    // Daily net
    const dailyMap = {};
    inflowRows.forEach(r => { const d = new Date(r.date).toISOString().split('T')[0]; dailyMap[d] = (dailyMap[d] || 0) + r.amount; });
    outflowRows.forEach(r => { const d = new Date(r.date).toISOString().split('T')[0]; dailyMap[d] = (dailyMap[d] || 0) - r.amount; });
    const dailyNet = Object.entries(dailyMap).map(([date, net]) => ({ date, net })).sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      inflows: totalInflows,
      outflows: totalOutflows,
      net: totalInflows - totalOutflows,
      inflowRows,
      outflowRows,
      inflowByCategory,
      outflowByCategory,
      inflowByMethod,
      dailyNet,
      inflowCount: inflowRows.length,
      outflowCount: outflowRows.length
    });
  } catch (error) {
    console.error('[CashFlow Error]', error);
    res.status(500).json({ error: error.message });
  }
};

// ── NEW: Income vs Expense ──
exports.getIncomeExpense = async (req, res) => {
  try {
    const branchId = getBranchId(req);
    const branchFilter = branchId ? { branch_id: branchId } : {};
    const revenue = await JournalLine.sum('credit', { include: [{ model: Account, where: { ...branchFilter, type: 'revenue' } }] }) || 0;
    const expenses = await JournalLine.sum('debit', { include: [{ model: Account, where: { ...branchFilter, type: 'expense' } }] }) || 0;

    // Expense split by category
    const expenseSplit = await Expense.findAll({
      attributes: ['category', [fn('SUM', col('amount')), 'total']],
      where: { ...branchFilter, status: { [Op.in]: ['approved', 'verified'] } },
      group: ['category'],
      order: [[literal('total'), 'DESC']]
    });

    res.json({ totalIncome: revenue, totalExpense: expenses, surplus: revenue - expenses, expenseSplit });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── NEW: Student-wise Income ──
exports.getStudentIncome = async (req, res) => {
  try {
    const branchId = getBranchId(req);
    const branchFilter = branchId ? { branch_id: branchId } : {};
    const students = await Transaction.findAll({
      attributes: ['enrollment_id', [fn('SUM', col('amount')), 'total_paid'], [fn('COUNT', col('Transaction.id')), 'payment_count']],
      where: { ...branchFilter, status: 'success' },
      include: [{ model: Enrollment, include: [{ model: Student, include: [{ model: User, attributes: ['name'] }] }] }],
      group: ['enrollment_id'],
      order: [[literal('total_paid'), 'DESC']]
    });
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── NEW: Liquid Accounts (Bank, Cash, MFS) ──
exports.getLiquidAccounts = async (req, res) => {
  try {
    const targetBranch = getBranchId(req) || req.branchId || 1;
    const accounts = await Account.findAll({
      where: {
        branch_id: targetBranch,
        type: 'asset',
        is_active: true,
        [Op.or]: [
          { code: { [Op.like]: '10%' } },
          { sub_type: { [Op.in]: ['cash', 'bank', 'mfs'] } }
        ]
      },
      order: [['code', 'ASC']]
    });

    const detailedAccounts = [];
    for (const acc of accounts) {
      // Find latest closing submission for this account (the most reliable balance checkpoint)
      const latestClosing = await LiquidityMovement.findOne({
        where: {
          branch_id: targetBranch,
          account_id: acc.id,
          transaction_type: 'closing_submission',
        },
        order: [['movement_date', 'DESC'], ['id', 'DESC']],
        attributes: ['actual_balance', 'movement_date'],
        raw: true,
      });

      let balance;
      if (latestClosing) {
        // Start from the last known physical balance
        balance = Number(latestClosing.actual_balance || 0);

        // Add any movements AFTER the closing date (inflows - outflows)
        const subsequentMovements = await LiquidityMovement.findAll({
          where: {
            branch_id: targetBranch,
            account_id: acc.id,
            movement_date: { [Op.gt]: latestClosing.movement_date },
            transaction_type: { [Op.ne]: 'closing_submission' },
          },
          attributes: ['direction', 'amount'],
          raw: true,
        });

        for (const mv of subsequentMovements) {
          const amt = Number(mv.amount || 0);
          if (mv.direction === 'inflow') balance += amt;
          if (mv.direction === 'outflow') balance -= amt;
        }

        // Add transactions after the closing date
        const subsequentTx = await Transaction.sum('amount', {
          where: {
            branch_id: targetBranch,
            account_id: acc.id,
            status: 'success',
            paid_at: { [Op.gt]: `${latestClosing.movement_date} 23:59:59` },
          },
        }) || 0;
        balance += subsequentTx;

        // Subtract expenses after the closing date
        const subsequentExp = await Expense.sum('amount', {
          where: {
            branch_id: targetBranch,
            account_id: acc.id,
            status: 'approved',
            date: { [Op.gt]: latestClosing.movement_date },
          },
        }) || 0;
        balance -= subsequentExp;
      } else {
        // No closing exists — fall back to journal-based balance + all movements
        const debitTotal = await JournalLine.sum('debit', { where: { account_id: acc.id } }) || 0;
        const creditTotal = await JournalLine.sum('credit', { where: { account_id: acc.id } }) || 0;
        balance = debitTotal - creditTotal;
      }
      
      detailedAccounts.push({
        id: acc.id,
        code: acc.code,
        name: acc.name,
        sub_type: acc.sub_type || 'cash',
        balance
      });
    }

    res.json(detailedAccounts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createLiquidAccount = async (req, res) => {
  try {
    const { name, sub_type } = req.body;
    const targetBranch = getBranchId(req) || req.branchId || 1;
    
    // Find highest existing code starting with '10'
    const existingAccounts = await Account.findAll({
      where: { type: 'asset', code: { [Op.like]: '10%' }, branch_id: targetBranch },
      attributes: ['code']
    });
    
    let maxCode = 1000;
    existingAccounts.forEach(acc => {
      const codeInt = parseInt(acc.code.split('-')[0]); // handle '1000-U'
      if (!isNaN(codeInt) && codeInt > maxCode && codeInt < 1100) {
        maxCode = codeInt;
      }
    });
    
    const newCodePrefix = (maxCode + 1).toString();
    const newCode = targetBranch === 1 ? newCodePrefix : `${newCodePrefix}-U`;

    const newAccount = await Account.create({
      branch_id: targetBranch,
      code: newCode,
      name,
      type: 'asset',
      sub_type: sub_type || 'bank',
      is_active: true
    });

    res.status(201).json(newAccount);
  } catch (error) {
    console.error('Account Creation Error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getReportSuite = async (req, res) => {
  try {
    const branchId = getBranchId(req);
    const { from, to } = req.query;
    const transactionDateFilter = createDateRangeFilter(from, to);
    const expenseDateFilter = createDateRangeFilter(from, to);
    const journalDateFilter = createDateRangeFilter(from, to);
    const premiumDateFilter = createDateRangeFilter(from, to);
    const dueDateFilter = createDateRangeFilter(from, to);

    const transactionWhere = { branch_id: branchId, status: 'success' };
    if (transactionDateFilter) transactionWhere.paid_at = transactionDateFilter;

    const expenseWhere = { branch_id: branchId, status: 'approved' };
    if (expenseDateFilter) expenseWhere.date = expenseDateFilter;

    const premiumWhere = { branch_id: branchId, plan_type: 'premium' };
    if (premiumDateFilter) premiumWhere.premium_start_date = premiumDateFilter;

    const invoiceWhere = { branch_id: branchId };
    if (dueDateFilter) invoiceWhere.due_date = dueDateFilter;

    const referralWhere = { branch_id: branchId, referral_amount: { [Op.gt]: 0 } };
    if (createDateRangeFilter(from, to)) referralWhere.updatedAt = createDateRangeFilter(from, to);

    const [transactions, expenses, premiumStudents, liquidAccounts, invoices, referralStudents] = await Promise.all([
      Transaction.findAll({
        where: transactionWhere,
        include: [
          {
            model: Enrollment,
            required: false,
            include: [
              {
                model: Student,
                required: false,
                include: [{ model: User, attributes: ['name', 'email'] }]
              },
              {
                model: Batch,
                required: false,
                include: [{ model: Course, attributes: ['title'], required: false }]
              }
            ]
          },
          { model: Account, required: false, attributes: ['id', 'name', 'code'] }
        ],
        order: [['paid_at', 'DESC']]
      }),
      Expense.findAll({
        where: expenseWhere,
        include: [{ model: Account, required: false, attributes: ['id', 'name', 'code'] }],
        order: [['date', 'DESC']]
      }),
      Student.findAll({
        where: premiumWhere,
        include: [
          { model: User, attributes: ['name', 'email'] },
          { model: Batch, required: false, include: [{ model: Course, attributes: ['title'], required: false }] }
        ],
        order: [['premium_start_date', 'DESC']]
      }),
      Account.findAll({
        where: { branch_id: branchId, type: 'asset', code: { [Op.like]: '10%' }, is_active: true },
        attributes: ['id', 'name', 'code', 'sub_type'],
        order: [['code', 'ASC']]
      }),
      Invoice.findAll({
        where: invoiceWhere,
        include: [
          {
            model: Student,
            required: false,
            include: [{ model: User, attributes: ['name', 'email'] }, { model: Batch, required: false, include: [{ model: Course, attributes: ['title'], required: false }] }]
          },
          {
            model: Enrollment,
            required: false,
            include: [{ model: Batch, required: false, include: [{ model: Course, attributes: ['title'], required: false }] }]
          }
        ],
        order: [['due_date', 'DESC']]
      }),
      Student.findAll({
        where: referralWhere,
        include: [
          { model: User, attributes: ['name', 'email'] },
          { model: Batch, required: false, include: [{ model: Course, attributes: ['title'], required: false }] }
        ],
        order: [['enrollment_date', 'DESC']]
      })
    ]);

    const liquidAccountIds = liquidAccounts.map((account) => account.id);
    const journalEntryWhere = { branch_id: branchId };
    if (journalDateFilter) journalEntryWhere.date = journalDateFilter;

    const bankStatementLines = liquidAccountIds.length > 0 ? await JournalLine.findAll({
      where: { account_id: { [Op.in]: liquidAccountIds } },
      include: [
        { model: Account, attributes: ['name', 'code', 'sub_type'] },
        { model: JournalEntry, where: journalEntryWhere, attributes: ['date', 'ref_no', 'description'] }
      ],
      order: [[JournalEntry, 'date', 'DESC'], ['id', 'DESC']]
    }) : [];

    const accountNameById = new Map(liquidAccounts.map((account) => [account.id, account]));
    const incomeRows = transactions.map((transaction) => {
      const enrollment = transaction.Enrollment;
      const student = enrollment?.Student;
      const batch = enrollment?.Batch || student?.Batch;
      return {
        id: transaction.id,
        date: transaction.paid_at,
        receipt_no: transaction.receipt_no,
        transaction_ref: transaction.transaction_ref,
        amount: Number(transaction.amount || 0),
        method: transaction.method,
        source: buildSourceLabel(transaction),
        source_label: buildSourceLabel(transaction),
        source_key: transaction.source || 'pos_fee',
        student_name: student?.User?.name || 'Walk-in / Manual',
        student_email: student?.User?.email || '',
        batch_name: batch?.code || batch?.name || 'N/A',
        course_name: batch?.Course?.title || 'N/A',
        account_name: transaction.Account?.name || 'Unmapped',
        description: student?.User?.name
          ? `${student.User.name} · ${batch?.Course?.title || 'General Income'}`
          : buildSourceLabel(transaction)
      };
    });

    const totalIncome = incomeRows.reduce((sum, row) => sum + row.amount, 0);
    const incomeSources = Array.from(incomeRows.reduce((map, row) => {
      const current = map.get(row.source) || { source: row.source, total: 0, count: 0 };
      current.total += row.amount;
      current.count += 1;
      map.set(row.source, current);
      return map;
    }, new Map()).values()).sort((a, b) => b.total - a.total);

    const expenseRows = expenses.map((expense) => ({
      id: expense.id,
      date: expense.date,
      category: expense.category || expense.Account?.name || 'Uncategorized',
      description: expense.description,
      amount: Number(expense.amount || 0),
      status: expense.status,
      payment_method: expense.payment_method,
      account_name: expense.Account?.name || 'Unknown',
      expense_origin: expense.expense_origin || 'manual',
      payroll_id: expense.payroll_id || null
    }));
    const totalExpense = expenseRows.reduce((sum, row) => sum + row.amount, 0);
    const expenseByCategory = Array.from(expenseRows.reduce((map, row) => {
      const current = map.get(row.category) || { category: row.category, total: 0, count: 0 };
      current.total += row.amount;
      current.count += 1;
      map.set(row.category, current);
      return map;
    }, new Map()).values()).sort((a, b) => b.total - a.total);

    const premiumSubscriptions = premiumStudents.map((student) => ({
      student_id: student.id,
      student_name: student.User?.name || 'Unknown',
      student_email: student.User?.email || '',
      batch_name: student.Batch?.code || student.Batch?.name || 'N/A',
      course_name: student.Batch?.Course?.title || 'N/A',
      start_date: student.premium_start_date,
      expiry_date: student.premium_expiry_date,
      amount: PREMIUM_PLAN_PRICE,
      source: 'PTE Premium Subscription'
    }));

    const receivableRows = invoices
      .map((invoice) => {
        const student = invoice.Student;
        const batch = student?.Batch || invoice.Enrollment?.Batch;
        const due = Math.max(Number(invoice.amount || 0) - Number(invoice.paid || 0), 0);
        return {
          invoice_id: invoice.id,
          invoice_no: invoice.invoice_no,
          invoice_number: invoice.invoice_no,
          due_date: invoice.due_date,
          student_name: student?.User?.name || 'Unknown',
          batch_name: batch?.code || batch?.name || 'N/A',
          course_name: batch?.Course?.title || 'N/A',
          amount: Number(invoice.amount || 0),
          paid: Number(invoice.paid || 0),
          due,
          status: invoice.status
        };
      })
      .filter((invoice) => invoice.due > 0)
      .sort((a, b) => b.due - a.due);

    const referralRows = referralStudents.map(student => ({
      id: student.id,
      student_name: student.User?.name || 'Unknown',
      student_email: student.User?.email || '',
      course_name: student.Batch?.Course?.title || 'N/A',
      batch_name: student.Batch?.code || 'Unassigned',
      enrollment_date: student.enrollment_date,
      referred_by: student.referred_by || 'Unknown',
      amount: Number(student.referral_amount || 0)
    }));

    const bankStatement = bankStatementLines.map((line) => ({
      id: line.id,
      date: line.JournalEntry?.date,
      reference: line.JournalEntry?.ref_no,
      description: line.JournalEntry?.description,
      account_name: line.Account?.name || accountNameById.get(line.account_id)?.name || 'Account',
      account_code: line.Account?.code || accountNameById.get(line.account_id)?.code || '',
      debit: Number(line.debit || 0),
      credit: Number(line.credit || 0),
      amount: Math.max(Number(line.debit || 0), Number(line.credit || 0)),
      entry_type: Number(line.debit || 0) > 0 ? 'inflow' : 'outflow',
      balance_effect: Number(line.debit || 0) - Number(line.credit || 0)
    }));

    const trialBalanceAccounts = await Account.findAll({
      where: { branch_id: branchId, is_active: true },
      order: [['code', 'ASC']]
    });
    const trialBalance = [];
    let totalDebits = 0;
    let totalCredits = 0;
    for (const account of trialBalanceAccounts) {
      const lineWhere = { account_id: account.id };
      const entryInclude = journalDateFilter ? [{ model: JournalEntry, where: journalEntryWhere, attributes: [] }] : [];
      const debit = await JournalLine.sum('debit', { where: lineWhere, include: entryInclude }) || 0;
      const credit = await JournalLine.sum('credit', { where: lineWhere, include: entryInclude }) || 0;
      if (debit || credit) {
        totalDebits += Number(debit);
        totalCredits += Number(credit);
        trialBalance.push({
          account_name: account.name,
          account_code: account.code,
          type: account.type,
          debit: Number(debit),
          credit: Number(credit),
          balance: Number(debit) - Number(credit)
        });
      }
    }

    const summary = {
      total_income: totalIncome,
      total_expense: totalExpense,
      net_profit: totalIncome - totalExpense,
      total_receivables: receivableRows.reduce((sum, row) => sum + row.due, 0),
      premium_revenue_estimate: premiumSubscriptions.reduce((sum, row) => sum + row.amount, 0),
      income_transactions: incomeRows.length,
      expense_transactions: expenseRows.length,
      premium_subscriptions: premiumSubscriptions.length,
      total_referral_payout: referralRows.reduce((sum, row) => sum + row.amount, 0)
    };

    res.json({
      range: { from: from || null, to: to || null },
      summary,
      income: {
        total: totalIncome,
        by_source: incomeSources,
        rows: incomeRows
      },
      expenses: {
        total: totalExpense,
        by_category: expenseByCategory,
        rows: expenseRows
      },
      premium: {
        total: premiumSubscriptions.reduce((sum, row) => sum + row.amount, 0),
        rows: premiumSubscriptions
      },
      receivables: {
        total_due: receivableRows.reduce((sum, row) => sum + row.due, 0),
        rows: receivableRows
      },
      bank_statement: {
        rows: bankStatement,
        liquid_accounts: liquidAccounts.map((account) => ({ id: account.id, name: account.name, code: account.code, sub_type: account.sub_type || 'cash' }))
      },
      trial_balance: {
        rows: trialBalance,
        total_debits: totalDebits,
        total_credits: totalCredits,
        difference: totalDebits - totalCredits
      },
      referrals: {
        total: referralRows.reduce((sum, row) => sum + row.amount, 0),
        rows: referralRows
      }
    });
  } catch (error) {
    console.error('[Finance Report Suite Error]:', error);
    res.status(500).json({ error: error.message });
  }
};
