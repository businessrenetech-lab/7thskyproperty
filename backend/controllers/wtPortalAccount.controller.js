/**
 * wtPortalAccount.controller.js — managing provider and customer logins.
 *
 * The Settings screen's Portal Accounts section talks to this. Accounts are
 * created automatically when an agreement is signed; these endpoints exist for
 * everything the automatic path cannot cover — a provider onboarded before this
 * existed, a client who changed their email, someone who needs their password
 * reset, or access that has to stop today.
 */
const { asyncHandler, branchScope, resolveBranchId } = require('../utils/controllerHelpers');
const svc = require('../services/wtPortalAccount.service');

const fail = (res, e) => {
  if (e instanceof svc.AccountError) {
    return res.status(e.status).json({ error: e.message, ...(e.existing_role ? { existing_role: e.existing_role } : {}) });
  }
  throw e;
};

/**
 * GET /wt-ops/portal-accounts?party_type=&q=&filter=
 *
 * Everyone who could have a login, whether or not they do. Parties with no
 * email are returned too, carrying the reason they cannot be invited — hiding
 * them would leave an operator wondering why someone never appears.
 */
exports.directory = asyncHandler(async (req, res) => {
  const rows = await svc.directory({
    branch_id: resolveBranchId(req),
    party_type: req.query.party_type || null,
  });

  const q = String(req.query.q || '').trim().toLowerCase();
  let shown = q
    ? rows.filter((r) => [r.name, r.code, r.email, r.contact].some((v) => String(v || '').toLowerCase().includes(q)))
    : rows;

  const filter = req.query.filter;
  if (filter === 'with_account') shown = shown.filter((r) => r.has_account);
  if (filter === 'without_account') shown = shown.filter((r) => !r.has_account);
  if (filter === 'never_signed_in') shown = shown.filter((r) => r.account?.awaiting_first_sign_in);
  if (filter === 'signed_agreement') shown = shown.filter((r) => r.agreement_signed);

  res.json({
    rows: shown,
    summary: {
      total: rows.length,
      with_account: rows.filter((r) => r.has_account).length,
      never_signed_in: rows.filter((r) => r.account?.awaiting_first_sign_in).length,
      suspended: rows.filter((r) => r.account?.status === 'suspended').length,
      no_email: rows.filter((r) => !r.can_provision).length,
      awaiting_invite: rows.filter((r) => !r.has_account && r.can_provision && r.agreement_signed).length,
    },
  });
});

exports.status = asyncHandler(async (req, res) => {
  try {
    res.json(await svc.statusOf({
      party_type: req.params.partyType, party_id: req.params.id, branch_id: resolveBranchId(req),
    }));
  } catch (e) { fail(res, e); }
});

/**
 * POST /wt-ops/portal-accounts/:partyType/:id  { reset?: true }
 *
 * Create the login, or reset an existing one's password. The temporary password
 * is returned ONCE so an operator can read it out if the email does not arrive —
 * it is stored only as a bcrypt hash and cannot be recovered afterwards.
 */
exports.provision = asyncHandler(async (req, res) => {
  try {
    const out = await svc.provision({
      party_type: req.params.partyType,
      party_id: req.params.id,
      branch_id: resolveBranchId(req),
      actor: req.user?.name || req.user?.email,
      reset: req.body?.reset === true,
    });

    if (!out.password) {
      return res.json({
        created: false,
        email: out.user.email,
        message: 'This party already has a portal account. Use "Reset password" to send new credentials.',
      });
    }

    const mail = await svc.sendCredentials({
      to: out.user.email, name: out.party.name, password: out.password,
      partyType: req.params.partyType, reset: !!out.reset,
    });

    res.json({
      created: out.created,
      reset: !!out.reset,
      email: out.user.email,
      // Returned once, so the operator has a fallback when email fails.
      temporary_password: out.password,
      email_sent: mail.sent,
      message: mail.sent
        ? `Credentials emailed to ${out.user.email}. They will choose their own password on first sign-in.`
        : `Account ready, but the email could not be sent (${mail.error || 'unknown error'}). Pass the temporary password on yourself — it is shown here once.`,
    });
  } catch (e) { fail(res, e); }
});

exports.suspend = asyncHandler(async (req, res) => {
  try {
    await svc.suspend({ party_type: req.params.partyType, party_id: req.params.id, branch_id: resolveBranchId(req) });
    res.json({ ok: true, message: 'Access suspended. Their records and history are untouched.' });
  } catch (e) { fail(res, e); }
});

exports.reinstate = asyncHandler(async (req, res) => {
  try {
    await svc.reinstate({ party_type: req.params.partyType, party_id: req.params.id, branch_id: resolveBranchId(req) });
    res.json({ ok: true, message: 'Access restored.' });
  } catch (e) { fail(res, e); }
});
