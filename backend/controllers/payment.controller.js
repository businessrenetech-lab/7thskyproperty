const Transaction = require('../models/Transaction');
const Student = require('../models/Student');
const User = require('../models/User');
const Lead = require('../models/Lead');
const Contact = require('../models/Contact');
const Enrollment = require('../models/Enrollment');
const Invoice = require('../models/Invoice');
const Course = require('../models/Course');
const Batch = require('../models/Batch');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const fbCapi = require('../services/facebookCapi.service');
const { sendEnrollmentConfirmationEmail } = require('../services/communication.service');

const initiateCheckout = async (req, res) => {
  try {
    const { name, email, phone, course_id, batch_id, method } = req.body;

    if (!course_id || !batch_id || !name || !email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const course = await Course.findByPk(course_id);
    const batch = await Batch.findByPk(batch_id);

    if (!course || !batch) {
      return res.status(404).json({ error: 'Course or Batch not found' });
    }

    const payment_ref = `PAY-${uuidv4().substring(0, 8).toUpperCase()}`;

    // Create a Lead to hold the session state
    await Lead.create({
      branch_id: 1,
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
      notes: `Payment Method Initiated: ${method}`,
    });

    res.status(200).json({
      message: 'Checkout initiated',
      payment_ref,
      redirect_url: `/payment/success?ref=${payment_ref}`
    });
  } catch (error) {
    console.error('Checkout Initiation Error:', error);
    res.status(500).json({ error: 'Failed to initiate checkout' });
  }
};

const paymentSuccess = async (req, res) => {
  try {
    const { payment_ref } = req.body;

    if (!payment_ref) return res.status(400).json({ error: 'Payment reference required' });

    const lead = await Lead.findOne({ where: { payment_ref } });
    if (!lead) return res.status(404).json({ error: 'Payment session not found' });

    if (lead.status === 'successful' || lead.status === 'fees_pending') {
      return res.status(200).json({ message: 'Payment already processed successfully' });
    }

    const branch_id = lead.branch_id || 1;
    
    // Parse method from lead notes
    let method = 'card_brac';
    if (lead.notes && lead.notes.includes('Payment Method Initiated:')) {
      method = lead.notes.replace('Payment Method Initiated:', '').trim();
    }
    const isPayAtBranch = method === 'pay_at_branch';

    // 1. Create or find User
    let user = await User.findOne({ where: { email: lead.email } });
    if (!user) {
      const hashedPassword = await bcrypt.hash('Abc@1234', 10);
      user = await User.create({
        name: lead.name,
        email: lead.email,
        password: hashedPassword,
        branch_id,
        role: 'student'
      });
    }

    // 2. Create or find Student
    let student = await Student.findOne({ where: { user_id: user.id } });
    if (!student) {
      student = await Student.create({
        user_id: user.id,
        branch_id,
        first_name: lead.name,
        mobile_no: lead.phone,
        enrollment_date: new Date(),
        status: 'active'
      });
    }

    // 3. Update Lead
    await lead.update({ status: isPayAtBranch ? 'fees_pending' : 'successful' });

    // 4. Create Contact if not exists
    let contact = await Contact.findOne({ where: { email: lead.email } });
    if (!contact) {
      await Contact.create({
        branch_id,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        source: 'website'
      });
    }

    // 5. Create Enrollment
    const enrollment = await Enrollment.create({
      branch_id,
      student_id: student.id,
      batch_id: lead.batch_id,
      total_fee: lead.deal_value,
      paid_amount: isPayAtBranch ? 0 : lead.deal_value,
      status: isPayAtBranch ? 'pending' : 'paid'
    });

    // 6. Create Invoice
    const invoice = await Invoice.create({
      branch_id,
      invoice_no: `INV-${Date.now()}`,
      enrollment_id: enrollment.id,
      student_id: student.id,
      amount: lead.deal_value,
      paid: isPayAtBranch ? 0 : lead.deal_value,
      status: isPayAtBranch ? 'pending' : 'paid',
      due_date: new Date(),
    });

    // 7. Transaction and Accounting (If actually paid online)
    let transaction = null;
    let payment_ref_to_use = payment_ref;

    if (!isPayAtBranch) {
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
      order: {
        student_name: lead.name,
        email: lead.email,
        phone: lead.phone,
        course_name: course?.title || 'Course Enrollment',
        course_category: course?.category || '',
        course_duration: course?.duration_weeks ? `${course.duration_weeks} weeks` : '',
        batch_name: batch?.name || '',
        batch_schedule: batch?.schedule || '',
        batch_start_date: batch?.start_date || null,
        amount: lead.deal_value,
        currency: 'BDT',
        payment_method: isPayAtBranch ? 'Pay at branch' : transaction?.method,
        paid_at: transaction?.paid_at || new Date(),
      }
    });

    if (!isPayAtBranch) {
      // Fire Facebook CAPI 'Purchase' event (non-blocking)
      fbCapi.sendEvent(
        'Purchase',
        {
          em: lead.email,
          ph: lead.phone,
          fn: lead.name?.split(' ')[0],
          ln: lead.name?.split(' ').slice(1).join(' '),
          client_ip_address: req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
          client_user_agent: req.headers['user-agent'],
          fbc: req.headers['x-fbc'] || null,
          fbp: req.headers['x-fbp'] || null,
          external_id: String(student.id),
        },
        {
          currency: 'BDT',
          value: lead.deal_value || 0,
          content_name: course?.title || 'Course Enrollment',
          content_type: 'product',
          content_ids: [String(lead.course_id)],
          num_items: 1,
        },
        req.headers['referer'] || req.headers['origin'] || 'https://languageacademy.com.bd/payment/success',
        req.headers['x-event-id'] || null
      ).catch(() => {});

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
  } catch (error) {
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
  initiateCheckout,
  paymentSuccess,
  paymentFail,
  paymentCancel,
  paymentStatus,
  simulatePayment
};
