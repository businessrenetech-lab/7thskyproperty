const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

// Enforce globally at the system process level
process.env.TZ = 'Asia/Dhaka';

const sequelize = require('./config/db.config');
const { getCorsOptions } = require('./config/cors.config');
const { authMiddleware } = require('./middleware/auth.middleware');
const app = express();

// ─── SECURITY MIDDLEWARE ────────────────────────────────────────────────────
// C1 Fix: Security headers (CSP, X-Frame-Options, HSTS, nosniff, etc.)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// M4 Fix: Request logging for audit trail
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// CORS
app.use(cors(getCorsOptions()));

// M1 Fix: Body size limit (prevents JSON bomb DoS)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// M2 Fix: Auth-gated uploads (only authenticated users can access uploaded files)
app.use('/uploads', authMiddleware, express.static(path.join(__dirname, 'uploads')));

// Health check endpoint (no auth, no helmet interference)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/crm', require('./routes/crm.routes'));
app.use('/api/lms', require('./routes/lms.routes'));
app.use('/api/branches', require('./routes/branch.routes'));
app.use('/api/accounting', require('./routes/accounting.routes'));
app.use('/api/reconciliation', require('./routes/reconciliation.routes'));
app.use('/api/pte', require('./routes/pte.routes'));
app.use('/api/students', require('./routes/student.routes'));
app.use('/api/student', require('./routes/student.routes'));
app.use('/api/attendance', require('./routes/attendance.routes'));
app.use('/api/enrollments', require('./routes/enrollment.routes'));
app.use('/api/pos', require('./routes/pos.routes'));
app.use('/api/finance', require('./routes/finance.routes'));
app.use('/api/erp', require('./routes/erp.routes'));
app.use('/api/schedule', require('./routes/schedule.routes'));
app.use('/api/notifications', require('./routes/notification.routes'));
app.use('/api/dashboard', require('./routes/dashboard.routes'));
app.use('/api/payroll', require('./routes/payroll.routes'));
app.use('/api/materials', require('./routes/material.routes'));
app.use('/api/assets', require('./routes/asset.routes'));
app.use('/api/reports', require('./routes/report.routes'));
app.use('/api/automation', require('./routes/automation.routes'));

// New Finance Routes
app.use('/api/invoices', require('./routes/invoice.routes'));
app.use('/api/expenses', require('./routes/expense.routes'));
app.use('/api/budget', require('./routes/budget.routes'));

// Website Public & Payment Routes
app.use('/api/public', require('./routes/public.routes'));
app.use('/api/payment', require('./routes/payment.routes'));
app.use('/api/website', require('./routes/website.routes'));
app.use('/api/hrm', require('./routes/hrm.routes'));
app.use('/api/rbac', require('./routes/rbac.routes'));
app.use('/api/settings', require('./routes/settings.routes'));

// Default Route
app.get('/', (req, res) => {
  res.json({ message: 'Language Academy API is running' });
});



// H1 Fix: Global error handler — use centralized middleware
const { errorHandler } = require('./middleware/errorHandler');
app.use(errorHandler);

// Ensure critical tables exist
const ExpenseCategory = require('./models/ExpenseCategory');
const Expense = require('./models/Expense');
const Contact = require('./models/Contact');
const Opportunity = require('./models/Opportunity');
const Activity = require('./models/Activity');
const CampaignTemplate = require('./models/CampaignTemplate');
const Lead = require('./models/Lead');
const Student = require('./models/Student');
const PteTask = require('./models/PteTask');
const Course = require('./models/Course');
const Batch = require('./models/Batch');

// Set up Course↔Batch association (avoiding circular dependency in model files)
Course.hasMany(Batch, { foreignKey: 'course_id' });

// Sync Database
const PORT = process.env.PORT || 5000;

// Import reconciliation models for sync
const ReconciliationSession = require('./models/ReconciliationSession');
const ReconciliationLine = require('./models/ReconciliationLine');
const ReconciliationMatch = require('./models/ReconciliationMatch');
const ReconciliationEvent = require('./models/ReconciliationEvent');
const LiquidityMovement = require('./models/LiquidityMovement');

// Import accounting & pos models for sync
const Transaction = require('./models/Transaction');
const JournalEntry = require('./models/JournalEntry');
const JournalLine = require('./models/JournalLine');
const Account = require('./models/Account');
const BankAccount = require('./models/BankAccount');
const BankAccountLedgerMap = require('./models/BankAccountLedgerMap');
const Invoice = require('./models/Invoice');
const Enrollment = require('./models/Enrollment');
const User = require('./models/User');

// HRM Models
const StaffAttendance = require('./models/StaffAttendance');
const LeaveType = require('./models/LeaveType');
const LeaveRequest = require('./models/LeaveRequest');
const LeaveBalance = require('./models/LeaveBalance');
const JobPosting = require('./models/JobPosting');
const Applicant = require('./models/Applicant');
const StaffDocument = require('./models/StaffDocument');
const PerformanceReview = require('./models/PerformanceReview');
const Shift = require('./models/Shift');
const StaffSchedule = require('./models/StaffSchedule');
const StaffProfile = require('./models/StaffProfile');
const RbacConfig = require('./models/RbacConfig');
const SystemSetting = require('./models/SystemSetting');
const IncomeCategory = require('./models/IncomeCategory');
const Customer = require('./models/Customer');
const automationService = require('./services/automation.service');

let birthdaySweepRunning = false;

const runBirthdaySweep = async () => {
  if (birthdaySweepRunning) return;

  birthdaySweepRunning = true;
  try {
    const result = await automationService.processBirthdayReminders();
    if (result.sent || result.processed) {
      console.log(`[AUTOMATION] Birthday reminder sweep completed. Processed: ${result.processed}, Sent: ${result.sent}`);
    }
  } catch (error) {
    console.error('[AUTOMATION] Birthday reminder sweep failed:', error.message);
  } finally {
    birthdaySweepRunning = false;
  }
};

// ─── MODEL ASSOCIATIONS (Centralized to avoid circularity) ──────────────────
ReconciliationSession.hasMany(ReconciliationLine, { foreignKey: 'session_id' });
ReconciliationSession.hasMany(ReconciliationEvent, { foreignKey: 'session_id' });

ReconciliationLine.belongsTo(ReconciliationSession, { foreignKey: 'session_id' });
ReconciliationLine.belongsTo(BankAccount, { foreignKey: 'bank_account_id' });
ReconciliationLine.belongsTo(Account, { foreignKey: 'account_id' });

ReconciliationEvent.belongsTo(ReconciliationSession, { foreignKey: 'session_id' });

// Accounting & CRM
Student.belongsTo(User, { foreignKey: 'user_id' });
User.hasOne(Student, { foreignKey: 'user_id' });

Enrollment.belongsTo(Student, { foreignKey: 'student_id' });
Enrollment.belongsTo(Batch, { foreignKey: 'batch_id' });
Transaction.belongsTo(Enrollment, { foreignKey: 'enrollment_id' });
Invoice.belongsTo(Student, { foreignKey: 'student_id' });
Invoice.belongsTo(Enrollment, { foreignKey: 'enrollment_id' });

JournalEntry.hasMany(JournalLine, { foreignKey: 'journal_entry_id' });
JournalLine.belongsTo(JournalEntry, { foreignKey: 'journal_entry_id' });
JournalLine.belongsTo(Account, { foreignKey: 'account_id' });
// ─── END ASSOCIATIONS ───────────────────────────────────────────────────────

sequelize.authenticate()
  .then(() => {
    console.log('Database connected...');
    // Sync tables — errors are caught per-table so one failure doesn't block startup
    const models = [
      User, ExpenseCategory, Expense, Lead, Contact, Opportunity, Activity,
      CampaignTemplate, Student, PteTask, Course, Batch, Account, BankAccount,
      BankAccountLedgerMap, Invoice, Enrollment, Transaction, JournalEntry,
      JournalLine, ReconciliationSession, ReconciliationLine,
      ReconciliationMatch, ReconciliationEvent, LiquidityMovement,
      StaffAttendance, LeaveType, LeaveRequest, LeaveBalance,
      JobPosting, Applicant, StaffDocument, PerformanceReview,
      Shift, StaffSchedule, StaffProfile, RbacConfig, SystemSetting,
      IncomeCategory, Customer,
    ];
    // L2 Fix: Block ALTER sync in production — prevents accidental schema changes
    const isProduction = process.env.NODE_ENV === 'production';
    const wantsAlter = process.env.DB_SYNC_ALTER === 'true';
    if (isProduction && wantsAlter) {
      console.warn('⚠ DB_SYNC_ALTER=true is BLOCKED in production. Set NODE_ENV=development to enable.');
    }
    const syncOptions = (!isProduction && wantsAlter) ? { alter: true } : {};
    return Promise.allSettled(
      models.map(m => m.sync(syncOptions).catch(err => {
        console.warn(`  ⚠ Sync warning for ${m.name}: ${err.message.substring(0, 80)}`);
      }))
    );
  })
  .then(() => {
    // Initialize required defaults like Settings
    const settingsController = require('./controllers/settings.controller');
    return settingsController.initializeDefaults().catch(err => console.error('Error initializing settings:', err));
  })
  .then(() => automationService.ensureDefaultBirthdayRule())
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      runBirthdaySweep().catch(() => {});
      setInterval(() => {
        runBirthdaySweep().catch(() => {});
      }, 60 * 60 * 1000);
    });
  })
  .catch(err => {
    console.error('Database connection error:', err);
    process.exit(1);
  });
