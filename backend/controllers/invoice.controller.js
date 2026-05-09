const Invoice = require('../models/Invoice');
const Student = require('../models/Student');
const User = require('../models/User');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const Batch = require('../models/Batch');
const IncomeCategory = require('../models/IncomeCategory');
const Customer = require('../models/Customer');
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const JournalEntry = require('../models/JournalEntry');
const JournalLine = require('../models/JournalLine');
const sequelize = require('../config/db.config');
const { Op, fn, col } = require('sequelize');

exports.getInvoices = async (req, res) => {
  try {
    const { status, search, type } = req.query;
    const where = { branch_id: req.branchId };
    if (status && status !== 'all') where.status = status;
    if (type && type !== 'all') where.invoice_type = type;

    const invoices = await Invoice.findAll({
      where,
      include: [
        { model: Student, include: [{ model: User, attributes: ['name', 'email'] }] },
        { model: Enrollment, include: [{ model: Batch, attributes: ['name'], include: [{ model: Course, attributes: ['title'] }] }] },
        { model: IncomeCategory, attributes: ['name'] },
        { model: Customer, attributes: ['id', 'name', 'phone', 'email', 'company'] }
      ],
      order: [['issued_at', 'DESC']]
    });
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getInvoiceStats = async (req, res) => {
  try {
    const bw = { branch_id: req.branchId };
    const totalInvoiced = await Invoice.sum('amount', { where: bw }) || 0;
    const totalPaid = await Invoice.sum('paid', { where: bw }) || 0;
    const pending = await Invoice.sum('amount', { where: { ...bw, status: { [Op.in]: ['pending', 'partial'] } } }) || 0;
    const pendingPaid = await Invoice.sum('paid', { where: { ...bw, status: { [Op.in]: ['pending', 'partial'] } } }) || 0;
    const overdue = await Invoice.sum('amount', { where: { ...bw, status: 'overdue' } }) || 0;
    const overduePaid = await Invoice.sum('paid', { where: { ...bw, status: 'overdue' } }) || 0;
    const totalCount = await Invoice.count({ where: bw });
    const overdueCount = await Invoice.count({ where: { ...bw, status: 'overdue' } });
    const pendingCount = await Invoice.count({ where: { ...bw, status: { [Op.in]: ['pending', 'partial'] } } });
    const customCount = await Invoice.count({ where: { ...bw, invoice_type: 'custom' } });

    res.json({
      totalInvoiced, totalPaid, collectionRate: totalInvoiced > 0 ? ((totalPaid / totalInvoiced) * 100).toFixed(1) : 0,
      pendingAmount: pending - pendingPaid, overdueAmount: overdue - overduePaid,
      totalCount, overdueCount, pendingCount, customCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAgingAnalysis = async (req, res) => {
  try {
    const now = new Date();
    const ranges = [
      { label: 'Current (0-30 days)', min: 0, max: 30 },
      { label: '31-60 days', min: 31, max: 60 },
      { label: '61-90 days', min: 61, max: 90 },
      { label: '90+ days', min: 91, max: 9999 }
    ];

    const aging = [];
    for (const range of ranges) {
      const fromDate = new Date(now);
      fromDate.setDate(fromDate.getDate() - range.max);
      const toDate = new Date(now);
      toDate.setDate(toDate.getDate() - range.min);

      const total = await Invoice.sum('amount', {
        where: {
          branch_id: req.branchId,
          status: { [Op.in]: ['pending', 'overdue', 'partial'] },
          due_date: { [Op.between]: [fromDate.toISOString().split('T')[0], toDate.toISOString().split('T')[0]] }
        }
      }) || 0;
      const paid = await Invoice.sum('paid', {
        where: {
          branch_id: req.branchId,
          status: { [Op.in]: ['pending', 'overdue', 'partial'] },
          due_date: { [Op.between]: [fromDate.toISOString().split('T')[0], toDate.toISOString().split('T')[0]] }
        }
      }) || 0;

      aging.push({ label: range.label, amount: total - paid });
    }

    const totalReceivable = aging.reduce((s, a) => s + a.amount, 0);
    res.json({ aging, totalReceivable });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createInvoice = async (req, res) => {
  try {
    const { enrollment_id, student_id, amount, due_date, notes, invoice_type, income_category_id, customer_id, customer_name, customer_phone, customer_email, customer_company, customer_address, save_customer } = req.body;
    
    // Optionally save new customer
    let savedCustomerId = customer_id || null;
    if (save_customer && customer_name && !customer_id) {
      const newCustomer = await Customer.create({
        branch_id: req.branchId, name: customer_name, phone: customer_phone,
        email: customer_email, company: customer_company, address: customer_address
      });
      savedCustomerId = newCustomer.id;
    }

    const invCount = await Invoice.count({ where: { branch_id: req.branchId } });
    const invoice = await Invoice.create({
      branch_id: req.branchId,
      invoice_no: `INV-${new Date().getFullYear()}-${String(invCount + 1).padStart(4, '0')}`,
      enrollment_id: enrollment_id || null,
      student_id: student_id || null,
      amount,
      due_date,
      notes,
      status: 'pending',
      invoice_type: invoice_type || 'tuition',
      income_category_id: income_category_id || null,
      customer_id: savedCustomerId,
      customer_name, customer_phone, customer_email, customer_company, customer_address
    });
    res.status(201).json(invoice);
  } catch (error) {
    console.error('[Create Invoice Error]', error);
    res.status(500).json({ error: error.message });
  }
};

exports.updateInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findByPk(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    await invoice.update(req.body);
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── Income Category endpoints ──
exports.getIncomeCategories = async (req, res) => {
  try {
    const categories = await IncomeCategory.findAll({
      where: { branch_id: { [Op.or]: [req.branchId, null] }, is_active: true },
      include: [{ model: IncomeCategory, as: 'Children' }]
    });
    res.json(categories);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.getAllIncomeCategoriesFlat = async (req, res) => {
  try {
    const categories = await IncomeCategory.findAll({
      where: { branch_id: { [Op.or]: [req.branchId, null] }, is_active: true }
    });
    res.json(categories);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.createIncomeCategory = async (req, res) => {
  try {
    const cat = await IncomeCategory.create({ ...req.body, branch_id: req.branchId });
    res.status(201).json(cat);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.updateIncomeCategory = async (req, res) => {
  try {
    const cat = await IncomeCategory.findByPk(req.params.id);
    if (!cat) return res.status(404).json({ error: 'Not found' });
    await cat.update(req.body);
    res.json(cat);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.deleteIncomeCategory = async (req, res) => {
  try {
    const cat = await IncomeCategory.findByPk(req.params.id);
    if (!cat) return res.status(404).json({ error: 'Not found' });
    await cat.update({ is_active: false });
    res.json({ message: 'Deleted' });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

// ── Customer CRUD ──
exports.getCustomers = async (req, res) => {
  try {
    const customers = await Customer.findAll({
      where: { branch_id: req.branchId, is_active: true },
      order: [['name', 'ASC']]
    });
    res.json(customers);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.createCustomer = async (req, res) => {
  try {
    const customer = await Customer.create({ ...req.body, branch_id: req.branchId });
    res.status(201).json(customer);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Not found' });
    await customer.update(req.body);
    res.json(customer);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Not found' });
    await customer.update({ is_active: false });
    res.json({ message: 'Deleted' });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

// ── Custom Invoice Payment endpoint ──
exports.payCustomInvoice = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const invoice = await Invoice.findByPk(req.params.id, {
      include: [{ model: IncomeCategory }]
    });
    if (!invoice) {
        await t.rollback();
        return res.status(404).json({ error: 'Invoice not found' });
    }
    const { method, account_id, amount, paid_date } = req.body;
    // Resolve payment timestamp — use provided date or default to now
    const paymentTimestamp = paid_date ? new Date(`${paid_date}T12:00:00+06:00`) : new Date();
    
    const tx = await Transaction.create({
      branch_id: req.branchId,
      invoice_id: invoice.id,
      receipt_no: `MR-CUST-${Date.now()}`,
      amount: amount || invoice.amount,
      method: method || 'cash',
      source: 'manual',
      account_id,
      status: 'success',
      paid_at: paymentTimestamp,
      recorded_by: req.user?.id
    }, { transaction: t });

    const newPaid = Number(invoice.paid || 0) + Number(amount || invoice.amount);
    await invoice.update({
      paid: newPaid,
      status: newPaid >= invoice.amount ? 'paid' : 'partial'
    }, { transaction: t });

    const liquidAcc = await Account.findByPk(account_id);
    const isUttara = req.branchId !== 1;
    const revenueCode = isUttara ? '4010-U' : '4010';
    let revenueAcc = await Account.findOne({ where: { is_active: true, branch_id: req.branchId, code: revenueCode } }); 
    if (!revenueAcc) {
      revenueAcc = await Account.create({
        code: revenueCode, name: isUttara ? 'Custom Income Revenue - Uttara' : 'Custom Income Revenue',
        type: 'revenue', branch_id: req.branchId, balance: 0
      }, { transaction: t });
    }
    if (liquidAcc && revenueAcc) {
      const je = await JournalEntry.create({
        branch_id: req.branchId,
        date: paymentTimestamp,
        ref_no: tx.receipt_no,
        description: `Custom Income: ${invoice.IncomeCategory?.name || 'Revenue'} - ${invoice.customer_name || 'Customer'}`,
        posted_by: req.user?.id
      }, { transaction: t });

      await JournalLine.bulkCreate([
        { journal_entry_id: je.id, account_id: liquidAcc.id, debit: tx.amount, credit: 0, notes: 'Payment Received' },
        { journal_entry_id: je.id, account_id: revenueAcc.id, debit: 0, credit: tx.amount, notes: 'Revenue Accrued' }
      ], { transaction: t });
    }

    await t.commit();
    res.json({ message: 'Payment successful', transaction: tx });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ error: error.message });
  }
};

exports.updateInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, due_date, notes, income_category_id } = req.body;
    
    const invoice = await Invoice.findByPk(id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    // Ensure amount is not less than already paid
    if (amount < invoice.paid) {
      return res.status(400).json({ error: 'Amount cannot be less than already paid amount' });
    }

    let status = invoice.status;
    if (invoice.paid >= amount) {
      status = 'paid';
    } else if (invoice.paid > 0) {
      status = 'partial';
    } else {
      status = new Date(due_date) < new Date() ? 'overdue' : 'pending';
    }

    const updateData = { amount, due_date, notes, status };
    if (income_category_id) updateData.income_category_id = income_category_id;

    await invoice.update(updateData);
    
    res.json({ message: 'Invoice updated successfully', invoice });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
