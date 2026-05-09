const Transaction = require('../models/Transaction');
const Enrollment = require('../models/Enrollment');
const JournalEntry = require('../models/JournalEntry');
const JournalLine = require('../models/JournalLine');
const Account = require('../models/Account');
const Invoice = require('../models/Invoice');
const Student = require('../models/Student');
const User = require('../models/User');
const Lead = require('../models/Lead');
const Opportunity = require('../models/Opportunity');
const Batch = require('../models/Batch');
const Course = require('../models/Course');
const Customer = require('../models/Customer');
const IncomeCategory = require('../models/IncomeCategory');
const Expense = require('../models/Expense');
const sequelize = require('../config/db.config');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const calculateDue = (invoice) => {
  const amount = Number(invoice?.amount || 0);
  const paid = Number(invoice?.paid || 0);
  return Math.max(amount - paid, 0);
};

const buildReferralExpenseRef = (enrollmentId, invoiceId) => `[REF:${enrollmentId}:${invoiceId || 0}]`;

const upsertPendingReferralExpense = async ({
  branchId,
  enrollment,
  invoiceId,
  payoutAccountId,
  paymentMethod,
  amount,
  referredBy,
  transaction,
}) => {
  if (!(amount > 0)) return { created: false, updated: false };

  const referralStudent = enrollment.student_id
    ? await Student.findOne({ where: { id: enrollment.student_id, branch_id: branchId }, include: [{ model: User, attributes: ['name'] }], transaction })
    : null;
  const referrerName = referredBy || referralStudent?.referred_by || 'Unknown Referrer';
  const studentName = referralStudent?.User?.name || `Student ID: ${enrollment.student_id || 'N/A'}`;
  const referenceTag = buildReferralExpenseRef(enrollment.id, invoiceId);
  const category = branchId !== 1 ? 'Referral Expense - Uttara' : 'Referral Expense';
  const description = `Referral Fee payout to: ${referrerName} (for ${studentName}) ${referenceTag}`;

  const existingExpense = await Expense.findOne({
    where: {
      branch_id: branchId,
      description: { [Op.like]: `%${referenceTag}%` },
      status: { [Op.notIn]: ['rejected', 'deleted'] },
    },
    transaction,
  });

  if (existingExpense) {
    if (existingExpense.status === 'pending') {
      await existingExpense.update({
        account_id: payoutAccountId,
        amount,
        description,
        category,
        payment_method: paymentMethod || 'cash',
        date: new Date(),
      }, { transaction });
      return { created: false, updated: true, description };
    }

    return { created: false, updated: false, description };
  }

  await Expense.create({
    branch_id: branchId,
    account_id: payoutAccountId,
    amount,
    description,
    category,
    payment_method: paymentMethod || 'cash',
    date: new Date(),
    approved_by: null,
    status: 'pending',
  }, { transaction });

  return { created: true, updated: false, description };
};

// ─── Get Transactions (supports both enrollment + custom income) ──────────────
exports.getTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.findAll({
      where: { branch_id: req.branchId },
      include: [
        { model: Enrollment, required: false, include: [{ model: Student, include: [User] }, { model: Batch, include: [Course] }] },
        { model: Invoice, required: false, include: [{ model: Customer, required: false }, { model: IncomeCategory, required: false }] }
      ],
      order: [['createdAt', 'DESC']],
      limit: 50
    });
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Get Pending Invoices (both enrollment + custom) ─────────────────────────
exports.getPendingInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.findAll({
      where: { 
        branch_id: req.branchId,
        status: { [Op.in]: ['pending', 'partial', 'overdue'] }
      },
      include: [
        { model: Student, include: [User], required: false },
        { model: Enrollment, required: false, include: [{ model: Student, include: [User], required: false }, { model: Batch, required: false, include: [{ model: Course, required: false }] }] },
        { model: Customer, required: false },
        { model: IncomeCategory, required: false }
      ]
    });
    res.json(invoices.filter((invoice) => calculateDue(invoice) > 0));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// COLLECT ENROLLMENT FEE — strictly for student enrollment invoices
// ══════════════════════════════════════════════════════════════════════════════
exports.collectFee = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { enrollment_id, invoice_id, amount, method, transaction_ref, notes, account_id, paid_date } = req.body;

    // Resolve payment timestamp — use provided date or default to now
    const paymentTimestamp = paid_date ? new Date(`${paid_date}T12:00:00+06:00`) : new Date();

    const linkedInvoice = invoice_id ? await Invoice.findOne({
      where: { id: invoice_id, branch_id: req.branchId },
      transaction: t
    }) : await Invoice.findOne({
      where: { enrollment_id, branch_id: req.branchId },
      transaction: t
    });

    const resolvedEnrollmentId = linkedInvoice?.enrollment_id || enrollment_id;
    const enrollment = await Enrollment.findOne({ where: { id: resolvedEnrollmentId, branch_id: req.branchId }, transaction: t });
    if (!enrollment) throw new Error('Enrollment not found');

    const paymentAmount = Number(amount || 0);
    if (!paymentAmount || Number.isNaN(paymentAmount) || paymentAmount <= 0) {
      throw new Error('Valid payment amount is required');
    }

    // 1. Double-Entry Journaling Accounts
    const isUttara = req.branchId !== 1;
    let debitAccount = null;

    if (account_id) {
      debitAccount = await Account.findOne({ where: { id: account_id, branch_id: req.branchId }, transaction: t });
      if (!debitAccount) throw new Error('Selected asset account not found');
    } else {
      const cashCode = isUttara ? '1000-U' : '1000';
      const bankCode = isUttara ? '1010-U' : '1010';
      debitAccount = await Account.findOne({ where: { code: method === 'cash' ? cashCode : bankCode, branch_id: req.branchId }, transaction: t });
      
      if (!debitAccount) {
        debitAccount = await Account.create({ code: method === 'cash' ? cashCode : bankCode, name: method === 'cash' ? (isUttara ? 'Cash in Hand - Uttara' : 'Cash in Hand') : (isUttara ? 'Cash at Bank - Uttara' : 'Cash at Bank'), type: 'asset', branch_id: req.branchId, balance: 0 }, { transaction: t });
      }
    }

    const revenueCode = isUttara ? '4000-U' : '4000';
    let creditAccount = await Account.findOne({ where: { code: revenueCode, branch_id: req.branchId }, transaction: t });

    if (!creditAccount) {
      creditAccount = await Account.create({ code: revenueCode, name: isUttara ? 'Tuition Revenue - Uttara' : 'Tuition Revenue', type: 'revenue', branch_id: req.branchId, balance: 0 }, { transaction: t });
    }

    if (!debitAccount || !creditAccount) throw new Error('Financial accounts not configured properly');

    // 2. Record Transaction
    const txn = await Transaction.create({
      branch_id: req.branchId,
      enrollment_id: enrollment.id,
      invoice_id: linkedInvoice?.id || null,
      amount: paymentAmount,
      method,
      transaction_ref,
      source: 'pos_fee',
      account_id: debitAccount.id,
      recorded_by: req.user.id,
      status: 'success',
      paid_at: paymentTimestamp
    }, { transaction: t });

    // 3. Update Enrollment paid_amount
    const newPaidAmount = Number(enrollment.paid_amount || 0) + paymentAmount;
    enrollment.paid_amount = newPaidAmount;
    
    if (newPaidAmount >= parseFloat(enrollment.total_fee)) {
      enrollment.status = 'paid';
    } else {
      enrollment.status = 'partial';
    }
    await enrollment.save({ transaction: t });

    if (linkedInvoice) {
      const updatedInvoicePaid = Number(linkedInvoice.paid || 0) + paymentAmount;
      const updatedInvoiceStatus = updatedInvoicePaid >= Number(linkedInvoice.amount || enrollment.total_fee)
        ? 'paid'
        : 'partial';

      await linkedInvoice.update({
        paid: updatedInvoicePaid,
        status: updatedInvoiceStatus
      }, { transaction: t });
    }

    // ── CRM INTEGRATION ─────────────────────────────────────
    const crmInvoice = linkedInvoice;
    const leadIdMatch = crmInvoice?.notes?.match(/CRM Lead ID:\s*(\d+)/);
    const opportunityIdMatch = crmInvoice?.notes?.match(/Opportunity ID:\s*(\d+)/);

    let lead = null;
    if (leadIdMatch) {
      lead = await Lead.findOne({
        where: { id: Number(leadIdMatch[1]), branch_id: req.branchId },
        transaction: t
      });
    }

    if (!lead && crmInvoice?.notes) {
      const nameMatch = crmInvoice.notes.match(/CRM Lead: (.+?) —/);
      if (nameMatch) {
        lead = await Lead.findOne({
          where: { name: nameMatch[1], branch_id: req.branchId },
          transaction: t
        });
      }
    }

    let linkedOpp = null;
    if (opportunityIdMatch) {
      linkedOpp = await Opportunity.findOne({
        where: { id: Number(opportunityIdMatch[1]), branch_id: req.branchId },
        transaction: t
      });
    }

    if (!linkedOpp && lead) {
      linkedOpp = await Opportunity.findOne({
        where: { lead_id: lead.id, branch_id: req.branchId },
        order: [['created_at', 'DESC']],
        transaction: t
      });
    }

    let generatedPassword = null;
    if (!enrollment.student_id && lead) {
      let user = null;
      if (lead.email) {
        user = await User.findOne({ where: { email: lead.email }, transaction: t });
      }
      if (!user) {
        generatedPassword = crypto.randomBytes(12).toString('base64url');
        user = await User.create({
          name: lead.name,
          email: lead.email || `lead-${lead.id}@languageacademy.local`,
          password: await bcrypt.hash(generatedPassword, 10),
          role: 'student',
          branch_id: req.branchId,
        }, { transaction: t });
      }

      let student = await Student.findOne({ where: { user_id: user.id, branch_id: req.branchId }, transaction: t });
      if (!student) {
        student = await Student.create({
          user_id: user.id,
          branch_id: req.branchId,
          batch_id: enrollment.batch_id || null,
          first_name: lead.name.split(' ')[0],
          last_name: lead.name.split(' ').slice(1).join(' ') || '',
          mobile_no: lead.phone,
          enrollment_date: new Date(),
          status: 'active',
        }, { transaction: t });
      }

      enrollment.student_id = student.id;
      await enrollment.save({ transaction: t });

      if (crmInvoice) {
        await crmInvoice.update({ student_id: student.id }, { transaction: t });
      }

      if (enrollment.batch_id) {
        await Batch.increment('enrolled', { by: 1, where: { id: enrollment.batch_id, branch_id: req.branchId }, transaction: t });
      }
    } else if (crmInvoice && enrollment.student_id && !crmInvoice.student_id) {
      await crmInvoice.update({ student_id: enrollment.student_id }, { transaction: t });
    }

    if (lead && newPaidAmount >= parseFloat(enrollment.total_fee)) {
      await lead.update({ status: 'successful', last_activity_at: new Date() }, { transaction: t });

      if (linkedOpp) {
        await linkedOpp.update({
          stage: 'won',
          closed_at: new Date(),
          probability: 100,
          invoice_id: crmInvoice?.id
        }, { transaction: t });
      }
    }
    // ── END CRM INTEGRATION ─────────────────────────────────

    // 4. Double-Entry Journal
    const entry = await JournalEntry.create({
      branch_id: req.branchId,
      ref_no: `PAY-${txn.id}`,
      description: `Fee Collection - Enrollment: ${enrollment.id} | Ref: ${transaction_ref || 'N/A'}`,
      date: paymentTimestamp,
      posted_by: req.user.id
    }, { transaction: t });

    const lines = [
      { journal_entry_id: entry.id, account_id: debitAccount.id, debit: paymentAmount, credit: 0, notes: notes || 'POS Payment' },
      { journal_entry_id: entry.id, account_id: creditAccount.id, debit: 0, credit: paymentAmount, notes: 'Tuition Revenue' }
    ];

    const refAmount = Number(req.body.referral_amount || 0);
    const referralExpenseResult = await upsertPendingReferralExpense({
      branchId: req.branchId,
      enrollment,
      invoiceId: linkedInvoice?.id,
      payoutAccountId: debitAccount.id,
      paymentMethod: method,
      amount: refAmount,
      referredBy: req.body.referred_by,
      transaction: t,
    });

    await JournalLine.bulkCreate(lines, { transaction: t });

    await t.commit();
    const message = referralExpenseResult.created || referralExpenseResult.updated
      ? 'Fee collected successfully. Referral payout moved to pending expense approval.'
      : 'Fee collected successfully';
    res.status(201).json({ message, transaction: txn, referral_expense: referralExpenseResult, temporary_password: generatedPassword });
  } catch (error) {
    await t.rollback();
    console.error('[CollectFee Error]:', error);
    res.status(500).json({ error: error.message });
  }

};

// ══════════════════════════════════════════════════════════════════════════════
// COLLECT CUSTOM INCOME — for manual/custom invoices (no enrollment required)
// ══════════════════════════════════════════════════════════════════════════════
exports.collectCustomIncome = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { invoice_id, amount, method, transaction_ref, notes, account_id, paid_date } = req.body;

    // Resolve payment timestamp — use provided date or default to now
    const paymentTimestamp = paid_date ? new Date(`${paid_date}T12:00:00+06:00`) : new Date();

    if (!invoice_id) throw new Error('Invoice ID is required for custom income collection');

    const invoice = await Invoice.findOne({
      where: { id: invoice_id, branch_id: req.branchId },
      include: [{ model: IncomeCategory, required: false }, { model: Customer, required: false }],
      transaction: t
    });
    if (!invoice) throw new Error('Invoice not found');

    const paymentAmount = Number(amount || 0);
    if (!paymentAmount || Number.isNaN(paymentAmount) || paymentAmount <= 0) {
      throw new Error('Valid payment amount is required');
    }

    // 1. Resolve Debit Account (Cash / Bank / Bkash / Nagad)
    const isUttara = req.branchId !== 1;
    let debitAccount = null;

    if (account_id) {
      debitAccount = await Account.findOne({ where: { id: account_id, branch_id: req.branchId }, transaction: t });
      if (!debitAccount) throw new Error('Selected asset account not found');
    } else {
      const cashCode = isUttara ? '1000-U' : '1000';
      const bankCode = isUttara ? '1010-U' : '1010';
      debitAccount = await Account.findOne({ where: { code: method === 'cash' ? cashCode : bankCode, branch_id: req.branchId }, transaction: t });
      if (!debitAccount) {
        debitAccount = await Account.create({
          code: method === 'cash' ? cashCode : bankCode,
          name: method === 'cash' ? (isUttara ? 'Cash in Hand - Uttara' : 'Cash in Hand') : (isUttara ? 'Cash at Bank - Uttara' : 'Cash at Bank'),
          type: 'asset', branch_id: req.branchId, balance: 0
        }, { transaction: t });
      }
    }

    // 2. Resolve Credit Account (Revenue)
    const revenueCode = isUttara ? '4010-U' : '4010'; // 4010 is for Custom Income, 4000 is for Tuition
    let creditAccount = await Account.findOne({ where: { code: revenueCode, branch_id: req.branchId }, transaction: t });
    if (!creditAccount) {
      creditAccount = await Account.create({
        code: revenueCode, name: isUttara ? 'Custom Income Revenue - Uttara' : 'Custom Income Revenue',
        type: 'revenue', branch_id: req.branchId, balance: 0
      }, { transaction: t });
    }

    if (!debitAccount || !creditAccount) throw new Error('Financial accounts not configured properly');

    // 3. Create Transaction Record
    const receiptNo = `MR-CUST-${Date.now()}`;
    const txn = await Transaction.create({
      branch_id: req.branchId,
      enrollment_id: null,
      invoice_id: invoice.id,
      receipt_no: receiptNo,
      amount: paymentAmount,
      method,
      transaction_ref,
      source: 'manual',
      account_id: debitAccount.id,
      recorded_by: req.user.id,
      status: 'success',
      paid_at: paymentTimestamp
    }, { transaction: t });

    // 4. Update Invoice paid amount & status
    const newPaid = Number(invoice.paid || 0) + paymentAmount;
    await invoice.update({
      paid: newPaid,
      status: newPaid >= Number(invoice.amount) ? 'paid' : 'partial'
    }, { transaction: t });

    // 5. Double-Entry Journal
    const categoryName = invoice.IncomeCategory?.name || 'Custom Income';
    const customerName = invoice.Customer?.name || invoice.customer_name || 'Customer';

    const entry = await JournalEntry.create({
      branch_id: req.branchId,
      ref_no: receiptNo,
      description: `Custom Income: ${categoryName} - ${customerName}`,
      date: paymentTimestamp,
      posted_by: req.user.id
    }, { transaction: t });

    await JournalLine.bulkCreate([
      { journal_entry_id: entry.id, account_id: debitAccount.id, debit: paymentAmount, credit: 0, notes: notes || `Custom Income - ${categoryName}` },
      { journal_entry_id: entry.id, account_id: creditAccount.id, debit: 0, credit: paymentAmount, notes: `Revenue: ${categoryName}` }
    ], { transaction: t });

    await t.commit();
    res.status(201).json({ message: 'Custom income collected successfully', transaction: txn });
  } catch (error) {
    await t.rollback();
    console.error('[CollectCustomIncome Error]:', error);
    res.status(500).json({ error: error.message });
  }
};

// ─── Reject Pending Invoice ────────────────────────────────────────────────────
exports.rejectPendingInvoice = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { invoice_id, rejection_note } = req.body;

    if (!invoice_id) throw new Error('Invoice is required');
    if (!rejection_note || !String(rejection_note).trim()) throw new Error('Rejection note is required');

    const invoice = await Invoice.findOne({
      where: {
        id: invoice_id,
        branch_id: req.branchId,
        status: { [Op.in]: ['pending', 'partial', 'overdue'] }
      },
      include: [
        { model: Student, include: [User], required: false },
        { model: Enrollment, include: [{ model: Student, include: [User], required: false }], required: false }
      ],
      transaction: t
    });

    if (!invoice) throw new Error('Pending invoice not found');

    const studentName = invoice.Student?.User?.name || invoice.Enrollment?.Student?.User?.name || 'Unknown Student';
    const noteBlock = `[Fee Rejected ${new Date().toISOString()} by ${req.user?.name || `User ${req.user?.id || ''}`}] ${String(rejection_note).trim()} | Student: ${studentName}`;
    const nextNotes = invoice.notes ? `${invoice.notes}\n${noteBlock}` : noteBlock;

    const enrollment = invoice.Enrollment || (invoice.enrollment_id ? await Enrollment.findOne({ where: { id: invoice.enrollment_id, branch_id: req.branchId }, transaction: t }) : null);
    const student = invoice.Student || invoice.Enrollment?.Student || (invoice.student_id ? await Student.findOne({ where: { id: invoice.student_id, branch_id: req.branchId }, transaction: t }) : null);
    const resolvedStudentId = student?.id || enrollment?.student_id || invoice.student_id || null;

    if (enrollment) {
      await enrollment.update({ status: 'cancelled' }, { transaction: t });
    }

    if (student && enrollment?.batch_id && Number(student.batch_id || 0) === Number(enrollment.batch_id || 0)) {
      await student.update({ batch_id: null }, { transaction: t });
    }

    if (enrollment?.batch_id) {
      const batch = await Batch.findOne({ where: { id: enrollment.batch_id, branch_id: req.branchId }, transaction: t });
      if (batch && Number(batch.enrolled || 0) > 0) {
        await batch.decrement('enrolled', { by: 1, transaction: t });
      }
    }

    await invoice.update({
      status: 'rejected',
      student_id: resolvedStudentId,
      notes: nextNotes
    }, { transaction: t });

    const leadIdMatch = nextNotes.match(/CRM Lead ID:\s*(\d+)/);
    const opportunityIdMatch = nextNotes.match(/Opportunity ID:\s*(\d+)/);

    if (leadIdMatch) {
      const lead = await Lead.findOne({ where: { id: Number(leadIdMatch[1]), branch_id: req.branchId }, transaction: t });
      if (lead) {
        await lead.update({
          status: 'payment_rejected',
          last_activity_at: new Date(),
          notes: lead.notes ? `${lead.notes}\n${noteBlock}` : noteBlock
        }, { transaction: t });
      }
    }

    if (opportunityIdMatch) {
      const opportunity = await Opportunity.findOne({ where: { id: Number(opportunityIdMatch[1]), branch_id: req.branchId }, transaction: t });
      if (opportunity) {
        await opportunity.update({
          stage: 'lost',
          closed_at: new Date(),
          probability: 0,
          lost_reason: `Payment rejected: ${String(rejection_note).trim()}`
        }, { transaction: t });
      }
    }

    await t.commit();
    res.json({ message: 'Pending fee rejected and noted.', invoice });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ error: error.message });
  }
};
