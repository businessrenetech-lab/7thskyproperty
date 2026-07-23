/**
 * prefill.service.js — auto-fill an agreement template's field values from an
 * existing operational record so staff barely type. Template-aware: maps to the
 * template's field keys and, for a checkbox field, ticks the matching option.
 *
 * Sources: tenancy, tenant_application (when no tenancy yet), property,
 * service_provider, contact (customer).
 */
const Tenancy = require('../models/Tenancy');
const Property = require('../models/Property');
const ServiceProvider = require('../models/ServiceProvider');
const Contact = require('../models/Contact');
const TenantApplication = require('../models/TenantApplication');

const dateOnly = (v) => { if (!v) return ''; try { return new Date(v).toISOString().slice(0, 10); } catch { return ''; } };
const parseJson = (v) => { if (!v) return {}; if (typeof v === 'object') return v; try { return JSON.parse(v); } catch { return {}; } };
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v != null && v !== '' && !(Array.isArray(v) && !v.length)));

// Tick the option on a checkbox field that matches `raw` (case-insensitive).
// Returns { <key>: [option] } or, when unmatched and an "Other" option exists,
// { <key>: ['Other'], <otherKey>: raw }.
function matchCheckbox(fields, key, raw, otherKey) {
  if (!raw) return {};
  const f = fields.find((x) => x.key === key && x.type === 'checkbox_group');
  if (!f) return {};
  const hit = (f.options || []).find((o) => o.toLowerCase() === String(raw).toLowerCase());
  if (hit) return { [key]: [hit] };
  if ((f.options || []).some((o) => o.toLowerCase() === 'other')) return { [key]: ['Other'], ...(otherKey ? { [otherKey]: raw } : {}) };
  return {};
}

const contactValues = (c, prefix) => c ? clean({
  [`${prefix}_full_name`]: c.full_name,
  [`${prefix}_nid`]: c.national_id || c.passport_no,
  [`${prefix}_current_address`]: [c.area, c.city, c.district].filter(Boolean).join(', '),
  [`${prefix}_phone`]: c.primary_phone || c.whatsapp,
  [`${prefix}_email`]: c.email,
  [`${prefix}_occupation`]: c.designation,
}) : {};

async function buildPrefill(template, sourceType, sourceId) {
  const fields = template.fields || [];
  let v = {};

  if (sourceType === 'tenancy') {
    const t = await Tenancy.findByPk(sourceId);
    if (!t) return {};
    const [prop, tenant] = await Promise.all([
      t.property_id ? Property.findByPk(t.property_id) : null,
      t.tenant_contact_id ? Contact.findByPk(t.tenant_contact_id) : null,
    ]);
    v = {
      ...contactValues(tenant, 'tenant'),
      monthly_rent: t.monthly_rent, security_deposit: t.security_deposit, advance_rent: t.advance_rent,
      rent_due_date: t.rent_due_day, payment_method: t.payment_method,
      lease_start_date: dateOnly(t.lease_start), lease_end_date: dateOnly(t.lease_end),
      property_address: prop?.address,
      ...matchCheckbox(fields, 'property_type', prop?.property_type, 'property_type_other'),
    };
  } else if (sourceType === 'tenant_application') {
    const a = await TenantApplication.findByPk(sourceId);
    if (!a) return {};
    const [prop, tenant] = await Promise.all([
      a.property_id ? Property.findByPk(a.property_id) : null,
      a.tenant_contact_id ? Contact.findByPk(a.tenant_contact_id) : null,
    ]);
    v = {
      ...contactValues(tenant, 'tenant'),
      tenant_full_name: a.applicant_name || tenant?.full_name,
      tenant_phone: a.mobile || tenant?.primary_phone,
      tenant_email: a.email || tenant?.email,
      tenant_occupation: a.occupation,
      tenant_current_address: a.current_address,
      monthly_rent: a.proposed_monthly_rent || a.approved_rent,
      security_deposit: a.proposed_security_deposit, advance_rent: a.proposed_advance_rent,
      lease_start_date: dateOnly(a.proposed_lease_start || a.lease_start_target),
      property_address: prop?.address,
      ...matchCheckbox(fields, 'property_type', prop?.property_type, 'property_type_other'),
    };
  } else if (sourceType === 'property') {
    const p = await Property.findByPk(sourceId);
    if (!p) return {};
    v = {
      property_address: p.address, monthly_rent: p.approved_monthly_rent || p.market_rent_max,
      rent_due_date: p.rent_due_day,
      ...matchCheckbox(fields, 'property_type', p.property_type, 'property_type_other'),
    };
  } else if (sourceType === 'service_provider') {
    const p = await ServiceProvider.findByPk(sourceId);
    if (!p) return {};
    const rate = parseJson(p.rate_card); const bank = parseJson(p.bank_details);
    v = {
      sp_business_name: p.company_name, sp_rep_name: p.contact_person,
      sp_rep_phone: p.phone, sp_rep_email: p.email,
      commission_pct: rate.commission_pct,
      sp_account_name: bank.account_name || bank.account_holder, sp_bank_name: bank.bank_name || bank.bank,
      sp_bank_branch: bank.branch, sp_account_number: bank.account_number, sp_routing_number: bank.routing_number,
      sp_mobile_banking: bank.mobile_banking || bank.bkash || p.preferred_payment,
    };
  } else if (sourceType === 'contact') {
    const c = await Contact.findByPk(sourceId);
    if (!c) return {};
    v = {
      customer_name: c.full_name || c.company_name, customer_phone: c.primary_phone || c.whatsapp,
      customer_email: c.email, customer_address: [c.area, c.city, c.district].filter(Boolean).join(', '),
      // also usable on tenant/landlord templates
      ...contactValues(c, 'tenant'),
    };
  }

  // Only keep keys the template actually has (plus checkbox arrays already scoped).
  const keySet = new Set(fields.map((f) => f.key));
  const out = {};
  for (const [k, val] of Object.entries(clean(v))) if (keySet.has(k)) out[k] = val;
  return out;
}

module.exports = { buildPrefill };
