/**
 * Seventh Sky Property Care — API Server
 * --------------------------------------
 * Clean boot. Schema is owned by sequelize-cli migrations (see /migrations),
 * NOT by sequelize.sync(). Routes are mounted resiliently so the API can run
 * while individual domain modules are still being rebuilt.
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
require('dotenv').config();

// Enforce timezone at the process level
process.env.TZ = process.env.TZ || 'Asia/Dhaka';

const sequelize = require('./config/db.config');
const { getCorsOptions } = require('./config/cors.config');

const app = express();

// ─── SECURITY MIDDLEWARE ────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

if (process.env.NODE_ENV !== 'test') {
  app.use('/api', morgan(process.env.NODE_ENV === 'production' ? 'short' : 'dev'));
}

app.use(cors(getCorsOptions()));
app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ─── STATIC UPLOADS (token-gated for private docs) ──────────────────────────
// Public-ish asset folders served with caching (no auth needed for website media).
const publicUploadDirs = ['properties', 'services', 'website', 'branches', 'assets'];
publicUploadDirs.forEach((dir) => {
  app.use(`/uploads/${dir}`, express.static(path.join(__dirname, 'uploads', dir), {
    maxAge: '1d', etag: true, lastModified: true,
  }));
});

// Everything else under /uploads requires a valid JWT (signed docs, client files, etc.)
app.use('/uploads', (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '') || req.query.token;
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}, express.static(path.join(__dirname, 'uploads'), { maxAge: '1d', etag: true, lastModified: true }));

// ─── HEALTH CHECK ───────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'seventh-sky-api', timestamp: new Date().toISOString() });
});

// ─── RESILIENT ROUTE MOUNTING ───────────────────────────────────────────────
// During the rebuild, some domain modules may not exist yet or may still depend
// on code being replaced. We mount each independently and log failures rather
// than crashing the whole API.
const mounted = [];
const skipped = [];
function mount(urlPath, modulePath) {
  try {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    const router = require(modulePath);
    app.use(urlPath, router);
    mounted.push(urlPath);
  } catch (err) {
    skipped.push(`${urlPath} (${err.code || 'ERR'}: ${err.message.split('\n')[0].slice(0, 90)})`);
  }
}

// Core infrastructure (reused, generic)
mount('/api/auth', './routes/auth.routes');
mount('/api/rbac', './routes/rbac.routes');
mount('/api/settings', './routes/settings.routes');
mount('/api/notifications', './routes/notification.routes');
mount('/api/branches', './routes/branch.routes');
mount('/api/automation', './routes/automation.routes');
mount('/api/dashboard', './routes/dashboard.routes');

// Kept integrations (per project decisions): biometric (ZKTeco) + payments (SSLCommerz)
try {
  const { admsRouter, apiRouter: biometricApiRouter } = require('./routes/biometric.routes');
  app.use('/iclock', admsRouter);
  app.use('/api/biometric', biometricApiRouter);
  mounted.push('/api/biometric');
} catch (err) {
  skipped.push(`/api/biometric (${err.code || 'ERR'})`);
}
mount('/api/payment', './routes/payment.routes');

// HRM / Accounting (internal Seventh Sky operations — adapted in later phases)
mount('/api/hrm', './routes/hrm.routes');
mount('/api/payroll', './routes/payroll.routes');
mount('/api/assets', './routes/asset.routes');
mount('/api/expenses', './routes/expense.routes');
mount('/api/invoices', './routes/invoicing.routes');
mount('/api/billing', './routes/billing.routes');
mount('/api/account-categories', './routes/accountCategory.routes');
mount('/api/folios', './routes/folio.routes');
mount('/api/payments', './routes/paymentsList.routes');
mount('/api/budget', './routes/budget.routes');
mount('/api/accounting', './routes/accounting.routes');
mount('/api/finance', './routes/finance.routes');
mount('/api/reconciliation', './routes/reconciliation.routes');

// ─── Seventh Sky domain modules (added as each phase is built) ───────────────
mount('/api/contacts', './routes/contact.routes');
mount('/api/party-role-profiles', './routes/partyRoleProfile.routes');
mount('/api/clients', './routes/client.routes');
mount('/api/properties', './routes/property.routes');
mount('/api/tenancies', './routes/tenancy.routes');
mount('/api/tenant-applications', './routes/tenantApplication.routes');
mount('/api/rental-assessments', './routes/rentalAssessment.routes');
mount('/api/rental-enquiries', './routes/rentalEnquiry.routes');
mount('/api/sales-enquiries', './routes/salesEnquiry.routes');
mount('/api/public', './routes/publicSales.routes');
mount('/api/property-management', './routes/propertyManagement.routes');
mount('/api/owner-statements', './routes/ownerStatement.routes');
mount('/api/short-stay', './routes/shortTermStay.routes');
mount('/api/rprm', './routes/rprm.routes');
mount('/api/rptm', './routes/rptm.routes');
mount('/api/sts', './routes/sts.routes');
mount('/api/short-stay-verification', './routes/shortStayVerification.routes');
mount('/api/wt-ops', './routes/waterTankOps.routes');
mount('/api/wt-providers', './routes/waterTankProviders.routes');
mount('/api/public/water-tank-provider', './routes/publicWaterTankProvider.routes');
mount('/api/wt-clients', './routes/waterTankClients.routes');
mount('/api/wt-quotes', './routes/waterTankQuotation.routes');
mount('/api/wt-intake', './routes/waterTankIntake.routes');
mount('/api/wt-work-orders', './routes/waterTankWorkOrder.routes');
mount('/api/wt-projects', './routes/waterTankProject.routes');
mount('/api/wt-amc', './routes/waterTankAmc.routes');
mount('/api/wt-invoices', './routes/waterTankInvoice.routes');
mount('/api/wt-catalogue', './routes/waterTankCatalogue.routes');
mount('/api/wt-agreement-hub', './routes/waterTankAgreementHub.routes');
mount('/api/public/water-tank', './routes/publicWaterTank.routes');
mount('/api/wt-agreements', './routes/wtAgreements.routes');
mount('/api/public/short-stay', './routes/publicShortTermStay.routes');
mount('/api/landlord', './routes/landlord.routes');
mount('/api/tenant', './routes/tenant.routes');
mount('/api/vacancy-notices', './routes/vacancyNotice.routes');
mount('/api/deposit-settlements', './routes/depositSettlement.routes');
mount('/api/rental-reports', './routes/rentalReports.routes');
mount('/api/disbursements', './routes/disbursement.routes');
mount('/api/uploads', './routes/upload.routes');
mount('/api/service-catalog', './routes/serviceCatalog.routes');
mount('/api/public-provider', './routes/publicProvider.routes');
mount('/api/care', './routes/care.routes');
mount('/api/agreement-templates', './routes/agreementTemplate.routes');
mount('/api/kyc', './routes/kyc.routes');
mount('/api/utility-bills', './routes/utilityBill.routes');
mount('/api/tenant-requests', './routes/tenantRequest.routes');
mount('/api/arrears-actions', './routes/arrearsAction.routes');
mount('/api/marketing-activities', './routes/marketingActivity.routes');
mount('/api/expense-approvals', './routes/expenseApproval.routes');
mount('/api/property-risks', './routes/propertyRisk.routes');
mount('/api/move-in-checklist', './routes/moveInChecklist.routes');
mount('/api/public-party', './routes/publicParty.routes');
mount('/api/deals', './routes/deal.routes');
mount('/api/sales', './routes/sales.routes');
mount('/api/sales-payments', './routes/salesPayment.routes');
mount('/api/services', './routes/service.routes');
mount('/api/leads', './routes/lead.routes');
mount('/api/providers', './routes/provider.routes');
mount('/api/projects', './routes/project.routes');
mount('/api/registers', './routes/register.routes');
mount('/api/work-orders', './routes/workOrder.routes');
mount('/api/inspections', './routes/inspection.routes');
mount('/api/documents', './routes/document.routes');
mount('/api/signing', './routes/signing.routes');
mount('/api/agreements', './routes/agreement.routes');
mount('/api/sign', './routes/sign.routes');
mount('/api/intake', './routes/intake.routes');
mount('/api/portal', './routes/portal.routes');
mount('/api/public', './routes/public.routes');

// ─── ADMIN SPA (optional, single-origin production) ─────────────────────────
// When ADMIN_DIST points at the built admin-portal (Vite base '/admin/'), this
// app serves the admin at /admin on the SAME origin as /api — so the admin's
// default VITE_API_URL of '/api' works with no rebuild and no CORS.
const adminDist = process.env.ADMIN_DIST
  ? path.resolve(process.env.ADMIN_DIST)
  : path.join(__dirname, '..', 'admin-portal', 'dist');
if (fs.existsSync(path.join(adminDist, 'index.html'))) {
  app.use('/admin', express.static(adminDist, { maxAge: '1h', etag: true }));
  // SPA fallback for client-side routes (but never for /api or /uploads).
  app.get(/^\/admin(\/.*)?$/, (req, res) => res.sendFile(path.join(adminDist, 'index.html')));
  console.log(`✓ Admin SPA served from ${adminDist} at /admin`);
}

// Default route
app.get('/', (req, res) => {
  res.json({ message: 'Seventh Sky Property Care API is running' });
});

// Centralized error handler
const { errorHandler } = require('./middleware/errorHandler');
app.use(errorHandler);

// ─── STARTUP ─────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

(async () => {
  let dbOk = false;
  try {
    await sequelize.authenticate();
    dbOk = true;
    console.log('✓ Database connected');
  } catch (err) {
    console.warn(`⚠ Database not reachable yet (${err.code || 'ERR'}). API will still start. ` +
      'Run migrations once DB access is configured.');
  }

    app.listen(PORT, () => {
      console.log(`✓ Seventh Sky API running on port ${PORT} (db: ${dbOk ? 'up' : 'down'})`);
      console.log(`  mounted: ${mounted.join(', ') || 'none'}`);
      if (skipped.length) console.log(`  skipped (to be rebuilt): \n   - ${skipped.join('\n   - ')}`);
      if (dbOk) {
        try {
          require('./services/rentalReceiptScheduler.service').startRentalReceiptScheduler();
        } catch (err) {
          console.warn(`[RentalReceiptScheduler] not started: ${err.message}`);
        }
        try {
          require('./services/tenancyExpiry.scheduler').startTenancyExpiryScheduler();
        } catch (err) {
          console.warn(`[TenancyExpiry] not started: ${err.message}`);
        }
        try {
          require('./services/arrearsReminder.scheduler').startArrearsReminderScheduler();
        } catch (err) {
          console.warn(`[ArrearsReminder] not started: ${err.message}`);
        }
      }
    });
})();
