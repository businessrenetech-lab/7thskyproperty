/**
 * wtBranding.service.js — one place to read the company identity that every
 * outbound document and email carries. Values come from Settings, so changing
 * the phone number there changes it on every quotation and email.
 */
const SystemSetting = require('../models/SystemSetting');

const KEYS = [
  'BRAND_NAME', 'BRAND_TAGLINE', 'BRAND_LOGO_URL', 'BRAND_PRIMARY_COLOR', 'BRAND_ACCENT_COLOR',
  'CONTACT_PHONE_PRIMARY', 'CONTACT_PHONE_SECONDARY', 'CONTACT_WHATSAPP',
  'CONTACT_EMAIL_PRIMARY', 'CONTACT_EMAIL_SUPPORT', 'CONTACT_ADDRESS',
  'COMPANY_WEBSITE', 'COMPANY_BIN', 'COMPANY_TIN', 'COMPANY_TRADE_LICENCE',
  'SMTP_USER',
];

const FALLBACK = {
  BRAND_NAME: 'Seventh Sky Property Care',
  BRAND_TAGLINE: 'Water Tank Cleaning & Maintenance Services',
  BRAND_PRIMARY_COLOR: '#12b6f3',
  BRAND_ACCENT_COLOR: '#003768',
};

/**
 * Reads branding + contact settings. Missing keys fall back to sensible
 * defaults rather than rendering blanks on a client-facing document.
 */
async function getBranding() {
  let map = {};
  try {
    const rows = await SystemSetting.findAll({ where: { setting_key: KEYS }, raw: true });
    map = rows.reduce((a, r) => { if (r.setting_value) a[r.setting_key] = r.setting_value; return a; }, {});
  } catch { map = {}; }

  const get = (k) => map[k] || FALLBACK[k] || '';
  // the published contact address wins over whatever the SMTP account happens to be
  const email = get('CONTACT_EMAIL_PRIMARY') || get('SMTP_USER');

  return {
    name: get('BRAND_NAME'),
    tagline: get('BRAND_TAGLINE'),
    logo_url: get('BRAND_LOGO_URL'),
    primary: get('BRAND_PRIMARY_COLOR'),
    accent: get('BRAND_ACCENT_COLOR'),
    phone: get('CONTACT_PHONE_PRIMARY'),
    phone_alt: get('CONTACT_PHONE_SECONDARY'),
    whatsapp: get('CONTACT_WHATSAPP'),
    email,
    support_email: get('CONTACT_EMAIL_SUPPORT') || email,
    address: get('CONTACT_ADDRESS'),
    website: get('COMPANY_WEBSITE'),
    bin: get('COMPANY_BIN'),
    tin: get('COMPANY_TIN'),
    trade_licence: get('COMPANY_TRADE_LICENCE'),
    // which contact lines are actually configured — the document only prints these
    contact_lines: [
      get('CONTACT_PHONE_PRIMARY') && { label: 'Phone', value: get('CONTACT_PHONE_PRIMARY') },
      get('CONTACT_PHONE_SECONDARY') && { label: 'Alt', value: get('CONTACT_PHONE_SECONDARY') },
      get('CONTACT_WHATSAPP') && { label: 'WhatsApp', value: get('CONTACT_WHATSAPP') },
      email && { label: 'Email', value: email },
      get('COMPANY_WEBSITE') && { label: 'Web', value: get('COMPANY_WEBSITE') },
      get('CONTACT_ADDRESS') && { label: 'Address', value: get('CONTACT_ADDRESS') },
    ].filter(Boolean),
  };
}

module.exports = { getBranding };
