const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const cookieParser = require('cookie-parser');
require('dotenv').config();

// Enforce globally at the system process level
process.env.TZ = 'Asia/Dhaka';

const sequelize = require('./config/db.config');
const { getCorsOptions } = require('./config/cors.config');
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

// M4 Fix: Request logging — only log API calls, skip static files for performance
if (process.env.NODE_ENV !== 'test') {
  app.use('/api', morgan(process.env.NODE_ENV === 'production' ? 'short' : 'dev'));
}

// CORS
app.use(cors(getCorsOptions()));
app.use(cookieParser());

// M1 Fix: Body size limit (prevents JSON bomb DoS)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// M2 Fix: Uploads — lightweight token check (no DB query per file)
// Only verify JWT signature, don't fetch user from DB for static files
const jwt = require('jsonwebtoken');
app.use('/uploads/courses', express.static(path.join(__dirname, 'uploads', 'courses'), {
  maxAge: '1d',
  etag: true,
  lastModified: true,
}));

app.use('/uploads/branches', express.static(path.join(__dirname, 'uploads', 'branches'), {
  maxAge: '1d',
  etag: true,
  lastModified: true,
}));

app.use('/uploads/resources', express.static(path.join(__dirname, 'uploads', 'resources'), {
  maxAge: '1d',
  etag: true,
  lastModified: true,
}));

app.use('/uploads/blogs', express.static(path.join(__dirname, 'uploads', 'blogs'), {
  maxAge: '1d',
  etag: true,
  lastModified: true,
}));

app.use('/uploads', (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '') 
    || req.query.token; // Allow ?token= for image tags
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}, express.static(path.join(__dirname, 'uploads'), {
  maxAge: '1d',           // Cache files for 1 day
  etag: true,             // Enable ETag for conditional requests
  lastModified: true,
}));

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
const BlogPost = require('./models/BlogPost');
const Resource = require('./models/Resource');
const BlogResource = require('./models/BlogResource');

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
const Branch = require('./models/Branch');
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
const StaffPayRule = require('./models/StaffPayRule');
const TeacherSession = require('./models/TeacherSession');
const PayrollDeduction = require('./models/PayrollDeduction');
const PayrollBonus = require('./models/PayrollBonus');
const RbacConfig = require('./models/RbacConfig');
const SystemSetting = require('./models/SystemSetting');
const IncomeCategory = require('./models/IncomeCategory');
const Customer = require('./models/Customer');
const automationService = require('./services/automation.service');
const adminNotify = require('./services/adminNotification.service');

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

const runMonthlyReportSweep = async () => {
  const result = await adminNotify.runMonthlyReportSweep();
  if (result?.sent) {
    console.log(`[ADMIN_NOTIFY] Monthly report sent for ${result.period}`);
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
      Branch, User, ExpenseCategory, Expense, Lead, Contact, Opportunity, Activity,
      CampaignTemplate, Student, PteTask, Course, Batch, BlogPost, Resource, BlogResource, Account, BankAccount,
      BankAccountLedgerMap, Invoice, Enrollment, Transaction, JournalEntry,
      JournalLine, ReconciliationSession, ReconciliationLine,
      ReconciliationMatch, ReconciliationEvent, LiquidityMovement,
      StaffAttendance, LeaveType, LeaveRequest, LeaveBalance,
      JobPosting, Applicant, StaffDocument, PerformanceReview,
      Shift, StaffSchedule, StaffProfile, StaffPayRule, TeacherSession, PayrollDeduction, PayrollBonus, RbacConfig, SystemSetting,
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
      runMonthlyReportSweep().catch(() => {});
      setInterval(() => {
        runBirthdaySweep().catch(() => {});
        runMonthlyReportSweep().catch(() => {});
      }, 60 * 60 * 1000);
    });
  })
  .catch(err => {
    console.error('Database connection error:', err);
    process.exit(1);
  });
