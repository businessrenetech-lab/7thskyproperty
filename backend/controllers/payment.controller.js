const Transaction = require('../models/Transaction');
const Student = require('../models/Student');
const User = require('../models/User');
const Lead = require('../models/Lead');
const Contact = require('../models/Contact');
const Enrollment = require('../models/Enrollment');
const Invoice = require('../models/Invoice');
const Course = require('../models/Course');
const Batch = require('../models/Batch');
const Branch = require('../models/Branch');
const SystemSetting = require('../models/SystemSetting');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const fbCapi = require('../services/facebookCapi.service');
const adminNotify = require('../services/adminNotification.service');
const { sendEnrollmentConfirmationEmail } = require('../services/communication.service');
const sequelize = require('../config/db.config');
const { createInvoiceWithGeneratedNo } = require('../utils/invoiceNumber');

const DEFAULT_BKASH_MERCHANT_NO = '01913-373581';

const getBkashMerchantNo = async () => {
  const setting = await SystemSetting.findOne({ where: { setting_key: 'BKASH_MERCHANT_NO' } }).catch(() => null);
  return setting?.setting_value || process.env.BKASH_MERCHANT_NO || DEFAULT_BKASH_MERCHANT_NO;
};

const getPaymentConfig = async (req, res) => {
  try {
    const bkashMerchantNo = await getBkashMerchantNo();
    res.status(200).json({ bkash_merchant_no: bkashMerchantNo });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load payment configuration' });
  }
};

const pickNoteValue = (notes, label) => {
  const match = String(notes || '').match(new RegExp(`${label}:\\s*([^\\r\\n]+)`, 'i'));
  return match ? match[1].trim() : '';
};

const parseCheckoutMetadata = (lead) => {
  const notes = lead?.notes || '';
  return {
    method: pickNoteValue(notes, 'Payment Method Initiated') || 'card_brac',
    bkash_merchant_no: pickNoteValue(notes, 'bKash Merchant No'),
    payer_bkash_number: pickNoteValue(notes, 'Student bKash Number'),
    bkash_transaction_id: pickNoteValue(notes, 'bKash Transaction ID'),
  };
};

const buildCheckoutNotes = ({ method, bkashMerchantNo, payerBkashNumber, bkashTransactionId }) => {
  const lines = [`Payment Method Initiated: ${method}`];
  if (method === 'bkash_manual') {
    lines.push(`bKash Merchant No: ${bkashMerchantNo}`);
    lines.push(`Student bKash Number: ${payerBkashNumber}`);
    lines.push(`bKash Transaction ID: ${bkashTransactionId}`);
  }
  return lines.join('\n');
};

const normalizeCheckoutMethod = (value) => {
  const method = String(value || 'pay_at_branch').trim().toLowerCase();
  if (['bkash', 'bkash_manual', 'bkash_online', 'bkash_payment'].includes(method)) return 'bkash_manual';
  if (['cash', 'branch', 'pay_branch', 'pay_at_branch'].includes(method)) return 'pay_at_branch';
  return method;
};

const parsePaymentMethod = (lead) => {
  return normalizeCheckoutMethod(parseCheckoutMetadata(lead).method);
};

const initiateCheckout = async (req, res) => {
  try {
    const { name, email, phone, course_id, batch_id } = req.body;
    const method = normalizeCheckoutMethod(req.body.method);
    const payerBkashNumber = String(req.body.payer_bkash_number || '').trim();
    const bkashTransactionId = String(req.body.bkash_transaction_id || '').trim();
    const branch_id = parseInt(req.body.branch_id || req.body.branch, 10);

    if (!branch_id || !course_id || !batch_id || !name || !email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const branch = await Branch.findOne({ where: { id: branch_id, is_active: true } });
    if (!branch) {
      return res.status(404).json({ error: 'Selected branch is not available' });
    }

    const course = await Course.findOne({ where: { id: course_id, branch_id, status: 'active' } });
    const batch = await Batch.findOne({ where: { id: batch_id, branch_id, course_id } });

    if (!course || !batch) {
      return res.status(404).json({ error: 'Course or Batch not found for selected branch' });
    }

    if (!['pay_at_branch', 'bkash_manual'].includes(method)) {
      return res.status(501).json({ error: 'Online payment is not configured yet. Please choose Pay at Branch or bKash Payment.' });
    }

    if (method === 'bkash_manual' && (!payerBkashNumber || !bkashTransactionId)) {
      return res.status(400).json({ error: 'Student bKash number and transaction ID are required.' });
    }

    const payment_ref = `PAY-${uuidv4().substring(0, 8).toUpperCase()}`;
    const bkashMerchantNo = await getBkashMerchantNo();

    // Create a Lead to hold the session state
    const lead = await Lead.create({
      branch_id,
      name,
      email,
      phone,
      source: 'website',
      status: 'interested',
      priority: 'high',
      course_id,
      batch_id,
      payment_ref,
      deal_value: batch.fee || course.base_fee,
      notes: buildCheckoutNotes({ method, bkashMerchantNo, payerBkashNumber, bkashTransactionId }),
    });

    res.status(200).json({
      message: 'Checkout initiated',
      payment_ref,
      redirect_url: `/payment/success?ref=${payment_ref}`
    });

    adminNotify.sendLeadNotificationEmail({
      lead,
      branch,
      course,
      batch,
      type: 'Website Checkout',
    }).catch(err => console.error('[ADMIN_NOTIFY] Checkout lead email failed:', err.message));
  } catch (error) {
    console.error('Checkout Initiation Error:', error);
    res.status(500).json({ error: 'Failed to initiate checkout' });
  }
};

const paymentSuccess = async (req, res) => {
  let dbTransaction;
  try {
    const { payment_ref } = req.body;

    if (!payment_ref) return res.status(400).json({ error: 'Payment reference required' });

    const lead = await Lead.findOne({ where: { payment_ref } });
    if (!lead) return res.status(404).json({ error: 'Payment session not found' });

    if (lead.status === 'successful' || lead.status === 'fees_pending') {
      return res.status(200).json({ message: 'Payment already processed successfully' });
    }

    const branch_id = lead.branch_id || 1;
    
    const paymentMeta = parseCheckoutMetadata(lead);
    const method = normalizeCheckoutMethod(paymentMeta.method);
    const isPayAtBranch = method === 'pay_at_branch';
    const isManualBkash = method === 'bkash_manual';
    const isPendingManualPayment = isPayAtBranch || isManualBkash;

    if (!isPendingManualPayment) {
      return res.status(409).json({
        error: 'Online payment has not been verified by the payment provider.',
        status: lead.status
      });
    }

    dbTransaction = await sequelize.transaction();

    // 1. Create or find User
    let user = await User.findOne({ where: { email: lead.email }, transaction: dbTransaction });
    if (!user) {
      const temporaryPassword = require('crypto').randomBytes(24).toString('hex');
      const hashedPassword = await bcrypt.hash(temporaryPassword, 10);
      user = await User.create({
        name: lead.name,
        email: lead.email,
        password: hashedPassword,
        branch_id,
        role: 'student'
      }, { transaction: dbTransaction });
    }

    // 2. Create or find Student
    let student = await Student.findOne({ where: { user_id: user.id }, transaction: dbTransaction });
    if (!student) {
      student = await Student.create({
        user_id: user.id,
        branch_id,
        first_name: lead.name,
        mobile_no: lead.phone,
        enrollment_date: new Date(),
        status: 'active'
      }, { transaction: dbTransaction });
    }

    // 3. Update Lead
    await lead.update({ status: isPendingManualPayment ? 'fees_pending' : 'successful' }, { transaction: dbTransaction });

    // 4. Create Contact if not exists
    let contact = await Contact.findOne({ where: { email: lead.email, branch_id }, transaction: dbTransaction });
    if (!contact) {
      await Contact.create({
        branch_id,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        source: 'website'
      }, { transaction: dbTransaction });
    }

    // 5. Create Enrollment
    const enrollment = await Enrollment.create({
      branch_id,
      student_id: student.id,
      batch_id: lead.batch_id,
      total_fee: lead.deal_value,
      paid_amount: isPendingManualPayment ? 0 : lead.deal_value,
      status: isPendingManualPayment ? 'pending' : 'paid'
    }, { transaction: dbTransaction });

    // 6. Create Invoice
    const invoice = await createInvoiceWithGeneratedNo({
      branch_id,
      enrollment_id: enrollment.id,
      student_id: student.id,
      amount: lead.deal_value,
      paid: isPendingManualPayment ? 0 : lead.deal_value,
      status: isPendingManualPayment ? 'pending' : 'paid',
      due_date: new Date(),
      notes: buildCheckoutNotes({
        method,
        bkashMerchantNo: paymentMeta.bkash_merchant_no,
        payerBkashNumber: paymentMeta.payer_bkash_number,
        bkashTransactionId: paymentMeta.bkash_transaction_id,
      }),
    }, { transaction: dbTransaction });

    await dbTransaction.commit();
    dbTransaction = null;

    // 7. Transaction and Accounting (If actually paid online)
    let transaction = null;
    let payment_ref_to_use = payment_ref;

    if (!isPendingManualPayment) {
      const Account = require('../models/Account');
      const JournalEntry = require('../models/JournalEntry');
      const JournalLine = require('../models/JournalLine');

      // Map methods to specific accounts
      let accName = 'BRAC Bank';
      let accCode = '1012';
      let parsedMethod = 'card';

      if (method === 'bkash') { accName = 'bKash'; accCode = '1015'; parsedMethod = 'bkash'; }
      else if (method === 'nagad') { accName = 'Nagad'; accCode = '1016'; parsedMethod = 'nagad'; }

      let debitAccount = await Account.findOne({ where: { name: accName, branch_id } });
      if (!debitAccount) {
        debitAccount = await Account.create({ code: accCode, name: accName, type: 'asset', branch_id, balance: 0 });
      }

      let creditAccount = await Account.findOne({ where: { code: branch_id === 1 ? '4000' : '4000-U' } });
      if (!creditAccount) {
        creditAccount = await Account.create({ code: branch_id === 1 ? '4000' : '4000-U', name: 'Tuition Revenue', type: 'revenue', branch_id, balance: 0 });
      }

      transaction = await Transaction.create({
        branch_id,
        enrollment_id: enrollment.id,
        receipt_no: `REC-${Date.now()}`,
        amount: lead.deal_value,
        method: parsedMethod,
        transaction_ref: payment_ref,
        source: 'website',
        account_id: debitAccount.id,
        status: 'success',
        paid_at: new Date(),
        recorded_by: user.id
      });

      const jEntry = await JournalEntry.create({
        branch_id,
        ref_no: `JNL-WEB-${Date.now()}`,
        description: `Website Checkout - ${invoice.invoice_no}`,
        date: new Date(),
        posted_by: user.id
      });

      await JournalLine.bulkCreate([
        { journal_entry_id: jEntry.id, account_id: debitAccount.id, debit: lead.deal_value, credit: 0, notes: `Received via ${accName}` },
        { journal_entry_id: jEntry.id, account_id: creditAccount.id, debit: 0, credit: lead.deal_value, notes: `Course Fee (Online)` }
      ]);
    }

    // Fetch course and batch details for the confirmation response
    const course = lead.course_id ? await Course.findByPk(lead.course_id) : null;
    const batch = lead.batch_id ? await Batch.findByPk(lead.batch_id) : null;

    res.status(200).json({
      message: 'Payment processed and enrollment successful',
      student_id: student.id,
      enrollment_id: enrollment.id,
      transaction_id: transaction?.id || null,
      invoice_no: invoice.invoice_no,
      payment_ref: payment_ref_to_use,
        portal_access: isPendingManualPayment ? 'after_payment_verification' : 'immediate',
        order: {
        student_name: lead.name,
        email: lead.email,
        phone: lead.phone,
        course_name: course?.title || 'Course Enrollment',
        course_id: lead.course_id || null,
        course_category: course?.category || '',
        course_duration: course?.duration_weeks ? `${course.duration_weeks} weeks` : '',
        batch_name: batch?.name || '',
        batch_schedule: batch?.schedule || '',
        batch_start_date: batch?.start_date || null,
        amount: lead.deal_value,
        currency: 'BDT',
        payment_method: isPayAtBranch ? 'Pay at branch' : isManualBkash ? 'bKash manual' : transaction?.method,
        bkash_merchant_no: paymentMeta.bkash_merchant_no || null,
        payer_bkash_number: paymentMeta.payer_bkash_number || null,
        bkash_transaction_id: paymentMeta.bkash_transaction_id || null,
        paid_at: transaction?.paid_at || new Date(),
      }
    });

    if (!isPendingManualPayment) {
      // Fire Facebook CAPI 'Purchase' event (non-blocking)
      fbCapi.sendPurchaseEvent(req, {
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        courseName: course?.title || 'Course Enrollment',
        courseId: lead.course_id,
        value: lead.deal_value || 0,
        orderId: payment_ref,
        paymentMethod: transaction?.method,
        branchId: branch_id,
        externalId: student.id,
      }).catch(() => {});

      // Send branded enrollment confirmation email (non-blocking)
      sendEnrollmentConfirmationEmail({
        student_name: lead.name,
        email: lead.email,
        phone: lead.phone,
        course_name: course?.title || 'Course Enrollment',
        batch_name: batch?.name || batch?.code || '',
        batch_schedule: batch?.schedule || '',
        batch_start_date: batch?.start_date || null,
        amount: lead.deal_value,
        currency: 'BDT',
        payment_ref,
        paid_at: transaction?.paid_at,
        course_duration: course?.duration_weeks ? `${course.duration_weeks} weeks` : ''
      }).catch(err => console.error('[PAYMENT] Enrollment email failed:', err.message));
    }

    adminNotify.sendEnrollmentNotificationEmail({
      enrollment,
      student,
      user,
      batch,
      course,
      invoice,
      source: isPendingManualPayment ? 'website pending payment' : 'website paid checkout',
    }).catch(err => console.error('[ADMIN_NOTIFY] Website enrollment email failed:', err.message));
  } catch (error) {
    if (dbTransaction) await dbTransaction.rollback().catch(() => {});
    console.error('Payment Success Processing Error:', error);
    res.status(500).json({ error: 'Failed to process payment success' });
  }
};

const paymentFail = async (req, res) => {
  res.status(200).json({ message: 'Payment failed' });
};

const paymentCancel = async (req, res) => {
  res.status(200).json({ message: 'Payment cancelled' });
};

const paymentStatus = async (req, res) => {
  try {
    const { reference } = req.params;
    const lead = await Lead.findOne({ where: { payment_ref: reference } });
    if (!lead) return res.status(404).json({ error: 'Session not found' });
    res.status(200).json({ status: lead.status });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check status' });
  }
};

const simulatePayment = async (req, res) => {
  try {
    const { method, amount } = req.body;
    const user = req.user;

    if (!amount || amount !== 2500) {
      return res.status(400).json({ error: 'Invalid payment amount. Premium plan costs 2500 BDT.' });
    }

    const validMethods = ['bkash', 'amarpay', 'sslcommerz', 'surjopay', 'card', 'bank_transfer', 'nagad'];
    if (!validMethods.includes(method?.toLowerCase())) {
      return res.status(400).json({ error: 'Invalid payment method.' });
    }

    const student = await Student.findOne({ where: { user_id: user.id } });
    if (!student) {
      return res.status(404).json({ error: 'Student record not found.' });
    }

    const startDate = new Date();
    const expiryDate = new Date();
    expiryDate.setDate(startDate.getDate() + 90);

    await student.update({
      plan_type: 'premium',
      premium_start_date: startDate,
      premium_expiry_date: expiryDate,
      active_devices: []
    });

    let parsedMethod = method.toLowerCase();
    if (parsedMethod === 'amarpay' || parsedMethod === 'sslcommerz' || parsedMethod === 'surjopay') {
      parsedMethod = 'card';
    }

    const transaction = await Transaction.create({
      branch_id: student.branch_id,
      amount: 2500,
      method: parsedMethod,
      transaction_ref: `SIM-${uuidv4().substring(0, 8).toUpperCase()}`,
      source: 'premium_plan',
      status: 'success',
      paid_at: new Date(),
      recorded_by: user.id
    });

    res.status(200).json({
      message: 'Payment successful. Upgraded to Premium Plan.',
      plan_type: 'premium',
      premium_expiry_date: expiryDate,
      transaction_id: transaction.id
    });
  } catch (error) {
    console.error('Payment Simulation Error:', error);
    res.status(500).json({ error: 'Payment processing failed' });
  }
};

module.exports = {
  getPaymentConfig,
  initiateCheckout,
  paymentSuccess,
  paymentFail,
  paymentCancel,
  paymentStatus,
  simulatePayment
};
