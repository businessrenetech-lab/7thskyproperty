const Budget = require('../models/Budget');
const Account = require('../models/Account');
const Expense = require('../models/Expense');
const { Op } = require('sequelize');

exports.getBudgets = async (req, res) => {
  try {
    const budgets = await Budget.findAll({
      where: { branch_id: req.branchId },
      include: [{ model: Account, attributes: ['name', 'code', 'type'] }],
      order: [['period_start', 'DESC']]
    });
    res.json(budgets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createBudget = async (req, res) => {
  try {
    const { account_id, period, period_start, period_end, allocated } = req.body;
    const account = await Account.findOne({ where: { id: account_id, branch_id: req.branchId } });
    if (!account) return res.status(404).json({ error: 'Account not found' });

    const budget = await Budget.create({
      branch_id: req.branchId, account_id, period, period_start, period_end, allocated
    });
    res.status(201).json(budget);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getBudgetVsActual = async (req, res) => {
  try {
    const budgets = await Budget.findAll({
      where: { branch_id: req.branchId },
      include: [{ model: Account, attributes: ['name', 'code'] }]
    });

    const result = [];
    for (const budget of budgets) {
      const spent = await Expense.sum('amount', {
        where: {
          branch_id: req.branchId,
          account_id: budget.account_id,
          date: { [Op.between]: [budget.period_start, budget.period_end] },
          status: 'approved'
        }
      }) || 0;

      result.push({
        id: budget.id,
        accountName: budget.Account?.name,
        accountCode: budget.Account?.code,
        period: budget.period,
        periodStart: budget.period_start,
        periodEnd: budget.period_end,
        allocated: parseFloat(budget.allocated),
        spent,
        remaining: parseFloat(budget.allocated) - spent,
        utilization: parseFloat(budget.allocated) > 0 ? ((spent / parseFloat(budget.allocated)) * 100).toFixed(1) : 0
      });
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
