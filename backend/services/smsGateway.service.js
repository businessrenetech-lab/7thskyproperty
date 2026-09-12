// backend/services/smsGateway.service.js
//
// SMS / WhatsApp delivery for magic links, portal invites and job alerts — built
// "ready for keys" exactly like the SSLCommerz paths: the code is complete, and
// the moment the account owner puts real credentials in Settings → Integrations
// it starts sending. Until then every call is a safe no-op that reports
// `{ sent:false, skipped:true }` — it never throws and never blocks the email
// that goes out alongside it.
//
// Two providers are supported out of the box:
//   • greenweb — Greenweb SMS (Bangladesh); simple token + HTTP.
//   • twilio   — Twilio SMS and WhatsApp (international).
//
// CONFIG (SystemSetting rows, or the same-named env vars as a fallback):
//   SMS_PROVIDER            'greenweb' | 'twilio'   (blank = disabled)
//   Greenweb:  SMS_GREENWEB_TOKEN
//   Twilio:    SMS_TWILIO_ACCOUNT_SID, SMS_TWILIO_AUTH_TOKEN,
//              SMS_TWILIO_FROM (SMS sender), SMS_TWILIO_WHATSAPP_FROM (e.g. whatsapp:+14155238886)
const axios = require('axios');
const SystemSetting = require('../models/SystemSetting');

// Read a setting from the DB, falling back to an env var of the same name.
async function setting(key) {
  try {
    const row = await SystemSetting.findOne({ where: { setting_key: key } });
    return row?.setting_value || process.env[key] || null;
  } catch { return process.env[key] || null; }
}

// Resolve the active provider + its credentials, or null when not configured.
async function smsConfig() {
  const provider = (await setting('SMS_PROVIDER') || '').trim().toLowerCase();
  if (provider === 'greenweb') {
    const token = await setting('SMS_GREENWEB_TOKEN');
    if (!token) return null;
    return { provider, token };
  }
  if (provider === 'twilio') {
    const sid = await setting('SMS_TWILIO_ACCOUNT_SID');
    const auth = await setting('SMS_TWILIO_AUTH_TOKEN');
    const from = await setting('SMS_TWILIO_FROM');
    const waFrom = await setting('SMS_TWILIO_WHATSAPP_FROM');
    if (!sid || !auth) return null;
    return { provider, sid, auth, from, waFrom };
  }
  return null;
}

// Is any SMS/WhatsApp channel wired up? Used to decide whether to OFFER the
// channel in the UI, mirroring gatewayConfigured() for payments.
async function isConfigured() { return !!(await smsConfig()); }

// Bangladeshi numbers are stored many ways (01712…, +88017…, 88017…). Normalise
// to the E.164-ish form each provider wants.
function normalizeBd(to) {
  let n = String(to || '').replace(/[^\d+]/g, '');
  if (!n) return null;
  if (n.startsWith('+')) return n;
  if (n.startsWith('880')) return `+${n}`;
  if (n.startsWith('0')) return `+88${n}`;
  if (n.startsWith('1') && n.length === 10) return `+880${n}`;
  return n.startsWith('+') ? n : `+${n}`;
}

async function viaGreenweb(cfg, to, text) {
  // Greenweb accepts a simple form post; local numbers without the + are fine.
  const res = await axios.post('https://api.greenweb.com.bd/api.php', new URLSearchParams({
    token: cfg.token, to: String(to).replace(/^\+/, ''), message: text,
  }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 20000 });
  const body = String(res.data || '');
  if (/error|invalid|fail/i.test(body)) throw new Error(body.slice(0, 120) || 'Greenweb rejected the message');
  return { id: body.slice(0, 60) };
}

async function viaTwilio(cfg, to, text, { whatsapp = false } = {}) {
  const from = whatsapp ? cfg.waFrom : cfg.from;
  if (!from) throw new Error(`Twilio ${whatsapp ? 'WhatsApp' : 'SMS'} sender is not configured.`);
  const dest = whatsapp ? `whatsapp:${to}` : to;
  const res = await axios.post(
    `https://api.twilio.com/2010-04-01/Accounts/${cfg.sid}/Messages.json`,
    new URLSearchParams({ To: dest, From: from, Body: text }),
    { auth: { username: cfg.sid, password: cfg.auth }, headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 20000 },
  );
  return { id: res.data?.sid || null };
}

/**
 * Send a text message. Never throws — returns a result the caller can log.
 * @returns {Promise<{sent:boolean, skipped?:boolean, reason?:string, id?:string, channel?:string}>}
 */
async function sendSms(to, text, { whatsapp = false } = {}) {
  const dest = normalizeBd(to);
  if (!dest) return { sent: false, skipped: true, reason: 'no mobile number on file' };
  const cfg = await smsConfig();
  if (!cfg) return { sent: false, skipped: true, reason: 'SMS gateway not configured' };
  try {
    const out = cfg.provider === 'greenweb'
      ? await viaGreenweb(cfg, dest, text)
      : await viaTwilio(cfg, dest, text, { whatsapp });
    return { sent: true, id: out.id || null, channel: whatsapp ? 'whatsapp' : 'sms' };
  } catch (e) {
    console.warn(`[smsGateway] send failed (${cfg.provider}):`, e.message);
    return { sent: false, reason: e.message, channel: whatsapp ? 'whatsapp' : 'sms' };
  }
}

const sendWhatsApp = (to, text) => sendSms(to, text, { whatsapp: true });

module.exports = { isConfigured, smsConfig, sendSms, sendWhatsApp, normalizeBd };
