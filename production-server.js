/**
 * Language Academy — Monolith Production Server
 * Single process · Single port · Hostinger-ready
 */

const fs = require('fs');
const path = require('path');

// ─── DEBUG LOG — writes to file + console so we can always see what happened ─
const LOG_FILE = path.join(__dirname, 'startup-debug.log');
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch (e) { /* ignore */ }
}

// Clear previous log
try { fs.writeFileSync(LOG_FILE, ''); } catch (e) { /* ignore */ }

log('═══ PRODUCTION SERVER STARTING ═══');
log(`__dirname: ${__dirname}`);
log(`cwd: ${process.cwd()}`);
log(`Node version: ${process.version}`);
log(`Platform: ${process.platform} ${process.arch}`);
log(`ENV PORT (before dotenv): ${process.env.PORT || '(not set)'}`);
log(`ENV NODE_ENV: ${process.env.NODE_ENV || '(not set)'}`);

// ─── Capture Hostinger's PORT before dotenv can override it ─────────────────
const HOSTINGER_PORT = process.env.PORT;

// ─── Global error handlers ──────────────────────────────────────────────────
process.on('uncaughtException', (err) => {
  log(`UNCAUGHT EXCEPTION: ${err.stack || err.message || err}`);
});
process.on('unhandledRejection', (err) => {
  log(`UNHANDLED REJECTION: ${err && err.stack ? err.stack : err}`);
});

// ─── Step 1: Load dotenv ────────────────────────────────────────────────────
log('STEP 1: Loading dotenv...');
const envPath = path.join(__dirname, 'backend', '.env');
const envExists = fs.existsSync(envPath);
log(`  backend/.env path: ${envPath}`);
log(`  backend/.env EXISTS: ${envExists}`);
if (envExists) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  log(`  backend/.env has ${envContent.split('\n').length} lines`);
  // Log key names only (not values for security)
  const keys = envContent.split('\n').filter(l => l.includes('=')).map(l => l.split('=')[0].trim());
  log(`  ENV keys found: ${keys.join(', ')}`);
}
require('dotenv').config({ path: envPath });
process.env.TZ = 'Asia/Dhaka';

const PORT = HOSTINGER_PORT || process.env.PORT || 3000;
process.env.PORT = String(PORT);
if (!process.env.INTERNAL_API_URL) {
  process.env.INTERNAL_API_URL = `http://127.0.0.1:${PORT}`;
}
log(`  Final PORT: ${PORT}`);
log(`  INTERNAL_API_URL: ${process.env.INTERNAL_API_URL}`);
log(`  DB_HOST: ${process.env.DB_HOST || '(NOT SET!)'}`);
log(`  DB_NAME: ${process.env.DB_NAME || '(NOT SET!)'}`);
log('STEP 1: Done');

// ─── Step 2: Load express ───────────────────────────────────────────────────
log('STEP 2: Loading express...');
let express;
try {
  express = require('express');
  log(`  Express version: ${require('express/package.json').version}`);
} catch (err) {
  log(`  FATAL: Cannot load express: ${err.message}`);
  process.exit(1);
}
log('STEP 2: Done');

// ─── Step 3: Load Next.js ───────────────────────────────────────────────────
log('STEP 3: Loading Next.js...');
let next, nextApp, nextHandle;
const websiteDir = path.join(__dirname, 'website');
const nextDir = path.join(websiteDir, '.next');
log(`  website dir: ${websiteDir}`);
log(`  website dir exists: ${fs.existsSync(websiteDir)}`);
log(`  .next dir exists: ${fs.existsSync(nextDir)}`);
log(`  .next/BUILD_ID exists: ${fs.existsSync(path.join(nextDir, 'BUILD_ID'))}`);
try {
  next = require(path.join(websiteDir, 'node_modules', 'next'));
  nextApp = next({
    dev: false,
    dir: websiteDir,
    conf: { skipTrailingSlashRedirect: true },
  });
  nextHandle = nextApp.getRequestHandler();
  log('  Next.js app created successfully');
} catch (err) {
  log(`  FATAL: Cannot load/create Next.js: ${err.stack || err.message}`);
  process.exit(1);
}
log('STEP 3: Done');

// ─── Boot ───────────────────────────────────────────────────────────────────
async function start() {
  // Step 4: Prepare Next.js
  log('STEP 4: Preparing Next.js (this can take 10-30s)...');
  try {
    await nextApp.prepare();
    log('STEP 4: Done — Next.js ready');
  } catch (err) {
    log(`STEP 4 FAILED: Next.js prepare error: ${err.stack || err.message}`);
    process.exit(1);
  }

  // Step 5: Create Express app and mount routes
  log('STEP 5: Creating Express app and mounting routes...');
  const app = express();
  const compression = require('compression');
  const cors = require('cors');
  const cookieParser = require('cookie-parser');
  const { getCorsOptions } = require('./backend/config/cors.config');
  app.use(compression());
  app.use(cors(getCorsOptions()));
  app.use(cookieParser());
  app.use(express.json());

  // Health check endpoint (test before everything else)
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), port: PORT });
  });

  // Mount API routes one by one with try/catch
  const routes = [
    ['/api/auth', './backend/routes/auth.routes'],
    ['/api/crm', './backend/routes/crm.routes'],
    ['/api/lms', './backend/routes/lms.routes'],
    ['/api/branches', './backend/routes/branch.routes'],
    ['/api/accounting', './backend/routes/accounting.routes'],
    ['/api/reconciliation', './backend/routes/reconciliation.routes'],
    ['/api/pte', './backend/routes/pte.routes'],
    ['/api/students', './backend/routes/student.routes'],
    ['/api/student', './backend/routes/student.routes'],
    ['/api/attendance', './backend/routes/attendance.routes'],
    ['/api/enrollments', './backend/routes/enrollment.routes'],
    ['/api/pos', './backend/routes/pos.routes'],
    ['/api/finance', './backend/routes/finance.routes'],
    ['/api/erp', './backend/routes/erp.routes'],
    ['/api/schedule', './backend/routes/schedule.routes'],
    ['/api/notifications', './backend/routes/notification.routes'],
    ['/api/dashboard', './backend/routes/dashboard.routes'],
    ['/api/payroll', './backend/routes/payroll.routes'],
    ['/api/materials', './backend/routes/material.routes'],
    ['/api/assets', './backend/routes/asset.routes'],
    ['/api/reports', './backend/routes/report.routes'],
    ['/api/automation', './backend/routes/automation.routes'],
    ['/api/invoices', './backend/routes/invoice.routes'],
    ['/api/expenses', './backend/routes/expense.routes'],
    ['/api/budget', './backend/routes/budget.routes'],
    ['/api/public', './backend/routes/public.routes'],
    ['/api/payment', './backend/routes/payment.routes'],
    ['/api/website', './backend/routes/website.routes'],
    ['/api/hrm', './backend/routes/hrm.routes'],
    ['/api/rbac', './backend/routes/rbac.routes'],
    ['/api/settings', './backend/routes/settings.routes'],
  ];

  let routesFailed = 0;
  for (const [mountPath, routeFile] of routes) {
    try {
      app.use(mountPath, require(routeFile));
    } catch (err) {
      routesFailed++;
      log(`  ✘ Route ${mountPath} FAILED: ${err.message}`);
    }
  }
  log(`  Mounted ${routes.length - routesFailed}/${routes.length} API routes (${routesFailed} failed)`);

  // Static files
  const staticAssetCache = 'public, max-age=31536000, immutable';
  const publicImageCache = 'public, max-age=86400, stale-while-revalidate=604800';

  app.use('/uploads', express.static(path.join(__dirname, 'backend', 'uploads'), {
    setHeaders: (res, filePath) => {
      if (/\.(?:avif|webp|png|jpe?g|svg|ico)$/i.test(filePath)) {
        res.set('Cache-Control', publicImageCache);
      }
    },
  }));

  const websitePublicDir = path.join(__dirname, 'website', 'public');
  app.use(express.static(websitePublicDir, {
    index: false,
    setHeaders: (res, filePath) => {
      if (/\.(?:avif|webp|png|jpe?g|svg|ico)$/i.test(filePath)) {
        res.set('Cache-Control', publicImageCache);
      }
    },
  }));

  const sendMissingUploadFallback = (fallbackFile) => (req, res, next) => {
    const fallbackPath = path.join(websitePublicDir, fallbackFile);
    if (!fs.existsSync(fallbackPath)) return next();
    res.set('Cache-Control', publicImageCache);
    return res.sendFile(fallbackPath);
  };

  app.get('/uploads/blogs/{*splat}', sendMissingUploadFallback('blog_resources.webp'));
  app.get('/uploads/courses/{*splat}', sendMissingUploadFallback('pte_course.webp'));
  app.get('/uploads/branches/{*splat}', sendMissingUploadFallback('hero_banner.webp'));

  const sendSpaIndex = (indexFile) => (req, res) => {
    if (path.extname(req.path)) {
      return res.status(404).type('text/plain').send('Asset not found');
    }
    res.set('Cache-Control', 'no-store');
    res.sendFile(indexFile);
  };

  // ─── MIME types for static assets ─────────────────────────────
  const MIME_MAP = {
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.json': 'application/json',
    '.webp': 'image/webp',
    '.map': 'application/json',
  };

  // Admin Portal
  const adminDist = path.join(__dirname, 'admin-portal', 'dist');
  const adminIndex = path.join(adminDist, 'index.html');
  log(`  admin-portal/dist exists: ${fs.existsSync(adminDist)}`);
  log(`  admin-portal/dist/index.html exists: ${fs.existsSync(adminIndex)}`);

  // Explicit admin asset handler — guaranteed correct MIME types
  app.use('/admin/assets', (req, res, next) => {
    const assetPath = path.join(adminDist, 'assets', req.path.substring(1));
    const ext = path.extname(assetPath).toLowerCase();
    if (fs.existsSync(assetPath)) {
      const mime = MIME_MAP[ext] || 'application/octet-stream';
      res.set('Content-Type', mime);
      res.set('Cache-Control', staticAssetCache);
      return res.sendFile(assetPath);
    }
    return res.status(404).type('text/plain').send('Asset not found');
  });
  app.use('/admin', express.static(adminDist, { index: false }));
  app.get('/admin/{*splat}', sendSpaIndex(adminIndex));

  // Student Portal
  const studentDist = path.join(__dirname, 'student-portal', 'dist');
  const studentIndex = path.join(studentDist, 'index.html');
  log(`  student-portal/dist exists: ${fs.existsSync(studentDist)}`);
  log(`  student-portal/dist/index.html exists: ${fs.existsSync(studentIndex)}`);
  app.use('/student', express.static(studentDist, { index: false }));
  app.get('/student/{*splat}', sendSpaIndex(studentIndex));

  const portalMounts = [
    ['/teacher', 'teacher-portal'],
    ['/accounting', 'accounting-portal'],
    ['/hrm', 'hr-portal'],
    ['/brandmanager', 'crm-portal'],
  ];

  for (const [mountPath, dirName] of portalMounts) {
    const distDir = path.join(__dirname, dirName, 'dist');
    const indexFile = path.join(distDir, 'index.html');
    const hasBuild = fs.existsSync(distDir) && fs.existsSync(indexFile);
    log(`  ${dirName}/dist exists: ${fs.existsSync(distDir)}`);
    log(`  ${dirName}/dist/index.html exists: ${fs.existsSync(indexFile)}`);
    if (!hasBuild) continue;
    app.use(mountPath, express.static(distDir, { index: false }));
    app.get(`${mountPath}/{*splat}`, sendSpaIndex(indexFile));
  }

  // Next.js catch-all
  app.all('{*splat}', (req, res) => {
    return nextHandle(req, res);
  });

  log('STEP 5: Done — all routes mounted');

  // Step 6: Database
  log('STEP 6: Connecting to database...');
  try {
    const sequelize = require('./backend/config/db.config');

    const ExpenseCategory = require('./backend/models/ExpenseCategory');
    const Expense = require('./backend/models/Expense');
    const Contact = require('./backend/models/Contact');
    const Opportunity = require('./backend/models/Opportunity');
    const Activity = require('./backend/models/Activity');
    const CampaignTemplate = require('./backend/models/CampaignTemplate');
    const Lead = require('./backend/models/Lead');
    const Student = require('./backend/models/Student');
    const PteTask = require('./backend/models/PteTask');
    const Course = require('./backend/models/Course');
    const Batch = require('./backend/models/Batch');
    const Branch = require('./backend/models/Branch');
    const ReconciliationSession = require('./backend/models/ReconciliationSession');
    const ReconciliationLine = require('./backend/models/ReconciliationLine');
    const ReconciliationMatch = require('./backend/models/ReconciliationMatch');
    const ReconciliationEvent = require('./backend/models/ReconciliationEvent');
    const LiquidityMovement = require('./backend/models/LiquidityMovement');
    const Transaction = require('./backend/models/Transaction');
    const JournalEntry = require('./backend/models/JournalEntry');
    const JournalLine = require('./backend/models/JournalLine');
    const Account = require('./backend/models/Account');
    const BankAccount = require('./backend/models/BankAccount');
    const BankAccountLedgerMap = require('./backend/models/BankAccountLedgerMap');
    const Invoice = require('./backend/models/Invoice');
    const Enrollment = require('./backend/models/Enrollment');
    const User = require('./backend/models/User');
    const StaffAttendance = require('./backend/models/StaffAttendance');
    const LeaveType = require('./backend/models/LeaveType');
    const LeaveRequest = require('./backend/models/LeaveRequest');
    const LeaveBalance = require('./backend/models/LeaveBalance');
    const JobPosting = require('./backend/models/JobPosting');
    const Applicant = require('./backend/models/Applicant');
    const StaffDocument = require('./backend/models/StaffDocument');
    const PerformanceReview = require('./backend/models/PerformanceReview');
    const Shift = require('./backend/models/Shift');
    const StaffSchedule = require('./backend/models/StaffSchedule');
    const StaffProfile = require('./backend/models/StaffProfile');
    const StaffPayRule = require('./backend/models/StaffPayRule');
    const TeacherSession = require('./backend/models/TeacherSession');
    const PayrollDeduction = require('./backend/models/PayrollDeduction');
    const PayrollBonus = require('./backend/models/PayrollBonus');
    const RbacConfig = require('./backend/models/RbacConfig');
    const SystemSetting = require('./backend/models/SystemSetting');
    const IncomeCategory = require('./backend/models/IncomeCategory');
    const Customer = require('./backend/models/Customer');
    const BlogPost = require('./backend/models/BlogPost');
    const Resource = require('./backend/models/Resource');
    const BlogResource = require('./backend/models/BlogResource');

    log('  Models loaded, setting up associations...');

    Course.hasMany(Batch, { foreignKey: 'course_id' });
    ReconciliationSession.hasMany(ReconciliationLine, { foreignKey: 'session_id' });
    ReconciliationSession.hasMany(ReconciliationEvent, { foreignKey: 'session_id' });
    ReconciliationLine.belongsTo(ReconciliationSession, { foreignKey: 'session_id' });
    ReconciliationLine.belongsTo(BankAccount, { foreignKey: 'bank_account_id' });
    ReconciliationLine.belongsTo(Account, { foreignKey: 'account_id' });
    ReconciliationEvent.belongsTo(ReconciliationSession, { foreignKey: 'session_id' });
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

    log('  Associations set, authenticating DB...');
    await sequelize.authenticate();
    log('  ✓ Database authenticated');

    const models = [
      Branch, User, ExpenseCategory, Expense, Lead, Contact, Opportunity, Activity,
      CampaignTemplate, Student, PteTask, Course, Batch, Account, BankAccount,
      BankAccountLedgerMap, Invoice, Enrollment, Transaction, JournalEntry,
      JournalLine, ReconciliationSession, ReconciliationLine,
      ReconciliationMatch, ReconciliationEvent, LiquidityMovement,
      StaffAttendance, LeaveType, LeaveRequest, LeaveBalance,
      JobPosting, Applicant, StaffDocument, PerformanceReview,
      Shift, StaffSchedule, StaffProfile, StaffPayRule, TeacherSession, PayrollDeduction, PayrollBonus, RbacConfig, SystemSetting,
      IncomeCategory, Customer, BlogPost, Resource, BlogResource,
    ];

    log('  Syncing models...');
    const isProduction = process.env.NODE_ENV === 'production';
    const wantsAlter = process.env.DB_SYNC_ALTER === 'true';
    if (isProduction && wantsAlter) {
      log('  ⚠ DB_SYNC_ALTER=true is BLOCKED in production. Set NODE_ENV=development to enable.');
    }
    const syncOptions = (!isProduction && wantsAlter) ? { alter: true } : {};
    await Promise.allSettled(
      models.map(m => m.sync(syncOptions).catch(err => {
        log(`  ⚠ Sync warning ${m.name}: ${err.message.substring(0, 100)}`);
      }))
    );
    log('  ✓ Models synced');

    const settingsController = require('./backend/controllers/settings.controller');
    await settingsController.initializeDefaults().catch(err =>
      log(`  ⚠ Settings init error: ${err.message}`)
    );
    log('STEP 6: Done — database ready');

  } catch (err) {
    log(`STEP 6 FAILED: Database error: ${err.stack || err.message}`);
    log('STEP 6: Continuing without a startup DB connection. DB-backed API routes may fail until MySQL accepts connections again.');
  }

  // Step 7: Listen
  log(`STEP 7: Starting HTTP server on port ${PORT}...`);
  app.listen(PORT, '0.0.0.0', () => {
    log(`STEP 7: Done — Server LISTENING on 0.0.0.0:${PORT}`);
    log('═══ PRODUCTION SERVER READY ═══');
  });
}

start().catch(err => {
  log(`FATAL STARTUP ERROR: ${err.stack || err.message}`);
  process.exit(1);
});
