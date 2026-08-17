/**
 * waterTankReports.controller.js — the accounting reports.
 *
 * Thin on purpose. Everything that decides what a report contains lives in
 * wtReports.service; everything that decides how it prints lives in
 * wtReportPdf.service. This layer resolves the branch, passes the filters
 * through and chooses a content type — so the JSON a screen renders and the PDF
 * a client receives are built from the SAME call, not from two code paths that
 * agree today.
 */
const { asyncHandler, resolveBranchId } = require('../utils/controllerHelpers');
const reports = require('../services/wtReports.service');
const pdfSvc = require('../services/wtReportPdf.service');
const { getBranding } = require('../services/wtBranding.service');

/** Only the filters a report understands; anything else is ignored, not obeyed. */
const pickFilters = (q) => {
  const out = {};
  for (const k of ['client', 'provider', 'project', 'category', 'method']) {
    if (q[k] && String(q[k]).trim()) out[k] = String(q[k]).trim();
  }
  return out;
};

/** GET /wt-reports — what reports exist, and the date presets they all share. */
exports.catalogue = asyncHandler(async (req, res) => {
  res.json({ reports: reports.catalogue(), presets: reports.PRESETS });
});

/** GET /wt-reports/:kind — the report as data. */
exports.run = asyncHandler(async (req, res) => {
  try {
    const out = await reports.run({
      branch_id: resolveBranchId(req),
      kind: req.params.kind,
      preset: req.query.preset,
      from: req.query.from,
      to: req.query.to,
      filters: pickFilters(req.query),
    });
    res.json(out);
  } catch (e) {
    if (e instanceof reports.ReportError) return res.status(e.status).json({ error: e.message });
    throw e;
  }
});

/** GET /wt-reports/:kind/pdf — the same report, branded. */
exports.pdf = asyncHandler(async (req, res) => {
  try {
    const out = await reports.run({
      branch_id: resolveBranchId(req),
      kind: req.params.kind,
      preset: req.query.preset,
      from: req.query.from,
      to: req.query.to,
      filters: pickFilters(req.query),
    });
    const branding = await getBranding().catch(() => ({}));
    const buf = await pdfSvc.buildReportPdf(out, branding);

    const name = `${req.params.kind}-${out.range.from}-to-${out.range.to}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    // `inline` so it opens in a tab rather than dropping into Downloads — the
    // operator usually wants to look at it before deciding to keep it.
    res.setHeader('Content-Disposition', `inline; filename="${name}"`);
    res.send(buf);
  } catch (e) {
    if (e instanceof reports.ReportError) return res.status(e.status).json({ error: e.message });
    throw e;
  }
});

/**
 * GET /wt-reports/statement/client/:code — one client's account.
 *
 * Reuses the client-payments report with the client filter applied, rather than
 * being a sixth report that computes the same numbers slightly differently. A
 * client dashboard showing a total that disagrees with the report the same
 * client is emailed is the exact failure this reuse prevents.
 */
exports.clientStatement = asyncHandler(async (req, res) => {
  const branch_id = resolveBranchId(req);
  const common = { branch_id, preset: req.query.preset, from: req.query.from, to: req.query.to };
  const filters = { client: req.params.code };

  const [payments, completion] = await Promise.all([
    reports.run({ ...common, kind: 'client-payments', filters }),
    reports.run({ ...common, kind: 'service-completion', filters }),
  ]);
  res.json({ payments, completion });
});

/** GET /wt-reports/statement/provider/:name — one provider's account. */
exports.providerStatement = asyncHandler(async (req, res) => {
  const branch_id = resolveBranchId(req);
  const common = { branch_id, preset: req.query.preset, from: req.query.from, to: req.query.to };
  const filters = { provider: decodeURIComponent(req.params.name) };

  const [payouts, completion] = await Promise.all([
    reports.run({ ...common, kind: 'provider-payouts', filters }),
    reports.run({ ...common, kind: 'service-completion', filters }),
  ]);
  res.json({ payouts, completion });
});
