/**
 * wtPortalAccount.service.js — real logins for providers and clients.
 *
 * Phase 6's magic link is right for one-off access and wrong for a relationship
 * that lasts: it expires, it cannot be remembered, forwarding it hands over
 * everything, and the holder can change nothing about their own access. So a
 * provider or client now gets an account — their own email and password, created
 * automatically the moment their agreement is signed.
 *
 * Both mechanisms coexist deliberately. A client who will decide one quotation
 * and never return does not need an account; a provider working weekly does.
 *
 * Accounts live in the EXISTING users table. A parallel identity system is how a
 * codebase ends up with two ways to authenticate and only one of them patched
 * when something is found.
 *
 * Two rules the whole file exists to keep:
 *
 *   THE TEMPORARY PASSWORD IS SHOWN ONCE AND MUST BE REPLACED. It is generated
 *   here, emailed, and stored only as a bcrypt hash. `must_change_password`
 *   forces it to be replaced at first sign-in, so a password that travelled
 *   through an inbox stops working as soon as it has been used.
 *
 *   AN ACCOUNT IS NEVER SILENTLY REPOINTED. If the email already belongs to
 *   someone, provisioning refuses rather than attaching this provider's records
 *   to an existing person's login — quietly granting one party sight of
 *   another's data is the worst thing this file could do.
 */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const User = require('../models/User');
const M = require('../models/waterTankOps');

const ROLE = { provider: 'wt_provider', client: 'wt_client' };
const PORTAL_ROLES = Object.values(ROLE);

class AccountError extends Error {
  constructor(status, message, extra = {}) { super(message); this.status = status; Object.assign(this, extra); }
}

const hashToken = (t) => crypto.createHash('sha256').update(String(t || '')).digest('hex');

/**
 * A temporary password a human has to retype off an email.
 *
 * Deliberately avoids the characters people misread — no O/0, no l/1/I — because
 * the failure mode of a "secure" temporary password is the recipient giving up
 * and telephoning the office, which is the workflow this is meant to remove.
 */
function tempPassword() {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(14);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

const partyModel = (type) => (type === 'provider' ? M.WtProvider : M.WtClient);

/** Everything the two party types name differently, in one place. */
const partyShape = (type, row) => (type === 'provider'
  ? { name: row.business_name || row.contact_person, email: row.contact_email, contact: row.contact_person }
  : { name: row.name, email: row.email, contact: row.name });

/* ────────────────────────────────────────────────────────────────────────────
 * Provisioning
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Create (or find) the login for a party.
 *
 * Idempotent: called again for a party that already has an account, it returns
 * the existing one rather than creating a second. That matters because the
 * agreement-signed hook can fire more than once for the same envelope.
 */
async function provision({ party_type, party_id, branch_id, actor, reset = false }) {
  if (!ROLE[party_type]) throw new AccountError(400, 'Unknown party type.');

  const row = await partyModel(party_type).findOne({ where: { id: party_id, branch_id } });
  if (!row) throw new AccountError(404, `That ${party_type} was not found.`);

  const shape = partyShape(party_type, row);
  const email = String(shape.email || '').trim().toLowerCase();
  if (!email) {
    throw new AccountError(400,
      `${shape.name || 'This party'} has no email address on file, so there is nowhere to send the login. Add one first.`);
  }

  // Already provisioned: hand back what exists unless a reset was asked for.
  if (row.portal_user_id) {
    const existing = await User.findByPk(row.portal_user_id);
    if (existing && !reset) {
      return { user: existing, created: false, password: null, party: shape };
    }
    if (existing && reset) {
      const password = tempPassword();
      await existing.update({
        password: await bcrypt.hash(password, 10),
        must_change_password: true,
        status: 'active',
        reset_token_hash: null,
        reset_token_expires_at: null,
      });
      return { user: existing, created: false, password, party: shape, reset: true };
    }
  }

  /*
   * The email is already someone's login. Refuse — attaching this party's
   * records to an existing account would silently give that person sight of
   * data that is not theirs, and an email collision usually means a typo or a
   * shared address rather than a genuine same-person match.
   */
  const clash = await User.findOne({ where: { email } });
  if (clash) {
    const sameParty = clash.id === row.portal_user_id;
    if (!sameParty) {
      throw new AccountError(409,
        `${email} is already used by another account (${clash.name}). Portal access must use an address unique to this ${party_type}.`,
        { existing_role: clash.role });
    }
  }

  const password = tempPassword();
  const user = await User.create({
    branch_id,
    name: shape.name || email,
    email,
    password: await bcrypt.hash(password, 10),
    role: ROLE[party_type],
    status: 'active',
    must_change_password: true,
  });

  await row.update({ portal_user_id: user.id });

  return { user, created: true, password, party: shape };
}

/** Suspend without deleting: the account and its history stay, sign-in stops. */
async function suspend({ party_type, party_id, branch_id }) {
  const row = await partyModel(party_type).findOne({ where: { id: party_id, branch_id } });
  if (!row?.portal_user_id) throw new AccountError(404, 'That party has no portal account.');
  const user = await User.findByPk(row.portal_user_id);
  if (!user) throw new AccountError(404, 'That account no longer exists.');
  await user.update({ status: 'suspended' });
  return { ok: true };
}

async function reinstate({ party_type, party_id, branch_id }) {
  const row = await partyModel(party_type).findOne({ where: { id: party_id, branch_id } });
  if (!row?.portal_user_id) throw new AccountError(404, 'That party has no portal account.');
  const user = await User.findByPk(row.portal_user_id);
  if (!user) throw new AccountError(404, 'That account no longer exists.');
  await user.update({ status: 'active' });
  return { ok: true };
}

/** Account state for one party, for the Settings list. */
async function statusOf({ party_type, party_id, branch_id }) {
  const row = await partyModel(party_type).findOne({ where: { id: party_id, branch_id } });
  if (!row) throw new AccountError(404, 'Not found.');
  const shape = partyShape(party_type, row);

  if (!row.portal_user_id) {
    return { has_account: false, email: shape.email || null, name: shape.name, can_provision: !!shape.email };
  }
  const user = await User.findByPk(row.portal_user_id, {
    attributes: ['id', 'name', 'email', 'role', 'status', 'must_change_password', 'last_login_at', 'password_changed_at'],
  });
  if (!user) return { has_account: false, email: shape.email || null, name: shape.name, can_provision: !!shape.email };

  return {
    has_account: true,
    name: shape.name,
    account: {
      id: user.id, email: user.email, status: user.status,
      // Named plainly so the operator can tell "sent but never used" from
      // "in use" — the first is the one that needs chasing.
      awaiting_first_sign_in: !!user.must_change_password,
      last_login_at: user.last_login_at,
      password_changed_at: user.password_changed_at,
    },
  };
}

/**
 * Everyone who could have an account, with its state.
 *
 * Drives the Settings screen: providers and clients appear here as soon as they
 * exist, so an operator can see at a glance who has access, who was invited and
 * never signed in, and who cannot be invited because no email is on file.
 */
async function directory({ branch_id, party_type, service_line }) {
  const out = [];
  const types = party_type ? [party_type] : ['provider', 'client'];

  for (const type of types) {
    const rows = await partyModel(type).findAll({
      // Providers and clients are service-scoped, so a console only lists its own.
      where: { branch_id, ...(service_line ? { service_line } : {}) }, order: [['id', 'DESC']], limit: 400, raw: true,
    });
    const userIds = rows.map((r) => r.portal_user_id).filter(Boolean);
    const users = userIds.length
      ? await User.findAll({
        where: { id: { [Op.in]: userIds } },
        attributes: ['id', 'email', 'status', 'must_change_password', 'last_login_at'],
        raw: true,
      })
      : [];
    const byId = Object.fromEntries(users.map((u) => [u.id, u]));

    rows.forEach((r) => {
      const shape = partyShape(type, r);
      const user = r.portal_user_id ? byId[r.portal_user_id] : null;
      out.push({
        party_type: type,
        id: r.id,
        code: r.code,
        name: shape.name,
        contact: shape.contact,
        email: shape.email || null,
        status: r.status || r.current_status || null,
        // Whether this party has reached the point where an account is warranted.
        // Both party types record 'Signed' here — checked against the two
        // activation hooks rather than assumed, because they are written in
        // different places and could easily have diverged.
        agreement_signed: String(r.agreement_status || '').toLowerCase() === 'signed',
        has_account: !!user,
        account: user ? {
          email: user.email,
          status: user.status,
          awaiting_first_sign_in: !!user.must_change_password,
          last_login_at: user.last_login_at,
        } : null,
        can_provision: !!shape.email,
        blocked_reason: shape.email ? null : 'No email address on file',
      });
    });
  }
  return out;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Email
 * ──────────────────────────────────────────────────────────────────────────── */

const portalUrl = () => process.env.PORTAL_LOGIN_URL || `${process.env.APP_BASE_URL || 'http://localhost:3005'}/admin/login`;

/**
 * Send the credentials.
 *
 * Best-effort by design: if SMTP is down the account still exists and the
 * operator can hand the password over another way. Failing the provisioning
 * because an email bounced would leave a half-made account behind.
 */
async function sendCredentials({ to, name, password, partyType, reset = false }) {
  const { sendEmail } = require('./communication.service');
  const what = partyType === 'provider' ? 'Provider Portal' : 'Customer Portal';
  const subject = reset
    ? `Your Seventh Sky ${what} password has been reset`
    : `Your Seventh Sky ${what} access`;

  const html = `
    <p>Dear ${name || 'Sir/Madam'},</p>
    <p>${reset
    ? `Your password for the Seventh Sky ${what} has been reset.`
    : `An account has been created for you on the Seventh Sky ${what}.`}</p>
    <p>
      <b>Sign in:</b> <a href="${portalUrl()}">${portalUrl()}</a><br/>
      <b>Email:</b> ${to}<br/>
      <b>Temporary password:</b> <code style="font-size:15px;letter-spacing:1px">${password}</code>
    </p>
    <p>You will be asked to choose your own password the first time you sign in.
       This temporary one stops working at that point.</p>
    <p>${partyType === 'provider'
    ? 'From the portal you can accept or decline the jobs assigned to you, book a date, submit your completion report and see what you are owed.'
    : 'From the portal you can review and accept quotations, download your invoices and receipts, and see your maintenance visits and warranties.'}</p>
    <p>If you were not expecting this message, please tell us and ignore it.</p>
    <p>— Seventh Sky Property Care</p>`;

  return sendEmail(to, subject, html).then(() => ({ sent: true })).catch((e) => ({ sent: false, error: e.message }));
}

/* ────────────────────────────────────────────────────────────────────────────
 * Password reset — for every role, not only portal users
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Begin a reset.
 *
 * Always reports success, whether or not the address exists. Saying "no such
 * account" turns this endpoint into a way to discover who has one.
 */
async function requestReset(email) {
  const user = await User.findOne({ where: { email: String(email || '').trim().toLowerCase() } });
  if (!user) return { ok: true, sent: false };

  const token = crypto.randomBytes(32).toString('hex');
  await user.update({
    reset_token_hash: hashToken(token),
    // Short-lived on purpose: a reset link is a live credential sitting in an
    // inbox, and an hour is long enough to act on and short enough to matter.
    reset_token_expires_at: new Date(Date.now() + 60 * 60 * 1000),
  });

  const base = process.env.APP_BASE_URL || 'http://localhost:3005';
  const link = `${base}/admin/reset-password/${token}`;
  const { sendEmail } = require('./communication.service');
  const out = await sendEmail(
    user.email,
    'Reset your Seventh Sky password',
    `<p>Dear ${user.name || 'Sir/Madam'},</p>
     <p>Somebody asked to reset the password for this account. If it was you, use the link below within the next hour:</p>
     <p><a href="${link}">${link}</a></p>
     <p>If it was not you, ignore this message — your password has not changed.</p>
     <p>— Seventh Sky Property Care</p>`,
  ).then(() => true).catch(() => false);

  return { ok: true, sent: out };
}

/** Complete a reset. The token is single-use: it is cleared on success. */
async function completeReset({ token, password }) {
  if (!token || String(token).length < 32) throw new AccountError(400, 'That reset link is not valid.');
  if (!password || String(password).length < 8) {
    throw new AccountError(400, 'Choose a password of at least 8 characters.');
  }

  const user = await User.findOne({ where: { reset_token_hash: hashToken(token) } });
  if (!user) throw new AccountError(400, 'That reset link is not valid or has already been used.');
  if (!user.reset_token_expires_at || new Date(user.reset_token_expires_at) < new Date()) {
    throw new AccountError(410, 'That reset link has expired. Please ask for a new one.');
  }

  await user.update({
    password: await bcrypt.hash(String(password), 10),
    must_change_password: false,
    password_changed_at: new Date(),
    reset_token_hash: null,
    reset_token_expires_at: null,
  });
  return { ok: true };
}

/** Change a password from inside a session — including the forced first change. */
async function changePassword({ user_id, current_password, new_password }) {
  if (!new_password || String(new_password).length < 8) {
    throw new AccountError(400, 'Choose a password of at least 8 characters.');
  }
  const user = await User.findByPk(user_id);
  if (!user) throw new AccountError(404, 'Account not found.');

  const ok = await bcrypt.compare(String(current_password || ''), user.password);
  if (!ok) throw new AccountError(401, 'That is not your current password.');
  if (await bcrypt.compare(String(new_password), user.password)) {
    throw new AccountError(400, 'Choose a password you have not just been using.');
  }

  await user.update({
    password: await bcrypt.hash(String(new_password), 10),
    must_change_password: false,
    password_changed_at: new Date(),
  });
  return { ok: true };
}

/* ────────────────────────────────────────────────────────────────────────────
 * Resolving a signed-in portal user back to their party
 * ──────────────────────────────────────────────────────────────────────────── */

/** Which provider or client this login speaks for, or null for staff. */
async function partyForUser(user) {
  if (!user || !PORTAL_ROLES.includes(user.role)) return null;
  const type = user.role === ROLE.provider ? 'provider' : 'client';
  const row = await partyModel(type).findOne({ where: { portal_user_id: user.id } });
  return row ? { party_type: type, row } : null;
}

module.exports = {
  ROLE, PORTAL_ROLES, AccountError,
  provision, suspend, reinstate, statusOf, directory,
  sendCredentials, requestReset, completeReset, changePassword,
  partyForUser, tempPassword, hashToken, partyShape,
};
